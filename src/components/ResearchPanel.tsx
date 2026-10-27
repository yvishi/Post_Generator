import type { ResearchResult } from '@/lib/types';
import { FactRows } from './PieceDetails';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h4>
      {children}
    </section>
  );
}

/** How the pack was made: the report summary plus everything research found. */
export function ResearchPanel({ research, summary }: { research: ResearchResult; summary?: string }) {
  const notes = [...research.errors, ...research.conflicts];
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      {summary && (
        <Block title="Summary">
          <p className="max-w-prose text-sm leading-6">{summary}</p>
        </Block>
      )}
      {notes.length > 0 && (
        <Block title="Research issues">
          <ul className="ml-4 list-disc text-sm leading-6 text-danger">
            {notes.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Block>
      )}
      <Block title={`Angles (${research.angles.length})`}>
        {research.angles.length === 0 ? (
          <p className="text-sm text-muted">No angles came back. Drafts used the facts alone.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {research.angles.map((a, i) => (
              <li key={i} className="text-sm leading-6">
                {a.angle} <span className="font-mono text-xs text-muted">{a.factIds.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title={`Facts (${research.facts.length})`}>
        <FactRows facts={research.facts} />
      </Block>
    </div>
  );
}
