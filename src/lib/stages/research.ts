// Research stage: brand + topic in parallel, then audience, then the merger. Any one call may fail;
// the stage still returns research and records what went wrong in `errors`.
import { mergeResearch, researchAudience, researchBrand, researchTopic } from '../agents/research-agents';
import { BRAND_FACTS } from '../brand-facts';
import type { Angle, Fact, ResearchRequest, ResearchResult } from '../types';

export type ResearchAgents = {
  researchBrand: () => Promise<{ facts: Fact[]; conflicts: string[] }>;
  researchTopic: (input: ResearchRequest) => Promise<Fact[]>;
  researchAudience: (brand: Fact[], topic: Fact[], input: ResearchRequest) => Promise<Angle[]>;
  mergeResearch: (brand: Fact[], topic: Fact[], audience: Angle[]) => Promise<{ facts: Fact[]; angles: Angle[] }>;
};

// Wrapped so the agents' optional model/deps parameters are never filled by stage arguments.
export const defaultResearchAgents: ResearchAgents = {
  researchBrand: () => researchBrand(),
  researchTopic: (input) => researchTopic(input),
  researchAudience: (brand, topic, input) => researchAudience(brand, topic, input),
  mergeResearch: (brand, topic, audience) => mergeResearch(brand, topic, audience),
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runResearch(input: ResearchRequest, agents: ResearchAgents = defaultResearchAgents): Promise<ResearchResult> {
  const errors: string[] = [];

  const [brandResult, topicResult] = await Promise.allSettled([agents.researchBrand(), agents.researchTopic(input)]);
  let brand: Fact[] = BRAND_FACTS;
  let conflicts: string[] = [];
  if (brandResult.status === 'fulfilled') ({ facts: brand, conflicts } = brandResult.value);
  else errors.push(`Brand research failed: ${message(brandResult.reason)}`);
  let topic: Fact[] = [];
  if (topicResult.status === 'fulfilled') topic = topicResult.value;
  else errors.push(`Topic research failed: ${message(topicResult.reason)}`);

  let angles: Angle[] = [];
  try {
    angles = await agents.researchAudience(brand, topic, input);
  } catch (e) {
    errors.push(`Audience research failed: ${message(e)}`);
  }

  try {
    const merged = await agents.mergeResearch(brand, topic, angles);
    return { ...merged, errors, conflicts };
  } catch (e) {
    errors.push(`Merge failed: ${message(e)}`);
    return { facts: [...brand, ...topic], angles, errors, conflicts };
  }
}
