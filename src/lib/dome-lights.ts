import { createValueStore } from './client-store';

export const domeLights = createValueStore<boolean | null>(null);
