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

function Count({ text, limit }: { text: string; limit: number }) {
  const over = text.length > limit;
  return (
    <span className={`font-mono text-[11px] ${over ? 'font-medium text-margin' : 'text-ink-soft'}`}>
      {text.length}/{limit}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Variation({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0">
      <h4 className="font-display text-sm font-bold">Variation {n}</h4>
      {children}
    </div>
  );
}

export function PieceContent({ draft }: { draft: Draft }) {
  switch (draft.type) {
    case 'blog': {
      const c = draft.content as BlogContent;
      return (
        <article className="flex flex-col gap-3">
          <h3 className="font-display text-xl font-bold leading-snug">{c.title}</h3>
          {c.sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-1">
              <h4 className="font-display font-bold">{s.heading}</h4>
              <p className="whitespace-pre-line leading-relaxed">{s.body}</p>
            </section>
          ))}
        </article>
      );
    }
    case 'linkedin':
      return <p className="whitespace-pre-line leading-relaxed">{(draft.content as LinkedinContent).text}</p>;
    case 'x_thread': {
      const { posts } = draft.content as XThreadContent;
      return (
        <ol className="flex flex-col gap-3">
          {posts.map((p, i) => (
            <li key={i} className="flex flex-col gap-1 border-l-2 border-rule pl-3">
              <span className="flex justify-between gap-3 font-mono text-[11px] text-ink-soft">
                <span>
                  {i + 1}/{posts.length}
                </span>
                <Count text={p} limit={280} />
              </span>
              <p className="whitespace-pre-line leading-relaxed">{p}</p>
            </li>
          ))}
        </ol>
      );
    }
    case 'instagram': {
      const c = draft.content as InstagramContent;
      return (
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-line leading-relaxed">{c.caption}</p>
          <p className="text-sm font-medium text-ink-soft">
            {c.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
          </p>
        </div>
      );
    }
    case 'meta_ads':
      return (
        <div className="flex flex-col gap-3">
          {(draft.content as MetaAdsContent).variations.map((v, i) => (
            <Variation key={i} n={i + 1}>
              <Field label="Primary text">
                <p className="leading-relaxed">{v.primaryText}</p>
              </Field>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Field label="Headline">
                  <p className="font-semibold">{v.headline}</p>
                </Field>
                <Field label="CTA">
                  <p className="font-semibold">{v.cta}</p>
                </Field>
              </div>
            </Variation>
          ))}
        </div>
      );
    case 'google_ads':
      return (
        <div className="flex flex-col gap-3">
          {(draft.content as GoogleAdsContent).variations.map((v, i) => (
            <Variation key={i} n={i + 1}>
              <Field label="Headlines">
                <ul className="flex flex-col gap-0.5">
                  {v.headlines.map((h, j) => (
                    <li key={j} className="flex justify-between gap-3">
                      <span className="font-semibold">{h}</span>
                      <Count text={h} limit={30} />
                    </li>
                  ))}
                </ul>
              </Field>
              <Field label="Descriptions">
                <ul className="flex flex-col gap-0.5">
                  {v.descriptions.map((d, j) => (
                    <li key={j} className="flex justify-between gap-3">
                      <span>{d}</span>
                      <Count text={d} limit={90} />
                    </li>
                  ))}
                </ul>
              </Field>
            </Variation>
          ))}
        </div>
      );
    case 'image': {
      const c = draft.content as ImageBriefContent;
      return (
        <dl className="flex flex-col gap-2">
          {(
            [
              ['Concept', c.concept],
              ['Style', c.style],
              ['Composition', c.composition],
              ['Alt text', c.altText],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{k}</dt>
              <dd className="leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      );
    }
  }
}
