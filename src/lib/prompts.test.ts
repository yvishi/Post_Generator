import { describe, expect, it } from 'vitest';
import { BRAND_FACTS } from './brand-facts';
import { checkPrompt, draftPrompt, mergePrompt, nest, reportPrompt } from './prompts';
import type { DraftRequest, Issue, ResearchResult } from './types';

const research: ResearchResult = { facts: BRAND_FACTS.slice(0, 2), angles: [], errors: [], conflicts: [] };
const baseReq: DraftRequest = { type: 'linkedin', research, topic: 'Exam stress' };
const pushy: Issue = { severity: 'blocking', rule: 'tone', quote: 'Buy now!', problem: 'too pushy', fix: 'Invite, do not push.' };

describe('nest', () => {
  it('wraps a value as pretty JSON in tags', () => {
    const out = nest('a', { x: 1 });
    expect(out).toContain('<a>');
    expect(out).toContain('"x": 1');
    expect(out).toContain('</a>');
  });

  it('passes strings through unchanged', () => {
    expect(nest('a', 'hello')).toBe('<a>\nhello\n</a>');
  });

  it('marks undefined or empty values as (none)', () => {
    expect(nest('a', undefined)).toBe('<a>(none)</a>');
    expect(nest('a', '')).toBe('<a>(none)</a>');
    expect(nest('a', [])).toBe('<a>(none)</a>');
  });
});

describe('draftPrompt', () => {
  it('nests the previous draft and checker feedback on a retry', () => {
    const out = draftPrompt({ ...baseReq, previous: { type: 'linkedin', content: { text: 'Buy now!' } }, feedback: [pushy] });
    expect(out).toContain('<checker_feedback>');
    expect(out).toContain('too pushy');
    expect(out).toContain('<previous_draft>');
  });

  it('has no checker feedback or revision note on a first attempt', () => {
    const out = draftPrompt(baseReq);
    expect(out).not.toContain('<checker_feedback>');
    expect(out).not.toContain('<previous_draft>');
    expect(out).not.toContain('<revision_note>');
    expect(out).toContain('<research_facts>');
    expect(out).toContain('brand-1');
  });

  it('nests the marketer revision note when given', () => {
    const out = draftPrompt({ ...baseReq, userNote: 'drop the stat' });
    expect(out).toContain('<revision_note>');
    expect(out).toContain('drop the stat');
  });

  it('states the channel limits for the type', () => {
    expect(draftPrompt({ ...baseReq, type: 'x_thread' })).toContain('280');
    expect(draftPrompt({ ...baseReq, type: 'google_ads' })).toMatch(/30 characters[\s\S]*90 characters/);
  });
});

describe('mergePrompt', () => {
  it('nests brand, topic and audience research', () => {
    const out = mergePrompt(BRAND_FACTS, [], [{ angle: 'calm exam prep', factIds: ['brand-1'] }]);
    for (const tag of ['brand_facts', 'topic_facts', 'audience_research']) expect(out).toContain(`<${tag}>`);
  });
});

describe('checkPrompt', () => {
  it('nests the draft and lists every issue rule', () => {
    const out = checkPrompt({ draft: { type: 'linkedin', content: { text: 'Hi' } }, research });
    expect(out).toContain('<draft>');
    expect(out).toContain('<research_facts>');
    for (const rule of ['unsupported_claim', 'brand_fact', 'tone', 'audience', 'format', 'other']) expect(out).toContain(rule);
  });
});

describe('reportPrompt', () => {
  it('nests the pieces and explains held status', () => {
    const out = reportPrompt({ research, pieces: [{ type: 'blog', status: 'held', draft: null, attempts: [] }] });
    expect(out).toContain('<pieces>');
    expect(out).toContain('held');
  });
});
