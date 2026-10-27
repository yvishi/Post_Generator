import { stageRoute } from '@/lib/route-helper';
import { checkRequestSchema } from '@/lib/types';
import { checkPiece } from '@/lib/stages/check';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = stageRoute(checkRequestSchema, (req) => checkPiece(req));
