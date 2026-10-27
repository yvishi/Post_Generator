import { describe, expect, it, vi } from 'vitest';
import { runPack, type ProgressEvent } from './orchestrator';
import type { StageApi } from './stage-api';
import type { Check, Draft, ResearchResult } from './types';

const research: ResearchResult = {
  facts: [{ id: 'brand-1', fact: '₹499/month', sourceUrl: 'https://x' }],
  angles: [],
  errors: [],
  conflicts: [],
};

const pass: Check = { pass: true, reasons: [], factIdsUsed: ['brand-1'] };
const fail = (...reasons: string[]): Check => ({ pass: false, reasons, factIdsUsed: [] });

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
    const check = vi.fn().mockResolvedValueOnce(fail('too pushy')).mockResolvedValue(pass);
    const api = fakeApi({ check });
    const { pieces } = await runPack({ topic: 't', types: ['blog'] }, api);
    expect(pieces[0].attempts).toHaveLength(2);
    const second = vi.mocked(api.draft).mock.calls[1][0];
    expect(second.feedback).toEqual(['too pushy']);
    expect(second.previous).toEqual(pieces[0].attempts[0].draft);
  });

  it('fails after 3 attempts with last reasons', async () => {
    let n = 0;
    const { pieces } = await runPack({ topic: 't', types: ['blog'] }, fakeApi({ check: async () => fail(`r${++n}`) }));
    expect(pieces[0].status).toBe('failed');
    expect(pieces[0].attempts).toHaveLength(3);
    expect(pieces[0].failureReasons).toEqual(['r3']);
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
    expect(pieces[1].status).toBe('failed');
    expect(pieces[1].failureReasons[0]).toMatch(/^Generation error/);
  });

  it('image only after brief passes', async () => {
    const api = fakeApi({ check: async () => fail('vague') });
    await runPack({ topic: 't', types: ['image'] }, api);
    expect(api.image).not.toHaveBeenCalled();
  });

  it('emits progress', async () => {
    const events: ProgressEvent[] = [];
    const check = vi.fn().mockResolvedValueOnce(fail('x')).mockResolvedValue(pass);
    await runPack({ topic: 't', types: ['blog'] }, fakeApi({ check }), (e) => events.push(e));
    expect(events).toContainEqual({ stage: 'check', type: 'blog', attempt: 2, status: 'started' });
    expect(events.at(-1)).toEqual({ stage: 'done', status: 'done' });
  });
});
