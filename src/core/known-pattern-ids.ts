/** Stable identifiers for the patterns that ship with this repository. */
export const KnownPatternIds = {
  NoTool: "no-tool",
  PlanExecuteValidate: "plan-execute-validate",
  JsonPlan: "json-plan",
  BoundedReAct: "bounded-react",
} as const;

export type KnownPatternId = (typeof KnownPatternIds)[keyof typeof KnownPatternIds];
