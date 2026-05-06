import { describe, expect, it } from "vitest";

import {
  BoundedReActOptions,
  BoundedReActPattern,
} from "../src/patterns/index.js";

describe("BoundedReActPattern", () => {
  it("rejects unbounded max steps", () => {
    expect(
      () =>
        new BoundedReActPattern({
          maxSteps: 0,
          allowedTools: ["noop"],
          stepTimeoutMs: 5000,
        }),
    ).toThrow(/Unbounded ReAct is rejected by design/);
  });

  it("rejects empty allowed tools", () => {
    expect(
      () =>
        new BoundedReActPattern({
          maxSteps: 4,
          allowedTools: [],
          stepTimeoutMs: 5000,
        }),
    ).toThrow(/at least one tool/);
  });

  it("rejects negative timeout", () => {
    expect(
      () =>
        new BoundedReActPattern({
          maxSteps: 4,
          allowedTools: ["noop"],
          stepTimeoutMs: 0,
        }),
    ).toThrow(/stepTimeoutMs must be greater than zero/);
  });

  it("rejects disabled audit", () => {
    expect(
      () =>
        new BoundedReActPattern({
          maxSteps: 4,
          allowedTools: ["noop"],
          stepTimeoutMs: 5000,
          requireAudit: false,
        } satisfies BoundedReActOptions),
    ).toThrow(/requireAudit must be true/);
  });

  it("succeeds with a valid bounded configuration", () => {
    const pattern = new BoundedReActPattern({
      maxSteps: 3,
      allowedTools: ["echo"],
      stepTimeoutMs: 2000,
    });

    expect(pattern.descriptor.maxSteps).toBe(3);
    expect(pattern.descriptor.isBounded).toBe(true);
  });
});
