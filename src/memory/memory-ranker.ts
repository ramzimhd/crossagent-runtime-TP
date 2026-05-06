import type { MemoryItem } from "../abstractions/memory.js";

export class MemoryRanker {
  rank(query: string, items: ReadonlyArray<MemoryItem>): ReadonlyArray<MemoryItem> {
    if (!items) throw new Error("items must not be null");
    if (items.length === 0) return items;

    if (items.every((i) => i.score !== undefined)) {
      return [...items].sort((a, b) => {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        if (sa !== sb) return sb - sa;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }

    const queryTokens = MemoryRanker.tokenize(query);
    if (queryTokens.size === 0) return items;

    return [...items]
      .map((item) => ({ item, score: MemoryRanker.computeOverlap(queryTokens, item.content) }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
      })
      .map(({ item, score }) => ({ ...item, score }));
  }

  private static computeOverlap(queryTokens: Set<string>, content: string): number {
    const list = MemoryRanker.tokenizeList(content);
    if (list.length === 0) return 0;
    let hits = 0;
    for (const token of list) {
      if (queryTokens.has(token)) hits++;
    }
    return hits / list.length;
  }

  private static tokenize(text: string): Set<string> {
    return new Set(MemoryRanker.tokenizeList(text));
  }

  private static tokenizeList(text: string): string[] {
    if (!text || !text.trim()) return [];
    const tokens: string[] = [];
    let current = "";
    for (const ch of text) {
      if (/[\p{L}\p{N}]/u.test(ch)) {
        current += ch;
      } else if (current) {
        tokens.push(current.toLowerCase());
        current = "";
      }
    }
    if (current) tokens.push(current.toLowerCase());
    return tokens;
  }
}
