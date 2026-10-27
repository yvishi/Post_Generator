import { stageRoute } from '@/lib/route-helper';
import { researchRequestSchema } from '@/lib/types';
import { runResearch } from '@/lib/stages/research';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = stageRoute(researchRequestSchema, (req) => runResearch(req));
