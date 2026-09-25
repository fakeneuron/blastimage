/**
 * blastimage — write rounds/r<N>/selection.json (BI-045)
 *
 * The terminal loop's inbox (BI-024.2): the browser posts the task entries it
 * decided this sitting, and the server merges them into whatever the file
 * already holds rather than overwriting a co-existing decision.
 */

import { jsonBody, refuseUnguarded, resultResponse, rootFrom, roundFrom } from '@/lib/imagegenRoute';
import { writeRoundSelection } from '@/lib/imagegenServerFs';
import { parseRoundSelectionTask, type RoundSelectionTask } from '@/lib/roundSelection';

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
  if (typeof selectedAt !== 'string' || !selectedAt.trim()) {
    return resultResponse({ ok: false, error: 'Expected a selectedAt timestamp.' });
  }
  // Validated with the reader's own per-entry rule (BI-062): an entry the
  // reader rejects, once written, fails every later write to this round.
  const parsed: RoundSelectionTask[] = [];
  for (const [i, entry] of tasks.entries()) {
    const task = parseRoundSelectionTask(entry, i);
    if (!task.ok) return resultResponse(task);
    parsed.push(task.value);
  }
  return resultResponse(await writeRoundSelection(root.value, round.value, parsed, selectedAt));
}
