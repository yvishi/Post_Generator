import { stageRoute } from '@/lib/route-helper';
import { draftRequestSchema } from '@/lib/types';
import { draftPiece } from '@/lib/stages/draft';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = stageRoute(draftRequestSchema, (req) => draftPiece(req));
