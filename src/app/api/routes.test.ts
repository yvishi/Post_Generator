import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/stages/research', () => ({ runResearch: vi.fn() }));
vi.mock('@/lib/stages/draft', () => ({ draftPiece: vi.fn() }));
vi.mock('@/lib/stages/check', () => ({ checkPiece: vi.fn() }));
vi.mock('@/lib/stages/image', () => ({ generateImage: vi.fn() }));
vi.mock('@/lib/stages/report', () => ({ writeReport: vi.fn() }));

import { runResearch } from '@/lib/stages/research';
import { POST as research } from './research/route';
import { POST as draft } from './draft/route';

const call = (handler: (r: Request) => Promise<Response>, stage: string, body: string) =>
  handler(new Request(`http://x/api/${stage}`, { method: 'POST', body }));

beforeEach(() => {
  vi.mocked(runResearch).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('stage routes', () => {
  it('routes return 400 on invalid body', async () => {
    const r1 = await call(research, 'research', '{}');
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toBe('Enter a topic or a link');

    const r2 = await call(draft, 'draft', JSON.stringify({ type: 'nope' }));
    expect(r2.status).toBe(400);
    expect(typeof (await r2.json()).error).toBe('string');

    expect((await call(research, 'research', 'not json')).status).toBe(400);
  });

  it('research route returns stage output', async () => {
    const fixture = { brandFacts: [], topicFacts: [], audience: [], angles: [] };
    vi.mocked(runResearch).mockResolvedValue(fixture as never);
    const res = await call(research, 'research', JSON.stringify({ topic: 'CBSE maths' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fixture);
    expect(vi.mocked(runResearch).mock.calls[0]).toHaveLength(1);
  });

  it('stage throw returns 500 with message', async () => {
    vi.mocked(runResearch).mockRejectedValue(new Error('boom'));
    const res = await call(research, 'research', JSON.stringify({ topic: 'x' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });
});
