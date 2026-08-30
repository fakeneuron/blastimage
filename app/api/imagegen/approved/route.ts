/**
 * blastimage — the approved/ folder (BI-045)
 *
 * `GET` reports whether a promotion would replace a *different* image already
 * under that name (BI-032), `POST` promotes a keeper, and `DELETE` undoes one
 * (BI-030.2) so an approve is never a one-way write into the operator's repo.
 */

import {
  filenameFrom,
  jsonBody,
  refuseUnguarded,
  resultResponse,
  rootFrom,
  roundFrom,
} from '@/lib/imagegenRoute';
import { approvedConflict, promoteApproved, removeApproved } from '@/lib/imagegenServerFs';

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const params = new URL(req.url).searchParams;
  const root = await rootFrom(params.get('root'));
  if (!root.ok) return resultResponse(root);
  const round = roundFrom(params.get('round'));
  if (!round.ok) return resultResponse(round);
  const filename = filenameFrom(params.get('filename'));
  if (!filename.ok) return resultResponse(filename);
  return resultResponse(await approvedConflict(root.value, round.value, filename.value));
}

export async function POST(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const body = await jsonBody(req);
  if (!body.ok) return resultResponse(body);
  const root = await rootFrom(typeof body.value.root === 'string' ? body.value.root : null);
  if (!root.ok) return resultResponse(root);
  const round = roundFrom(body.value.round);
  if (!round.ok) return resultResponse(round);
  const filename = filenameFrom(body.value.filename);
  if (!filename.ok) return resultResponse(filename);
  return resultResponse(await promoteApproved(root.value, round.value, filename.value));
}

export async function DELETE(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const params = new URL(req.url).searchParams;
  const root = await rootFrom(params.get('root'));
  if (!root.ok) return resultResponse(root);
  const filename = filenameFrom(params.get('filename'));
  if (!filename.ok) return resultResponse(filename);
  return resultResponse(await removeApproved(root.value, filename.value));
}
