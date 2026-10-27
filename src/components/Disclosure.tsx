'use client';

import { useId, useState } from 'react';
import { Chevron } from './icons';

/** A small "Details" toggle whose panel opens below the row it sits in. */
export function useDisclosure(label = 'Details') {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40"
    >
      {label}
      <Chevron open={open} />
    </button>
  );
  return { button, panelProps: { id, hidden: !open } };
}
