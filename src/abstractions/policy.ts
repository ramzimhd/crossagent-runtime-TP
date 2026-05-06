import type { AgentTask } from "./agents.js";
import type { ModelProfile } from "./models.js";
import type { PatternDescriptor } from "./patterns.js";

/** Result of a policy evaluation. */
export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}

export const PolicyDecision = {
  allow(): PolicyDecision {
    return { allowed: true };
  },
  deny(reason: string): PolicyDecision {
    return { allowed: false, reason };
  },
};

/** Application-supplied constraints that apply to a session. */
export interface AgentPolicy {
  readonly allowedPatterns?: ReadonlySet<string>;
  readonly forbiddenPatterns?: ReadonlySet<string>;
  readonly allowedTools?: ReadonlySet<string>;
  readonly forbiddenTools?: ReadonlySet<string>;
  /** Defaults to 8. */
  readonly maxSteps?: number;
  /** Defaults to true. */
  readonly requireAudit?: boolean;
  /** Defaults to true. */
  readonly requireValidation?: boolean;
  /** Defaults to true. */
  readonly allowMemory?: boolean;
  /** Defaults to true. */
  readonly allowTools?: boolean;
}

export function defaultAgentPolicy(): Required<
  Pick<AgentPolicy, "maxSteps" | "requireAudit" | "requireValidation" | "allowMemory" | "allowTools">
> &
  AgentPolicy {
  return {
    maxSteps: 8,
    requireAudit: true,
    requireValidation: true,
    allowMemory: true,
    allowTools: true,
  };
}

/** Application-replaceable evaluator for policy rules. */
export interface IPolicyEngine {
  readonly policy: AgentPolicy;
  evaluatePatternSelection(
    task: AgentTask,
    pattern: PatternDescriptor,
    model: ModelProfile,
  ): PolicyDecision;
  evaluateToolCall(task: AgentTask, toolName: string): PolicyDecision;
}
