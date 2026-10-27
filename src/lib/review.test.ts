import { describe, expect, it } from 'vitest';
import { analyseHold, gatherFeedback, pickBest } from './review';
import type { Attempt, Issue } from './types';

const draft = { type: 'linkedin' as const, content: { text: 'x' } };
const issue = (rule: Issue['rule'], problem: string = rule, severity: Issue['severity'] = 'blocking'): Issue => ({
  severity,
  rule,
  quote: '',
  problem,
  fix: '',
});
const attempt = (...issues: Issue[]): Attempt => ({
  draft,
  check: { pass: false, reasoning: `r${issues.length}`, issues, factIdsUsed: [] },
});

describe('review', () => {
  it('gatherFeedback drops repeats across attempts', () => {
    expect(gatherFeedback([attempt(issue('tone')), attempt(issue('tone'), issue('format'))])).toEqual([
      issue('tone'),
      issue('format'),
    ]);
  });

  it('pickBest prefers fewer blocking issues, then fewer minor, then later', () => {
    expect(pickBest([attempt(issue('tone'), issue('format')), attempt(issue('tone'))])).toBe(1);
    expect(pickBest([attempt(issue('tone')), attempt(issue('tone'), issue('format', 'f', 'minor'))])).toBe(0);
    expect(pickBest([attempt(issue('tone')), attempt(issue('format'))])).toBe(1);
  });

  it('analyseHold finds recurring and resolved rules', () => {
    const a = analyseHold([
      attempt(issue('unsupported_claim'), issue('format')),
      attempt(issue('unsupported_claim'), issue('tone')),
      attempt(issue('unsupported_claim')),
    ]);
    expect(a).toMatchObject({ attemptCount: 3, bestAttempt: 3, reasoning: 'r1' });
    expect(a.recurring).toEqual(['unsupported_claim']);
    expect(a.resolved).toEqual(['format', 'tone']);
    expect(a.blockers).toEqual([issue('unsupported_claim')]);
  });
});
