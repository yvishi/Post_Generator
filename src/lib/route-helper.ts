import type { ZodType } from 'zod';

const json = (body: unknown, status: number) => Response.json(body, { status });

export function stageRoute<Req, Res>(
  schema: ZodType<Req>,
  run: (req: Req) => Promise<Res>,
): (r: Request) => Promise<Response> {
  return async (r) => {
    let body: unknown;
    try {
      body = await r.json();
    } catch {
      return json({ error: 'Request body must be valid JSON' }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
    }
    try {
      return json(await run(parsed.data), 200);
    } catch (e) {
      console.error('Stage route failed:', e);
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  };
}
