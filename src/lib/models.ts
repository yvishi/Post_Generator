import 'server-only';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const TEXT_MODEL_ID = process.env.TEXT_MODEL || 'google/gemini-2.5-flash';
const SEARCH_MODEL_ID = process.env.SEARCH_MODEL || 'google/gemini-2.5-flash:online';
export const IMAGE_MODEL_ID = process.env.IMAGE_MODEL || 'google/gemini-2.5-flash-image';

export function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  return key;
}

const provider = () => createOpenRouter({ apiKey: getApiKey() });

/** The model every text stage uses (research, merge, draft, check, report). */
export const textModel = () => provider().chat(TEXT_MODEL_ID);

/** Same family with OpenRouter web search on, for topic-only research. */
export const searchModel = () => provider().chat(SEARCH_MODEL_ID);
