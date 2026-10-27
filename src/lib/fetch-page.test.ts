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
