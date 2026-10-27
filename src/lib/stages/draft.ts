import { generateText, Output, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { MODEL_MAX_RETRIES, textModel } from '../models';
import { draftPrompt } from '../prompts';
import { draftSchemas, type Draft, type DraftRequest } from '../types';
import { withSchemaRetry } from './schema-retry';

/** One drafter call: structured output shaped by the content type's schema, retried once if it does not match. */
export async function draftPiece(req: DraftRequest, model: LanguageModel = textModel()): Promise<Draft> {
  // Widened: the schema is chosen at runtime, so the output type is only known as `unknown`.
  const schema: z.ZodType<unknown> = draftSchemas[req.type];
  const prompt = draftPrompt(req);
  const { output } = await withSchemaRetry(req.type, (timeout) =>
    generateText({ model, output: Output.object({ schema }), prompt, timeout, maxRetries: MODEL_MAX_RETRIES }),
  );
  return { type: req.type, content: output };
}
