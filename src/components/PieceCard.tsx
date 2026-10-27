'use client';

import { useState } from 'react';
import { CONTENT_META, draftToText } from '@/lib/content-meta';
import { MAX_ATTEMPTS } from '@/lib/orchestrator';
import type { Fact, ImageBriefContent, PieceResult } from '@/lib/types';
import { PieceContent } from './PieceContent';

const ORDINAL = ['1st', '2nd', '3rd'];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="rounded border border-ink px-3 py-1 text-sm font-semibold transition-colors hover:bg-ink hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function FactList({ ids, facts }: { ids: string[]; facts: Fact[] }) {
  const used = ids.map((id) => facts.find((f) => f.id === id) ?? { id, fact: 'Not in the research facts', sourceUrl: '' });
  if (used.length === 0) return <p className="text-sm text-ink-soft">The checker did not list any facts.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {used.map((f) => (
        <li key={f.id} className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
          <span className="font-mono text-xs leading-5 text-ink-soft">{f.id}</span>
          <span>
            {f.fact}{' '}
            {f.sourceUrl && (
              <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-ink-soft underline underline-offset-2 hover:text-ink">
                source
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AttemptHistory({ piece }: { piece: PieceResult }) {
  return (
    <ol className="flex flex-col gap-3">
      {piece.attempts.map((a, i) => (
        <li key={i} className="flex flex-col gap-1">
          <span className={`text-sm font-semibold ${a.check.pass ? 'text-tick' : 'text-margin'}`}>
            Attempt {i + 1}: {a.check.pass ? 'passed' : 'sent back'}
          </span>
          {a.check.reasons.length > 0 ? (
            <ul className="ml-4 list-disc text-sm leading-relaxed">
              {a.check.reasons.map((r, j) => (
                <li key={j}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">No notes from the checker.</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{title}</h4>
      {children}
    </div>
  );
}

export function PieceCard({ piece, facts }: { piece: PieceResult; facts: Fact[] }) {
  const passed = piece.status === 'passed';
  const tries = piece.attempts.length;
  const factIds = piece.attempts.at(-1)?.check.factIdsUsed ?? [];
  const isImage = piece.type === 'image';
  const brief = isImage ? (piece.draft?.content as ImageBriefContent | undefined) : undefined;

  return (
    <article className="grid grid-cols-[var(--margin-x)_minmax(0,1fr)]" aria-label={CONTENT_META[piece.type].label}>
      {/* The checker's mark, written in the margin. */}
      <div aria-hidden className="flex flex-col items-center pt-3 font-hand leading-none">
        <span className={`ink-in text-3xl ${passed ? 'text-tick' : 'text-margin'}`}>{passed ? '✓' : '✗'}</span>
        <span className={`ink-in mt-1 hidden -rotate-6 text-sm sm:block ${passed ? 'text-tick' : 'text-margin'}`}>
          {passed ? `${ORDINAL[tries - 1] ?? tries} try` : 'redo'}
        </span>
      </div>

      <div className="mr-3 rounded-lg border border-rule bg-sheet shadow-[0_1px_0_var(--color-rule)] sm:mr-5">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display text-base font-bold">{CONTENT_META[piece.type].label}</h3>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${
                passed ? 'bg-tick/10 text-tick' : 'bg-margin text-sheet'
              }`}
            >
              {passed ? 'Passed' : 'Failed'}
            </span>
          </div>
          {passed && piece.draft && !isImage && <CopyButton text={draftToText(piece.draft)} />}
          {passed && piece.imageDataUrl && (
            <a
              href={piece.imageDataUrl}
              download="vidya-image.png"
              className="rounded border border-ink px-3 py-1 text-sm font-semibold transition-colors hover:bg-ink hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            >
              Download
            </a>
          )}
        </header>

        <div className="px-4 py-4 sm:px-5">
          {passed ? (
            isImage && piece.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from the image model
              <img src={piece.imageDataUrl} alt={brief?.altText ?? 'Generated image'} className="w-full rounded-md border border-rule" />
            ) : (
              piece.draft && <PieceContent draft={piece.draft} />
            )
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-margin">
                {tries >= MAX_ATTEMPTS
                  ? `Still failing after ${MAX_ATTEMPTS} attempts. The checker's last notes:`
                  : 'This piece stopped early:'}
              </p>
              <ul className="ml-4 list-disc leading-relaxed">
                {piece.failureReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <details className="group border-t border-rule">
          <summary className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marigold sm:px-5">
            <span aria-hidden className="chev inline-block transition-transform">›</span>
            Show details
          </summary>
          <div className="flex flex-col gap-5 px-4 pb-5 pt-1 sm:px-5">
            {passed && (
              <p className="font-hand text-lg text-tick">
                Passed on attempt {tries} of {MAX_ATTEMPTS}
              </p>
            )}
            {isImage && passed && piece.draft && (
              <DetailBlock title="Image brief">
                <PieceContent draft={piece.draft} />
              </DetailBlock>
            )}
            {!passed && piece.draft && (
              <DetailBlock title={isImage ? 'Image brief' : 'Last draft'}>
                <div className="rounded-md border border-dashed border-rule p-3">
                  <PieceContent draft={piece.draft} />
                </div>
              </DetailBlock>
            )}
            {tries > 0 && (
              <DetailBlock title="Checker notes">
                <AttemptHistory piece={piece} />
              </DetailBlock>
            )}
            <DetailBlock title="Facts used">
              <FactList ids={factIds} facts={facts} />
            </DetailBlock>
          </div>
        </details>
      </div>
    </article>
  );
}
