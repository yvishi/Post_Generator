import { generateText, Output, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { MODEL_MAX_RETRIES, STAGE_CALL_TIMEOUT_MS, textModel } from '../models';
import { draftPrompt } from '../prompts';
import { draftSchemas, type Draft, type DraftRequest } from '../types';

/** One drafter call: structured output shaped by the content type's schema. */
export async function draftPiece(req: DraftRequest, model: LanguageModel = textModel()): Promise<Draft> {
  // Widened: the schema is chosen at runtime, so the output type is only known as `unknown`.
  const schema: z.ZodType<unknown> = draftSchemas[req.type];
  const { output } = await generateText({
    model,
    output: Output.object({ schema }),
    prompt: draftPrompt(req),
    timeout: STAGE_CALL_TIMEOUT_MS,
    maxRetries: MODEL_MAX_RETRIES,
  });
  return { type: req.type, content: output };
}
