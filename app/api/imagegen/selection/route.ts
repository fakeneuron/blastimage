/**
 * blastimage — write rounds/r<N>/selection.json (BI-045)
 *
 * The terminal loop's inbox (BI-024.2): the browser posts the task entries it
 * decided this sitting, and the server merges them into whatever the file
 * already holds rather than overwriting a co-existing decision.
 */

import { jsonBody, refuseUnguarded, resultResponse, rootFrom, roundFrom } from '@/lib/imagegenRoute';
import { writeRoundSelection } from '@/lib/imagegenServerFs';
import type { RoundSelectionTask } from '@/lib/roundSelection';

export async function POST(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const body = await jsonBody(req);
  if (!body.ok) return resultResponse(body);
  const root = await rootFrom(typeof body.value.root === 'string' ? body.value.root : null);
  if (!root.ok) return resultResponse(root);
  const round = roundFrom(body.value.round);
  if (!round.ok) return resultResponse(round);
  const { tasks, selectedAt } = body.value;
  if (!Array.isArray(tasks)) return resultResponse({ ok: false, error: 'Expected a tasks array.' });
  if (typeof selectedAt !== 'string') {
    return resultResponse({ ok: false, error: 'Expected a selectedAt timestamp.' });
  }
  return resultResponse(
    await writeRoundSelection(root.value, round.value, tasks as RoundSelectionTask[], selectedAt),
  );
}
