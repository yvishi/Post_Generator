import type { ResearchResult } from '@/lib/types';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{title}</h4>
      {children}
    </div>
  );
}

export function ResearchPanel({ research }: { research: ResearchResult }) {
  const notes = research.errors.length + research.conflicts.length;
  return (
    <details className="rounded-lg border border-rule bg-sheet">
      <summary className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marigold sm:px-5">
        <span aria-hidden className="chev inline-block transition-transform">›</span>
        <span className="font-display text-base font-bold">Research</span>
        <span className="font-mono text-xs text-ink-soft">
          {research.facts.length} facts · {research.angles.length} angles
          {notes > 0 && <span className="text-margin"> · {notes} to review</span>}
        </span>
      </summary>
      <div className="flex flex-col gap-6 border-t border-rule px-4 py-5 sm:px-5">
        {notes > 0 && (
          <Group title="Errors and conflicts">
            <ul className="ml-4 list-disc text-sm leading-relaxed text-margin">
              {[...research.errors, ...research.conflicts].map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Group>
        )}
        <Group title="Angles">
          {research.angles.length === 0 ? (
            <p className="text-sm text-ink-soft">No angles came back. Drafts used the facts alone.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {research.angles.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {a.angle} <span className="font-mono text-xs text-ink-soft">{a.factIds.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Group>
        <Group title="Facts">
          <ul className="flex flex-col gap-1.5">
            {research.facts.map((f) => (
              <li key={f.id} className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
                <span className="font-mono text-xs leading-5 text-ink-soft">{f.id}</span>
                <span>
                  {f.fact}{' '}
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-ink-soft underline underline-offset-2 hover:text-ink"
                  >
                    {new URL(f.sourceUrl, 'https://invalid.local').hostname}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </Group>
      </div>
    </details>
  );
}
