import type {
  BlogContent,
  ContentType,
  Draft,
  GoogleAdsContent,
  ImageBriefContent,
  InstagramContent,
  LinkedinContent,
  MetaAdsContent,
  XThreadContent,
} from './types';

export const CONTENT_META: Record<ContentType, { label: string; hint: string }> = {
  blog: { label: 'Blog post', hint: 'Title and sections' },
  linkedin: { label: 'LinkedIn post', hint: 'One post' },
  x_thread: { label: 'X thread', hint: 'Posts up to 280 chars' },
  instagram: { label: 'Instagram caption', hint: 'Caption and hashtags' },
  meta_ads: { label: 'Meta ads (3)', hint: 'Text, headline, CTA' },
  google_ads: { label: 'Google ads (3)', hint: 'Headlines ≤30, descriptions ≤90' },
  image: { label: 'Image', hint: 'Brief, then a generated image' },
};

/** Plain-text version of a draft, for the Copy button. */
export function draftToText(draft: Draft): string {
  switch (draft.type) {
    case 'blog': {
      const c = draft.content as BlogContent;
      return [c.title, ...c.sections.map((s) => `${s.heading}\n\n${s.body}`)].join('\n\n');
    }
    case 'linkedin':
      return (draft.content as LinkedinContent).text;
    case 'x_thread': {
      const { posts } = draft.content as XThreadContent;
      return posts.map((p, i) => `${i + 1}/${posts.length} ${p}`).join('\n\n');
    }
    case 'instagram': {
      const c = draft.content as InstagramContent;
      return `${c.caption}\n\n${c.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`;
    }
    case 'meta_ads':
      return (draft.content as MetaAdsContent).variations
        .map((v, i) => `Variation ${i + 1}\nPrimary text: ${v.primaryText}\nHeadline: ${v.headline}\nCTA: ${v.cta}`)
        .join('\n\n');
    case 'google_ads':
      return (draft.content as GoogleAdsContent).variations
        .map(
          (v, i) =>
            `Variation ${i + 1}\nHeadlines: ${v.headlines.join(' | ')}\nDescriptions: ${v.descriptions.join(' | ')}`,
        )
        .join('\n\n');
    case 'image': {
      const c = draft.content as ImageBriefContent;
      return `Concept: ${c.concept}\nStyle: ${c.style}\nComposition: ${c.composition}\nAlt text: ${c.altText}`;
    }
  }
}
