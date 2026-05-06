import type { AuditEvent } from "./audit.js";
import type { ActiveContext } from "./memory.js";
import type { ModelProfile } from "./models.js";

/** The kind of work a task represents. */
export enum AgentTaskType {
  Generic = 0,
  Question = 1,
  Plan = 2,
  Extract = 3,
  Validate = 4,
  Transform = 5,
  Decision = 6,
}

/** Lifecycle state of an in-flight agent session. */
export enum AgentState {
  Pending = 0,
  Planning = 1,
  Executing = 2,
  Validating = 3,
  Completed = 4,
  Failed = 5,
  Rejected = 6,
}

/** The unit of work submitted to AgentRuntime. */
export interface AgentTask {
  readonly taskId: string;
  readonly input: string;
  readonly type?: AgentTaskType;
  readonly requiresTools?: boolean;
  readonly requiresMemory?: boolean;
  /** Defaults to true when not specified. */
  readonly requiresValidation?: boolean;
  readonly maxSteps?: number;
  readonly allowedPatternIds?: ReadonlySet<string>;
  readonly forbiddenPatternIds?: ReadonlySet<string>;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Read-only execution context handed to a pattern. */
export interface AgentContext {
  readonly sessionId: string;
  readonly task: AgentTask;
  readonly model: ModelProfile;
  readonly activeContext?: ActiveContext;
  readonly properties?: Readonly<Record<string, unknown>>;
}

/** The outcome of executing a single pattern within a session. */
export interface AgentResult {
  readonly sessionId: string;
  readonly state: AgentState;
  readonly output?: string;
  readonly validationPassed?: boolean;
  readonly auditEvents?: ReadonlyArray<AuditEvent>;
  readonly errorMessage?: string;
}
