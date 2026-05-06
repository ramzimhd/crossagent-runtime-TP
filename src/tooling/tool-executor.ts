import type { ITool, ToolCall, ToolResult } from "../abstractions/tools.js";

export class ToolExecutor {
  async execute(tool: ITool, call: ToolCall): Promise<ToolResult> {
    if (!tool) throw new Error("tool must not be null");
    if (!call) throw new Error("call must not be null");
    try {
      return await tool.invoke(call);
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return {
        callId: call.callId,
        toolName: call.toolName,
        success: false,
        output: "",
        error: message,
      };
    }
  }
}
