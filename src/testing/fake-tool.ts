import type {
  ITool,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from "../abstractions/tools.js";

export type Handler = (call: ToolCall) => ToolResult;

export class FakeTool implements ITool {
  readonly definition: ToolDefinition;
  private readonly handler: Handler;

  constructor(
    name: string,
    description: string,
    parametersJsonSchema: string,
    handler?: Handler,
  ) {
    this.definition = { name, description, parametersJsonSchema };
    this.handler = handler ?? FakeTool.defaultHandler;
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    if (!call) throw new Error("call must not be null");
    return this.handler(call);
  }

  private static defaultHandler(call: ToolCall): ToolResult {
    return {
      callId: call.callId,
      toolName: call.toolName,
      success: true,
      output: call.argumentsJson,
    };
  }
}
