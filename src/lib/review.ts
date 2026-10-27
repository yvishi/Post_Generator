import type { Attempt, Issue } from './types';

export const RULE_LABELS: Record<Issue['rule'], string> = {
  unsupported_claim: 'Unsupported claim',
  brand_fact: 'Wrong brand fact',
  tone: 'Tone',
  audience: 'Wrong audience',
  format: 'Format or length',
  other: 'Other',
};

export const blocking = (issues: Issue[]) => issues.filter((i) => i.severity === 'blocking');

const key = (i: Issue) => `${i.rule}|${i.quote.trim().toLowerCase()}|${i.problem.trim().toLowerCase()}`;

/** Every issue raised so far, oldest first, without repeats. Sent to the drafter on each retry. */
export function gatherFeedback(attempts: Attempt[]): Issue[] {
  const seen = new Map<string, Issue>();
  for (const a of attempts) for (const i of a.check.issues) seen.set(key(i), i);
  return [...seen.values()];
}

/** Index of the attempt closest to passing: fewest blocking issues, then fewest minor, then the latest. */
export function pickBest(attempts: Attempt[]): number {
  let best = 0;
  attempts.forEach((a, i) => {
    const b = attempts[best];
    const score = [blocking(a.check.issues).length, a.check.issues.length];
    const bestScore = [blocking(b.check.issues).length, b.check.issues.length];
    if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] <= bestScore[1])) best = i;
  });
  return best;
}

export type HoldAnalysis = {
  attemptCount: number;
  bestAttempt: number; // 1-based, for display
  reasoning: string;
  blockers: Issue[];
  /** Rules that blocked every attempt: the drafter could not fix these on its own. */
  recurring: Issue['rule'][];
  /** Rules that blocked an earlier attempt but not the best one. */
  resolved: Issue['rule'][];
};

/** Why a held piece was held, in a shape the user can read through. */
export function analyseHold(attempts: Attempt[], best = pickBest(attempts)): HoldAnalysis {
  const rulesPer = attempts.map((a) => new Set(blocking(a.check.issues).map((i) => i.rule)));
  const all = [...new Set(rulesPer.flatMap((s) => [...s]))];
  const bestRules = rulesPer[best];
  return {
    attemptCount: attempts.length,
    bestAttempt: best + 1,
    reasoning: attempts[best].check.reasoning,
    blockers: blocking(attempts[best].check.issues),
    recurring: attempts.length > 1 ? all.filter((r) => rulesPer.every((s) => s.has(r))) : [],
    resolved: all.filter((r) => !bestRules.has(r)),
  };
}
