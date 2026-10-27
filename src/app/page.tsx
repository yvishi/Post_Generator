'use client';

import { useRef, useState } from 'react';
import { InputForm } from '@/components/InputForm';
import { ProgressView } from '@/components/ProgressView';
import { Results } from '@/components/Results';
import { createDemoApi } from '@/lib/demo-api';
import { acceptPiece, revisePiece, runPack, type ProgressEvent } from '@/lib/orchestrator';
import { httpApi, type StageApi } from '@/lib/stage-api';
import type { ContentType, PackForm, PackResult, PieceResult } from '@/lib/types';

export default function Home() {
  const [form, setForm] = useState<PackForm | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const api = useRef<StageApi>(httpApi);
  const running = form !== null && result === null && error === null;

  async function generate(f: PackForm) {
    setForm(f);
    setEditing(false);
    setEvents([]);
    setResult(null);
    setError(null);
    const demo = new URLSearchParams(window.location.search).has('demo');
    api.current = demo ? createDemoApi() : httpApi;
    try {
      setResult(await runPack(f, api.current, (e) => setEvents((prev) => [...prev, e])));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Follow-up actions on one piece after the pack is done. The report is not rewritten.
  async function update(type: ContentType, change: (piece: PieceResult, r: PackResult) => Promise<PieceResult>) {
    const piece = result?.pieces.find((p) => p.type === type);
    if (!result || !piece) return;
    const next = await change(piece, result);
    setResult((r) => r && { ...r, pieces: r.pieces.map((p) => (p.type === type ? next : p)) });
  }

  const revise = (type: ContentType, note: string) =>
    update(type, (piece, r) => revisePiece(piece, note, { form: form!, research: r.research }, api.current));
  const accept = (type: ContentType) => update(type, (piece) => acceptPiece(piece, api.current));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-xl">Vidya AI</span>
            <span className="text-sm text-muted">Content studio</span>
          </p>
          <p className="hidden text-sm text-muted sm:block">Drafts only. Nothing is posted for you.</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Kept mounted so the brief survives while results are shown. */}
        <section hidden={!editing} className="flex flex-col gap-8">
          {!form && (
            <div className="flex max-w-2xl flex-col gap-3">
              <h1 className="font-display text-4xl leading-[1.1] text-balance sm:text-5xl">
                What should Vidya talk about next?
              </h1>
              <p className="text-lg leading-relaxed text-muted">
                Give us a topic or a link. You’ll get posts, ads and an image in Vidya’s voice, ready for you to review.
              </p>
            </div>
          )}
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_10px_40px_-20px_rgb(21_33_42/0.18)] sm:p-8">
            <InputForm onSubmit={generate} disabled={running} />
          </div>
        </section>

        {form && !editing && (
          <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-peacock">Your brief</p>
              <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">{form.topic ?? form.link}</h1>
              {form.topic && form.link && <p className="truncate text-sm text-muted">{form.link}</p>}
              {form.notes && <p className="text-sm text-muted">Notes: {form.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={running}
              className="shrink-0 self-start rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold transition hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              Edit brief
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-danger/30 bg-surface p-5">
            <p className="font-semibold text-danger">We couldn’t start on this brief.</p>
            <p className="mt-1 text-sm leading-6">{error}</p>
            <p className="mt-2 text-sm text-muted">Check the topic or link, then generate again.</p>
          </div>
        )}

        {running && <ProgressView events={events} types={form.types} />}
        {result && <Results data={result} onRevise={revise} onAccept={accept} />}
      </main>
    </div>
  );
}
