/** Categorises a RuntimeError for callers that branch on it. */
export enum RuntimeErrorCode {
  None = 0,
  UnknownModel = 1,
  NoEligiblePattern = 2,
  PatternRejected = 3,
  PatternNotRegistered = 4,
  InvalidConfiguration = 5,
  PolicyDenied = 6,
  Cancelled = 7,
  ExecutionFailed = 8,
}

/** Errors are values, not exceptions. */
export interface RuntimeError {
  readonly code: RuntimeErrorCode;
  readonly message: string;
  readonly detail?: string;
}
