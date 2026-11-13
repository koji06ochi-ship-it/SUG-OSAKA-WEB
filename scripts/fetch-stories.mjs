import {writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {normalize} from '../stories-core.mjs';
export async function collect(env, request = fetch, now = Date.now()) {
  const {INSTAGRAM_ACCESS_TOKEN:token, INSTAGRAM_USER_ID:id, INSTAGRAM_LOGIN_MODE:mode, INSTAGRAM_API_VERSION:version} = env;
  if (!token || !/^\d+$/.test(id || '') || !['instagram','facebook'].includes(mode) || !/^v\d+\.\d+$/.test(version || '')) throw Error('CONFIG_REQUIRED');
  const host = mode === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com';
  async function get(path, params) {
    const url = new URL(`https://${host}/${version}/${path}`);
    for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
    const res = await request(url, {headers:{Authorization:`Bearer ${token}`}, redirect:'error', signal:AbortSignal.timeout(15000)});
    if (!res.ok) throw Error(`META_HTTP_${res.status}`);
    const body = await res.json();
    if (body.error) throw Error('META_API_ERROR');
    return body;
  }
  const owner = await get(id, {fields:'id,username'});
  if (owner.username !== 'ko_ji.sug' || String(owner.id) !== id) throw Error('ACCOUNT_MISMATCH');
  const items = [];
  let after;
  for (let page=0; page<10; page++) {
    const body = await get(`${id}/stories`, {fields:'id,media_type,media_url,thumbnail_url,timestamp',limit:'100',...(after ? {after} : {})});
    if (!Array.isArray(body.data)) throw Error('INVALID_RESPONSE');
    items.push(...body.data);
    if (!body.paging?.next) return {schema:1,fetched_at:new Date(now).toISOString(),stories:normalize(items,now)};
    const cursor=body.paging?.cursors?.after;
    if (typeof cursor !== 'string' || !cursor || cursor === after) throw Error('INVALID_PAGING');
    after=cursor; // Never follow provider-supplied URLs with credentials.
  }
  throw Error('PAGE_LIMIT');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const feed = await collect(process.env);
    const output=process.argv[2] || 'stories.json';
    const json=JSON.stringify(feed,null,2)+'\n';
    if (json.includes(process.env.INSTAGRAM_ACCESS_TOKEN)) throw Error('SECRET_DETECTED');
    await writeFile(output+'.tmp',json,{mode:0o600});
    await rename(output+'.tmp',output);
    console.log(`Stories fetched: ${feed.stories.length}`);
  } catch (e) {
    // No raw response, request URL, token, or stack in public Actions logs.
    console.error(/^META_HTTP_\d+$/.test(e.message) || ['CONFIG_REQUIRED','ACCOUNT_MISMATCH','INVALID_RESPONSE','INVALID_PAGING','PAGE_LIMIT','SECRET_DETECTED','META_API_ERROR'].includes(e.message) ? e.message : 'FETCH_FAILED');
    process.exitCode=1;
  }
}
