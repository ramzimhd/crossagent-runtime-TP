/** A timestamp factory that advances only when explicitly stepped. */
export class DeterministicClock {
  private _now: Date;

  constructor(start?: Date) {
    this._now = start ?? new Date(Date.UTC(2024, 0, 1));
  }

  now(): Date {
    return new Date(this._now.getTime());
  }

  advance(intervalMs: number): void {
    if (intervalMs < 0) {
      throw new Error("Interval must not be negative.");
    }
    this._now = new Date(this._now.getTime() + intervalMs);
  }
}
