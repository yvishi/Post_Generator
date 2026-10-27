'use client';

import { useState } from 'react';
import { CONTENT_META } from '@/lib/content-meta';
import { CONTENT_TYPES, packFormSchema, type ContentType, type PackForm } from '@/lib/types';
import { ChannelIcon } from './icons';

type Props = { onSubmit: (form: PackForm) => void; disabled: boolean };

const input =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 ' +
  'transition focus:border-peacock focus:outline-none focus:ring-4 focus:ring-peacock/10 disabled:opacity-60';

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
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed.success && !disabled) onSubmit(parsed.data);
      }}
    >
      <fieldset disabled={disabled} className="flex flex-col gap-4">
        <legend className="sr-only">Brief</legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="text-sm font-semibold">
            Topic
          </label>
          <input
            id="topic"
            className={`${input} py-4 text-lg`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Helping your child prepare for board exams without stress"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="link" className="text-sm font-semibold">
              Link
            </label>
            <input
              id="link"
              type="url"
              inputMode="url"
              className={input}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste an article or page (optional)"
              aria-invalid={linkInvalid}
              aria-describedby="link-help"
            />
            <p id="link-help" className={`text-xs ${linkInvalid ? 'text-danger' : 'text-muted'}`}>
              {linkInvalid ? 'Link must start with http:// or https://' : 'Use a topic, a link, or both.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm font-semibold">
              Notes (optional)
            </label>
            <input
              id="notes"
              className={input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mention the 7-day free trial"
            />
            <p className="text-xs text-muted">Tone, emphasis, or what to promote.</p>
          </div>
        </div>
      </fieldset>

      <fieldset disabled={disabled} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <legend className="text-sm font-semibold">What do you need?</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-ink">
            <input
              type="checkbox"
              className="size-4 accent-peacock"
              checked={allSelected}
              onChange={() => setTypes(allSelected ? [] : [...CONTENT_TYPES])}
            />
            Select all
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((t) => {
            const on = types.includes(t);
            return (
              <label
                key={t}
                className={`flex cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-peacock/20 ${
                  on
                    ? 'border-peacock bg-peacock text-white'
                    : 'border-line bg-surface text-ink hover:border-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggle(t)}
                  aria-label={CONTENT_META[t].label}
                />
                <ChannelIcon type={t} />
                <span>{CONTENT_META[t].label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col items-start gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {!parsed.success && !disabled
            ? `${parsed.error.issues[0].message} to continue.`
            : `${types.length} ${types.length === 1 ? 'piece' : 'pieces'} selected. Everything stays a draft until you post it.`}
        </p>
        <button
          type="submit"
          disabled={!parsed.success || disabled}
          className="w-full rounded-full bg-peacock px-7 py-3 text-base font-semibold text-white transition hover:bg-[#094c58] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peacock/30 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted sm:w-auto"
        >
          {disabled ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </form>
  );
}
