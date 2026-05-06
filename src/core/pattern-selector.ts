import type { AgentTask } from "../abstractions/agents.js";
import { AgentTaskType } from "../abstractions/agents.js";
import type { ModelProfile } from "../abstractions/models.js";
import type {
  IAgentPattern,
  PatternDescriptor,
  PatternRequirement,
} from "../abstractions/patterns.js";
import { PatternRiskLevel } from "../abstractions/patterns.js";
import type { IPolicyEngine } from "../abstractions/policy.js";
import { KnownPatternIds } from "./known-pattern-ids.js";

export interface PatternSelectionResult {
  readonly hasSelection: boolean;
  readonly pattern?: IAgentPattern;
  readonly requirement?: PatternRequirement;
  readonly rejections: ReadonlyArray<string>;
  readonly reason?: string;
}

export class PatternSelector {
  constructor(private readonly policy: IPolicyEngine) {
    if (!policy) throw new Error("policy must not be null");
  }

  static deriveRequirements(task: AgentTask, model: ModelProfile): PatternRequirement {
    if (!task) throw new Error("task must not be null");
    if (!model) throw new Error("model must not be null");
    return {
      needsTools: task.requiresTools ?? false,
      needsMemory: task.requiresMemory ?? false,
      needsValidation: task.requiresValidation ?? true,
      needsJsonMode:
        task.type === AgentTaskType.Plan ||
        task.type === AgentTaskType.Extract ||
        task.type === AgentTaskType.Decision,
      needsMultiAgent: false,
    };
  }

  select(
    task: AgentTask,
    model: ModelProfile,
    patterns: ReadonlyArray<IAgentPattern>,
    preferredPatternId?: string,
  ): PatternSelectionResult {
    if (!task) throw new Error("task must not be null");
    if (!model) throw new Error("model must not be null");
    if (!patterns) throw new Error("patterns must not be null");

    if (patterns.length === 0) {
      return { hasSelection: false, rejections: [], reason: "No patterns are registered." };
    }

    const requirement = PatternSelector.deriveRequirements(task, model);
    const rejections: string[] = [];
    const candidates: Array<[IAgentPattern, number]> = [];

    for (const pattern of patterns) {
      const sat = PatternSelector.satisfies(pattern.descriptor, requirement);
      if (!sat.ok) {
        rejections.push(`${pattern.descriptor.patternId}: ${sat.error}`);
        continue;
      }
      const decision = this.policy.evaluatePatternSelection(task, pattern.descriptor, model);
      if (!decision.allowed) {
        rejections.push(`${pattern.descriptor.patternId}: ${decision.reason}`);
        continue;
      }
      candidates.push([pattern, PatternSelector.score(pattern.descriptor, requirement, model)]);
    }

    if (candidates.length === 0) {
      return { hasSelection: false, rejections, reason: rejections.join("; ") };
    }

    if (preferredPatternId) {
      for (const [pattern] of candidates) {
        if (pattern.descriptor.patternId === preferredPatternId) {
          return { hasSelection: true, pattern, requirement, rejections };
        }
      }
    }

    candidates.sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      const ra = a[0].descriptor.riskLevel ?? PatternRiskLevel.Low;
      const rb = b[0].descriptor.riskLevel ?? PatternRiskLevel.Low;
      if (ra !== rb) return ra - rb;
      return a[0].descriptor.patternId < b[0].descriptor.patternId
        ? -1
        : a[0].descriptor.patternId > b[0].descriptor.patternId
          ? 1
          : 0;
    });
    const winner = candidates[0]![0];
    return { hasSelection: true, pattern: winner, requirement, rejections };
  }

  private static satisfies(
    descriptor: PatternDescriptor,
    requirement: PatternRequirement,
  ): { ok: true; error: "" } | { ok: false; error: string } {
    if (
      requirement.needsTools &&
      !descriptor.requiresTools &&
      !descriptor.requiresNativeToolCalling
    ) {
      return { ok: false, error: "task requires tools but pattern does not use them" };
    }
    if (requirement.needsMemory && !descriptor.requiresMemory) {
      return {
        ok: false,
        error: "task requires memory but pattern does not consume an active context",
      };
    }
    if (requirement.needsMultiAgent && !descriptor.supportsMultiAgent) {
      return {
        ok: false,
        error: "task requires multi-agent execution but pattern is single-agent",
      };
    }
    return { ok: true, error: "" };
  }

  private static score(
    descriptor: PatternDescriptor,
    requirement: PatternRequirement,
    model: ModelProfile,
  ): number {
    let score = 0;
    if (descriptor.isBounded) score += 4;
    const risk = descriptor.riskLevel ?? PatternRiskLevel.Low;
    if (risk === PatternRiskLevel.Low) score += 3;
    else if (risk === PatternRiskLevel.Medium) score += 1;

    if (
      requirement.needsValidation &&
      descriptor.patternId === KnownPatternIds.PlanExecuteValidate
    ) {
      score += 5;
    }
    if (requirement.needsJsonMode && descriptor.requiresJsonMode) {
      score += 2;
    }
    if (
      descriptor.requiresNativeToolCalling &&
      model.capabilities.supportsNativeToolCalling
    ) {
      score += 1;
    }
    if (
      !requirement.needsTools &&
      !descriptor.requiresTools &&
      !descriptor.requiresNativeToolCalling
    ) {
      score += 2;
    }
    return score;
  }
}
