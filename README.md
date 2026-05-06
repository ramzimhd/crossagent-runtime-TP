# CrossAgent Runtime (TypeScript)

CrossAgent Runtime is a provider-agnostic, model-adaptive agent runtime for building controlled mono-agent and multi-agent systems on Node.js / TypeScript. It picks an execution pattern that fits a given task, model, policy, and operational constraints, then runs it inside an audited, bounded session.

This repository contains the TypeScript implementation of the framework. Implementations in other ecosystems (.NET, Python) live in separate repositories so each can follow the conventions and release cadence of its own ecosystem.

## What it is

- A small set of stable contracts (`crossagent-runtime/abstractions`) describing models, tools, memory, patterns, policy, and audit.
- A minimal runtime host (`crossagent-runtime/core`) that registers adapters and patterns, selects one for each task, runs it, and surfaces a structured result.
- A first-party set of safe patterns (`crossagent-runtime/patterns`): a no-tool single call, a Plan-Execute-Validate flow, a JSON plan skeleton, and a strictly bounded ReAct loop.
- Optional layers for tooling (`crossagent-runtime/tooling`) and memory (`crossagent-runtime/memory`) that can be plugged in independently.
- Deterministic test doubles (`crossagent-runtime/testing`) for pattern and runtime tests with no external dependencies.

## What it isn't

- Not a chatbot framework. Conversations are a use case applications can build on top, not the framework's purpose.
- Not coupled to a single LLM provider. The framework ships no provider adapters in this milestone; applications wire their own through `IModelAdapter`.
- Not a tool-calling library. Tooling is an optional module; tasks that don't need tools never see the tooling layer.
- Not a memory store. Memory retrieval is an optional module; the framework does not own a database or vector index.
- Not unbounded. Patterns must declare bounds. Unbounded ReAct configurations are rejected at registration time.

## Core concepts

- **Model adapter**: a thin `IModelAdapter` implementation that talks to one model and reports `ModelCapabilities`.
- **Agent task**: a single unit of work (`AgentTask`) with a type, input, and optional requirements.
- **Pattern**: an `IAgentPattern` plus a `PatternDescriptor` that declares its risk profile, bounds, and dependencies.
- **Pattern selector**: a deterministic chooser that filters patterns by task requirements, model capabilities, and policy, then scores survivors.
- **Policy engine**: an `IPolicyEngine` that translates declarative policies (`AgentPolicy`) into yes/no decisions for selection and tool calls.
- **Audit pipeline**: a per-session buffer that fans events out to `IAuditSink` and surfaces them in the runtime result.

## Minimal example

```ts
import { AgentRuntime } from "crossagent-runtime/core";
import {
  NoToolPattern,
  PlanExecuteValidatePattern,
} from "crossagent-runtime/patterns";
import { FakeModelAdapter, InMemoryAuditSink } from "crossagent-runtime/testing";
import { ModelProvider } from "crossagent-runtime/abstractions";

const runtime = new AgentRuntime({ auditSink: new InMemoryAuditSink() });

const profile = {
  profileId: "demo-echo",
  displayName: "Demo echo model",
  provider: ModelProvider.Custom,
  capabilities: { providerName: "demo", modelId: "echo", isLocal: true },
};

runtime
  .registerModel(new FakeModelAdapter(profile, "Hello from CrossAgent Runtime."))
  .registerPattern(new NoToolPattern())
  .registerPattern(new PlanExecuteValidatePattern());

const result = await runtime.run(
  { taskId: "demo-1", input: "Say hello.", requiresValidation: false },
  profile.profileId,
);

console.log(`${result.selectedPatternId}: ${result.agent?.output ?? ""}`);
```

A self-contained runnable version of this lives in [examples/minimal-runtime.ts](examples/minimal-runtime.ts).

## Package layout

| Subpath | Purpose |
| --- | --- |
| `crossagent-runtime/abstractions` | Stable contracts (models, tools, memory, patterns, policy, audit) |
| `crossagent-runtime/core` | Runtime host, session, selector, default policy engine, audit pipeline |
| `crossagent-runtime/patterns` | First-party safe patterns |
| `crossagent-runtime/tooling` | Optional tool registry, validator, executor, normalizer |
| `crossagent-runtime/memory` | Optional retrieval, ranking, compression, sliding buffer |
| `crossagent-runtime/testing` | Deterministic test doubles |

## Design principles

1. **Provider-agnostic**: model behaviour reaches the runtime only through `IModelAdapter` and `ModelCapabilities`.
2. **Model-adaptive**: pattern selection inspects the model's capability profile and degrades safely when something is missing.
3. **Bounded by default**: every shipped pattern declares step counts and risk levels; the runtime rejects unbounded configurations.
4. **Optional middleware**: tooling and memory are separate subpaths and separate runtime services; they can be omitted entirely.
5. **Auditable**: every session emits a canonical sequence of audit events suitable for compliance and debugging.
6. **Deterministic to test**: `crossagent-runtime/testing` ships in-process fakes for every external dependency the framework defines.
7. **Small public surface**: contracts are short, immutable, and documented; framework code never exposes provider-specific types.

## Current status

This is the first milestone. It establishes the contracts, the runtime, three patterns plus a strictly bounded ReAct loop, optional tooling and memory layers, and the test surface. Provider adapters, multi-agent orchestration primitives, distributed session storage, and other extensions are out of scope for this milestone.

## What is intentionally not in this milestone

- No real provider adapters (OpenAI, Anthropic, Bedrock, Ollama, etc.).
- No vector store, embedding, or document extraction implementations.
- No multi-agent orchestration patterns (debate, swarm, voting). The contracts allow them; an implementation will arrive in a later milestone.
- No streaming response surface beyond the boolean capability flag.
- No long-term session persistence.
- No telemetry exporter (open-telemetry, Prometheus, etc.). The audit sink is the integration point.

## Building and testing

Requires Node.js >= 20.

```sh
npm install
npm run typecheck
npm test
npm run example
npm run build
npm pack --dry-run
```

Tests run entirely in-process and require no credentials or network access.

## License

MIT. See [LICENSE](LICENSE).
