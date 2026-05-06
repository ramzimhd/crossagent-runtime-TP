import { randomUUID } from "node:crypto";

import type { IAuditSink } from "../abstractions/audit.js";
import type { IMemoryProvider } from "../abstractions/memory.js";
import type { AgentPolicy } from "../abstractions/policy.js";
import type { IToolInvoker } from "../abstractions/tools.js";

export interface RuntimeOptions {
  defaultPolicy?: AgentPolicy;
  auditSink?: IAuditSink;
  tools?: IToolInvoker;
  memory?: IMemoryProvider;
  preferredPatternId?: string;
  /** Source of timestamps. Defaults to `() => new Date()`. */
  timestampFactory?: () => Date;
  /** Source of session ids. Defaults to a uuid v4 generator. */
  sessionIdFactory?: () => string;
}

export function defaultSessionId(): string {
  return randomUUID().replace(/-/g, "");
}

export function defaultTimestamp(): Date {
  return new Date();
}
