export interface BoundedReActOptions {
  readonly maxSteps: number;
  readonly allowedTools: ReadonlyArray<string>;
  readonly stepTimeoutMs: number;
  readonly requireAudit?: boolean;
  readonly stopWhenModelEmitsNoToolCalls?: boolean;
}

export function validateBoundedReActOptions(options: BoundedReActOptions): void {
  if (!options) {
    throw new Error("options must not be null");
  }
  if (options.maxSteps <= 0) {
    throw new Error(
      "BoundedReActOptions.maxSteps must be greater than zero. Unbounded ReAct is rejected by design.",
    );
  }
  if (!options.allowedTools || options.allowedTools.length === 0) {
    throw new Error(
      "BoundedReActOptions.allowedTools must contain at least one tool. Unbounded ReAct is rejected by design.",
    );
  }
  if (options.stepTimeoutMs <= 0) {
    throw new Error("BoundedReActOptions.stepTimeoutMs must be greater than zero.");
  }
  if (options.requireAudit === false) {
    throw new Error(
      "BoundedReActOptions.requireAudit must be true; bounded ReAct execution requires audit logging.",
    );
  }
}
