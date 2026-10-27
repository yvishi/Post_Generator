import { describe, expect, it } from 'vitest';
import { fetchPage, MAX_PAGE_CHARS } from './fetch-page';

const respond = (body: string, init: { status?: number; type?: string } = {}) =>
  (async () =>
    new Response(body, { status: init.status ?? 200, headers: { 'content-type': init.type ?? 'text/html' } })) as unknown as typeof fetch;

describe('fetchPage', () => {
  it('rejects non-http and reports 404', async () => {
    await expect(fetchPage('ftp://x.com', respond(''))).rejects.toThrow('Could not read link');
    await expect(fetchPage('not a url', respond(''))).rejects.toThrow('Could not read link');
    await expect(fetchPage('https://x.com', respond('', { status: 404 }))).rejects.toThrow(/Could not read link: .*404/);
  });

  it('rejects non-text content types', async () => {
    await expect(fetchPage('https://x.com/a.pdf', respond('x', { type: 'application/pdf' }))).rejects.toThrow('Could not read link');
  });

  it('wraps network failures and timeouts', async () => {
    const boom = (async () => {
      throw new DOMException('timed out', 'TimeoutError');
    }) as unknown as typeof fetch;
    await expect(fetchPage('https://x.com', boom)).rejects.toThrow('Could not read link');
  });

  it('wraps a body read that times out or drops', async () => {
    const stalled = (async () => {
      const res = new Response('x', { headers: { 'content-type': 'text/html' } });
      res.text = () => Promise.reject(new DOMException('timed out', 'TimeoutError'));
      return res;
    }) as unknown as typeof fetch;
    await expect(fetchPage('https://x.com', stalled)).rejects.toThrow('Could not read link: the page took too long');
  });

  it('sends a browser-like User-Agent and asks for HTML', async () => {
    let init: RequestInit | undefined;
    const spy = (async (_url: string, i?: RequestInit) => {
      init = i;
      return new Response('<p>Hi</p>', { headers: { 'content-type': 'text/html' } });
    }) as unknown as typeof fetch;
    await fetchPage('https://x.com', spy);
    const headers = new Headers(init?.headers);
    expect(headers.get('user-agent')).toMatch(/^Mozilla\/5\.0 /);
    expect(headers.get('accept')).toContain('text/html');
  });

  it('extracts text', async () => {
    const page = await fetchPage('https://x.com', respond('<h1>Hi</h1><script>x()</script><a href="https://y.com">link</a>'));
    expect(page.url).toBe('https://x.com');
    expect(page.text).toContain('Hi');
    expect(page.text).not.toContain('x()');
    expect(page.text).not.toContain('https://y.com');
  });

  it('truncates long pages', async () => {
    const page = await fetchPage('https://x.com', respond('<p>' + 'word '.repeat(10000) + '</p>'));
    expect(page.text).toHaveLength(MAX_PAGE_CHARS);
  });
});
