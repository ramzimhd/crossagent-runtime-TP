import {
  AgentTaskType,
  type AgentTask,
} from "../src/abstractions/agents.js";
import {
  ModelFinishReason,
  ModelProvider,
  type ModelProfile,
  type ModelResponse,
} from "../src/abstractions/models.js";
import { AgentRuntime } from "../src/core/index.js";
import {
  NoToolPattern,
  PlanExecuteValidatePattern,
} from "../src/patterns/index.js";
import { FakeModelAdapter, InMemoryAuditSink } from "../src/testing/index.js";

async function main(): Promise<number> {
  const sink = new InMemoryAuditSink();
  const runtime = new AgentRuntime({ auditSink: sink });

  const profile: ModelProfile = {
    profileId: "demo-echo",
    displayName: "Demo echo model",
    provider: ModelProvider.Custom,
    capabilities: {
      providerName: "demo",
      modelId: "echo",
      supportsStreaming: false,
      maxContextTokens: 8192,
      isLocal: true,
    },
  };

  const adapter = new FakeModelAdapter(profile, (_request, callIndex): ModelResponse => {
    const content =
      callIndex === 1
        ? "1. read input\n2. emit reply"
        : callIndex === 2
          ? "Hello from CrossAgent Runtime."
          : "PASS - response addresses the task.";
    return { content, finishReason: ModelFinishReason.Stop };
  });

  runtime
    .registerModel(adapter)
    .registerPattern(new NoToolPattern())
    .registerPattern(new PlanExecuteValidatePattern());

  const task: AgentTask = {
    taskId: "demo-1",
    type: AgentTaskType.Generic,
    input: "Greet a developer who is just trying out the runtime.",
    requiresValidation: true,
  };

  const result = await runtime.run(task, profile.profileId);

  console.log(`Session     : ${result.sessionId}`);
  console.log(`Selected    : ${result.selectedPatternId} on ${result.selectedModelId}`);
  console.log(`Success     : ${result.success}`);
  console.log(`Output      : ${result.agent?.output ?? ""}`);
  console.log(`Validation  : ${result.agent?.validationPassed ?? ""}`);
  console.log("");
  console.log("Audit trail:");
  for (const evt of sink.events) {
    const t = evt.timestamp.toISOString().substring(11, 23);
    console.log(`  [${t}] ${kindName(evt.kind)} :: ${evt.message}`);
  }

  return result.success ? 0 : 1;
}

function kindName(kind: number): string {
  const names: Record<number, string> = {
    0: "SessionStarted",
    1: "TaskReceived",
    2: "ModelSelected",
    3: "PatternSelected",
    4: "StepStarted",
    5: "StepCompleted",
    6: "ToolCallRequested",
    7: "ToolCallApproved",
    8: "ToolCallRejected",
    9: "ToolResultReceived",
    10: "ValidationPassed",
    11: "ValidationFailed",
    12: "SessionCompleted",
    13: "SessionFailed",
    14: "PolicyRejected",
  };
  return names[kind] ?? `Kind(${kind})`;
}

main().then((code) => {
  process.exit(code);
});
