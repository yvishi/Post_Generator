import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PieceResult } from '@/lib/types';
import { PieceCard } from './PieceCard';

const draft = { type: 'linkedin' as const, content: { text: 'Hello parents' } };
const facts = [{ id: 'brand-1', fact: 'Vidya AI costs ₹499/month.', sourceUrl: 'https://x.test' }];

describe('PieceCard', () => {
  it('passed card shows content, hides reasons until Details', async () => {
    const piece: PieceResult = {
      type: 'linkedin',
      status: 'passed',
      draft,
      attempts: [{ draft, check: { pass: true, reasons: ['Warm and grounded'], factIdsUsed: ['brand-1'] } }],
      failureReasons: [],
    };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Hello parents')).toBeVisible();
    expect(screen.getByText('Warm and grounded')).not.toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Warm and grounded')).toBeVisible();
    expect(screen.getByText('Vidya AI costs ₹499/month.')).toBeVisible();
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
    expect(screen.getByText('Not ready')).toBeVisible();
    expect(screen.getAllByText('Invented statistic')[0]).toBeVisible();
    expect(screen.getByText('Hello parents')).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('passed on attempt label lives in details', () => {
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
    expect(screen.getByText('Passed on attempt 2 of 3')).not.toBeVisible();
  });
});
