import type {
  IMemoryProvider,
  MemoryItem,
  MemoryQuery,
} from "../abstractions/memory.js";

const TOKEN_SEPARATORS = /[\s.,;:!?]+/;

export class FakeMemoryProvider implements IMemoryProvider {
  private readonly _items: MemoryItem[] = [];

  add(item: MemoryItem): this {
    if (!item) throw new Error("item must not be null");
    this._items.push(item);
    return this;
  }

  get items(): ReadonlyArray<MemoryItem> {
    return this._items;
  }

  async search(query: MemoryQuery): Promise<ReadonlyArray<MemoryItem>> {
    if (!query) throw new Error("query must not be null");
    const tokens = new Set(
      query.query.split(TOKEN_SEPARATORS).filter(Boolean).map((t) => t.toLowerCase()),
    );
    const limit = query.limit ?? 8;
    const matches: MemoryItem[] = [];
    for (const item of this._items) {
      const lowered = item.content.toLowerCase();
      if (tokens.size === 0 || [...tokens].some((t) => lowered.includes(t))) {
        matches.push(item);
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }
}
