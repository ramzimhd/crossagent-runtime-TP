/** A simple ordered graph of named steps used by patterns to record their phases. */
export class ExecutionGraph {
  private readonly _steps: string[] = [];

  addStep(name: string): this {
    if (!name || !name.trim()) {
      throw new Error("Step name must be non-empty.");
    }
    if (this._steps.includes(name)) {
      throw new Error(`Step '${name}' already exists in the graph.`);
    }
    this._steps.push(name);
    return this;
  }

  get steps(): ReadonlyArray<string> {
    return this._steps;
  }

  contains(name: string): boolean {
    return this._steps.includes(name);
  }
}
