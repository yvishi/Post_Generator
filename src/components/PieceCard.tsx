'use client';

import { useState } from 'react';
import { CONTENT_META, draftToText } from '@/lib/content-meta';
import type { Fact, PieceResult } from '@/lib/types';
import { useDisclosure } from './Disclosure';
import { ChannelIcon } from './icons';
import { PieceContent } from './PieceContent';
import { PieceDetails } from './PieceDetails';

const action =
  'inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-semibold transition hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={action}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

type Props = { piece: PieceResult; facts: Fact[]; imageDataUrl?: string; className?: string };

export function PieceCard({ piece, facts, imageDataUrl, className = '' }: Props) {
  const passed = piece.status === 'passed';
  const details = useDisclosure();

  return (
    <article
      aria-label={CONTENT_META[piece.type].title}
      className={`rise flex flex-col rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(21_33_42/0.04)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <ChannelIcon type={piece.type} />
          {CONTENT_META[piece.type].title}
        </h3>
        {!passed && (
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">Not ready</span>
        )}
      </header>

      <div className="flex-1 px-5 pb-4">
        {passed && piece.draft ? (
          <PieceContent draft={piece.draft} imageDataUrl={imageDataUrl ?? piece.imageDataUrl} />
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-danger/30 bg-danger/[0.03] p-4">
            <p className="font-semibold">This one needs a human touch.</p>
            <p className="text-sm text-muted">It didn&apos;t meet Vidya&apos;s brand rules, so we held it back:</p>
            <ul className="ml-4 list-disc text-sm leading-6">
              {piece.failureReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
        <div className="flex gap-2">
          {passed && piece.draft && piece.type !== 'image' && <CopyButton text={draftToText(piece.draft)} />}
          {passed && piece.imageDataUrl && (
            <a href={piece.imageDataUrl} download="vidya-image.png" className={action}>
              Download
            </a>
          )}
        </div>
        {details.button}
      </footer>
      <div {...details.panelProps} className="px-5 pb-5">
        <PieceDetails piece={piece} facts={facts} />
      </div>
    </article>
  );
}
