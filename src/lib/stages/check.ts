import { generateText, Output, type LanguageModel } from 'ai';
import { checkChannelRules } from '../channel-rules';
import { textModel } from '../models';
import { checkPrompt } from '../prompts';
import { checkSchema, type Check, type CheckRequest, type Issue } from '../types';

const RULE_FIX = 'Edit the draft so it meets the channel limits and format rules, keeping the message the same.';

/** Pass means no blocking issue (R9); the LLM's own pass flag is ignored. LLM review plus deterministic channel rules. Format violations are always blocking, so they can veto a pass. */
export async function checkPiece(req: CheckRequest, model: LanguageModel = textModel()): Promise<Check> {
  const { output: llm } = await generateText({
    model,
    output: Output.object({ schema: checkSchema }),
    prompt: checkPrompt(req),
  });
  const ruleIssues: Issue[] = checkChannelRules(req.draft).map((problem) => ({
    severity: 'blocking',
    rule: 'format',
    quote: '',
    problem,
    fix: RULE_FIX,
  }));
  const issues = [...llm.issues, ...ruleIssues];
  return {
    pass: !issues.some((i) => i.severity === 'blocking'),
    reasoning: llm.reasoning,
    issues,
    factIdsUsed: llm.factIdsUsed,
  };
}
