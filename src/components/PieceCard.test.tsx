import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PieceResult } from '@/lib/types';
import { PieceCard } from './PieceCard';

const draft = { type: 'linkedin' as const, content: { text: 'Hello parents' } };
const facts = [{ id: 'brand-1', fact: 'Vidya AI costs ₹499/month.', sourceUrl: 'https://x.test' }];

describe('PieceCard', () => {
  it('passed card shows content, hides reasons', () => {
    const piece: PieceResult = {
      type: 'linkedin',
      status: 'passed',
      draft,
      attempts: [{ draft, check: { pass: true, reasons: ['Warm and grounded'], factIdsUsed: ['brand-1'] } }],
      failureReasons: [],
    };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Hello parents').closest('details')).toBeNull();
    const reason = screen.getByText('Warm and grounded');
    expect(reason.closest('details')).not.toBeNull();
    expect(reason.closest('details')).not.toHaveAttribute('open');
  });

  it('failed card shows reasons as main content', () => {
    const check = { pass: false, reasons: ['Invented statistic'], factIdsUsed: [] };
    const piece: PieceResult = {
      type: 'linkedin',
      status: 'failed',
      draft,
      attempts: [{ draft, check }, { draft, check }, { draft, check }],
      failureReasons: ['Invented statistic'],
    };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Failed').closest('details')).toBeNull();
    expect(screen.getAllByText('Invented statistic').some((el) => !el.closest('details'))).toBe(true);
    expect(screen.getByText('Hello parents').closest('details')).not.toBeNull();
  });

  it('passed on attempt label', () => {
    const piece: PieceResult = {
      type: 'linkedin',
      status: 'passed',
      draft,
      attempts: [
        { draft, check: { pass: false, reasons: ['Too pushy'], factIdsUsed: [] } },
        { draft, check: { pass: true, reasons: [], factIdsUsed: [] } },
      ],
      failureReasons: [],
    };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Passed on attempt 2 of 3')).toBeInTheDocument();
  });
});
