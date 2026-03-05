/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * When the dev server is launched from a directory other than the project root
 * (e.g. `cd / && next dev /project`), Node.js receives an invalid
 * `--localstorage-file` path and creates a broken `localStorage` global whose
 * methods are `undefined`.  We replace it here with a simple in-memory
 * implementation so that SSR guards like `typeof window !== 'undefined'` work
 * correctly and no unhandled exceptions are thrown.
 */
export async function register(): Promise<void> {
  // Only patch on the server (Node.js) side.
  if (typeof window !== 'undefined') return;

  // If localStorage is already healthy, leave it alone.
  if (
    typeof globalThis.localStorage !== 'undefined' &&
    typeof (globalThis.localStorage as Storage).getItem === 'function'
  ) {
    return;
  }

  // Provide a no-op, in-memory localStorage so SSR never throws.
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => { store.set(key, String(value)); },
      removeItem: (key: string): void => { store.delete(key); },
      clear: (): void => { store.clear(); },
      get length(): number { return store.size; },
      key: (n: number): string | null => [...store.keys()][n] ?? null,
    } satisfies Storage,
    writable: true,
    configurable: true,
  });
}
