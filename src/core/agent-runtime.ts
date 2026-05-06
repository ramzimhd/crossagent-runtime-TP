import type { AgentTask } from "../abstractions/agents.js";
import { AgentState, AgentTaskType } from "../abstractions/agents.js";
import { AuditEventKind } from "../abstractions/audit.js";
import type { IMemoryProvider } from "../abstractions/memory.js";
import type { IModelAdapter } from "../abstractions/models.js";
import type {
  IAgentPattern,
  PatternDescriptor,
} from "../abstractions/patterns.js";
import { PatternRiskLevel } from "../abstractions/patterns.js";
import type { AgentPolicy, IPolicyEngine } from "../abstractions/policy.js";
import type { IToolInvoker } from "../abstractions/tools.js";
import { AgentSession } from "./agent-session.js";
import { AuditPipeline } from "./audit-pipeline.js";
import { NullAuditSink } from "./null-audit-sink.js";
import { PatternSelector } from "./pattern-selector.js";
import { RuntimeErrorCode } from "./runtime-error.js";
import {
  defaultSessionId,
  defaultTimestamp,
  type RuntimeOptions,
} from "./runtime-options.js";
import { RuntimePolicyEngine } from "./runtime-policy-engine.js";
import type { RuntimeResult } from "./runtime-result.js";

const TASK_TYPE_NAMES: Record<AgentTaskType, string> = {
  [AgentTaskType.Generic]: "generic",
  [AgentTaskType.Question]: "question",
  [AgentTaskType.Plan]: "plan",
  [AgentTaskType.Extract]: "extract",
  [AgentTaskType.Validate]: "validate",
  [AgentTaskType.Transform]: "transform",
  [AgentTaskType.Decision]: "decision",
};

export class AgentRuntime {
  private readonly _models = new Map<string, IModelAdapter>();
  private readonly _patterns: IAgentPattern[] = [];
  private readonly _policy: RuntimePolicyEngine;
  private readonly _selector: PatternSelector;
  private readonly _options: RuntimeOptions & {
    auditSink: NonNullable<RuntimeOptions["auditSink"]>;
    timestampFactory: () => Date;
    sessionIdFactory: () => string;
    defaultPolicy: AgentPolicy;
  };

  constructor(options: RuntimeOptions = {}) {
    this._options = {
      ...options,
      defaultPolicy: options.defaultPolicy ?? {},
      auditSink: options.auditSink ?? NullAuditSink.instance(),
      timestampFactory: options.timestampFactory ?? defaultTimestamp,
      sessionIdFactory: options.sessionIdFactory ?? defaultSessionId,
    };
    this._policy = new RuntimePolicyEngine(this._options.defaultPolicy);
    this._selector = new PatternSelector(this._policy);
  }

  get policy(): IPolicyEngine {
    return this._policy;
  }

  get tools(): IToolInvoker | undefined {
    return this._options.tools;
  }

  get memory(): IMemoryProvider | undefined {
    return this._options.memory;
  }

  get models(): ReadonlyMap<string, IModelAdapter> {
    return this._models;
  }

  get patterns(): ReadonlyArray<IAgentPattern> {
    return this._patterns;
  }

  registerModel(adapter: IModelAdapter): this {
    if (!adapter) throw new Error("adapter must not be null");
    if (!adapter.profile.profileId || !adapter.profile.profileId.trim()) {
      throw new Error("ModelAdapter.profile.profileId must be non-empty.");
    }
    if (this._models.has(adapter.profile.profileId)) {
      throw new Error(
        `A model with id '${adapter.profile.profileId}' is already registered.`,
      );
    }
    this._models.set(adapter.profile.profileId, adapter);
    return this;
  }

  registerPattern(pattern: IAgentPattern): this {
    if (!pattern) throw new Error("pattern must not be null");
    AgentRuntime.validatePatternDescriptor(pattern.descriptor);
    this._patterns.push(pattern);
    return this;
  }

