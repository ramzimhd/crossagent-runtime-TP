import type { AuditEvent, IAuditSink } from "../abstractions/audit.js";

export class InMemoryAuditSink implements IAuditSink {
  private readonly _events: AuditEvent[] = [];

  get events(): ReadonlyArray<AuditEvent> {
    return this._events;
  }

  async write(event: AuditEvent): Promise<void> {
    this._events.push(event);
  }
}
