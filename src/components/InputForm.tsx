'use client';

import { useState } from 'react';
import { CONTENT_META } from '@/lib/content-meta';
import { CONTENT_TYPES, packFormSchema, type ContentType, type PackForm } from '@/lib/types';

type Props = { onSubmit: (form: PackForm) => void; disabled: boolean };

const field =
  'w-full rounded-md border border-rule bg-sheet px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-marigold/60 disabled:opacity-60';

export function InputForm({ onSubmit, disabled }: Props) {
  const [topic, setTopic] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [types, setTypes] = useState<ContentType[]>([]);

  const parsed = packFormSchema.safeParse({ topic, link, notes, types });
  const allSelected = types.length === CONTENT_TYPES.length;
  const linkInvalid = link.trim() !== '' && !/^https?:\/\/\S+$/i.test(link.trim());

  const toggle = (t: ContentType) =>
    setTypes((prev) => CONTENT_TYPES.filter((c) => (c === t ? !prev.includes(c) : prev.includes(c))));

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed.success && !disabled) onSubmit(parsed.data);
      }}
    >
      <fieldset disabled={disabled} className="flex flex-col gap-4">
        <legend className="mb-3 font-display text-lg font-bold">What should we write about?</legend>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-sm font-semibold">
            Topic
          </label>
          <input
            id="topic"
            className={field}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Helping your child prepare for board exams without stress"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="link" className="text-sm font-semibold">
            Link
          </label>
          <input
            id="link"
            type="url"
            inputMode="url"
            className={field}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://… a news article or page"
            aria-invalid={linkInvalid}
            aria-describedby="link-help"
          />
          <p id="link-help" className={`text-xs ${linkInvalid ? 'text-margin' : 'text-ink-soft'}`}>
            {linkInvalid
              ? 'Link must start with http:// or https://'
              : 'Use a topic, a link, or both. A link is read; a topic alone is searched.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-semibold">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className={`${field} resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Push the 7-day free trial. Keep it calm, exam season is stressful enough."
          />
          <p className="text-xs text-ink-soft">Notes steer the angle. Facts still come from research.</p>
        </div>
      </fieldset>

      <fieldset disabled={disabled} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <legend className="font-display text-lg font-bold">What should we make?</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-ink"
              checked={allSelected}
              onChange={() => setTypes(allSelected ? [] : [...CONTENT_TYPES])}
            />
            Select all
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONTENT_TYPES.map((t) => {
            const on = types.includes(t);
            return (
              <label
                key={t}
                className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marigold ${
                  on ? 'border-ink bg-ink text-sheet' : 'border-rule bg-sheet hover:border-ink-soft'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-marigold"
                  checked={on}
                  onChange={() => toggle(t)}
                  aria-label={CONTENT_META[t].label}
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">{CONTENT_META[t].label}</span>
                  <span className={`mt-0.5 text-xs ${on ? 'text-sheet/70' : 'text-ink-soft'}`}>
                    {CONTENT_META[t].hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={!parsed.success || disabled}
          className="rounded-md bg-marigold px-5 py-3 font-display text-base font-bold text-ink shadow-[0_2px_0_var(--color-ink)] transition hover:-translate-y-px hover:shadow-[0_3px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-soft disabled:shadow-none disabled:hover:translate-y-0"
        >
          {disabled ? 'Generating…' : 'Generate'}
        </button>
        {!parsed.success && !disabled && (
          <p className="text-center text-xs text-ink-soft">{parsed.error.issues[0].message} to continue.</p>
        )}
      </div>
    </form>
  );
}
