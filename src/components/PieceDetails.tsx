import { MAX_ATTEMPTS } from '@/lib/orchestrator';
import type { Fact, ImageBriefContent, PieceResult } from '@/lib/types';
import { IssueItem } from './HoldReview';
import { BriefFields, PieceContent } from './PieceContent';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h4>
      {children}
    </section>
  );
}

export function FactRows({ facts }: { facts: Fact[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {facts.map((f) => (
        <li key={f.id} className="grid grid-cols-[4.75rem_1fr] gap-3 text-sm leading-6">
          <span className="font-mono text-xs leading-6 text-muted">{f.id}</span>
          <span>
            {f.fact}{' '}
            {f.sourceUrl && (
              <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-2 hover:text-ink">
                source
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function verdict(piece: PieceResult) {
  const n = (piece.bestAttempt ?? piece.attempts.length - 1) + 1;
  if (piece.acceptedByUser) return `You chose to use attempt ${n} without the checker's approval`;
  return piece.attempts.length > MAX_ATTEMPTS ? `Passed on attempt ${n}, after your note` : `Passed on attempt ${n} of ${MAX_ATTEMPTS}`;
}

/** Everything about how a piece was made: checks, attempts, facts, brief. */
export function PieceDetails({ piece, facts }: { piece: PieceResult; facts: Fact[] }) {
  const passed = piece.status === 'passed';
  const best = piece.bestAttempt ?? piece.attempts.length - 1;
  const ids = piece.attempts[best]?.check.factIdsUsed ?? [];
  const used = ids.map((id) => facts.find((f) => f.id === id) ?? { id, fact: 'Not in the research facts', sourceUrl: '' });

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-canvas p-4 sm:p-5">
      {passed && <p className="text-sm font-semibold text-peacock">{verdict(piece)}</p>}

      {piece.type === 'image' && piece.draft && (
        <Block title="Image brief">
          <BriefFields c={piece.draft.content as ImageBriefContent} />
        </Block>
      )}

      {!passed && piece.draft && piece.type !== 'image' && (
        <Block title={`Closest draft (attempt ${best + 1})`}>
          <div className="rounded-xl border border-dashed border-line bg-surface p-4">
            <PieceContent draft={piece.draft} />
          </div>
        </Block>
      )}

      {piece.attempts.length > 0 && (
        <Block title="Brand checks">
          <ol className="flex flex-col gap-4">
            {piece.attempts.map((a, i) => (
              <li key={i} className="flex flex-col gap-1 text-sm">
                <p className={`font-semibold ${a.check.pass ? 'text-peacock' : 'text-danger'}`}>
                  Attempt {i + 1}: {a.check.pass ? 'passed' : 'sent back for changes'}
                </p>
                {a.userNote && <p className="text-muted">Your note: “{a.userNote}”</p>}
                {a.check.reasoning && <p className="leading-6 text-ink/80">{a.check.reasoning}</p>}
                {a.check.issues.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-2.5">
                    {a.check.issues.map((issue, j) => (
                      <IssueItem key={j} issue={issue} />
                    ))}
                  </ul>
                ) : (
                  !a.check.reasoning && <p className="text-muted">No notes.</p>
                )}
              </li>
            ))}
          </ol>
        </Block>
      )}

      <Block title="Facts used">
        {used.length ? <FactRows facts={used} /> : <p className="text-sm text-muted">None listed.</p>}
      </Block>
    </div>
  );
}
