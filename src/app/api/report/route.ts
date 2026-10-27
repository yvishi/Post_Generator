import { stageRoute } from '@/lib/route-helper';
import { reportRequestSchema } from '@/lib/types';
import { writeReport } from '@/lib/stages/report';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = stageRoute(reportRequestSchema, (req) => writeReport(req));
