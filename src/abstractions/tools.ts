/** Public description of a tool a model may invoke. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  /** JSON Schema for the tool's argument object. */
  readonly parametersJsonSchema: string;
}

/** A model's request to invoke a tool. */
export interface ToolCall {
  readonly callId: string;
  readonly toolName: string;
  /** Raw JSON produced by the model. */
  readonly argumentsJson: string;
}

/** The outcome of a tool invocation. */
export interface ToolResult {
  readonly callId: string;
  readonly toolName: string;
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
}

/** Constraints applied to tool usage within a single session. */
export interface ToolPolicy {
  readonly allowedTools?: ReadonlySet<string>;
  readonly forbiddenTools?: ReadonlySet<string>;
  /** Defaults to 16. */
  readonly maxCallsPerSession?: number;
}

/** A single tool that can be exposed to a model. */
export interface ITool {
  readonly definition: ToolDefinition;
  invoke(call: ToolCall): Promise<ToolResult>;
}

/** Abstraction over the tooling layer. */
export interface IToolInvoker {
  tryGet(toolName: string): ITool | null;
  getDefinitions(): ReadonlyArray<ToolDefinition>;
  invoke(call: ToolCall): Promise<ToolResult>;
}
