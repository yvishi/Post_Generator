import { stageRoute } from '@/lib/route-helper';
import { imageRequestSchema } from '@/lib/types';
import { generateImage } from '@/lib/stages/image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = stageRoute(imageRequestSchema, (req) => generateImage(req));
