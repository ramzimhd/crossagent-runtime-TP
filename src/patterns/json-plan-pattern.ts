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

export class JsonPlanPattern implements IAgentPattern {
  readonly descriptor: PatternDescriptor = {
    patternId: KnownPatternIds.JsonPlan,
    name: "JSON plan",
    requiresJsonMode: true,
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
      message: "json-plan: requesting structured plan",
      properties: {},
    });

    const response = await services.model.complete({
      prompt: `Produce a JSON object with a 'steps' array describing how to address the task. Do not include any prose.\n\nTask:\n${context.task.input}`,
      jsonMode: true,
    });

    await services.audit.write({
      timestamp: new Date(),
      sessionId: context.sessionId,
      kind: AuditEventKind.StepCompleted,
      message: "json-plan: response received",
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
