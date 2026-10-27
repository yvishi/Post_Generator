import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { mergeResearch, researchAudience, researchBrand, researchTopic } from '../agents/research-agents';
import { BRAND_FACTS } from '../brand-facts';
import type { Angle, Fact } from '../types';
import { runResearch, type ResearchAgents } from './research';

// models.ts imports 'server-only', which throws outside a React Server Component bundle.
vi.mock('server-only', () => ({}));

const topicFact: Fact = { id: 'topic-1', fact: 'CBSE board exams start 15 Feb.', sourceUrl: 'https://cbse.gov.in/a' };
const angle: Angle = { angle: 'Calm prep before boards', factIds: ['brand-1', 'topic-1'] };

function fakeAgents(overrides: Partial<ResearchAgents> = {}, calls: string[] = []): ResearchAgents {
  return {
    researchBrand: async () => {
      calls.push('brand');
      return { facts: BRAND_FACTS, conflicts: [] };
    },
    researchTopic: async () => {
      calls.push('topic');
      return [topicFact];
    },
    researchAudience: async () => {
      calls.push('audience');
      return [angle];
    },
    mergeResearch: async (brand, topic, audience) => {
      calls.push('merge');
      return { facts: [...brand, ...topic], angles: audience };
    },
    ...overrides,
  };
}

/** A V4 mock whose every call answers with `text` (JSON for structured calls). */
const mockModel = (text: string, extra: { sources?: { url: string }[] } = {}) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [
        { type: 'text' as const, text },
        ...(extra.sources ?? []).map((s, i) => ({ type: 'source' as const, sourceType: 'url' as const, id: `s${i}`, url: s.url })),
      ],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });

const promptText = (model: MockLanguageModelV4) => JSON.stringify(model.doGenerateCalls[0].prompt);

describe('runResearch', () => {
  it('runs brand and topic before audience, then merge', async () => {
    const calls: string[] = [];
    const audienceArgs: Fact[][] = [];
    const agents = fakeAgents(
      {
        researchAudience: async (brand, topic) => {
          calls.push('audience');
          audienceArgs.push(brand, topic);
          return [angle];
        },
      },
      calls,
    );
    const result = await runResearch({ topic: 'Board exam prep' }, agents);

    expect(calls.slice(0, 2).sort()).toEqual(['brand', 'topic']);
    expect(calls.slice(2)).toEqual(['audience', 'merge']);
    expect(audienceArgs).toEqual([BRAND_FACTS, [topicFact]]);
    expect(result).toEqual({ facts: [...BRAND_FACTS, topicFact], angles: [angle], errors: [], conflicts: [] });
  });

  it('topic failure still returns research', async () => {
    const agents = fakeAgents({
      researchTopic: async () => {
        throw new Error('Could not read link: the page returned status 404');
      },
    });
    const result = await runResearch({ link: 'https://bad.example' }, agents);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^Topic research failed/);
    expect(result.facts.map((f) => f.id)).toContain('brand-1');
  });

  it('brand failure falls back to the baseline brand facts', async () => {
    const agents = fakeAgents({
      researchBrand: async () => {
        throw new Error('site down');
      },
    });
    const result = await runResearch({ topic: 'x' }, agents);

    expect(result.errors).toEqual(['Brand research failed: site down']);
    expect(result.facts).toEqual([...BRAND_FACTS, topicFact]);
  });

  it('merger failure falls back to raw facts', async () => {
    const siteFact: Fact = { id: 'site-1', fact: 'New offer.', sourceUrl: 'https://site' };
    const agents = fakeAgents({
      researchBrand: async () => ({ facts: [...BRAND_FACTS, siteFact], conflicts: ['brand-1 differs'] }),
      mergeResearch: async () => {
        throw new Error('bad JSON');
      },
    });
    const result = await runResearch({ topic: 'x' }, agents);

    expect(result.facts).toEqual([...BRAND_FACTS, siteFact, topicFact]);
    expect(result.angles).toEqual([angle]);
    expect(result.conflicts).toEqual(['brand-1 differs']);
    expect(result.errors).toEqual(['Merge failed: bad JSON']);
  });

  it('audience failure leaves angles empty and still merges', async () => {
    const merge = vi.fn(async (brand: Fact[], topic: Fact[], audience: Angle[]) => ({ facts: [...brand, ...topic], angles: audience }));
    const agents = fakeAgents({
      researchAudience: async () => {
        throw new Error('timeout');
      },
      mergeResearch: merge,
    });
    const result = await runResearch({ topic: 'x' }, agents);

    expect(merge).toHaveBeenCalledWith(BRAND_FACTS, [topicFact], []);
    expect(result.angles).toEqual([]);
    expect(result.errors).toEqual(['Audience research failed: timeout']);
  });
});

