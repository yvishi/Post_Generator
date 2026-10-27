import { draftSchemas, type Draft } from './types';

export const X_POST_MAX = 280;
export const GOOGLE_HEADLINE_MAX = 30;
export const GOOGLE_DESCRIPTION_MAX = 90;
export const BLOG_MIN_SECTIONS = 2;

const LABELS = {
  blog: 'Blog',
  linkedin: 'LinkedIn post',
  x_thread: 'X thread',
  instagram: 'Instagram post',
  meta_ads: 'Meta ads',
  google_ads: 'Google ads',
  image: 'Image brief',
} as const;

const tooLong = (what: string, text: string, max: number) =>
  text.length > max ? [`${what} is ${text.length} characters; the limit is ${max}.`] : [];

const FACT_ID = /\b(?:brand|site|topic)-\d+\b/gi;

// Every string in the content, with the path it sits at (e.g. "sections.0.body").
function* strings(value: unknown, path: string[] = []): Generator<[string, string]> {
  if (typeof value === 'string') yield [path.join('.'), value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, [...path, String(i)]);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) yield* strings(v, [...path, k]);
}

// Fact ids are for traceability (the checker records them); they must never reach the client-facing copy.
function factIdViolations(draft: Draft): string[] {
  return [...strings(draft.content)].flatMap(([path, str]) =>
    [...str.matchAll(FACT_ID)].map(
      (m) => `Fact id "${m[0]}" appears in the copy (${LABELS[draft.type]}${path ? ` ${path}` : ''}); remove citation markers.`,
    ),
  );
}

// Deterministic, per-channel format checks. Returns readable violations; [] means OK.
// Content arrives as `unknown`, so a shape mismatch is reported as a violation, never thrown.
export function checkChannelRules(draft: Draft): string[] {
  const parsed = draftSchemas[draft.type].safeParse(draft.content);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return [`${LABELS[draft.type]} content is not in the expected format (${detail}).`];
  }
  return [...channelViolations(draft, parsed.data), ...factIdViolations(draft)];
}

function channelViolations(draft: Draft, data: unknown): string[] {
  switch (draft.type) {
    case 'blog': {
      const c = data as ReturnType<typeof draftSchemas.blog.parse>;
      const out: string[] = [];
      if (!c.title.trim()) out.push('Blog has no title.');
      if (c.sections.length < BLOG_MIN_SECTIONS)
        out.push(`Blog has ${c.sections.length} section(s); it needs at least ${BLOG_MIN_SECTIONS} sections.`);
      return out;
    }
    case 'x_thread': {
      const c = data as ReturnType<typeof draftSchemas.x_thread.parse>;
      if (c.posts.length === 0) return ['X thread has no posts.'];
      return c.posts.flatMap((p, i) => tooLong(`X post ${i + 1}`, p, X_POST_MAX));
    }
    case 'instagram': {
      const c = data as ReturnType<typeof draftSchemas.instagram.parse>;
      return c.hashtags.some((h) => h.trim()) ? [] : ['Instagram post has no hashtags; it needs at least 1.'];
    }
    case 'meta_ads': {
      const c = data as ReturnType<typeof draftSchemas.meta_ads.parse>;
      return c.variations.flatMap((v, i) =>
        (['primaryText', 'headline', 'cta'] as const)
          .filter((f) => !v[f].trim())
          .map((f) => `Meta ad variation ${i + 1} is missing its ${f}.`),
      );
    }
    case 'google_ads': {
      const c = data as ReturnType<typeof draftSchemas.google_ads.parse>;
      return c.variations.flatMap((v, i) => [
        ...v.headlines.flatMap((h, j) =>
          tooLong(`Google ad variation ${i + 1}, headline ${j + 1}`, h, GOOGLE_HEADLINE_MAX),
        ),
        ...v.descriptions.flatMap((d, j) =>
          tooLong(`Google ad variation ${i + 1}, description ${j + 1}`, d, GOOGLE_DESCRIPTION_MAX),
        ),
      ]);
    }
    case 'linkedin':
    case 'image':
      return [];
  }
}
