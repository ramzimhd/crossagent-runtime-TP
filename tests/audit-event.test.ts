import { describe, expect, it } from "vitest";

import type { AgentTask } from "../src/abstractions/agents.js";
import { AuditEventKind } from "../src/abstractions/audit.js";
import { AgentRuntime } from "../src/core/index.js";
import { NoToolPattern } from "../src/patterns/index.js";
import { InMemoryAuditSink } from "../src/testing/index.js";
import { echoAdapter } from "./fixtures.js";

describe("Audit events", () => {
  it("runtime emits canonical audit events", async () => {
    const sink = new InMemoryAuditSink();
    const runtime = new AgentRuntime({ auditSink: sink });
    runtime.registerModel(echoAdapter()).registerPattern(new NoToolPattern());

    const task: AgentTask = {
      taskId: "audit",
      input: "hi",
      requiresValidation: false,
    };
    const result = await runtime.run(task, "echo");

    expect(result.success).toBe(true);

    const kinds = sink.events.map((e) => e.kind);
    expect(kinds).toContain(AuditEventKind.SessionStarted);
    expect(kinds).toContain(AuditEventKind.TaskReceived);
    expect(kinds).toContain(AuditEventKind.ModelSelected);
    expect(kinds).toContain(AuditEventKind.PatternSelected);
    expect(kinds).toContain(AuditEventKind.SessionCompleted);

    expect(result.runtimeAuditEvents.length).toBeGreaterThan(0);
    for (const evt of result.runtimeAuditEvents) {
      expect(evt.sessionId).toBe(result.sessionId);
    }
  });
});
