/**
 * Live eval: runs one full pack (all 7 types) against the real stages and prints how it went.
 *
 *   npm run eval -- "<topic or link>"
 *
 * Needs OPENROUTER_API_KEY in .env.local. Writes the full result to eval-output/<timestamp>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

// Before the stage modules load: models.ts reads its env vars at import time.
config({ path: '.env.local', quiet: true });

async function main() {
  const input = process.argv.slice(2).join(' ').trim();
  if (!input) {
    console.error('Usage: npm run eval -- "<topic or link>"');
    process.exit(1);
  }

  const { runPack } = await import('../src/lib/orchestrator');
  const { directApi } = await import('../src/lib/direct-api');
  const { blocking } = await import('../src/lib/review');
  const { CONTENT_TYPES } = await import('../src/lib/types');

  const isLink = input.startsWith('http');
  const form = { ...(isLink ? { link: input } : { topic: input }), types: [...CONTENT_TYPES] };

  const start = Date.now();
  const secs = () => ((Date.now() - start) / 1000).toFixed(1).padStart(6);
  console.log(`Eval (${isLink ? 'link' : 'topic'} mode): ${input}\n`);

  const result = await runPack(form, directApi, (e) => {
    const where = [e.stage, e.type, e.attempt && `#${e.attempt}`].filter(Boolean).join(' ');
    console.log(`[${secs()}s] ${where}: ${e.status}`);
  });
  const total = (Date.now() - start) / 1000;

  const { research, pieces, report } = result;
  console.log('\ntype        | status | attempts');
  console.log('------------|--------|---------');
  for (const p of pieces) console.log(`${p.type.padEnd(11)} | ${p.status.padEnd(6)} | ${p.attempts.length}`);

  const passed = pieces.filter((p) => p.status === 'passed').length;
  console.log(`\nPass rate: ${passed}/${pieces.length} (${Math.round((passed / pieces.length) * 100)}%)`);
  console.log(`Facts: ${research.facts.length}   Angles: ${research.angles.length}   Time: ${total.toFixed(1)}s`);
  if (isLink) {
    const linked = research.facts.filter((f) => f.id.startsWith('topic-') && f.sourceUrl === input).length;
    console.log(`topic-* facts sourced from the link: ${linked}`);
  }

  console.log(`\nResearch errors (${research.errors.length}):`);
  for (const err of research.errors) console.log(`  - ${err}`);
  console.log(`Conflicts (${research.conflicts.length}):`);
  for (const c of research.conflicts) console.log(`  - ${c}`);

  const firstBad = pieces.find((p) => p.status !== 'passed');
  if (firstBad) {
    console.log(`\nFirst ${firstBad.status} piece: ${firstBad.type}`);
    if (firstBad.error) console.log(`  error: ${firstBad.error}`);
    const best = firstBad.bestAttempt !== undefined ? firstBad.attempts[firstBad.bestAttempt] : undefined;
    for (const i of best ? blocking(best.check.issues) : []) {
      console.log(`  - [${i.rule}] "${i.quote}"\n      problem: ${i.problem}\n      fix: ${i.fix}`);
    }
  } else {
    console.log('\nEvery piece passed.');
  }

  console.log(`\nReport: ${report.summary}`);

  mkdirSync('eval-output', { recursive: true });
  const file = join('eval-output', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ input, mode: isLink ? 'link' : 'topic', seconds: total, result }, null, 2));
  console.log(`\nSaved ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
