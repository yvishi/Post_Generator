import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { MODEL_MAX_RETRIES, STAGE_CALL_TIMEOUT_MS, textModel } from '../models';
import { reportPrompt } from '../prompts';
import type { ReportRequest } from '../types';

const reportSchema = z.object({ summary: z.string() });

/** The client-facing summary of the run (3-6 sentences, per reportPrompt). */
export async function writeReport(req: ReportRequest, model: LanguageModel = textModel()): Promise<{ summary: string }> {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: reportSchema }),
    prompt: reportPrompt(req),
    timeout: STAGE_CALL_TIMEOUT_MS,
    maxRetries: MODEL_MAX_RETRIES,
  });
  return { summary: output.summary };
}
