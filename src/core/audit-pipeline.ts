import type { AuditEvent, AuditEventKind, IAuditSink } from "../abstractions/audit.js";

/** Buffers audit events for one session and fans them out to a sink. */
export class AuditPipeline {
  private readonly _captured: AuditEvent[] = [];

  constructor(
    private readonly sink: IAuditSink,
    private readonly timestampFactory: () => Date,
    private readonly sessionId: string,
  ) {
    if (!sink) {
      throw new Error("sink must not be null");
    }
    if (!timestampFactory) {
      throw new Error("timestampFactory must not be null");
    }
    if (!sessionId) {
      throw new Error("sessionId must not be empty");
    }
  }

  get captured(): ReadonlyArray<AuditEvent> {
    return this._captured;
  }

  async emit(
    kind: AuditEventKind,
    message: string,
    properties?: Record<string, string>,
  ): Promise<void> {
    const event: AuditEvent = {
      timestamp: this.timestampFactory(),
      sessionId: this.sessionId,
      kind,
      message,
      properties: properties ? { ...properties } : {},
    };
    this._captured.push(event);
    await this.sink.write(event);
  }

  asSink(): IAuditSink {
    const pipeline = this;
    return {
      async write(event: AuditEvent): Promise<void> {
        await pipeline.emit(event.kind, event.message, { ...event.properties });
      },
    };
  }
}
