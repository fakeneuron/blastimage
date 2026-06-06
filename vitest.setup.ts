// Node's experimental global `localStorage` shadows the happy-dom one and is
// unusable without a runtime flag, so install a clean in-memory Storage on both
// `globalThis` and `window` for the persistence tests (lib/storage.ts reads
// `window.localStorage`).

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage() as unknown as Storage;

Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true });
}
