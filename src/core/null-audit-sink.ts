import type { AuditEvent, IAuditSink } from "../abstractions/audit.js";

/** An audit sink that discards events. */
export class NullAuditSink implements IAuditSink {
  private static _instance: NullAuditSink | undefined;

  static instance(): NullAuditSink {
    if (!NullAuditSink._instance) {
      NullAuditSink._instance = new NullAuditSink();
    }
    return NullAuditSink._instance;
  }

  async write(_event: AuditEvent): Promise<void> {
    // discard
  }
}
