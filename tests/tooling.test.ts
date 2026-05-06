import { describe, expect, it } from "vitest";

import type { ToolCall } from "../src/abstractions/tools.js";
import { FakeTool } from "../src/testing/index.js";
import { ToolRegistry } from "../src/tooling/index.js";

describe("Tooling registry", () => {
  it("rejects unknown tool", async () => {
    const registry = new ToolRegistry();
    const call: ToolCall = {
      callId: "1",
      toolName: "does-not-exist",
      argumentsJson: "{}",
    };

    const result = await registry.invoke(call);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool");
  });

  it("rejects invalid arguments when schema requires properties", async () => {
    const schema = '{"type": "object", "properties": {"n": {"type": "number"}}, "required": ["n"]}';
    const registry = new ToolRegistry();
    registry.register(new FakeTool("add", "Adds 1 to n.", schema));

    const missing = await registry.invoke({
      callId: "1",
      toolName: "add",
      argumentsJson: "{}",
    });
    expect(missing.success).toBe(false);
    expect(missing.error).toContain("Required properties");

    const wrongType = await registry.invoke({
      callId: "2",
      toolName: "add",
      argumentsJson: '{"n": "not-a-number"}',
    });
    expect(wrongType.success).toBe(false);
    expect(wrongType.error).toContain("incompatible types");

    const ok = await registry.invoke({
      callId: "3",
      toolName: "add",
      argumentsJson: '{"n": 5}',
    });
    expect(ok.success).toBe(true);
  });

  it("rejects malformed JSON", async () => {
    const registry = new ToolRegistry();
    registry.register(new FakeTool("noop", "noop", '{"type": "object"}'));

    const result = await registry.invoke({
      callId: "1",
      toolName: "noop",
      argumentsJson: "{ this is not json",
    });

    expect(result.success).toBe(false);
  });
});
