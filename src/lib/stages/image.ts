import 'server-only';
import { getApiKey, IMAGE_MODEL_ID } from '../models';
import { draftSchemas, type ImageRequest } from '../types';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function imagePrompt(brief: ImageRequest['brief']): string {
  const parsed = draftSchemas.image.safeParse(brief.content);
  if (!parsed.success) throw new Error('Image brief is not in the expected format');
  const { concept, style, composition } = parsed.data;
  return [
    'Create one image for a social and ad campaign for Vidya AI, a learning companion for parents of CBSE/ICSE school children.',
    `Concept: ${concept}`,
    `Style: ${style}`,
    `Composition: ${composition}`,
    'Brand look: warm, natural light, a parent and child together, calm and encouraging.',
    'Do not show any screen displaying finished answers or homework solutions. No text overlays, logos or watermarks.',
  ].join('\n');
}

/** Renders the image brief with the image model; returns a data URL. */
export async function generateImage(
  req: ImageRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ imageDataUrl: string }> {
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getApiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL_ID,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: imagePrompt(req.brief) }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Image generation failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  const json = (await res.json()) as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error('No image returned');
  return { imageDataUrl: url };
}
