/** A single retrievable memory record. */
export interface MemoryItem {
  readonly id: string;
  readonly content: string;
  readonly score?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Search request issued to a memory provider. */
export interface MemoryQuery {
  readonly query: string;
  /** Defaults to 8. */
  readonly limit?: number;
  readonly filters?: Readonly<Record<string, string>>;
}

/** The compressed and ranked working context produced by the memory layer. */
export interface ActiveContext {
  readonly items: ReadonlyArray<MemoryItem>;
  readonly estimatedTokens: number;
}

/** Read-side abstraction over a memory store. */
export interface IMemoryProvider {
  search(query: MemoryQuery): Promise<ReadonlyArray<MemoryItem>>;
}
