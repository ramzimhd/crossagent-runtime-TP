import type { IAuditSink } from "../abstractions/audit.js";
import type { IMemoryProvider } from "../abstractions/memory.js";
import type { IModelAdapter } from "../abstractions/models.js";
import type { IPatternServices } from "../abstractions/patterns.js";
import type { AgentPolicy, IPolicyEngine } from "../abstractions/policy.js";
import type { IToolInvoker } from "../abstractions/tools.js";

export class PatternServices implements IPatternServices {
  readonly sessionId: string;
  readonly model: IModelAdapter;
  readonly tools: IToolInvoker | null;
  readonly memory: IMemoryProvider | null;
  readonly audit: IAuditSink;
  readonly policy: IPolicyEngine;
  readonly effectivePolicy: AgentPolicy;

  constructor(
    sessionId: string,
    model: IModelAdapter,
    audit: IAuditSink,
    policy: IPolicyEngine,
    effectivePolicy: AgentPolicy,
    tools: IToolInvoker | null,
    memory: IMemoryProvider | null,
  ) {
    if (!sessionId) throw new Error("sessionId must not be empty");
    if (!model) throw new Error("model must not be null");
    if (!audit) throw new Error("audit must not be null");
    if (!policy) throw new Error("policy must not be null");
    if (!effectivePolicy) throw new Error("effectivePolicy must not be null");
    this.sessionId = sessionId;
    this.model = model;
    this.audit = audit;
    this.policy = policy;
    this.effectivePolicy = effectivePolicy;
    this.tools = (effectivePolicy.allowTools ?? true) ? tools : null;
    this.memory = (effectivePolicy.allowMemory ?? true) ? memory : null;
  }
}
