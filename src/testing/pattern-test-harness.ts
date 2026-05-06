import { randomUUID } from "node:crypto";

import type {
  AgentContext,
  AgentResult,
  AgentTask,
} from "../abstractions/agents.js";
import type { IMemoryProvider } from "../abstractions/memory.js";
import type { IModelAdapter } from "../abstractions/models.js";
import type { IAgentPattern } from "../abstractions/patterns.js";
import type { AgentPolicy } from "../abstractions/policy.js";
import type { IToolInvoker } from "../abstractions/tools.js";
import { PatternServices } from "../core/pattern-services.js";
import { RuntimePolicyEngine } from "../core/runtime-policy-engine.js";
import { InMemoryAuditSink } from "./in-memory-audit-sink.js";

export class PatternTestHarness {
  readonly model: IModelAdapter;
  tools: IToolInvoker | null = null;
  memory: IMemoryProvider | null = null;
  readonly audit = new InMemoryAuditSink();
  policy: AgentPolicy = {};

  constructor(model: IModelAdapter) {
    if (!model) throw new Error("model must not be null");
    this.model = model;
  }

  async run(pattern: IAgentPattern, task: AgentTask): Promise<AgentResult> {
    if (!pattern) throw new Error("pattern must not be null");
    if (!task) throw new Error("task must not be null");

    const policyEngine = new RuntimePolicyEngine(this.policy);
    const sessionId = randomUUID().replace(/-/g, "");
    const context: AgentContext = {
      sessionId,
      task,
      model: this.model.profile,
    };
    const services = new PatternServices(
      sessionId,
      this.model,
      this.audit,
      policyEngine,
      this.policy,
      this.tools,
      this.memory,
    );
    return pattern.execute(context, services);
  }
}
