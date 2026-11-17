import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { vi } from 'vitest';
import worker, { type Env } from '../../src/index';
// @ts-expect-error: a plain .mjs fixture, shared with the CLI tests
import { page } from '../fixtures/filing.mjs';

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

export const sha = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Full begin → put → commit, the way the CLI does it, of a report-builder page filed as the publish says
 * (kind, project, stream). `page` overrides the filing written into the page itself; `html` replaces the page.
 */
export async function publishPage(jwt: string, project: string, id: string, o: {
  body?: Record<string, unknown>; page?: Record<string, string>; html?: string; content?: string; files?: Record<string, string>;
} = {}) {
  const b0: Record<string, unknown> = { kind: 'investigation', title: `T ${id}`, summary: 's', classification: { why: 'test', confirmed: true }, ...o.body };
  const stream = (b0.stream as string) ?? (b0.new_stream as any)?.id ?? (b0.proposed_stream as any)?.id ?? '';
  const html = o.html ?? page({ kind: b0.kind as string, project, stream, title: b0.title as string, body: o.content ?? '', ...o.page });
  const all = { 'index.html': html, ...o.files };
  const files = await Promise.all(Object.entries(all).map(async ([path, s]) => ({ path, size: new TextEncoder().encode(s).length, sha256: await sha(s) })));
  const api = (path: string, method: string, body: unknown) => call(path, { jwt, method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const b = await api('/api/publish', 'POST', { project, id, files, ...b0 });
  const begun = (await b.json()) as any;
  if (b.status !== 201) return { status: b.status, body: begun };
  for (const [path, s] of Object.entries(all)) {
    const r = await call(`${begun.put_base}${path}`, { jwt, method: 'PUT', body: s, headers: { 'content-type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' } });
    if (r.status !== 200) throw new Error(`PUT ${path}: ${r.status} ${await r.text()}`);
  }
  const c = await api(`${begun.put_base}commit`, 'POST', {});
  return { status: c.status, body: (await c.json()) as any, put_base: begun.put_base as string };
}
