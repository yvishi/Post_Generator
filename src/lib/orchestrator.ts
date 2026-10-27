import { gatherFeedback, pickBest } from './review';
import type { StageApi } from './stage-api';
import type { Attempt, ContentType, PackForm, PackResult, PieceResult, ResearchResult } from './types';

export const MAX_ATTEMPTS = 3;

export type ProgressEvent = {
  stage: 'research' | 'draft' | 'check' | 'image' | 'report' | 'done';
  type?: ContentType;
  attempt?: number;
  status: 'started' | 'passed' | 'failed' | 'done';
};

type Emit = (e: ProgressEvent) => void;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

type Context = { form: PackForm; research: ResearchResult };

/** One draft→check round, built on everything the earlier attempts learned. */
async function round(type: ContentType, ctx: Context, attempts: Attempt[], api: StageApi, emit: Emit, userNote?: string) {
  const n = attempts.length + 1;
  const prior = attempts.length ? attempts[pickBest(attempts)].draft : undefined;
  emit({ stage: 'draft', type, attempt: n, status: 'started' });
  const draft = await api.draft({
    type,
    research: ctx.research,
    topic: ctx.form.topic,
    notes: ctx.form.notes,
    previous: prior,
    feedback: attempts.length ? gatherFeedback(attempts) : undefined,
    userNote,
  });
  emit({ stage: 'check', type, attempt: n, status: 'started' });
  const check = await api.check({ draft, research: ctx.research, topic: ctx.form.topic, notes: ctx.form.notes });
  emit({ stage: 'check', type, attempt: n, status: check.pass ? 'passed' : 'failed' });
  return { draft, check, ...(userNote ? { userNote } : {}) } satisfies Attempt;
}

async function withImage(piece: PieceResult, api: StageApi, emit: Emit): Promise<PieceResult> {
  if (piece.type !== 'image' || !piece.draft) return piece;
  emit({ stage: 'image', type: piece.type, status: 'started' });
  try {
    const { imageDataUrl } = await api.image({ brief: piece.draft });
    emit({ stage: 'image', type: piece.type, status: 'passed' });
    return { ...piece, imageDataUrl };
  } catch (err) {
    emit({ stage: 'image', type: piece.type, status: 'failed' });
    return { ...piece, status: 'error', error: `Image generation error: ${message(err)}` };
  }
}

/** Passed if the latest attempt passed; otherwise held on the best attempt for the user to decide. */
async function settle(type: ContentType, attempts: Attempt[], api: StageApi, emit: Emit): Promise<PieceResult> {
  const last = attempts.at(-1)!;
  if (last.check.pass) {
    return withImage({ type, status: 'passed', draft: last.draft, attempts, bestAttempt: attempts.length - 1 }, api, emit);
  }
  const best = pickBest(attempts);
  return { type, status: 'held', draft: attempts[best].draft, attempts, bestAttempt: best };
}

async function rounds(
  type: ContentType,
  ctx: Context,
  attempts: Attempt[],
  count: number,
  api: StageApi,
  emit: Emit,
  userNote?: string,
): Promise<PieceResult> {
  const all = [...attempts];
  try {
    for (let i = 0; i < count; i++) {
      all.push(await round(type, ctx, all, api, emit, i === 0 ? userNote : undefined));
      if (all.at(-1)!.check.pass) break;
    }
  } catch (err) {
    emit({ stage: 'draft', type, status: 'failed' });
    if (all.length) return { ...(await settle(type, all, api, emit)), error: `Generation error: ${message(err)}` };
    return { type, status: 'error', draft: null, attempts: all, error: `Generation error: ${message(err)}` };
  }
  return settle(type, all, api, emit);
}

/** The user's note plus one more draft→check round on a held piece. */
export function revisePiece(piece: PieceResult, userNote: string, ctx: Context, api: StageApi, emit: Emit = () => {}) {
  return rounds(piece.type, ctx, piece.attempts, 1, api, emit, userNote.trim() || undefined);
}

/** The user overrides the checker and takes the best draft as it is. */
export function acceptPiece(piece: PieceResult, api: StageApi, emit: Emit = () => {}) {
  return withImage({ ...piece, status: 'passed', acceptedByUser: true, error: undefined }, api, emit);
}

export async function runPack(form: PackForm, api: StageApi, onProgress: Emit = () => {}): Promise<PackResult> {
  onProgress({ stage: 'research', status: 'started' });
  const research = await api.research({ topic: form.topic, link: form.link, notes: form.notes });
  onProgress({ stage: 'research', status: 'done' });

  const pieces = await Promise.all(form.types.map((type) => rounds(type, { form, research }, [], MAX_ATTEMPTS, api, onProgress)));

  onProgress({ stage: 'report', status: 'started' });
  let report: { summary: string };
  try {
    report = await api.report({ research, pieces });
    onProgress({ stage: 'report', status: 'done' });
  } catch (err) {
    report = { summary: `Report unavailable: ${message(err)}` };
    onProgress({ stage: 'report', status: 'failed' });
  }

  onProgress({ stage: 'done', status: 'done' });
  return { research, pieces, report };
}
