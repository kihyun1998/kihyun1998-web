'use client';

import { useSyncExternalStore } from 'react';
import { Lamp, LampCeiling } from 'lucide-react';
import { domeLights } from '@/lib/dome-lights';

const noneOnServer = () => null;

export function DomeLightsToggle() {
  const on = useSyncExternalStore(domeLights.subscribe, domeLights.get, noneOnServer);

  if (on === null) return null;

  return (
    <button
      type="button"
      onClick={() => domeLights.set(!on)}
      aria-label="Dome lights"
      aria-pressed={on}
      className={`transition-colors hover:text-foreground ${on ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      {on ? <LampCeiling className="size-4" /> : <Lamp className="size-4" />}
    </button>
  );
}
