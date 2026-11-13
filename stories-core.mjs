export const DAY = 86400000;
export const MAX_STALE = 1800000;
export const PROFILE = 'https://www.instagram.com/ko_ji.sug/';
export function safeMedia(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname) &&
      !u.searchParams.has('access_token') ? u.href : '';
  } catch { return ''; }
}
export function normalize(items, now = Date.now()) {
  const found = new Set();
  return (Array.isArray(items) ? items : []).flatMap(item => {
    const posted = Date.parse(item.timestamp);
    const expires = posted + DAY;
    if (!/^\d+$/.test(item.id) || found.has(item.id) || !Number.isFinite(posted) || posted > now || expires <= now || !['IMAGE','VIDEO'].includes(item.media_type)) return [];
    const media_url = safeMedia(item.media_url);
    const thumbnail_url = safeMedia(item.thumbnail_url);
    // Missing video URLs are retained as an Instagram-only item, never invented.
    found.add(item.id);
    return [{id:item.id, media_type:item.media_type, media_url, thumbnail_url,
      timestamp:new Date(posted).toISOString(), expires_at:new Date(expires).toISOString()}];
  }).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
}
export function activeFeed(feed, now = Date.now()) {
  const fetched = Date.parse(feed?.fetched_at);
  if (!Number.isFinite(fetched) || fetched > now + 60000 || now - fetched >= MAX_STALE) return [];
  return normalize(feed.stories, now);
}
