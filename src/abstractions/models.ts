import type { ToolCall, ToolDefinition } from "./tools.js";

/** Identifies the broad category of model provider. */
export enum ModelProvider {
  Unknown = 0,
  OpenAI = 1,
  Anthropic = 2,
  Google = 3,
  Mistral = 4,
  AzureOpenAI = 5,
  Bedrock = 6,
  Local = 7,
  Custom = 8,
}

/** Reason an adapter returned, in provider-neutral terms. */
export enum ModelFinishReason {
  Unknown = 0,
  Stop = 1,
  Length = 2,
  ToolCalls = 3,
  ContentFilter = 4,
  Error = 5,
}

/** Declarative capability descriptor for a model. */
export interface ModelCapabilities {
  readonly providerName?: string;
  readonly modelId?: string;
  readonly supportsNativeToolCalling?: boolean;
  readonly supportsJsonMode?: boolean;
  readonly supportsJsonSchema?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsStreaming?: boolean;
  readonly maxContextTokens?: number;
  readonly isLocal?: boolean;
}

/** A registered model description. */
export interface ModelProfile {
  readonly profileId: string;
  readonly displayName: string;
  readonly capabilities: ModelCapabilities;
  readonly provider?: ModelProvider;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Provider-neutral request submitted to an IModelAdapter. */
export interface ModelRequest {
  readonly prompt: string;
  readonly system?: string;
  readonly tools?: ReadonlyArray<ToolDefinition>;
  readonly jsonSchema?: string;
  readonly jsonMode?: boolean;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Provider-neutral response returned from an IModelAdapter. */
export interface ModelResponse {
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<ToolCall>;
  readonly finishReason?: ModelFinishReason;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** A provider-neutral entry point to a single model. */
export interface IModelAdapter {
  readonly profile: ModelProfile;
  complete(request: ModelRequest): Promise<ModelResponse>;
}
