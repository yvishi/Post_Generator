import type { PackResult } from '@/lib/types';
import { PieceCard } from './PieceCard';
import { ResearchPanel } from './ResearchPanel';

export function Results({ data }: { data: PackResult }) {
  const passed = data.pieces.filter((p) => p.status === 'passed').length;
  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-[var(--margin-x)_minmax(0,1fr)]">
        <div aria-hidden className="pt-1 text-center font-hand text-2xl leading-none text-margin">
          {passed}/{data.pieces.length}
        </div>
        <div className="mr-3 flex flex-col gap-2 sm:mr-5">
          <h2 className="font-display text-2xl font-bold leading-tight">
            {passed === data.pieces.length
              ? 'Every piece passed the checker'
              : `${passed} of ${data.pieces.length} pieces passed the checker`}
          </h2>
          <p className="max-w-prose leading-relaxed">{data.report.summary}</p>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {data.pieces.map((p) => (
          <PieceCard key={p.type} piece={p} facts={data.research.facts} />
        ))}
      </div>

      <div className="ml-[var(--margin-x)] mr-3 sm:mr-5">
        <ResearchPanel research={data.research} />
      </div>
    </div>
  );
}
