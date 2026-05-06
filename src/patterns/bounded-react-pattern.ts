import type { AgentContext, AgentResult } from "../abstractions/agents.js";
import { AgentState } from "../abstractions/agents.js";
import { AuditEventKind } from "../abstractions/audit.js";
import type { ModelResponse } from "../abstractions/models.js";
import type {
  IAgentPattern,
  IPatternServices,
  PatternDescriptor,
} from "../abstractions/patterns.js";
import { PatternRiskLevel } from "../abstractions/patterns.js";
import { KnownPatternIds } from "../core/known-pattern-ids.js";
import {
  type BoundedReActOptions,
  validateBoundedReActOptions,
} from "./bounded-react-options.js";

export class BoundedReActPattern implements IAgentPattern {
  readonly descriptor: PatternDescriptor;
  private readonly allowedTools: Set<string>;

  constructor(private readonly options: BoundedReActOptions) {
    validateBoundedReActOptions(options);
    this.allowedTools = new Set(options.allowedTools);
    this.descriptor = {
      patternId: KnownPatternIds.BoundedReAct,
      name: "Bounded ReAct",
      requiresTools: true,
      requiresNativeToolCalling: true,
      isBounded: true,
      maxSteps: options.maxSteps,
      riskLevel: PatternRiskLevel.Medium,
    };
  }

  async execute(
    context: AgentContext,
    services: IPatternServices,
  ): Promise<AgentResult> {
    if (!context) throw new Error("context must not be null");
    if (!services) throw new Error("services must not be null");

    if (services.tools === null) {
      return {
        sessionId: context.sessionId,
        state: AgentState.Rejected,
        errorMessage: "BoundedReActPattern requires a tool invoker.",
      };
    }

    const toolDefinitions = services.tools
      .getDefinitions()
      .filter((d) => this.allowedTools.has(d.name));
    if (toolDefinitions.length === 0) {
      return {
        sessionId: context.sessionId,
        state: AgentState.Rejected,
        errorMessage: "None of the allowed tools are registered.",
      };
    }

    let transcript = context.task.input;
    let lastResponse: ModelResponse | undefined;

    for (let step = 1; step <= this.options.maxSteps; step++) {
      await services.audit.write({
        timestamp: new Date(),
        sessionId: context.sessionId,
        kind: AuditEventKind.StepStarted,
        message: `react: step ${step} of ${this.options.maxSteps}`,
        properties: {},
      });

      let response: ModelResponse;
      try {
        response = await this.withTimeout(
          services.model.complete({ prompt: transcript, tools: toolDefinitions }),
          this.options.stepTimeoutMs,
        );
      } catch (err) {
        if (err instanceof TimeoutError) {
          return {
            sessionId: context.sessionId,
            state: AgentState.Failed,
            output: lastResponse?.content ?? "",
            errorMessage: `Step ${step} exceeded the configured timeout of ${this.options.stepTimeoutMs}ms.`,
          };
        }
        throw err;
      }

      lastResponse = response;
      const toolCalls = response.toolCalls ?? [];
      if (toolCalls.length === 0) {
        await services.audit.write({
          timestamp: new Date(),
          sessionId: context.sessionId,
          kind: AuditEventKind.StepCompleted,
          message: `react: step ${step} produced final answer`,
          properties: {},
        });
        return {
          sessionId: context.sessionId,
          state: AgentState.Completed,
          output: response.content,
          validationPassed: true,
        };
      }

      for (const toolCall of toolCalls) {
        if (!this.allowedTools.has(toolCall.toolName)) {
          await services.audit.write({
            timestamp: new Date(),
            sessionId: context.sessionId,
            kind: AuditEventKind.ToolCallRejected,
            message: `react: tool '${toolCall.toolName}' is not allowed in this session`,
            properties: {},
          });
          continue;
        }
        const decision = services.policy.evaluateToolCall(context.task, toolCall.toolName);
        if (!decision.allowed) {
          await services.audit.write({
            timestamp: new Date(),
            sessionId: context.sessionId,
            kind: AuditEventKind.ToolCallRejected,
            message: decision.reason ?? "Tool call rejected by policy.",
            properties: {},
          });
          continue;
        }

        await services.audit.write({
          timestamp: new Date(),
          sessionId: context.sessionId,
          kind: AuditEventKind.ToolCallApproved,
          message: `react: invoking tool '${toolCall.toolName}'`,
          properties: {},
        });

        const result = await services.tools.invoke(toolCall);

        await services.audit.write({
          timestamp: new Date(),
          sessionId: context.sessionId,
          kind: AuditEventKind.ToolResultReceived,
          message: `react: tool '${toolCall.toolName}' returned (success=${result.success})`,
          properties: {},
        });

        const fragment = result.success
          ? (result.output ?? "")
          : `error: ${result.error ?? ""}`;
        transcript = `${transcript}\n[tool ${toolCall.toolName}] ${fragment}`;
      }

      await services.audit.write({
        timestamp: new Date(),
        sessionId: context.sessionId,
        kind: AuditEventKind.StepCompleted,
        message: `react: step ${step} completed`,
        properties: {},
      });
    }

    return {
      sessionId: context.sessionId,
      state: AgentState.Failed,
      output: lastResponse?.content ?? "",
      errorMessage: `Bounded ReAct exhausted ${this.options.maxSteps} step(s) without a final answer.`,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms.`);
    this.name = "TimeoutError";
  }
}