  private static validatePatternDescriptor(descriptor: PatternDescriptor): void {
    if (!descriptor) throw new Error("descriptor must not be null");
    if (!descriptor.patternId || !descriptor.patternId.trim()) {
      throw new Error("PatternDescriptor.patternId must be non-empty.");
    }
    if (descriptor.riskLevel === PatternRiskLevel.Unbounded) {
      throw new Error(
        `Unbounded patterns are not permitted. Pattern '${descriptor.patternId}' was registered with riskLevel=Unbounded.`,
      );
    }
    if (descriptor.isBounded && (descriptor.maxSteps ?? 0) <= 0) {
      throw new Error(
        `Bounded pattern '${descriptor.patternId}' must declare maxSteps > 0.`,
      );
    }
  }

  async run(
    task: AgentTask,
    modelProfileId: string,
    taskPolicy?: AgentPolicy,
  ): Promise<RuntimeResult> {
    if (!task) throw new Error("task must not be null");
    if (modelProfileId === undefined || modelProfileId === null) {
      throw new Error("modelProfileId must not be null");
    }

    const sessionId = this._options.sessionIdFactory();
    const pipeline = new AuditPipeline(
      this._options.auditSink,
      this._options.timestampFactory,
      sessionId,
    );

    await pipeline.emit(AuditEventKind.SessionStarted, "Session started.", {
      sessionId,
    });
    const taskTypeName = TASK_TYPE_NAMES[task.type ?? AgentTaskType.Generic];
    await pipeline.emit(
      AuditEventKind.TaskReceived,
      `Task '${task.taskId}' of type '${taskTypeName}'.`,
      { taskId: task.taskId },
    );

    const model = this._models.get(modelProfileId);
    if (!model) {
      const message = `No model is registered with profile id '${modelProfileId}'.`;
      await pipeline.emit(AuditEventKind.SessionFailed, message);
      return {
        sessionId,
        success: false,
        error: { code: RuntimeErrorCode.UnknownModel, message },
        runtimeAuditEvents: pipeline.captured,
      };
    }

    await pipeline.emit(
      AuditEventKind.ModelSelected,
      `Model '${model.profile.profileId}' selected.`,
      { modelId: model.profile.profileId },
    );

    const effectivePolicy = taskPolicy ?? this._options.defaultPolicy;
    const policyEngine: IPolicyEngine =
      effectivePolicy === this._options.defaultPolicy
        ? this._policy
        : new RuntimePolicyEngine(effectivePolicy);
    const selector =
      policyEngine === this._policy ? this._selector : new PatternSelector(policyEngine);

    const selection = selector.select(
      task,
      model.profile,
      this._patterns,
      this._options.preferredPatternId,
    );
    if (!selection.hasSelection || !selection.pattern) {
      await pipeline.emit(
        AuditEventKind.PolicyRejected,
        `No pattern selected. ${selection.reason ?? ""}`.trim(),
      );
      return {
        sessionId,
        success: false,
        error: {
          code: RuntimeErrorCode.NoEligiblePattern,
          message: "No eligible pattern.",
          detail: selection.reason,
        },
        runtimeAuditEvents: pipeline.captured,
        selectedModelId: model.profile.profileId,
      };
    }

    const selected = selection.pattern;
    await pipeline.emit(
      AuditEventKind.PatternSelected,
      `Pattern '${selected.descriptor.patternId}' selected.`,
      { patternId: selected.descriptor.patternId },
    );

    const session = new AgentSession(
      this,
      sessionId,
      task,
      model,
      selected,
      policyEngine,
      effectivePolicy,
      pipeline,
    );
    const agentResult = await session.run();
    const success = agentResult.state === AgentState.Completed;
    await pipeline.emit(
      success ? AuditEventKind.SessionCompleted : AuditEventKind.SessionFailed,
      success
        ? "Session completed."
        : `Session failed: ${agentResult.errorMessage ?? "unknown error"}.`,
      { sessionId },
    );

    return {
      sessionId,
      success,
      agent: agentResult,
      error: success
        ? undefined
        : {
            code: RuntimeErrorCode.ExecutionFailed,
            message:
              agentResult.errorMessage ?? "Pattern reported a non-completed state.",
            detail: AgentState[agentResult.state],
          },
      runtimeAuditEvents: pipeline.captured,
      selectedPatternId: selected.descriptor.patternId,
      selectedModelId: model.profile.profileId,
    };
  }
}
