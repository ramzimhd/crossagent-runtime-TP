import type { AgentTask } from "../abstractions/agents.js";
import { AgentTaskType } from "../abstractions/agents.js";
import type { ModelProfile } from "../abstractions/models.js";
import type { PatternDescriptor } from "../abstractions/patterns.js";
import { PatternRiskLevel } from "../abstractions/patterns.js";
import type { AgentPolicy, IPolicyEngine } from "../abstractions/policy.js";
import { PolicyDecision, defaultAgentPolicy } from "../abstractions/policy.js";
import { KnownPatternIds } from "./known-pattern-ids.js";

export class RuntimePolicyEngine implements IPolicyEngine {
  private readonly _policy: Required<
    Pick<AgentPolicy, "maxSteps" | "requireAudit" | "requireValidation" | "allowMemory" | "allowTools">
  > &
    AgentPolicy;

  constructor(policy: AgentPolicy) {
    if (!policy) {
      throw new Error("policy must not be null");
    }
    const merged = { ...defaultAgentPolicy(), ...policy };
    if (merged.maxSteps <= 0) {
      throw new Error("AgentPolicy.maxSteps must be greater than zero.");
    }
    this._policy = merged;
  }

  get policy(): AgentPolicy {
    return this._policy;
  }

  evaluatePatternSelection(
    task: AgentTask,
    pattern: PatternDescriptor,
    model: ModelProfile,
  ): PolicyDecision {
    if (!task) throw new Error("task must not be null");
    if (!pattern) throw new Error("pattern must not be null");
    if (!model) throw new Error("model must not be null");

    if (pattern.riskLevel === PatternRiskLevel.Unbounded) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' is unbounded; rejected by runtime.`,
      );
    }
    if (pattern.isBounded && (pattern.maxSteps ?? 0) <= 0) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' is marked bounded but has no maxSteps.`,
      );
    }

    const allowed = this._policy.allowedPatterns;
    if (allowed && allowed.size > 0 && !allowed.has(pattern.patternId)) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' is not in the allowed pattern list.`,
      );
    }

    const forbidden = this._policy.forbiddenPatterns;
    if (forbidden && forbidden.has(pattern.patternId)) {
      return PolicyDecision.deny(`Pattern '${pattern.patternId}' is forbidden by policy.`);
    }

    const taskAllowed = task.allowedPatternIds;
    if (taskAllowed && taskAllowed.size > 0 && !taskAllowed.has(pattern.patternId)) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' is not in the task's allowed pattern list.`,
      );
    }

    const taskForbidden = task.forbiddenPatternIds;
    if (taskForbidden && taskForbidden.has(pattern.patternId)) {
      return PolicyDecision.deny(`Pattern '${pattern.patternId}' is forbidden by the task.`);
    }

    if (pattern.requiresTools && !this._policy.allowTools) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' requires tools but policy disables tools.`,
      );
    }
    if (pattern.requiresMemory && !this._policy.allowMemory) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' requires memory but policy disables memory.`,
      );
    }
    if (
      pattern.requiresNativeToolCalling &&
      !model.capabilities.supportsNativeToolCalling
    ) {
      return PolicyDecision.deny(
        `Model '${model.profileId}' does not support native tool calling required by '${pattern.patternId}'.`,
      );
    }
    if (
      pattern.requiresJsonMode &&
      !(model.capabilities.supportsJsonMode || model.capabilities.supportsJsonSchema)
    ) {
      return PolicyDecision.deny(
        `Model '${model.profileId}' does not support JSON mode required by '${pattern.patternId}'.`,
      );
    }

    const requiresValidation = task.requiresValidation ?? true;
    if (
      this._policy.requireValidation &&
      requiresValidation &&
      pattern.patternId === KnownPatternIds.NoTool &&
      task.type === AgentTaskType.Validate
    ) {
      return PolicyDecision.deny(
        `Task '${task.taskId}' requires validation but pattern '${pattern.patternId}' does not provide a validation phase.`,
      );
    }

    if (task.maxSteps !== undefined && pattern.isBounded && (pattern.maxSteps ?? 0) > task.maxSteps) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' maxSteps (${pattern.maxSteps}) exceeds task maxSteps (${task.maxSteps}).`,
      );
    }
    if (pattern.isBounded && (pattern.maxSteps ?? 0) > this._policy.maxSteps) {
      return PolicyDecision.deny(
        `Pattern '${pattern.patternId}' maxSteps (${pattern.maxSteps}) exceeds policy maxSteps (${this._policy.maxSteps}).`,
      );
    }

    return PolicyDecision.allow();
  }

  evaluateToolCall(task: AgentTask, toolName: string): PolicyDecision {
    if (!task) throw new Error("task must not be null");
    if (!toolName || !toolName.trim()) {
      return PolicyDecision.deny("Tool name was empty.");
    }
    if (!this._policy.allowTools) {
      return PolicyDecision.deny("Tool calling is disabled by policy.");
    }

    const allowed = this._policy.allowedTools;
    if (allowed && allowed.size > 0 && !allowed.has(toolName)) {
      return PolicyDecision.deny(`Tool '${toolName}' is not in the allowed tool list.`);
    }
    const forbidden = this._policy.forbiddenTools;
    if (forbidden && forbidden.has(toolName)) {
      return PolicyDecision.deny(`Tool '${toolName}' is forbidden by policy.`);
    }
    return PolicyDecision.allow();
  }
}
