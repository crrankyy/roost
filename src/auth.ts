// Cloudflare Access JWT validation (SPEC 2). Every request is checked, even though Access sits in front.

export interface AuthEnv {
  POLICY_AUD: string;
  TEAM_DOMAIN: string;
  SERVICE_TOKEN_ID: string;
  /** Local development only (.dev.vars, never deployed): skip Access on localhost. */
  DEV_IDENTITY?: string;
}

export type Identity =
  | { kind: 'service'; commonName: string }
  | { kind: 'browser'; email: string };

const CERTS_TTL_MS = 60 * 60 * 1000;
const LEEWAY_S = 60;

let certs: { team: string; at: number; keys: Map<string, CryptoKey> } | null = null;

function b64urlBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

function b64urlJson(s: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

async function loadCerts(team: string): Promise<Map<string, CryptoKey>> {
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  const map = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    map.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  certs = { team, at: Date.now(), keys: map };
  return map;
}

async function keyFor(team: string, kid: string): Promise<CryptoKey | undefined> {
  const fresh = certs && certs.team === team && Date.now() - certs.at < CERTS_TTL_MS;
  const key = fresh ? certs!.keys.get(kid) : undefined;
  if (key) return key;
  return (await loadCerts(team)).get(kid); // unknown kid: Access may have rotated keys
}

/** Returns the caller's identity, or null when the request must get 403. */
export async function authenticate(req: Request, env: AuthEnv): Promise<Identity | null> {
  if (env.DEV_IDENTITY === '1' && ['localhost', '127.0.0.1'].includes(new URL(req.url).hostname)) {
    return req.headers.get('x-dev-identity') === 'service' ? { kind: 'service', commonName: 'dev' } : { kind: 'browser', email: 'dev@localhost' };
  }
  if (!env.POLICY_AUD || !env.TEAM_DOMAIN) return null; // not configured: fail closed
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = b64urlJson(parts[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const key = await keyFor(env.TEAM_DOMAIN, header.kid);
    if (!key) return null;
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return null;
    const p = b64urlJson(parts[1]);
    const now = Date.now() / 1000;
    if (p.iss !== `https://${env.TEAM_DOMAIN}`) return null;
    const aud: string[] = Array.isArray(p.aud) ? p.aud : [p.aud];
    if (!aud.includes(env.POLICY_AUD)) return null;
    if (typeof p.exp !== 'number' || p.exp + LEEWAY_S < now) return null;
    if (typeof p.nbf === 'number' && p.nbf - LEEWAY_S > now) return null;
    if (env.SERVICE_TOKEN_ID && p.common_name === env.SERVICE_TOKEN_ID) return { kind: 'service', commonName: p.common_name };
    if (typeof p.email === 'string' && p.email) return { kind: 'browser', email: p.email };
    return null;
  } catch {
    return null;
  }
}
