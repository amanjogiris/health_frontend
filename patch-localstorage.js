/**
 * Preloaded via `node --require ./patch-localstorage.js` before Next.js starts.
 * When the dev server is launched from a directory that is not the project root,
 * Node.js receives an invalid --localstorage-file path and creates a `localStorage`
 * global whose property accessors throw instead of returning values.
 * We replace it with a simple in-memory implementation so SSR never crashes.
 */
(function patchLocalStorage() {
  // Check whether the global already has a working localStorage
  try {
    if (
      typeof globalThis.localStorage !== 'undefined' &&
      typeof globalThis.localStorage.getItem === 'function'
    ) {
      return; // already healthy, nothing to do
    }
  } catch (_) {
    // getter threw — definitely broken, fall through to patch
  }

  const store = new Map();

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(String(key), String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); },
      get length() { return store.size; },
      key(n) { return [...store.keys()][n] ?? null; },
    },
    writable: true,
    configurable: true,
  });

  console.log('[patch-localstorage] Installed in-memory localStorage polyfill.');
})();
