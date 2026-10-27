import type { StageApi } from './stage-api';
import type { Attempt, ContentType, Draft, PackForm, PackResult, PieceResult, ResearchResult } from './types';

export const MAX_ATTEMPTS = 3;

export type ProgressEvent = {
  stage: 'research' | 'draft' | 'check' | 'image' | 'report' | 'done';
  type?: ContentType;
  attempt?: number;
  status: 'started' | 'passed' | 'failed' | 'done';
};

type Emit = (e: ProgressEvent) => void;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function runPiece(
  type: ContentType,
  form: PackForm,
  research: ResearchResult,
  api: StageApi,
  emit: Emit,
): Promise<PieceResult> {
  const attempts: Attempt[] = [];
  let previous: Draft | undefined;
  let feedback: string[] | undefined;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      emit({ stage: 'draft', type, attempt, status: 'started' });
      const draft = await api.draft({ type, research, topic: form.topic, notes: form.notes, previous, feedback });
      emit({ stage: 'check', type, attempt, status: 'started' });
      const check = await api.check({ draft, research, topic: form.topic, notes: form.notes });
      attempts.push({ draft, check });
      emit({ stage: 'check', type, attempt, status: check.pass ? 'passed' : 'failed' });
      if (check.pass) break;
      previous = draft;
      feedback = check.reasons;
    }
  } catch (err) {
    emit({ stage: 'draft', type, status: 'failed' });
    return {
      type,
      status: 'failed',
      draft: attempts.at(-1)?.draft ?? null,
      attempts,
      failureReasons: [`Generation error: ${message(err)}`],
    };
  }

  const last = attempts.at(-1)!;
  if (!last.check.pass) {
    return { type, status: 'failed', draft: last.draft, attempts, failureReasons: last.check.reasons };
  }

  const piece: PieceResult = { type, status: 'passed', draft: last.draft, attempts, failureReasons: [] };
  if (type !== 'image') return piece;

  emit({ stage: 'image', type, status: 'started' });
  try {
    const { imageDataUrl } = await api.image({ brief: last.draft });
    emit({ stage: 'image', type, status: 'passed' });
    return { ...piece, imageDataUrl };
  } catch (err) {
    emit({ stage: 'image', type, status: 'failed' });
    return { ...piece, status: 'failed', failureReasons: [`Image generation error: ${message(err)}`] };
  }
}

export async function runPack(form: PackForm, api: StageApi, onProgress: Emit = () => {}): Promise<PackResult> {
  onProgress({ stage: 'research', status: 'started' });
  const research = await api.research({ topic: form.topic, link: form.link, notes: form.notes });
  onProgress({ stage: 'research', status: 'done' });

  const pieces = await Promise.all(form.types.map((type) => runPiece(type, form, research, api, onProgress)));

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
