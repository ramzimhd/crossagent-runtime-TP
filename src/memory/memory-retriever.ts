import type {
  IMemoryProvider,
  MemoryItem,
  MemoryQuery,
} from "../abstractions/memory.js";

export class MemoryRetriever {
  constructor(private readonly provider: IMemoryProvider) {
    if (!provider) throw new Error("provider must not be null");
  }

  async retrieve(query: MemoryQuery): Promise<ReadonlyArray<MemoryItem>> {
    if (!query) throw new Error("query must not be null");
    if (!query.query || !query.query.trim()) return [];
    if ((query.limit ?? 8) <= 0) return [];
    const result = await this.provider.search(query);
    return result ?? [];
  }
}
