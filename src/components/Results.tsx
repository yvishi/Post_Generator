'use client';

import type { PackResult } from '@/lib/types';
import { useDisclosure } from './Disclosure';
import { PieceCard } from './PieceCard';
import { ResearchPanel } from './ResearchPanel';

const WIDE = new Set(['blog']);

export function Results({ data }: { data: PackResult }) {
  const details = useDisclosure('How this was made');
  const ready = data.pieces.filter((p) => p.status === 'passed').length;
  const image = data.pieces.find((p) => p.type === 'image' && p.status === 'passed')?.imageDataUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">
            {ready} of {data.pieces.length}
          </span>{' '}
          ready to post
        </p>
        {details.button}
      </div>
      <div {...details.panelProps}>
        <ResearchPanel research={data.research} summary={data.report.summary} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {data.pieces.map((p) => (
          <PieceCard
            key={p.type}
            piece={p}
            facts={data.research.facts}
            imageDataUrl={p.type === 'instagram' || p.type === 'meta_ads' ? image : undefined}
            className={WIDE.has(p.type) ? 'lg:col-span-2' : ''}
          />
        ))}
      </div>
    </div>
  );
}
