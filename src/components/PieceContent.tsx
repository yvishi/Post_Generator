'use client';

import { useState } from 'react';
import { CLIENT_SITE_URL } from '@/lib/brand-facts';
import type {
  BlogContent,
  Draft,
  GoogleAdsContent,
  ImageBriefContent,
  InstagramContent,
  LinkedinContent,
  MetaAdsContent,
  XThreadContent,
} from '@/lib/types';

type Props = { draft: Draft; imageDataUrl?: string };

const hashtag = (h: string) => (h.startsWith('#') ? h : `#${h}`);

function Avatar({ size = 'size-10' }: { size?: string }) {
  return (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-peacock font-display text-lg text-white`}>
      V
    </span>
  );
}

function Byline({ sub }: { sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar />
      <div className="leading-tight">
        <p className="text-sm font-semibold">Vidya AI</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

function Picture({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="grid aspect-square w-full place-items-center bg-peacock-soft text-center text-xs text-muted">
        <span className="px-6">Add your image here</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- data URL from the image model
  return <img src={src} alt={alt} className="aspect-square w-full object-cover" />;
}

function VersionTabs({ count, active, onChange }: { count: number; active: number; onChange: (i: number) => void }) {
  return (
    <div role="tablist" aria-label="Versions" className="inline-flex rounded-full bg-canvas p-1">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          role="tab"
          type="button"
          aria-selected={active === i}
          onClick={() => onChange(i)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40 ${
            active === i ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Version {i + 1}
        </button>
      ))}
    </div>
  );
}

function Blog({ c }: { c: BlogContent }) {
  const words = c.sections.reduce((n, s) => n + s.body.split(/\s+/).length, 0);
  return (
    <article className="flex max-w-3xl flex-col gap-5 py-1">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-peacock">Vidya AI blog · {Math.max(1, Math.round(words / 200))} min read</p>
        <h3 className="font-display text-3xl leading-tight text-balance">{c.title}</h3>
      </header>
      {c.sections.map((s, i) => (
        <section key={i} className="flex flex-col gap-1.5">
          <h4 className="text-lg font-semibold">{s.heading}</h4>
          <p className="whitespace-pre-line text-[15px] leading-7 text-ink/90">{s.body}</p>
        </section>
      ))}
    </article>
  );
}

function Thread({ c }: { c: XThreadContent }) {
  return (
    <ol className="flex flex-col">
      {c.posts.map((p, i) => (
        <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
          <div className="flex flex-col items-center">
            <Avatar />
            {i < c.posts.length - 1 && <span aria-hidden className="w-0.5 flex-1 bg-line" />}
          </div>
          <div className="pb-5">
            <p className="text-sm">
              <span className="font-semibold">Vidya AI</span>{' '}
              <span className="text-muted">
                · {i + 1}/{c.posts.length}
              </span>
            </p>
            <p className="mt-0.5 whitespace-pre-line text-[15px] leading-6">{p}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MetaAds({ c, imageDataUrl }: { c: MetaAdsContent; imageDataUrl?: string }) {
  const [i, setI] = useState(0);
  const v = c.variations[i];
  return (
    <div className="flex flex-col gap-4">
      <VersionTabs count={c.variations.length} active={i} onChange={setI} />
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex flex-col gap-3 p-4">
          <Byline sub="Sponsored" />
          <p className="whitespace-pre-line text-[15px] leading-6">{v.primaryText}</p>
        </div>
        {imageDataUrl && <Picture src={imageDataUrl} alt="" />}
        <div className="flex items-center justify-between gap-4 bg-canvas px-4 py-3">
          <p className="font-semibold leading-snug">{v.headline}</p>
          <span className="shrink-0 rounded-md bg-line px-3 py-1.5 text-sm font-semibold">{v.cta}</span>
        </div>
      </div>
    </div>
  );
}

function GoogleAds({ c }: { c: GoogleAdsContent }) {
  const [i, setI] = useState(0);
  const v = c.variations[i];
  const host = new URL(CLIENT_SITE_URL).hostname.split('.')[0];
  return (
    <div className="flex flex-col gap-4">
      <VersionTabs count={c.variations.length} active={i} onChange={setI} />
      <div className="flex flex-col gap-1 rounded-xl border border-line p-4">
        <p className="text-xs">
          <span className="font-bold">Sponsored</span>
        </p>
        <div className="flex items-center gap-2.5">
          <Avatar size="size-7" />
          <div className="leading-tight">
            <p className="text-sm">Vidya AI</p>
            <p className="text-xs text-muted">{host}/vidya-ai</p>
          </div>
        </div>
        <p className="mt-1 text-xl leading-snug text-link">{v.headlines.join(' | ')}</p>
        <p className="text-sm leading-6 text-ink/80">{v.descriptions.join(' ')}</p>
      </div>
    </div>
  );
}

export function BriefFields({ c }: { c: ImageBriefContent }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {(
        [
          ['Concept', c.concept],
          ['Style', c.style],
          ['Composition', c.composition],
          ['Alt text', c.altText],
        ] as const
      ).map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold text-muted">{k}</dt>
          <dd className="text-sm leading-6">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PieceContent({ draft, imageDataUrl }: Props) {
  switch (draft.type) {
    case 'blog':
      return <Blog c={draft.content as BlogContent} />;
    case 'linkedin':
      return (
        <div className="flex flex-col gap-3">
          <Byline sub="Education · Just now" />
          <p className="whitespace-pre-line text-[15px] leading-6">{(draft.content as LinkedinContent).text}</p>
        </div>
      );
    case 'x_thread':
      return <Thread c={draft.content as XThreadContent} />;
    case 'instagram': {
      const c = draft.content as InstagramContent;
      return (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="p-3">
            <Byline sub="Just now" />
          </div>
          <Picture src={imageDataUrl} alt="" />
          <div className="flex flex-col gap-1.5 p-4 text-[15px] leading-6">
            <p className="whitespace-pre-line">
              <span className="font-semibold">Vidya AI </span>
              {c.caption}
            </p>
            <p className="text-link">{c.hashtags.map(hashtag).join(' ')}</p>
          </div>
        </div>
      );
    }
    case 'meta_ads':
      return <MetaAds c={draft.content as MetaAdsContent} imageDataUrl={imageDataUrl} />;
    case 'google_ads':
      return <GoogleAds c={draft.content as GoogleAdsContent} />;
    case 'image': {
      const c = draft.content as ImageBriefContent;
      return imageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from the image model
        <img src={imageDataUrl} alt={c.altText} className="w-full rounded-xl" />
      ) : (
        <BriefFields c={c} />
      );
    }
  }
}
