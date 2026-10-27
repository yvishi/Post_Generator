import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/stages/research', () => ({ runResearch: vi.fn() }));
vi.mock('@/lib/stages/draft', () => ({ draftPiece: vi.fn() }));
vi.mock('@/lib/stages/check', () => ({ checkPiece: vi.fn() }));
vi.mock('@/lib/stages/image', () => ({ generateImage: vi.fn() }));
vi.mock('@/lib/stages/report', () => ({ writeReport: vi.fn() }));

import type { Check, PieceResult, ResearchResult } from '@/lib/types';
import { runResearch } from '@/lib/stages/research';
import { checkPiece } from '@/lib/stages/check';
import { generateImage } from '@/lib/stages/image';
import { writeReport } from '@/lib/stages/report';
import { POST as research } from './research/route';
import { POST as draft } from './draft/route';
import { POST as check } from './check/route';
import { POST as image } from './image/route';
import { POST as report } from './report/route';

const call = (handler: (r: Request) => Promise<Response>, stage: string, body: string) =>
  handler(new Request(`http://x/api/${stage}`, { method: 'POST', body }));

const researchResult: ResearchResult = {
  facts: [{ id: 'brand-1', fact: 'Vidya AI covers CBSE and ICSE.', sourceUrl: 'https://vidya.example' }],
  angles: [{ angle: 'Calm exam prep', factIds: ['brand-1'] }],
  errors: [],
  conflicts: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('stage routes', () => {
  it('routes return 400 on invalid body', async () => {
    const r1 = await call(research, 'research', '{}');
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toBe('Enter a topic or a link');

    const r2 = await call(draft, 'draft', JSON.stringify({ type: 'nope' }));
    expect(r2.status).toBe(400);
    // A field error is prefixed with its path; the topic-or-link refine above has none.
    expect((await r2.json()).error).toMatch(/^type: /);

    for (const [handler, stage] of [
      [check, 'check'],
      [image, 'image'],
      [report, 'report'],
    ] as const) {
      const res = await call(handler, stage, '{}');
      expect(res.status, stage).toBe(400);
      expect((await res.json()).error, stage).toMatch(/^\w+: /);
    }

    expect((await call(research, 'research', 'not json')).status).toBe(400);
  });

  it('research route returns stage output', async () => {
    vi.mocked(runResearch).mockResolvedValue(researchResult);
    const res = await call(research, 'research', JSON.stringify({ topic: 'CBSE maths' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(researchResult);
    expect(vi.mocked(runResearch).mock.calls[0]).toHaveLength(1);
  });

  it('check route returns stage output', async () => {
    const result: Check = { pass: true, reasoning: 'ok', issues: [], factIdsUsed: ['brand-1'] };
    vi.mocked(checkPiece).mockResolvedValue(result);
    const body = { draft: { type: 'linkedin', content: { text: 'Hi parents' } }, research: researchResult };
    const res = await call(check, 'check', JSON.stringify(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(vi.mocked(checkPiece).mock.calls[0]).toEqual([body]);
  });

  it('image route returns stage output', async () => {
    vi.mocked(generateImage).mockResolvedValue({ imageDataUrl: 'data:image/png;base64,AAA' });
    const brief = { type: 'image', content: { concept: 'c', style: 's', composition: 'p', altText: 'a' } };
    const res = await call(image, 'image', JSON.stringify({ brief }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ imageDataUrl: 'data:image/png;base64,AAA' });
    expect(vi.mocked(generateImage).mock.calls[0]).toEqual([{ brief }]);
  });

  it('report route returns stage output', async () => {
    vi.mocked(writeReport).mockResolvedValue({ summary: 'All pieces passed.' });
    const pieces: PieceResult[] = [];
    const res = await call(report, 'report', JSON.stringify({ research: researchResult, pieces }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ summary: 'All pieces passed.' });
    expect(vi.mocked(writeReport).mock.calls[0]).toEqual([{ research: researchResult, pieces }]);
  });

  it('stage throw returns 500 with message', async () => {
    vi.mocked(runResearch).mockRejectedValue(new Error('boom'));
    const res = await call(research, 'research', JSON.stringify({ topic: 'x' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });
});
