import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Check, Issue, PieceResult } from '@/lib/types';
import { PieceCard } from './PieceCard';

const draft = { type: 'linkedin' as const, content: { text: 'Hello parents' } };
const facts = [{ id: 'brand-1', fact: 'Vidya AI costs ₹499/month.', sourceUrl: 'https://x.test' }];
const claim: Issue = {
  severity: 'blocking',
  rule: 'unsupported_claim',
  quote: 'Top scores guaranteed',
  problem: 'Promises marks no fact supports.',
  fix: 'Promise the method instead.',
};
const pass = (reasoning = ''): Check => ({ pass: true, reasoning, issues: [], factIdsUsed: ['brand-1'] });
const fail: Check = { pass: false, reasoning: 'Still promises results.', issues: [claim], factIdsUsed: [] };
const held: PieceResult = {
  type: 'linkedin',
  status: 'held',
  draft,
  attempts: [{ draft, check: fail }, { draft, check: fail }, { draft, check: fail }],
  bestAttempt: 2,
};

describe('PieceCard', () => {
  it('passed card shows content, hides checks until Details', async () => {
    const piece: PieceResult = { type: 'linkedin', status: 'passed', draft, attempts: [{ draft, check: pass('Warm and grounded') }] };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Hello parents')).toBeVisible();
    expect(screen.getByText('Warm and grounded')).not.toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Warm and grounded')).toBeVisible();
    expect(screen.getByText('Vidya AI costs ₹499/month.')).toBeVisible();
  });

  it('held card explains why it was held as the main content', () => {
    render(<PieceCard piece={held} facts={facts} />);
    expect(screen.getByText('Needs review')).toBeVisible();
    expect(screen.getAllByText('Still promises results.')[0]).toBeVisible();
    expect(screen.getAllByText('Top scores guaranteed')[0]).toBeVisible();
    expect(screen.getAllByText('Suggested fix: Promise the method instead.')[0]).toBeVisible();
    expect(screen.getByText(/Blocked every attempt: Unsupported claim/)).toBeVisible();
    expect(screen.getByText('Hello parents')).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('held card sends the user note to revise', async () => {
    const onRevise = vi.fn(async () => {});
    render(<PieceCard piece={held} facts={facts} onRevise={onRevise} onAccept={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Revise with my note' }));
    expect(screen.getByRole('button', { name: 'Revise' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Your note for the writer'), 'Drop the claim');
    await userEvent.click(screen.getByRole('button', { name: 'Revise' }));
    expect(onRevise).toHaveBeenCalledWith('Drop the claim');
  });

  it('held card can be used anyway', async () => {
    const onAccept = vi.fn(async () => {});
    render(<PieceCard piece={held} facts={facts} onRevise={vi.fn()} onAccept={onAccept} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use anyway' }));
    expect(onAccept).toHaveBeenCalled();
  });

  it('error card shows the error and a retry', () => {
    const piece: PieceResult = { type: 'linkedin', status: 'error', draft: null, attempts: [], error: 'Generation error: boom' };
    render(<PieceCard piece={piece} facts={facts} onRevise={vi.fn()} />);
    expect(screen.getByText('Generation error: boom')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('passed on attempt label lives in details', () => {
    const piece: PieceResult = {
      type: 'linkedin',
      status: 'passed',
      draft,
      attempts: [{ draft, check: fail }, { draft, check: pass() }],
      bestAttempt: 1,
    };
    render(<PieceCard piece={piece} facts={facts} />);
    expect(screen.getByText('Passed on attempt 2 of 3')).not.toBeVisible();
  });
});
