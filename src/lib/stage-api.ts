import type {
  Check,
  CheckRequest,
  Draft,
  DraftRequest,
  ImageRequest,
  ReportRequest,
  ResearchRequest,
  ResearchResult,
} from './types';

export type StageApi = {
  research(r: ResearchRequest): Promise<ResearchResult>;
  draft(r: DraftRequest): Promise<Draft>;
  check(r: CheckRequest): Promise<Check>;
  image(r: ImageRequest): Promise<{ imageDataUrl: string }>;
  report(r: ReportRequest): Promise<{ summary: string }>;
};

async function post<T>(stage: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${stage}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${stage} request failed with status ${res.status}`);
  return data as T;
}

export const httpApi: StageApi = {
  research: (r) => post('research', r),
  draft: (r) => post('draft', r),
  check: (r) => post('check', r),
  image: (r) => post('image', r),
  report: (r) => post('report', r),
};
