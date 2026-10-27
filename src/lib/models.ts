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

// Time budgets. Each route has maxDuration 60s, so a slow call must fail with a clear timeout rather than
// be killed by the platform. maxRetries 1 (ai's default is 2) keeps a retried call inside its budget.
/** Each research call (brand, search, extract, audience, merge). */
export const RESEARCH_CALL_TIMEOUT_MS = 20_000;
/** Each draft, check or report stage, including its one schema retry. */
export const STAGE_CALL_TIMEOUT_MS = 40_000;
/** The image request to OpenRouter, headers and body. */
export const IMAGE_TIMEOUT_MS = 50_000;
/** Retries for a failed API call (network error, 429, 5xx) inside its timeout. */
export const MODEL_MAX_RETRIES = 1;
