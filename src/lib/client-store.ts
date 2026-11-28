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

export type ValueStore<T> = {
  subscribe: ClientStore['subscribe'];
  get: () => T;
  set: (next: T) => void;
};

export function createValueStore<T>(initial: T): ValueStore<T> {
  const store = createClientStore();
  let value = initial;

  return {
    subscribe: store.subscribe,
    get: () => value,
    set(next) {
      if (next === value) return;
      value = next;
      store.notify();
    },
  };
}
