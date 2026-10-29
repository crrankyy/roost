import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import worker, { type Env } from '../../src/index';

export const TEAM = 'test.cloudflareaccess.com';
export const AUD = 'test-aud';
export const SERVICE_ID = 'svc.access';

const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encBytes = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let keys: CryptoKeyPair | null = null;

/** Generates the test signing key and stubs the Access certs endpoint. */
export async function setupAccess() {
  keys ??= (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  )) as CryptoKeyPair;
  const jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1', alg: 'RS256' };
  const real = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url === `https://${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [jwk] });
    return real(input, init);
  });
}

export async function token(claims: Record<string, unknown>, kid = 'k1'): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ alg: 'RS256', kid });
  const body = enc({ iss: `https://${TEAM}`, aud: [AUD], iat: now, exp: now + 600, ...claims });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys!.privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${encBytes(sig)}`;
}

export const browser = () => token({ email: 'owner@example.com' });
export const service = () => token({ common_name: SERVICE_ID });

export const testEnv = (): Env => ({ ...(env as Env), POLICY_AUD: AUD, TEAM_DOMAIN: TEAM, SERVICE_TOKEN_ID: SERVICE_ID });

export async function call(path: string, opts: { jwt?: string; method?: string; body?: BodyInit; headers?: Record<string, string> } = {}) {
  const headers = new Headers(opts.headers);
  if (opts.jwt) headers.set('Cf-Access-Jwt-Assertion', opts.jwt);
  const req = new Request(`https://roost.test${path}`, { method: opts.method ?? 'GET', body: opts.body, headers, redirect: 'manual' });
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, testEnv(), ctx);
  await waitOnExecutionContext(ctx);
  return res;
}
