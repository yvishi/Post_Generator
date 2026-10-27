import 'server-only';
import type { StageApi } from './stage-api';
import { checkPiece } from './stages/check';
import { draftPiece } from './stages/draft';
import { generateImage } from './stages/image';
import { writeReport } from './stages/report';
import { runResearch } from './stages/research';

export const directApi: StageApi = {
  research: (r) => runResearch(r),
  draft: (r) => draftPiece(r),
  check: (r) => checkPiece(r),
  image: (r) => generateImage(r),
  report: (r) => writeReport(r),
};
