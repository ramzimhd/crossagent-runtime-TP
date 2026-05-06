import { describe, expect, it } from "vitest";

import {
  AgentState,
  type AgentTask,
} from "../src/abstractions/agents.js";
import { NoToolPattern, PlanExecuteValidatePattern } from "../src/patterns/index.js";
import { PatternTestHarness } from "../src/testing/index.js";
import { echoAdapter, scriptedAdapter } from "./fixtures.js";

describe("Pattern execution", () => {
  it("NoToolPattern produces deterministic output", async () => {
    const harness = new PatternTestHarness(echoAdapter());
    harness.policy = { requireValidation: false };
    const task: AgentTask = {
      taskId: "no-tool",
      input: "ECHO ME",
      requiresValidation: false,
    };

    const result = await harness.run(new NoToolPattern(), task);

    expect(result.state).toBe(AgentState.Completed);
    expect(result.output).toBe("ECHO ME");
  });

  it("PlanExecuteValidate runs three phases and reports validation", async () => {
    const adapter = scriptedAdapter(
      "scripted",
      "step 1; step 2; step 3",
      "the answer is 42",
      "PASS - looks complete",
    );
    const harness = new PatternTestHarness(adapter);
    const task: AgentTask = {
      taskId: "pev",
      input: "Compute the answer.",
      requiresValidation: true,
    };

    const result = await harness.run(new PlanExecuteValidatePattern(), task);

    expect(result.state).toBe(AgentState.Completed);
    expect(result.output).toBe("the answer is 42");
    expect(result.validationPassed).toBe(true);
    expect(adapter.calls).toHaveLength(3);
  });

  it("PlanExecuteValidate flags validation failure when validator reports FAIL", async () => {
    const adapter = scriptedAdapter("scripted", "plan", "answer", "FAIL - missing detail");
    const harness = new PatternTestHarness(adapter);
    const task: AgentTask = {
      taskId: "pev-fail",
      input: "Compute.",
      requiresValidation: true,
    };

    const result = await harness.run(new PlanExecuteValidatePattern(), task);

    expect(result.state).toBe(AgentState.Completed);
    expect(result.validationPassed).toBe(false);
  });
});
