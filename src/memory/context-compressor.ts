import type { ActiveContext, MemoryItem } from "../abstractions/memory.js";

const CHARS_PER_TOKEN = 4;

export class ContextCompressor {
  constructor(private readonly maxTokens: number = 2048) {
    if (maxTokens <= 0) {
      throw new Error("Token budget must be positive.");
    }
  }

  compress(ranked: ReadonlyArray<MemoryItem>): ActiveContext {
    if (!ranked) throw new Error("ranked must not be null");
    const kept: MemoryItem[] = [];
    let totalChars = 0;
    const budget = this.maxTokens * CHARS_PER_TOKEN;

    for (const item of ranked) {
      const size = item.content.length;
      if (totalChars + size > budget && kept.length > 0) break;
      kept.push(item);
      totalChars += size;
    }

    const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
    return { items: kept, estimatedTokens };
  }
}
