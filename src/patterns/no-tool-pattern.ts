import type { AgentContext, AgentResult } from "../abstractions/agents.js";
import { AgentState } from "../abstractions/agents.js";
import { AuditEventKind } from "../abstractions/audit.js";
import type {
  IAgentPattern,
  IPatternServices,
  PatternDescriptor,
} from "../abstractions/patterns.js";
import { PatternRiskLevel } from "../abstractions/patterns.js";
import { KnownPatternIds } from "../core/known-pattern-ids.js";

export class NoToolPattern implements IAgentPattern {
  readonly descriptor: PatternDescriptor = {
    patternId: KnownPatternIds.NoTool,
    name: "No-tool single call",
    isBounded: true,
    maxSteps: 1,
    riskLevel: PatternRiskLevel.Low,
  };

  async execute(
    context: AgentContext,
    services: IPatternServices,
  ): Promise<AgentResult> {
    if (!context) throw new Error("context must not be null");
    if (!services) throw new Error("services must not be null");

    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: AuditEventKind.StepStarted,
      message: "no-tool: single call",
      properties: {},
    });

    const response = await services.model.complete({ prompt: context.task.input });

    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: AuditEventKind.StepCompleted,
      message: "no-tool: single call completed",
      properties: {},
    });

    return {
      sessionId: context.sessionId,
      state: AgentState.Completed,
      output: response.content,
      validationPassed: true,
    };
  }
}
