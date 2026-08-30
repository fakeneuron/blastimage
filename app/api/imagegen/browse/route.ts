/**
 * blastimage — directory listing for the folder picker (BI-046)
 *
 * `GET` returns the subdirectories of the path the picker is showing, so
 * linking an `imagegen/` folder is navigation instead of a typed absolute
 * path. No `path` starts at the home directory. Unlike the other five routes
 * this one takes no linked root — it is how the operator finds one — and is
 * deliberately unconfined; see `lib/imagegenServerFs.ts` `listDirectories`.
 */

import { refuseUnguarded, resultResponse } from '@/lib/imagegenRoute';
import { listDirectories } from '@/lib/imagegenServerFs';

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const path = new URL(req.url).searchParams.get('path');
  return resultResponse(await listDirectories(path));
}
