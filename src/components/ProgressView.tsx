import { CONTENT_META } from '@/lib/content-meta';
import { MAX_ATTEMPTS, type ProgressEvent } from '@/lib/orchestrator';
import type { ContentType } from '@/lib/types';

type Props = { events: ProgressEvent[]; types: ContentType[] };
type Mark = 'pass' | 'fail' | 'pending' | null;
type RowState = { text: string; tone: 'idle' | 'busy' | 'pass' | 'fail' };

function pieceState(events: ProgressEvent[]): RowState {
  const last = events.at(-1);
  if (!last) return { text: 'Waiting', tone: 'idle' };
  const n = last.attempt ?? 1;
  switch (`${last.stage}:${last.status}`) {
    case 'draft:started':
      return { text: n === 1 ? 'Drafting' : `Redrafting (attempt ${n} of ${MAX_ATTEMPTS})`, tone: 'busy' };
    case 'check:started':
      return { text: `Checking (attempt ${n} of ${MAX_ATTEMPTS})`, tone: 'busy' };
    case 'check:passed':
    case 'image:passed':
      return { text: 'Passed', tone: 'pass' };
    case 'check:failed':
      return n < MAX_ATTEMPTS ? { text: 'Sent back with notes', tone: 'busy' } : { text: 'Failed', tone: 'fail' };
    case 'image:started':
      return { text: 'Generating image', tone: 'busy' };
    default:
      return { text: 'Failed', tone: 'fail' };
  }
}

function attemptMarks(events: ProgressEvent[]): Mark[] {
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const forAttempt = events.filter((e) => e.stage === 'check' && e.attempt === i + 1);
    if (forAttempt.some((e) => e.status === 'passed')) return 'pass';
    if (forAttempt.some((e) => e.status === 'failed')) return 'fail';
    return events.some((e) => e.attempt === i + 1) ? 'pending' : null;
  });
}

const toneClass: Record<RowState['tone'], string> = {
  idle: 'text-ink-soft',
  busy: 'text-ink',
  pass: 'text-tick font-semibold',
  fail: 'text-margin font-semibold',
};

function StateText({ state }: { state: RowState }) {
  return (
    <span className={`flex items-center gap-2 text-sm ${toneClass[state.tone]}`}>
      {state.tone === 'busy' && (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-marigold motion-reduce:animate-none" />
      )}
      {state.text}
    </span>
  );
}

function MarkBox({ mark, attempt }: { mark: Mark; attempt: number }) {
  const label =
    mark === 'pass' ? 'passed' : mark === 'fail' ? 'sent back' : mark === 'pending' ? 'in progress' : 'not needed';
  return (
    <span
      title={`Attempt ${attempt}: ${label}`}
      className="relative grid size-8 place-items-center border-l border-rule first:border-l-0"
    >
      <span className="sr-only">{`Attempt ${attempt}: ${label}`}</span>
      {mark === 'pass' && <span aria-hidden className="ink-in font-hand text-2xl leading-none text-tick">✓</span>}
      {mark === 'fail' && <span aria-hidden className="ink-in font-hand text-2xl leading-none text-margin">✗</span>}
      {mark === 'pending' && <span aria-hidden className="size-1.5 rounded-full bg-ink-soft/40" />}
    </span>
  );
}

export function ProgressView({ events, types }: Props) {
  const researchDone = events.some((e) => e.stage === 'research' && e.status === 'done');
  const reportEvents = events.filter((e) => e.stage === 'report');
  const reportLast = reportEvents.at(-1);
  const reportState: RowState = !reportLast
    ? { text: 'Waiting for every piece', tone: 'idle' }
    : reportLast.status === 'started'
      ? { text: 'Writing the summary', tone: 'busy' }
      : reportLast.status === 'failed'
        ? { text: 'Unavailable', tone: 'fail' }
        : { text: 'Done', tone: 'pass' };

  const row = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)_auto]';

  return (
    <section aria-label="Progress" aria-live="polite" className="rounded-lg border border-rule bg-sheet">
      <div className="flex items-baseline justify-between border-b-2 border-ink px-4 pb-2 pt-3 sm:px-5">
        <h2 className="font-display text-lg font-bold">Register</h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">checks · 1 2 3</span>
      </div>
      <div className="px-4 sm:px-5">
        <div className={row}>
          <span className="text-sm font-semibold">Research</span>
          <StateText
            state={researchDone ? { text: 'Done', tone: 'pass' } : { text: 'Researching… brand, topic, audience, merge', tone: 'busy' }}
          />
          <span className="hidden w-24 sm:block" />
        </div>
        {types.map((t) => {
          const mine = events.filter((e) => e.type === t);
          return (
            <div key={t} className={row}>
              <span className="text-sm font-semibold sm:col-auto">{CONTENT_META[t].label}</span>
              <span className="col-start-1 row-start-2 sm:col-auto sm:row-auto">
                <StateText state={pieceState(mine)} />
              </span>
              <span className="row-span-2 flex w-24 rounded border border-rule sm:row-span-1">
                {attemptMarks(mine).map((m, i) => (
                  <MarkBox key={i} mark={m} attempt={i + 1} />
                ))}
              </span>
            </div>
          );
        })}
        <div className={`${row} border-b-0`}>
          <span className="text-sm font-semibold">Report</span>
          <StateText state={reportState} />
          <span className="hidden w-24 sm:block" />
        </div>
      </div>
    </section>
  );
}
