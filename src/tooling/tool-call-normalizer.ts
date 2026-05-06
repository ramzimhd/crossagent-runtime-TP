import { randomUUID } from "node:crypto";

import type { ToolCall } from "../abstractions/tools.js";

export class ToolCallNormalizer {
  normalize(call: ToolCall): ToolCall {
    if (!call) throw new Error("call must not be null");

    const name = (call.toolName ?? "").trim();
    let callId = (call.callId ?? "").trim();
    if (!callId) {
      callId = randomUUID().replace(/-/g, "");
    }
    let args = (call.argumentsJson ?? "").trim();
    if (!args) args = "{}";

    try {
      args = JSON.stringify(JSON.parse(args));
    } catch {
      // pass through; ToolValidator will surface the parse error.
    }

    return { callId, toolName: name, argumentsJson: args };
  }
}
