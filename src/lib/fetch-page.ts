import { convert } from 'html-to-text';

export const MAX_PAGE_CHARS = 20000;
const TIMEOUT_MS = 10000;

const fail = (reason: string) => new Error(`Could not read link: ${reason}`);

export async function fetchPage(url: string, fetchImpl: typeof fetch = fetch): Promise<{ url: string; text: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw fail('that is not a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw fail('the link must start with http:// or https://');

  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw fail(timedOut ? 'the page took too long to respond' : e instanceof Error ? e.message : 'request failed');
  }
  if (!res.ok) throw fail(`the page returned status ${res.status}`);

  const type = res.headers.get('content-type') ?? '';
  if (!/^(text\/|application\/xhtml)/i.test(type)) throw fail(`unsupported content type "${type || 'unknown'}"`);

  const html = await res.text();
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'h1', options: { uppercase: false } },
      { selector: 'h2', options: { uppercase: false } },
      { selector: 'h3', options: { uppercase: false } },
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
    ],
  });
  return { url, text: text.slice(0, MAX_PAGE_CHARS) };
}
