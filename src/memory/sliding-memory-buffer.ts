/** A bounded FIFO buffer used to retain the most recent conversation turns or events. */
export class SlidingMemoryBuffer<T> {
  private readonly _items: T[] = [];

  constructor(public readonly capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be positive.");
    }
  }

  get count(): number {
    return this._items.length;
  }

  add(item: T): void {
    if (this._items.length === this.capacity) {
      this._items.shift();
    }
    this._items.push(item);
  }

  clear(): void {
    this._items.length = 0;
  }

  snapshot(): ReadonlyArray<T> {
    return [...this._items];
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (const item of this._items) {
      yield item;
    }
  }
}