describe('research agents', () => {
  it('topic-only mode searches, link mode fetches', async () => {
    const fetcher = vi.fn(async (url: string) => ({ url, text: 'Linked page text about board exams.' }));

    // Link mode: fetch the link; every fact's sourceUrl is the link, ids are assigned in code.
    const linkModel = mockModel(
      JSON.stringify({ facts: [{ id: 'x-9', fact: 'Exams start 15 Feb.', sourceUrl: 'https://elsewhere' }] }),
    );
    const searchUnused = mockModel('should not be called');
    const linkFacts = await researchTopic(
      { link: 'https://news.example/boards' },
      { model: linkModel, searchModel: searchUnused, fetcher },
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('https://news.example/boards');
    expect(searchUnused.doGenerateCalls).toHaveLength(0);
    expect(linkFacts).toEqual([{ id: 'topic-1', fact: 'Exams start 15 Feb.', sourceUrl: 'https://news.example/boards' }]);
    expect(promptText(linkModel)).toContain('Linked page text about board exams.');

    // Topic-only mode: search first, then a structured call over the notes; no fetch.
    fetcher.mockClear();
    const search = mockModel('- CBSE exams start 15 Feb. https://cbse.gov.in/datesheet', {
      sources: [{ url: 'https://cbse.gov.in/datesheet' }],
    });
    const text = mockModel(
      JSON.stringify({
        facts: [
          { id: 'topic-7', fact: 'CBSE exams start 15 Feb.', sourceUrl: 'https://cbse.gov.in/datesheet' },
          { id: 'topic-8', fact: 'Made-up claim.', sourceUrl: 'https://invented.example' },
        ],
      }),
    );
    const topicFacts = await researchTopic({ topic: 'Board exam dates' }, { model: text, searchModel: search, fetcher });

    expect(fetcher).not.toHaveBeenCalled();
    expect(search.doGenerateCalls).toHaveLength(1);
    expect(promptText(search)).toContain('Board exam dates');
    expect(promptText(text)).toContain('cbse.gov.in/datesheet');
    expect(topicFacts).toEqual([{ id: 'topic-1', fact: 'CBSE exams start 15 Feb.', sourceUrl: 'https://cbse.gov.in/datesheet' }]);
  });

  it('brand research keeps the baseline and numbers new site facts in code', async () => {
    const fetcher = vi.fn(async (url: string) => ({ url, text: 'Vidya AI now ₹549/month.' }));
    const model = mockModel(
      JSON.stringify({
        facts: [{ id: 'brand-3', fact: 'Vidya AI costs ₹549/month.' }],
        conflicts: ['brand-1 says ₹499/month; the live page says ₹549/month'],
      }),
    );
    const result = await researchBrand(model, fetcher);

    expect(fetcher).toHaveBeenCalledWith(BRAND_FACTS[0].sourceUrl);
    expect(result.facts.slice(0, BRAND_FACTS.length)).toEqual(BRAND_FACTS);
    expect(result.facts.at(-1)).toEqual({ id: 'site-1', fact: 'Vidya AI costs ₹549/month.', sourceUrl: BRAND_FACTS[0].sourceUrl });
    expect(result.conflicts).toHaveLength(1);
  });

  it('audience and merger drop unknown fact ids', async () => {
    const brand = BRAND_FACTS.slice(0, 2);
    const audience = await researchAudience(
      brand,
      [topicFact],
      { topic: 'x' },
      mockModel(
        JSON.stringify({
          angles: [
            { angle: 'A', factIds: ['brand-1', 'ghost-1'] },
            { angle: 'B', factIds: ['ghost-2'] },
          ],
        }),
      ),
    );
    expect(audience).toEqual([{ angle: 'A', factIds: ['brand-1'] }]);

    const merged = await mergeResearch(
      brand,
      [topicFact],
      audience,
      mockModel(
        JSON.stringify({
          facts: [
            { id: 'topic-1', fact: 'Reworded!', sourceUrl: 'https://other' },
            { id: 'invented-1', fact: 'Nope', sourceUrl: 'x' },
          ],
          angles: [
            { angle: 'A', factIds: ['brand-1', 'topic-1'] },
            { angle: 'C', factIds: ['topic-1'] },
          ],
        }),
      ),
    );
    // Original fact text is kept; brand-1 was dropped by the merger, so angle A only cites topic-1.
    expect(merged.facts).toEqual([topicFact]);
    expect(merged.angles).toEqual([
      { angle: 'A', factIds: ['topic-1'] },
      { angle: 'C', factIds: ['topic-1'] },
    ]);
  });

  it('merger that keeps no known facts throws so the stage falls back', async () => {
    await expect(
      mergeResearch(BRAND_FACTS, [], [], mockModel(JSON.stringify({ facts: [{ id: 'z', fact: 'z', sourceUrl: 'z' }], angles: [] }))),
    ).rejects.toThrow(/no known facts/);
  });
});
