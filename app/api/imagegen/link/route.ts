/**
 * blastimage — link the imagegen folder (BI-045)
 *
 * `GET` offers the paths worth pre-filling the prompt with; `POST` validates
 * the one the operator entered and hands back its canonical form, which the
 * browser stores and sends with every later call.
 */

import { NextResponse } from 'next/server';

import { jsonBody, refuseUnguarded, resultResponse } from '@/lib/imagegenRoute';
import { resolveRoot, suggestRoots } from '@/lib/imagegenServerFs';

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  return NextResponse.json({ ok: true, value: await suggestRoots(process.cwd()) });
}

export async function POST(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const body = await jsonBody(req);
  if (!body.ok) return resultResponse(body);
  const path = body.value.path;
  if (typeof path !== 'string') {
    return resultResponse({ ok: false, error: 'Enter the absolute path to your imagegen/ folder.' });
  }
  const root = await resolveRoot(path);
  if (!root.ok) return resultResponse(root);
  return NextResponse.json({ ok: true, value: { root: root.value } });
}
