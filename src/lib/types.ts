import { z } from 'zod';

export const CONTENT_TYPES = ['blog', 'linkedin', 'x_thread', 'instagram', 'meta_ads', 'google_ads', 'image'] as const;
export const contentTypeSchema = z.enum(CONTENT_TYPES);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const factSchema = z.object({ id: z.string(), fact: z.string(), sourceUrl: z.string() });
export type Fact = z.infer<typeof factSchema>;

export const angleSchema = z.object({ angle: z.string(), factIds: z.array(z.string()) });
export type Angle = z.infer<typeof angleSchema>;

export const researchResultSchema = z.object({
  facts: z.array(factSchema),
  angles: z.array(angleSchema),
  errors: z.array(z.string()),
  conflicts: z.array(z.string()),
});
export type ResearchResult = z.infer<typeof researchResultSchema>;

export const draftSchemas = {
  blog: z.object({
    title: z.string(),
    sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  }),
  linkedin: z.object({ text: z.string() }),
  x_thread: z.object({ posts: z.array(z.string()) }),
  instagram: z.object({ caption: z.string(), hashtags: z.array(z.string()) }),
  meta_ads: z.object({
    variations: z.array(z.object({ primaryText: z.string(), headline: z.string(), cta: z.string() })).length(3),
  }),
  google_ads: z.object({
    variations: z
      .array(z.object({ headlines: z.array(z.string()).length(3), descriptions: z.array(z.string()).length(2) }))
      .length(3),
  }),
  image: z.object({ concept: z.string(), style: z.string(), composition: z.string(), altText: z.string() }),
} satisfies Record<ContentType, z.ZodType>;

export type BlogContent = z.infer<typeof draftSchemas.blog>;
export type LinkedinContent = z.infer<typeof draftSchemas.linkedin>;
export type XThreadContent = z.infer<typeof draftSchemas.x_thread>;
export type InstagramContent = z.infer<typeof draftSchemas.instagram>;
export type MetaAdsContent = z.infer<typeof draftSchemas.meta_ads>;
export type GoogleAdsContent = z.infer<typeof draftSchemas.google_ads>;
export type ImageBriefContent = z.infer<typeof draftSchemas.image>;

export const draftSchema = z.object({ type: contentTypeSchema, content: z.unknown() });
export type Draft = z.infer<typeof draftSchema>;

export const checkSchema = z.object({
  pass: z.boolean(),
  reasons: z.array(z.string()),
  factIdsUsed: z.array(z.string()),
});
export type Check = z.infer<typeof checkSchema>;

export const attemptSchema = z.object({ draft: draftSchema, check: checkSchema });
export type Attempt = z.infer<typeof attemptSchema>;

export const pieceResultSchema = z.object({
  type: contentTypeSchema,
  status: z.enum(['passed', 'failed']),
  draft: draftSchema.nullable(),
  attempts: z.array(attemptSchema),
  failureReasons: z.array(z.string()),
  imageDataUrl: z.string().optional(),
});
export type PieceResult = z.infer<typeof pieceResultSchema>;

// Empty strings count as missing: trim, then drop.
const optionalText = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() || undefined : v),
  z.string().optional(),
);

const researchBase = z.object({
  topic: optionalText,
  link: optionalText.refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), {
    message: 'Link must start with http:// or https://',
  }),
  notes: optionalText,
});

const hasTopicOrLink = (v: { topic?: string; link?: string }) => Boolean(v.topic || v.link);
const topicOrLinkMessage = { message: 'Enter a topic or a link' };

export const researchRequestSchema = researchBase.refine(hasTopicOrLink, topicOrLinkMessage);
export type ResearchRequest = z.infer<typeof researchRequestSchema>;

export const packFormSchema = researchBase
  .extend({ types: z.array(contentTypeSchema).min(1, 'Pick at least one content type') })
  .refine(hasTopicOrLink, topicOrLinkMessage);
export type PackForm = z.infer<typeof packFormSchema>;

export const draftRequestSchema = z.object({
  type: contentTypeSchema,
  research: researchResultSchema,
  topic: z.string().optional(),
  notes: z.string().optional(),
  previous: draftSchema.optional(),
  feedback: z.array(z.string()).optional(),
});
export type DraftRequest = z.infer<typeof draftRequestSchema>;

export const checkRequestSchema = z.object({
  draft: draftSchema,
  research: researchResultSchema,
  topic: z.string().optional(),
  notes: z.string().optional(),
});
export type CheckRequest = z.infer<typeof checkRequestSchema>;

export const imageRequestSchema = z.object({ brief: draftSchema });
export type ImageRequest = z.infer<typeof imageRequestSchema>;

export const reportRequestSchema = z.object({ research: researchResultSchema, pieces: z.array(pieceResultSchema) });
export type ReportRequest = z.infer<typeof reportRequestSchema>;

export type PackResult = { research: ResearchResult; pieces: PieceResult[]; report: { summary: string } };
