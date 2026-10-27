import { describe, expect, it } from 'vitest';
import { BRAND_FACTS } from './brand-facts';
import { draftSchemas, packFormSchema, researchRequestSchema } from './types';

describe('types', () => {
  it('research request needs a topic or an http(s) link', () => {
    expect(researchRequestSchema.safeParse({}).success).toBe(false);
    expect(researchRequestSchema.safeParse({ topic: '   ' }).success).toBe(false);
    expect(researchRequestSchema.safeParse({ link: 'ftp://a' }).success).toBe(false);
    expect(researchRequestSchema.safeParse({ topic: 'x' }).success).toBe(true);
  });

  it('pack form needs at least one type', () => {
    expect(packFormSchema.safeParse({ topic: 'x', types: [] }).success).toBe(false);
    expect(packFormSchema.safeParse({ topic: 'x', types: ['blog'] }).success).toBe(true);
  });

  it('meta ads need exactly 3 variations', () => {
    const v = { primaryText: 'a', headline: 'b', cta: 'c' };
    expect(draftSchemas.meta_ads.safeParse({ variations: [v, v] }).success).toBe(false);
  });

  it('has the 15 brand facts', () => {
    expect(BRAND_FACTS).toHaveLength(15);
    expect(BRAND_FACTS.some((f) => f.fact.includes('₹499'))).toBe(true);
    expect(BRAND_FACTS.some((f) => f.fact.includes('10 Nov'))).toBe(true);
  });
});
