/**
 * blastimage — list loadable rounds (BI-045)
 *
 * Round numbers under `rounds/` that carry a `batch.json`, ascending.
 */

import { refuseUnguarded, resultResponse, rootFrom } from '@/lib/imagegenRoute';
import { listRounds } from '@/lib/imagegenServerFs';

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const root = await rootFrom(new URL(req.url).searchParams.get('root'));
  if (!root.ok) return resultResponse(root);
  return resultResponse({ ok: true, value: await listRounds(root.value) });
}
