import { describe, expect, it, vi } from 'vitest';
import { acceptPiece, revisePiece, runPack, type ProgressEvent } from './orchestrator';
import type { StageApi } from './stage-api';
import type { Check, Draft, Issue, ResearchResult } from './types';

const research: ResearchResult = {
  facts: [{ id: 'brand-1', fact: '₹499/month', sourceUrl: 'https://x' }],
  angles: [],
  errors: [],
  conflicts: [],
};

const issue = (problem: string, rule: Issue['rule'] = 'tone', severity: Issue['severity'] = 'blocking'): Issue => ({
  severity,
  rule,
  quote: '',
  problem,
  fix: `fix ${problem}`,
});
const pass: Check = { pass: true, reasoning: 'ok', issues: [], factIdsUsed: ['brand-1'] };
const fail = (...issues: Issue[]): Check => ({ pass: false, reasoning: 'no', issues, factIdsUsed: [] });

function fakeApi(overrides: Partial<StageApi> = {}): StageApi {
  let n = 0;
  return {
    research: vi.fn(async () => research),
    draft: vi.fn(async (r) => ({ type: r.type, content: { text: `draft ${++n}` } }) as Draft),
    check: vi.fn(async () => pass),
    image: vi.fn(async () => ({ imageDataUrl: 'data:image/png;base64,AAA' })),
    report: vi.fn(async () => ({ summary: 'ok' })),
    ...overrides,
  };
}

describe('runPack', () => {
  it('chains research output into draft', async () => {
    const api = fakeApi();
    await runPack({ topic: 't', types: ['blog'] }, api);
    expect(vi.mocked(api.draft).mock.calls[0][0].research).toBe(research);
  });

  it('passes first try', async () => {
    const { pieces } = await runPack({ topic: 't', types: ['blog'] }, fakeApi());
    expect(pieces[0].status).toBe('passed');
    expect(pieces[0].attempts).toHaveLength(1);
  });

  it('revises then passes', async () => {
    const check = vi.fn().mockResolvedValueOnce(fail(issue('too pushy'))).mockResolvedValue(pass);
    const api = fakeApi({ check });
    const { pieces } = await runPack({ topic: 't', types: ['blog'] }, api);
    expect(pieces[0].attempts).toHaveLength(2);
    const second = vi.mocked(api.draft).mock.calls[1][0];
    expect(second.feedback).toEqual([issue('too pushy')]);
    expect(second.previous).toEqual(pieces[0].attempts[0].draft);
  });

  it('sends feedback from every earlier attempt, not just the last', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(fail(issue('A')))
      .mockResolvedValueOnce(fail(issue('B')))
      .mockResolvedValue(pass);
    const api = fakeApi({ check });
    await runPack({ topic: 't', types: ['blog'] }, api);
    expect(vi.mocked(api.draft).mock.calls[2][0].feedback).toEqual([issue('A'), issue('B')]);
  });

  it('holds the best attempt after 3 failures', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(fail(issue('a'), issue('b')))
      .mockResolvedValueOnce(fail(issue('c')))
      .mockResolvedValueOnce(fail(issue('d'), issue('e')));
    const { pieces } = await runPack({ topic: 't', types: ['blog'] }, fakeApi({ check }));
    expect(pieces[0].status).toBe('held');
    expect(pieces[0].attempts).toHaveLength(3);
    expect(pieces[0].bestAttempt).toBe(1);
    expect(pieces[0].draft).toEqual(pieces[0].attempts[1].draft);
  });

  it('revisePiece runs one more round with the user note', async () => {
    const api = fakeApi({ check: async () => fail(issue('x')) });
    const form = { topic: 't', types: ['blog' as const] };
    const { pieces } = await runPack(form, api);
    vi.mocked(api.draft).mockClear();
    api.check = vi.fn(async () => pass);
    const revised = await revisePiece(pieces[0], ' drop the stat ', { form, research }, api);
    expect(vi.mocked(api.draft).mock.calls[0][0]).toMatchObject({ userNote: 'drop the stat', feedback: [issue('x')] });
    expect(revised.status).toBe('passed');
    expect(revised.attempts).toHaveLength(4);
    expect(revised.attempts[3].userNote).toBe('drop the stat');
  });

  it('acceptPiece passes a held piece and makes its image', async () => {
    const api = fakeApi({ check: async () => fail(issue('vague')) });
    const { pieces } = await runPack({ topic: 't', types: ['image'] }, api);
    const accepted = await acceptPiece(pieces[0], api);
    expect(accepted).toMatchObject({ status: 'passed', acceptedByUser: true, imageDataUrl: 'data:image/png;base64,AAA' });
  });

  it('stage error fails only that piece', async () => {
    const api = fakeApi({
      draft: async (r) => {
        if (r.type === 'google_ads') throw new Error('boom');
        return { type: r.type, content: {} };
      },
    });
    const { pieces } = await runPack({ topic: 't', types: ['blog', 'google_ads'] }, api);
    expect(pieces.map((p) => p.type)).toEqual(['blog', 'google_ads']);
    expect(pieces[0].status).toBe('passed');
    expect(pieces[1].status).toBe('error');
    expect(pieces[1].error).toMatch(/^Generation error/);
  });

  it('image only after brief passes', async () => {
    const api = fakeApi({ check: async () => fail(issue('vague')) });
    await runPack({ topic: 't', types: ['image'] }, api);
    expect(api.image).not.toHaveBeenCalled();
  });

  it('emits progress', async () => {
    const events: ProgressEvent[] = [];
    const check = vi.fn().mockResolvedValueOnce(fail(issue('x'))).mockResolvedValue(pass);
    await runPack({ topic: 't', types: ['blog'] }, fakeApi({ check }), (e) => events.push(e));
    expect(events).toContainEqual({ stage: 'check', type: 'blog', attempt: 2, status: 'started' });
    expect(events.at(-1)).toEqual({ stage: 'done', status: 'done' });
  });
});
