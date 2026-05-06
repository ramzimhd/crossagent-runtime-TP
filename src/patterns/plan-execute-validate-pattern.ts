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
import { ExecutionGraph } from "../core/execution-graph.js";
import { KnownPatternIds } from "../core/known-pattern-ids.js";

export class PlanExecuteValidatePattern implements IAgentPattern {
  readonly descriptor: PatternDescriptor = {
    patternId: KnownPatternIds.PlanExecuteValidate,
    name: "Plan-Execute-Validate",
    isBounded: true,
    maxSteps: 3,
    riskLevel: PatternRiskLevel.Low,
  };

  async execute(
    context: AgentContext,
    services: IPatternServices,
  ): Promise<AgentResult> {
    if (!context) throw new Error("context must not be null");
    if (!services) throw new Error("services must not be null");

    const graph = new ExecutionGraph().addStep("plan").addStep("execute").addStep("validate");

    const planResponse = await this.runStep(
      services,
      context,
      graph.steps[0]!,
      `Produce a short, ordered plan for the following task. Do not solve it yet.\n\nTask:\n${context.task.input}`,
    );
    const executeResponse = await this.runStep(
      services,
      context,
      graph.steps[1]!,
      `Plan:\n${planResponse.content}\n\nUsing the plan above, produce the final answer.\n\nTask:\n${context.task.input}`,
    );
    const validateResponse = await this.runStep(
      services,
      context,
      graph.steps[2]!,
      `Review the answer below for completeness against the task. Reply with the single word 'PASS' or 'FAIL' followed by a one-line reason.\n\nTask:\n${context.task.input}\n\nAnswer:\n${executeResponse.content}`,
    );

    const validationPassed = validateResponse.content.trimStart().toUpperCase().startsWith("PASS");

    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: validationPassed ? AuditEventKind.ValidationPassed : AuditEventKind.ValidationFailed,
      message: validateResponse.content,
      properties: {},
    });

    return {
      sessionId: context.sessionId,
      state: AgentState.Completed,
      output: executeResponse.content,
      validationPassed,
    };
  }

  private async runStep(
    services: IPatternServices,
    context: AgentContext,
    stepName: string,
    prompt: string,
  ): Promise<ModelResponse> {
    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: AuditEventKind.StepStarted,
      message: `plan-execute-validate: ${stepName} started`,
      properties: {},
    });
    const response = await services.model.complete({ prompt });
    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: AuditEventKind.StepCompleted,
      message: `plan-execute-validate: ${stepName} completed`,
      properties: {},
    });
    return response;
  }
}
