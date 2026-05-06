import type {
  IModelAdapter,
  ModelProfile,
  ModelRequest,
  ModelResponse,
} from "../abstractions/models.js";
import { ModelFinishReason } from "../abstractions/models.js";
import type { ToolCall } from "../abstractions/tools.js";

export type Responder = (request: ModelRequest, callIndex: number) => ModelResponse;

export class FakeModelAdapter implements IModelAdapter {
  private readonly _calls: ModelRequest[] = [];
  private readonly responder: Responder;
  readonly profile: ModelProfile;

  constructor(profile: ModelProfile, responder: Responder);
  constructor(profile: ModelProfile, content: string, toolCalls?: ReadonlyArray<ToolCall>);
  constructor(
    profile: ModelProfile,
    responderOrContent: Responder | string,
    toolCalls?: ReadonlyArray<ToolCall>,
  ) {
    if (!profile) throw new Error("profile must not be null");
    this.profile = profile;
    if (typeof responderOrContent === "string") {
      const content = responderOrContent;
      const calls = toolCalls ?? [];
      this.responder = () => ({
        content,
        toolCalls: calls,
        finishReason: ModelFinishReason.Stop,
      });
    } else {
      this.responder = responderOrContent;
    }
  }

  get calls(): ReadonlyArray<ModelRequest> {
    return this._calls;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (!request) throw new Error("request must not be null");
    this._calls.push(request);
    return this.responder(request, this._calls.length);
  }
}
