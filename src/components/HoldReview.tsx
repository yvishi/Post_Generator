'use client';

import { useId, useState } from 'react';
import { RULE_LABELS, analyseHold } from '@/lib/review';
import type { Issue, PieceResult } from '@/lib/types';

const list = (rules: Issue['rule'][]) => rules.map((r) => RULE_LABELS[r]).join(', ');

export function IssueItem({ issue }: { issue: Issue }) {
  return (
    <li className="flex flex-col gap-1 text-sm leading-6">
      <span className="flex flex-wrap items-baseline gap-2">
        <span
          className={`rounded-full px-2 py-px text-xs font-semibold ${
            issue.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-line text-muted'
          }`}
        >
          {RULE_LABELS[issue.rule]}
        </span>
        {issue.quote && <q className="italic">{issue.quote}</q>}
      </span>
      <span>{issue.problem}</span>
      {issue.fix && <span className="text-muted">Suggested fix: {issue.fix}</span>}
    </li>
  );
}

/** Why the checker held a piece back, written so the client can judge it and steer the next try. */
export function HoldReason({ piece }: { piece: PieceResult }) {
  const a = analyseHold(piece.attempts, piece.bestAttempt);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-marigold/60 bg-marigold/[0.06] p-4">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Held back for your review</p>
        <p className="text-sm text-muted">
          {a.attemptCount} attempts, none cleared the brand check. Attempt {a.bestAttempt} came closest, and its draft is
          kept under Details.
        </p>
      </div>

      <section className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Why it was held back</h4>
        {a.reasoning && <p className="text-sm leading-6">{a.reasoning}</p>}
        <ul className="mt-1 flex flex-col gap-3">
          {a.blockers.map((issue, i) => (
            <IssueItem key={i} issue={issue} />
          ))}
        </ul>
      </section>

      {(a.recurring.length > 0 || a.resolved.length > 0) && (
        <section className="flex flex-col gap-1.5 text-sm leading-6">
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Across the attempts</h4>
          {a.recurring.length > 0 && (
            <p>
              <span className="font-semibold">Blocked every attempt: {list(a.recurring)}.</span> The writer could not fix
              this on its own, so a note from you will help most here.
            </p>
          )}
          {a.resolved.length > 0 && <p className="text-muted">Fixed along the way: {list(a.resolved)}.</p>}
        </section>
      )}

      {piece.error && <p className="text-sm text-danger">The last try stopped early: {piece.error}</p>}
    </div>
  );
}

type FormProps = { onSubmit: (note: string) => void; onCancel: () => void; busy: boolean };

export function NoteForm({ onSubmit, onCancel, busy }: FormProps) {
  const [note, setNote] = useState('');
  const id = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (note.trim()) onSubmit(note);
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold">
        Your note for the writer
      </label>
      <textarea
        id={id}
        rows={3}
        value={note}
        disabled={busy}
        onChange={(e) => setNote(e.target.value)}
        placeholder='e.g. "Drop the results claim and lead with step-by-step help."'
        className="rounded-xl border border-line bg-surface p-3 text-sm leading-6 focus-visible:border-peacock focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/30"
      />
      <p className="text-xs text-muted">The writer also gets every issue the checker raised. One more attempt runs.</p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !note.trim()}
          className="rounded-full bg-peacock px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-peacock/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Revising…' : 'Revise'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
