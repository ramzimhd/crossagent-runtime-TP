import { describe, expect, it } from "vitest";

import { AgentRuntime } from "../src/core/agent-runtime.js";
import { NoToolPattern } from "../src/patterns/no-tool-pattern.js";
import { echoAdapter } from "./fixtures.js";

describe("AgentRuntime registration", () => {
  it("registerModel adds a model to the registry", () => {
    const runtime = new AgentRuntime();
    const adapter = echoAdapter("model-a");

    runtime.registerModel(adapter);

    expect(runtime.models.has("model-a")).toBe(true);
    expect(runtime.models.get("model-a")).toBe(adapter);
  });

  it("registerModel rejects duplicate profile id", () => {
    const runtime = new AgentRuntime();
    runtime.registerModel(echoAdapter("dup"));

    expect(() => runtime.registerModel(echoAdapter("dup"))).toThrow();
  });

  it("registerPattern adds a pattern to the registry", () => {
    const runtime = new AgentRuntime();
    const pattern = new NoToolPattern();

    runtime.registerPattern(pattern);

    expect(runtime.patterns).toHaveLength(1);
    expect(runtime.patterns[0]).toBe(pattern);
  });
});
