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

  // DOMException is not always an `Error` instance, so read name/message structurally.
  const reason = (e: unknown) => {
    const { name, message } = (e ?? {}) as { name?: string; message?: string };
    if (name === 'TimeoutError' || name === 'AbortError') return 'the page took too long to respond';
    return message || 'request failed';
  };
  // One signal covers headers and body, so a stalled body also times out.
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(url, { signal });
  } catch (e) {
    throw fail(reason(e));
  }
  if (!res.ok) throw fail(`the page returned status ${res.status}`);

  const type = res.headers.get('content-type') ?? '';
  if (!/^(text\/|application\/xhtml)/i.test(type)) throw fail(`unsupported content type "${type || 'unknown'}"`);

  let text: string;
  try {
    text = convert(await res.text(), {
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
  } catch (e) {
    throw fail(reason(e));
  }
  return { url, text: text.slice(0, MAX_PAGE_CHARS) };
}
