// A minimal notify-on-change store for values that live *outside* React and
// only exist in the browser — the `dark` class on <html>, a localStorage key.
//
// Components read those through `useSyncExternalStore` rather than copying them
// into state from an effect. The external value stays the single source of
// truth (no React copy to drift out of sync), and the server/client split is
// expressed as a server snapshot instead of a `mounted` flag.

export type ClientStore = {
  subscribe: (listener: () => void) => () => void;
  // Call after writing to the underlying value, so readers re-render.
  notify: () => void;
};

export function createClientStore(): ClientStore {
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
}
