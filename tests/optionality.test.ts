import { describe, expect, it } from "vitest";

import type { AgentTask } from "../src/abstractions/agents.js";
import { AgentRuntime, KnownPatternIds } from "../src/core/index.js";
import {
  ContextCompressor,
  MemoryRanker,
  MemoryRetriever,
  SlidingMemoryBuffer,
} from "../src/memory/index.js";
import { NoToolPattern } from "../src/patterns/index.js";
import { FakeMemoryProvider, InMemoryAuditSink } from "../src/testing/index.js";
import { echoAdapter } from "./fixtures.js";

describe("Optionality", () => {
  it("runs a task without tooling", async () => {
    const runtime = new AgentRuntime({ auditSink: new InMemoryAuditSink() });
    runtime.registerModel(echoAdapter()).registerPattern(new NoToolPattern());

    const task: AgentTask = {
      taskId: "no-tools",
      input: "hello",
      requiresValidation: false,
    };
    const result = await runtime.run(task, "echo");

    expect(result.success).toBe(true);
    expect(runtime.tools).toBeUndefined();
    expect(result.selectedPatternId).toBe(KnownPatternIds.NoTool);
    expect(result.agent?.output).toBe("hello");
  });

  it("runs a task without memory", async () => {
    const runtime = new AgentRuntime({ auditSink: new InMemoryAuditSink() });
    runtime.registerModel(echoAdapter()).registerPattern(new NoToolPattern());

    const task: AgentTask = {
      taskId: "no-memory",
      input: "ping",
      requiresValidation: false,
    };
    const result = await runtime.run(task, "echo");

    expect(result.success).toBe(true);
    expect(runtime.memory).toBeUndefined();
    expect(result.agent?.output).toBe("ping");
  });

  it("memory layer components are drop-in replaceable", () => {
    const provider = new FakeMemoryProvider();
    const retriever = new MemoryRetriever(provider);
    const ranker = new MemoryRanker();
    const compressor = new ContextCompressor(64);
    const buffer = new SlidingMemoryBuffer<string>(4);

    expect(retriever).toBeTruthy();
    expect(ranker).toBeTruthy();
    expect(compressor).toBeTruthy();
    expect(buffer).toBeTruthy();
  });
});
