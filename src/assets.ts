// Roost's own browser files (/_roost/), bundled into the Worker as text so they pass the same auth as everything else.
import islands from '../public/_roost/islands.js';
import chromeJs from '../public/_roost/chrome.js';
import chromeCss from '../public/_roost/chrome.css';

const FILES: Record<string, { body: string; type: string }> = {
  'islands.js': { body: islands, type: 'text/javascript; charset=utf-8' },
  'chrome.js': { body: chromeJs, type: 'text/javascript; charset=utf-8' },
  'chrome.css': { body: chromeCss, type: 'text/css; charset=utf-8' },
};

// FNV-1a: a cache-busting tag, not a security hash.
function tag(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
const TAGS = Object.fromEntries(Object.entries(FILES).map(([k, v]) => [k, tag(v.body)]));

export const assetUrl = (name: keyof typeof FILES & string) => `/_roost/${name}?v=${TAGS[name]}`;

export function serveAsset(name: string): Response | null {
  const f = FILES[name];
  if (!f) return null;
  return new Response(f.body, { headers: { 'content-type': f.type, 'cache-control': 'private, max-age=31536000, immutable' } });
}
