import { APICallError } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CheckRequest, DraftRequest, Issue } from '../types';
import { IMAGE_MODEL_ID } from '../models';
import { checkPiece } from './check';
import { draftPiece } from './draft';
import { generateImage } from './image';
import { writeReport } from './report';

// models.ts imports 'server-only', which throws outside a React Server Component bundle.
vi.mock('server-only', () => ({}));

beforeAll(() => {
  process.env.OPENROUTER_API_KEY = 'test-key';
});

const mockModel = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text' as const, text }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });

const promptText = (m: MockLanguageModelV4) => JSON.stringify(m.doGenerateCalls[0].prompt);
const research = { facts: [], angles: [], errors: [], conflicts: [] };

describe('checkPiece', () => {
  const xDraft = (post: string): CheckRequest => ({ draft: { type: 'x_thread', content: { posts: [post] } }, research });

  it('a format violation overrides an LLM pass', async () => {
    const model = mockModel(JSON.stringify({ pass: true, reasoning: 'Looks fine.', issues: [], factIdsUsed: ['brand-1'] }));
    const check = await checkPiece(xDraft('a'.repeat(300)), model);

    expect(check.pass).toBe(false);
    const format = check.issues.find((i) => i.rule === 'format');
    expect(format).toMatchObject({ severity: 'blocking', quote: '' });
    expect(format?.problem).toContain('280');
    expect(check.factIdsUsed).toEqual(['brand-1']);
    expect(check.reasoning).toBe('Looks fine.');
  });

  it('passes when the LLM passes and the format is fine, keeping minor issues', async () => {
    const minor: Issue = { severity: 'minor', rule: 'tone', quote: 'Hi', problem: 'A bit curt', fix: 'Warm it up' };
    const model = mockModel(JSON.stringify({ pass: true, reasoning: 'ok', issues: [minor], factIdsUsed: [] }));
    const check = await checkPiece(xDraft('Short post'), model);

    expect(check.pass).toBe(true);
    expect(check.issues).toEqual([minor]);
  });

  it('an LLM pass:false with only minor issues still passes', async () => {
    const minor: Issue = { severity: 'minor', rule: 'tone', quote: 'Hi', problem: 'A bit curt', fix: 'Warm it up' };
    const model = mockModel(JSON.stringify({ pass: false, reasoning: 'meh', issues: [minor], factIdsUsed: [] }));
    const check = await checkPiece(xDraft('Short post'), model);
    expect(check.pass).toBe(true);
    expect(check.issues).toEqual([minor]);
  });

  it('a blocking LLM issue fails even when the LLM says pass', async () => {
    const blocking: Issue = { severity: 'blocking', rule: 'unsupported_claim', quote: 'x', problem: 'No fact', fix: 'Remove' };
    const model = mockModel(JSON.stringify({ pass: true, reasoning: 'ok', issues: [blocking], factIdsUsed: [] }));
    expect((await checkPiece(xDraft('Short post'), model)).pass).toBe(false);
  });
});

describe('draftPiece', () => {
  it('sends checker feedback in the prompt and returns typed content', async () => {
    const model = mockModel(JSON.stringify({ text: 'Hello parents' }));
    const feedback: Issue[] = [{ severity: 'blocking', rule: 'tone', quote: 'Buy now', problem: 'too pushy', fix: 'Soften it' }];
    const req: DraftRequest = { type: 'linkedin', research, feedback };
    const draft = await draftPiece(req, model);

    expect(draft).toEqual({ type: 'linkedin', content: { text: 'Hello parents' } });
    expect(promptText(model)).toContain('<checker_feedback>');
    expect(promptText(model)).toContain('too pushy');
  });
});

describe('call limits', () => {
  it('text stage calls carry a timeout signal', async () => {
    const check = mockModel(JSON.stringify({ pass: true, reasoning: 'ok', issues: [], factIdsUsed: [] }));
    await checkPiece({ draft: { type: 'linkedin', content: { text: 'Hi' } }, research }, check);
    const report = mockModel(JSON.stringify({ summary: 'ok' }));
    await writeReport({ research, pieces: [] }, report);
    const draft = mockModel(JSON.stringify({ text: 'Hi' }));
    await draftPiece({ type: 'linkedin', research }, draft);

    for (const m of [check, report, draft]) expect(m.doGenerateCalls[0].abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('a retryable API error is retried only once', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: 'overloaded', url: 'x', requestBodyValues: {}, statusCode: 503, isRetryable: true });
      },
    });
    await expect(writeReport({ research, pieces: [] }, model)).rejects.toThrow();
    expect(model.doGenerateCalls).toHaveLength(2);
  });
});

describe('generateImage', () => {
  const brief = {
    type: 'image' as const,
    content: { concept: 'Parent and child at a kitchen table', style: 'Warm watercolor', composition: 'Close-up, side light', altText: 'A parent helps' },
  };
  const fakeFetch = (body: unknown, status = 200) =>
    vi.fn(async (_url: unknown, _init?: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));

  it('returns the data URL and sends auth plus the rendered brief', async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,AAA' } }] } }] });
    const out = await generateImage({ brief }, fetchImpl as unknown as typeof fetch);

    expect(out).toEqual({ imageDataUrl: 'data:image/png;base64,AAA' });
    const init = fetchImpl.mock.calls[0][1] as { headers: Record<string, string>; body: string };
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(body.model).toBe(IMAGE_MODEL_ID);
    expect(body.modalities).toEqual(['image', 'text']);
    expect(body.messages[0].content).toContain('Warm watercolor');
    expect(body.messages[0].content).toContain('Parent and child at a kitchen table');
  });

  it('rejects when no image is returned', async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: 'sorry' } }] });
    await expect(generateImage({ brief }, fetchImpl as unknown as typeof fetch)).rejects.toThrow('No image returned');
  });

  it('sends a timeout signal and reports a timeout in plain words', async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { images: [{ image_url: { url: 'data:x' } }] } }] });
    await generateImage({ brief }, fetchImpl as unknown as typeof fetch);
    expect((fetchImpl.mock.calls[0][1] as { signal?: unknown }).signal).toBeInstanceOf(AbortSignal);

    const slow = (async () => {
      throw new DOMException('timed out', 'TimeoutError');
    }) as unknown as typeof fetch;
    await expect(generateImage({ brief }, slow)).rejects.toThrow('Image generation timed out after 50s');
  });

  it('includes status and body text on HTTP errors', async () => {
    const fetchImpl = fakeFetch('quota exceeded', 429);
    await expect(generateImage({ brief }, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/429.*quota exceeded/);
  });
});

describe('writeReport', () => {
  it('returns the summary', async () => {
    const model = mockModel(JSON.stringify({ summary: 'Three pieces passed.' }));
    expect(await writeReport({ research, pieces: [] }, model)).toEqual({ summary: 'Three pieces passed.' });
  });
});
