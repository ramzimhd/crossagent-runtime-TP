import { describe, expect, it } from "vitest";

import { AgentTaskType, type AgentTask } from "../src/abstractions/agents.js";
import {
  KnownPatternIds,
  PatternSelector,
  RuntimePolicyEngine,
} from "../src/core/index.js";
import {
  JsonPlanPattern,
  NoToolPattern,
  PlanExecuteValidatePattern,
} from "../src/patterns/index.js";
import { echoProfile } from "./fixtures.js";

describe("PatternSelector", () => {
  it("prefers NoToolPattern when validation is not required", () => {
    const policy = new RuntimePolicyEngine({ requireValidation: false });
    const selector = new PatternSelector(policy);
    const patterns = [new PlanExecuteValidatePattern(), new NoToolPattern()];
    const task: AgentTask = {
      taskId: "t-1",
      input: "answer",
      requiresValidation: false,
    };

    const result = selector.select(task, echoProfile(), patterns);

    expect(result.hasSelection).toBe(true);
    expect(result.pattern?.descriptor.patternId).toBe(KnownPatternIds.NoTool);
  });

  it("prefers PlanExecuteValidate when validation is required", () => {
    const policy = new RuntimePolicyEngine({});
    const selector = new PatternSelector(policy);
    const patterns = [new NoToolPattern(), new PlanExecuteValidatePattern()];
    const task: AgentTask = {
      taskId: "t-2",
      input: "validate this",
      requiresValidation: true,
    };

    const result = selector.select(task, echoProfile(), patterns);

    expect(result.hasSelection).toBe(true);
    expect(result.pattern?.descriptor.patternId).toBe(
      KnownPatternIds.PlanExecuteValidate,
    );
  });

  it("respects task allow list", () => {
    const policy = new RuntimePolicyEngine({});
    const selector = new PatternSelector(policy);
    const patterns = [new NoToolPattern(), new PlanExecuteValidatePattern()];
    const task: AgentTask = {
      taskId: "t-3",
      input: "x",
      requiresValidation: true,
      allowedPatternIds: new Set([KnownPatternIds.NoTool]),
    };

    const result = selector.select(task, echoProfile(), patterns);

    expect(result.hasSelection).toBe(true);
    expect(result.pattern?.descriptor.patternId).toBe(KnownPatternIds.NoTool);
  });

  it("filters by model capabilities", () => {
    const policy = new RuntimePolicyEngine({ requireValidation: false });
    const selector = new PatternSelector(policy);
    const patterns = [new NoToolPattern(), new JsonPlanPattern()];
    const task: AgentTask = {
      taskId: "t-4",
      input: "x",
      requiresValidation: false,
    };

    const profileWithoutJson = echoProfile("noj", false, false);
    const resultWithoutJson = selector.select(task, profileWithoutJson, patterns);
    expect(resultWithoutJson.hasSelection).toBe(true);
    expect(resultWithoutJson.pattern?.descriptor.patternId).toBe(KnownPatternIds.NoTool);

    const profileWithJson = echoProfile("withj", false, true);
    const planTask: AgentTask = {
      taskId: "t-4-plan",
      input: "plan",
      type: AgentTaskType.Plan,
      requiresValidation: false,
    };
    const planResult = selector.select(planTask, profileWithJson, patterns);
    expect(planResult.hasSelection).toBe(true);
    expect(planResult.pattern?.descriptor.patternId).toBe(KnownPatternIds.JsonPlan);
  });
});
