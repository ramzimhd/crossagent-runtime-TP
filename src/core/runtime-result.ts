import type { AgentResult } from "../abstractions/agents.js";
import type { AuditEvent } from "../abstractions/audit.js";
import type { RuntimeError } from "./runtime-error.js";

/** Contains either an AgentResult or a RuntimeError, never both. */
export interface RuntimeResult {
  readonly sessionId: string;
  readonly success: boolean;
  readonly agent?: AgentResult;
  readonly error?: RuntimeError;
  readonly runtimeAuditEvents: ReadonlyArray<AuditEvent>;
  readonly selectedPatternId?: string;
  readonly selectedModelId?: string;
}
