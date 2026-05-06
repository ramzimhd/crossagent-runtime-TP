import {
  ModelFinishReason,
  ModelProvider,
  type ModelProfile,
  type ModelResponse,
} from "../src/abstractions/models.js";
import { FakeModelAdapter } from "../src/testing/fake-model-adapter.js";

export function echoProfile(
  profileId = "echo",
  toolCalling = false,
  jsonMode = false,
): ModelProfile {
  return {
    profileId,
    displayName: profileId,
    provider: ModelProvider.Custom,
    capabilities: {
      providerName: "test",
      modelId: profileId,
      supportsNativeToolCalling: toolCalling,
      supportsJsonMode: jsonMode,
      supportsStreaming: false,
      maxContextTokens: 8192,
      isLocal: true,
    },
  };
}

export function echoAdapter(profileId = "echo"): FakeModelAdapter {
  return new FakeModelAdapter(echoProfile(profileId), (request) => ({
    content: request.prompt,
    finishReason: ModelFinishReason.Stop,
  }));
}

export function scriptedAdapter(profileId: string, ...responses: string[]): FakeModelAdapter {
  return new FakeModelAdapter(echoProfile(profileId), (_, index): ModelResponse => ({
    content: responses[Math.min(index - 1, responses.length - 1)] ?? "",
    finishReason: ModelFinishReason.Stop,
  }));
}
