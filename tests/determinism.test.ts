import { describe, expect, it } from "vitest";

import type { AgentTask } from "../src/abstractions/agents.js";
import { AgentRuntime } from "../src/core/index.js";
import { NoToolPattern } from "../src/patterns/index.js";
import { InMemoryAuditSink } from "../src/testing/index.js";
import { echoAdapter } from "./fixtures.js";

describe("Determinism", () => {
  it("same task produces identical output with the fake adapter", async () => {
    const runtime = new AgentRuntime({ auditSink: new InMemoryAuditSink() });
    runtime.registerModel(echoAdapter()).registerPattern(new NoToolPattern());

    const task: AgentTask = {
      taskId: "det",
      input: "deterministic",
      requiresValidation: false,
    };
    const first = await runtime.run(task, "echo");
    const second = await runtime.run(task, "echo");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(first.agent?.output).toBe(second.agent?.output);
  });
});
