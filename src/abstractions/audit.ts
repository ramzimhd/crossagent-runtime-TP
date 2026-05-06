/** Canonical audit event kinds. New values may be added at the end. */
export enum AuditEventKind {
  SessionStarted = 0,
  TaskReceived = 1,
  ModelSelected = 2,
  PatternSelected = 3,
  StepStarted = 4,
  StepCompleted = 5,
  ToolCallRequested = 6,
  ToolCallApproved = 7,
  ToolCallRejected = 8,
  ToolResultReceived = 9,
  ValidationPassed = 10,
  ValidationFailed = 11,
  SessionCompleted = 12,
  SessionFailed = 13,
  PolicyRejected = 14,
}

/** A single audit event. Immutable, deterministic, free of model content payloads. */
export interface AuditEvent {
  readonly timestamp: Date;
  readonly sessionId: string;
  readonly kind: AuditEventKind;
  readonly message: string;
  readonly properties: Readonly<Record<string, string>>;
}

/** Destination for audit events. */
export interface IAuditSink {
  write(event: AuditEvent): Promise<void>;
}
