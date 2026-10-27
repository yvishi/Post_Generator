'use client';

import { useState } from 'react';
import { InputForm } from '@/components/InputForm';
import { ProgressView } from '@/components/ProgressView';
import { Results } from '@/components/Results';
import { createDemoApi } from '@/lib/demo-api';
import { runPack, type ProgressEvent } from '@/lib/orchestrator';
import { httpApi } from '@/lib/stage-api';
import type { PackForm, PackResult } from '@/lib/types';

const CHAIN = [
  ['Research', 'Four calls read the Vidya site and your topic or link, find parent concerns, then merge it all into one fact sheet.'],
  ['Draft', 'Each piece is written from those facts only, steered by your notes.'],
  ['Check', 'A checker marks each draft against brand rules and channel limits, sending it back up to 3 times.'],
  ['Image', 'If the image brief passes, the image is generated from it.'],
  ['Report', 'A short summary of what passed, what failed, and why.'],
] as const;

export default function Home() {
  const [form, setForm] = useState<PackForm | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = form !== null && result === null && error === null;

  async function generate(f: PackForm) {
    setForm(f);
    setEvents([]);
    setResult(null);
    setError(null);
    const demo = new URLSearchParams(window.location.search).has('demo');
    try {
      const data = await runPack(f, demo ? createDemoApi() : httpApi, (e) => setEvents((prev) => [...prev, e]));
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-4 sm:px-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Vidya <span className="font-medium text-ink-soft">content desk</span>
          </h1>
          <p className="text-sm text-ink-soft">Every piece is drafted for review. Nothing is posted for you.</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <InputForm onSubmit={generate} disabled={running} />
        </aside>

        <section aria-label="Content pack" className="ruled-sheet min-h-[32rem] rounded-lg border border-rule py-8">
          {!form && (
            <div className="mr-4 ml-[var(--margin-x)] flex max-w-xl flex-col gap-6 pl-4 sm:pl-6">
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-2xl font-bold leading-tight">Nothing generated yet</h2>
                <p className="leading-relaxed text-ink-soft">
                  Add a topic or a link, pick what to make, and press Generate. Each piece then goes through these steps:
                </p>
              </div>
              <ol className="flex flex-col gap-4">
                {CHAIN.map(([name, body], i) => (
                  <li key={name} className="grid grid-cols-[2rem_1fr] gap-x-2">
                    <span className="font-hand text-2xl leading-7 text-margin">{i + 1}.</span>
                    <div>
                      <h3 className="font-display font-bold leading-7">{name}</h3>
                      <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {form && !result && (
            <div className="mr-3 ml-[var(--margin-x)] flex flex-col gap-4 pl-3 sm:mr-5 sm:pl-5">
              {error ? (
                <div role="alert" className="rounded-lg border border-margin bg-sheet p-4">
                  <h2 className="font-display text-lg font-bold text-margin">The run stopped at research</h2>
                  <p className="mt-1 text-sm leading-relaxed">{error}</p>
                  <p className="mt-2 text-sm text-ink-soft">Check the topic or link and press Generate again.</p>
                </div>
              ) : (
                <p className="font-hand text-xl text-ink-soft">Working on it…</p>
              )}
              <ProgressView events={events} types={form.types} />
            </div>
          )}

          {result && <Results data={result} />}
        </section>
      </main>
    </div>
  );
}
