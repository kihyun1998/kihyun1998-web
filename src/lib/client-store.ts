export type ClientStore = {
  subscribe: (listener: () => void) => () => void;
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
