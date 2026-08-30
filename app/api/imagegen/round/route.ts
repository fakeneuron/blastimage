/**
 * blastimage — read a round's batch.json (BI-045)
 *
 * Returns the file as text. Validation stays client-side in `parseRoundBatch`,
 * the same pure parser the FSA read path fed (BI-024.1), so schema handling has
 * exactly one implementation.
 */

import { refuseUnguarded, resultResponse, rootFrom, roundFrom } from '@/lib/imagegenRoute';
import { readBatchText } from '@/lib/imagegenServerFs';

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const params = new URL(req.url).searchParams;
  const root = await rootFrom(params.get('root'));
  if (!root.ok) return resultResponse(root);
  const round = roundFrom(params.get('round'));
  if (!round.ok) return resultResponse(round);
  return resultResponse(await readBatchText(root.value, round.value));
}
