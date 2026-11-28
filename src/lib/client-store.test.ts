import { describe, expect, it, vi } from 'vitest';
import { createValueStore } from './client-store';

describe('createValueStore', () => {
  it('holds the value it was made with', () => {
    expect(createValueStore<boolean | null>(null).get()).toBeNull();
  });

  it('tells its listeners when the value changes', () => {
    const store = createValueStore<boolean | null>(null);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.set(false);
    store.set(true);
    stop();
    expect(store.get()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not tell its listeners when the value stays as it is', () => {
    const store = createValueStore<boolean | null>(true);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.set(true);
    stop();
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a listener once it unsubscribes', () => {
    const store = createValueStore(0);
    const listener = vi.fn();
    store.subscribe(listener)();
    store.set(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
