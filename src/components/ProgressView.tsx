import { CONTENT_META } from '@/lib/content-meta';
import { MAX_ATTEMPTS, type ProgressEvent } from '@/lib/orchestrator';
import type { ContentType } from '@/lib/types';
import { ChannelIcon } from './icons';

type Props = { events: ProgressEvent[]; types: ContentType[] };
type State = { text: string; tone: 'busy' | 'ready' | 'held' };

/** Plain-language status for one piece; the agent mechanics stay out of sight. */
export function pieceStatus(events: ProgressEvent[], researchDone: boolean): State {
  const last = events.at(-1);
  if (!last) return { text: researchDone ? 'Writing' : 'Researching', tone: 'busy' };
  switch (`${last.stage}:${last.status}`) {
    case 'draft:started':
      return { text: (last.attempt ?? 1) > 1 ? 'Polishing' : 'Writing', tone: 'busy' };
    case 'check:started':
      return { text: 'Reviewing', tone: 'busy' };
    case 'check:passed':
    case 'image:passed':
      return { text: 'Ready', tone: 'ready' };
    case 'check:failed':
      return (last.attempt ?? 1) < MAX_ATTEMPTS ? { text: 'Polishing', tone: 'busy' } : { text: 'Needs review', tone: 'held' };
    case 'image:started':
      return { text: 'Creating image', tone: 'busy' };
    default:
      return { text: 'Needs review', tone: 'held' };
  }
}

export function ProgressView({ events, types }: Props) {
  const researchDone = events.some((e) => e.stage === 'research' && e.status === 'done');
  const states = types.map((t) => pieceStatus(events.filter((e) => e.type === t), researchDone));
  const finished = states.filter((s) => s.tone !== 'busy').length;
  const pct = researchDone ? 15 + (85 * finished) / types.length : 8;

  return (
    <section aria-label="Progress" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <p aria-live="polite" className="text-sm text-muted">
          {researchDone ? (
            <>
              <span className="font-semibold text-ink">
                {finished} of {types.length}
              </span>{' '}
              done
            </>
          ) : (
            'Reading up on your topic and Vidya’s latest offers…'
          )}
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-peacock transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {types.map((t, i) => {
          const s = states[i];
          return (
            <div
              key={t}
              className={`flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 ${t === 'blog' ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <ChannelIcon type={t} />
                  {CONTENT_META[t].title}
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    s.tone === 'ready' ? 'text-peacock' : s.tone === 'held' ? 'text-danger' : 'text-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${
                      s.tone === 'ready' ? 'bg-marigold' : s.tone === 'held' ? 'bg-danger' : 'animate-pulse bg-muted/50 motion-reduce:animate-none'
                    }`}
                  />
                  {s.text}
                </span>
              </div>
              <div aria-hidden className="flex flex-col gap-2.5">
                <div className={`h-3 w-2/3 rounded-full ${s.tone === 'busy' ? 'skeleton' : 'bg-line'}`} />
                <div className={`h-3 w-full rounded-full ${s.tone === 'busy' ? 'skeleton' : 'bg-line'}`} />
                <div className={`h-3 w-5/6 rounded-full ${s.tone === 'busy' ? 'skeleton' : 'bg-line'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
