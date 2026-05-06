import type {
  ITool,
  IToolInvoker,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from "../abstractions/tools.js";
import { ToolCallNormalizer } from "./tool-call-normalizer.js";
import { ToolExecutor } from "./tool-executor.js";
import { ToolValidator } from "./tool-validator.js";

export class ToolRegistry implements IToolInvoker {
  private readonly _tools = new Map<string, ITool>();
  private readonly validator: ToolValidator;
  private readonly executor: ToolExecutor;
  private readonly normalizer: ToolCallNormalizer;

  constructor(
    validator?: ToolValidator,
    executor?: ToolExecutor,
    normalizer?: ToolCallNormalizer,
  ) {
    this.validator = validator ?? new ToolValidator();
    this.executor = executor ?? new ToolExecutor();
    this.normalizer = normalizer ?? new ToolCallNormalizer();
  }

  get count(): number {
    return this._tools.size;
  }

  register(tool: ITool): this {
    if (!tool) throw new Error("tool must not be null");
    if (!tool.definition.name || !tool.definition.name.trim()) {
      throw new Error("tool.definition.name must be non-empty.");
    }
    if (this._tools.has(tool.definition.name)) {
      throw new Error(`A tool named '${tool.definition.name}' is already registered.`);
    }
    this._tools.set(tool.definition.name, tool);
    return this;
  }

  tryGet(toolName: string): ITool | null {
    if (!toolName || !toolName.trim()) return null;
    return this._tools.get(toolName) ?? null;
  }

  getDefinitions(): ReadonlyArray<ToolDefinition> {
    return Array.from(this._tools.values()).map((t) => t.definition);
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    if (!call) throw new Error("call must not be null");
    const normalized = this.normalizer.normalize(call);
    const tool = this._tools.get(normalized.toolName);
    if (!tool) {
      return {
        callId: normalized.callId,
        toolName: normalized.toolName,
        success: false,
        error: `Unknown tool '${normalized.toolName}'.`,
      };
    }
    const validation = this.validator.validate(tool.definition, normalized);
    if (!validation.isValid) {
      return {
        callId: normalized.callId,
        toolName: normalized.toolName,
        success: false,
        error: validation.reason ?? "Invalid arguments.",
      };
    }
    return this.executor.execute(tool, normalized);
  }
}
