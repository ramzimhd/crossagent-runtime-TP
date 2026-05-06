import type { AgentResult, AgentTask } from "../abstractions/agents.js";
import { AgentState } from "../abstractions/agents.js";
import type { IModelAdapter } from "../abstractions/models.js";
import type { IAgentPattern } from "../abstractions/patterns.js";
import type { AgentPolicy, IPolicyEngine } from "../abstractions/policy.js";
import type { AgentRuntime } from "./agent-runtime.js";
import type { AuditPipeline } from "./audit-pipeline.js";
import { PatternServices } from "./pattern-services.js";

export class AgentSession {
  constructor(
    private readonly owner: AgentRuntime,
    public readonly sessionId: string,
    private readonly task: AgentTask,
    private readonly model: IModelAdapter,
    private readonly pattern: IAgentPattern,
    private readonly policy: IPolicyEngine,
    private readonly effectivePolicy: AgentPolicy,
    private readonly audit: AuditPipeline,
  ) {}

  async run(): Promise<AgentResult> {
    const context = {
      sessionId: this.sessionId,
      task: this.task,
      model: this.model.profile,
    };
    const services = new PatternServices(
      this.sessionId,
      this.model,
      this.audit.asSink(),
      this.policy,
      this.effectivePolicy,
      this.owner.tools ?? null,
      this.owner.memory ?? null,
    );
    try {
      return await this.pattern.execute(context, services);
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return {
        sessionId: this.sessionId,
        state: AgentState.Failed,
        validationPassed: false,
        errorMessage: message,
      };
    }
  }
}
