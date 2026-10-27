import { describe, expect, it } from 'vitest';
import { checkChannelRules } from './channel-rules';
import type { Draft } from './types';

const text = (n: number) => 'a'.repeat(n);
const google = (headline = 'Study smarter', description = 'Practice daily with Vidya.') => ({
  variations: [0, 1, 2].map(() => ({ headlines: [headline, 'Learn well', 'Try Vidya'], descriptions: [description, 'Start free'] })),
});
const meta = { variations: [0, 1, 2].map(() => ({ primaryText: 'Text', headline: 'Head', cta: 'Learn more' })) };

const valid: Draft[] = [
  { type: 'blog', content: { title: 'T', sections: [{ heading: 'a', body: 'b' }, { heading: 'c', body: 'd' }] } },
  { type: 'linkedin', content: { text: 'hello' } },
  { type: 'x_thread', content: { posts: [text(280), 'short'] } },
  { type: 'instagram', content: { caption: 'cap', hashtags: ['#vidya'] } },
  { type: 'meta_ads', content: meta },
  { type: 'google_ads', content: google(text(30), text(90)) },
  { type: 'image', content: { concept: 'c', style: 's', composition: 'x', altText: 'alt' } },
];

describe('checkChannelRules', () => {
  it.each(valid)('accepts a valid $type draft', (d) => {
    expect(checkChannelRules(d)).toEqual([]);
  });

  it('flags a long X post by number, length and limit', () => {
    const v = checkChannelRules({ type: 'x_thread', content: { posts: [text(281)] } });
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('X post 1');
    expect(v[0]).toContain('281');
    expect(v[0]).toContain('280');
  });

  it('flags a long Google headline', () => {
    const v = checkChannelRules({ type: 'google_ads', content: google(text(31)) });
    expect(v[0]).toContain('30');
    expect(v[0]).toContain('31');
    expect(v[0]).toContain('variation 1');
    expect(v[0]).toContain('headline 1');
  });

  it('flags a long Google description', () => {
    const v = checkChannelRules({ type: 'google_ads', content: google('ok', text(91)) });
    expect(v[0]).toContain('90');
    expect(v[0]).toContain('91');
    expect(v[0]).toContain('description 1');
  });

  it('flags Instagram with no hashtags', () => {
    expect(checkChannelRules({ type: 'instagram', content: { caption: 'c', hashtags: [] } })).toHaveLength(1);
  });

  it('flags a blog with one section', () => {
    const v = checkChannelRules({ type: 'blog', content: { title: 'T', sections: [{ heading: 'a', body: 'b' }] } });
    expect(v[0]).toContain('2 sections');
  });

  it('flags a blog without a title', () => {
    const v = checkChannelRules({ type: 'blog', content: { title: ' ', sections: [{ heading: 'a', body: 'b' }, { heading: 'c', body: 'd' }] } });
    expect(v[0]).toContain('title');
  });

  it('flags empty Meta fields by variation and field', () => {
    const content = { variations: [meta.variations[0], { primaryText: 'x', headline: '', cta: '  ' }, meta.variations[2]] };
    const v = checkChannelRules({ type: 'meta_ads', content });
    expect(v).toHaveLength(2);
    expect(v[0]).toContain('Meta ad variation 2');
    expect(v[0]).toContain('headline');
    expect(v[1]).toContain('cta');
  });

  it('returns a violation instead of throwing on malformed content', () => {
    expect(checkChannelRules({ type: 'x_thread', content: null }).length).toBeGreaterThan(0);
    expect(checkChannelRules({ type: 'meta_ads', content: { variations: [] } }).length).toBeGreaterThan(0);
    expect(checkChannelRules({ type: 'blog', content: 'nope' }).length).toBeGreaterThan(0);
  });
});
