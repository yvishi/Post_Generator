// The four research calls. Each takes its model (and fetcher) as parameters so tests can inject mocks.
// Fact ids are always assigned or checked in code: the model's ids are never trusted.
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { BRAND_FACTS, CLIENT_SITE_URL } from '../brand-facts';
import { fetchPage } from '../fetch-page';
import { searchModel as defaultSearchModel, textModel } from '../models';
import { audiencePrompt, brandPrompt, mergePrompt, topicPrompt } from '../prompts';
import { angleSchema, factSchema, type Angle, type Fact, type ResearchRequest } from '../types';

export type PageFetcher = (url: string) => Promise<{ url: string; text: string }>;

const brandOutput = z.object({
  facts: z.array(z.object({ id: z.string(), fact: z.string() })),
  conflicts: z.array(z.string()),
});
const topicOutput = z.object({ facts: z.array(factSchema) });
const audienceOutput = z.object({ angles: z.array(angleSchema) });
const mergeOutput = z.object({ facts: z.array(factSchema), angles: z.array(angleSchema) });

async function generate<T>(model: LanguageModel, schema: z.ZodType<T>, prompt: string): Promise<T> {
  const { output } = await generateText({ model, output: Output.object({ schema }), prompt });
  return output;
}

/** Keeps only fact ids in `known` (deduped); drops angles left with no supporting fact. */
function keepKnownAngles(angles: Angle[], known: Set<string>): Angle[] {
  return angles
    .map((a) => ({ angle: a.angle, factIds: [...new Set(a.factIds.filter((id) => known.has(id)))] }))
    .filter((a) => a.angle.trim() && a.factIds.length > 0);
}

/** Compares the live client site with the baseline: returns BRAND_FACTS plus new site-N facts, and any conflicts. */
export async function researchBrand(
  model: LanguageModel = textModel(),
  fetcher: PageFetcher = fetchPage,
): Promise<{ facts: Fact[]; conflicts: string[] }> {
  const page = await fetcher(CLIENT_SITE_URL);
  const out = await generate(model, brandOutput, brandPrompt(page.text));
  const siteFacts = out.facts
    .filter((f) => f.fact.trim())
    .map((f, i) => ({ id: `site-${i + 1}`, fact: f.fact, sourceUrl: CLIENT_SITE_URL }));
  return { facts: [...BRAND_FACTS, ...siteFacts], conflicts: out.conflicts.filter((c) => c.trim()) };
}

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;
const normalizeUrl = (url: string) => url.trim().replace(/[.,;:]+$/, '').replace(/\/+$/, '');

/**
 * Link mode: fetch the link and extract facts from it (sourceUrl is always the link).
 * Topic-only mode (R5): a web-search call writes notes with URLs, then a structured call extracts facts from them.
 * A fact whose sourceUrl is not among the search's URLs is dropped, since its attribution cannot be trusted.
 */
export async function researchTopic(
  input: ResearchRequest,
  deps: { model?: LanguageModel; searchModel?: LanguageModel; fetcher?: PageFetcher } = {},
): Promise<Fact[]> {
  const model = deps.model ?? textModel();
  const number = (facts: Fact[]) => facts.filter((f) => f.fact.trim()).map((f, i) => ({ ...f, id: `topic-${i + 1}` }));

  if (input.link) {
    const page = await (deps.fetcher ?? fetchPage)(input.link);
    const out = await generate(model, topicOutput, topicPrompt(input, page.text));
    return number(out.facts.map((f) => ({ ...f, sourceUrl: input.link! })));
  }

  const search = await generateText({ model: deps.searchModel ?? defaultSearchModel(), prompt: topicPrompt(input) });
  const sourceUrls = search.sources.flatMap((s) => (s.sourceType === 'url' ? [s.url] : []));
  const urls = [...sourceUrls, ...(search.text.match(URL_PATTERN) ?? [])];
  const known = new Map(urls.map((u) => [normalizeUrl(u), normalizeUrl(u)]));
  if (known.size === 0) throw new Error('Web search returned no source URLs');

  const notes = sourceUrls.length ? `${search.text}\n\nSources:\n${sourceUrls.join('\n')}` : search.text;
  const out = await generate(model, topicOutput, topicPrompt(input, notes));
  return number(
    out.facts.flatMap((f) => {
      const url = known.get(normalizeUrl(f.sourceUrl));
      return url ? [{ ...f, sourceUrl: url }] : [];
    }),
  );
}

/** Proposes parent-focused angles; each angle may only cite the brand and topic facts it was given. */
export async function researchAudience(
  brand: Fact[],
  topic: Fact[],
  input: ResearchRequest,
  model: LanguageModel = textModel(),
): Promise<Angle[]> {
  const out = await generate(model, audienceOutput, audiencePrompt(brand, topic, input));
  return keepKnownAngles(out.angles, new Set([...brand, ...topic].map((f) => f.id)));
}

/**
 * Dedupes and filters the research. The merger only chooses which facts to keep: each kept fact is the
 * original (id, text, sourceUrl), so the model cannot reword or invent one. Throws if it keeps no known fact.
 */
export async function mergeResearch(
  brand: Fact[],
  topic: Fact[],
  audience: Angle[],
  model: LanguageModel = textModel(),
): Promise<{ facts: Fact[]; angles: Angle[] }> {
  const out = await generate(model, mergeOutput, mergePrompt(brand, topic, audience));
  const originals = new Map([...brand, ...topic].map((f) => [f.id, f]));
  const keptIds = new Set(out.facts.map((f) => f.id).filter((id) => originals.has(id)));
  if (keptIds.size === 0) throw new Error('Merger kept no known facts');
  const facts = [...originals.values()].filter((f) => keptIds.has(f.id));
  return { facts, angles: keepKnownAngles(out.angles, keptIds) };
}
