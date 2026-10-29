// PLAN §10 Q12: which onlyIf form gives create-if-absent in R2.
import { env } from 'cloudflare:test';
import { expect, it } from 'vitest';
const R2 = (env as any).REPORTS as R2Bucket;

it('etagDoesNotMatch "*" refuses to overwrite an existing object', async () => {
  const first = await R2.put('probe/a', 'one', { onlyIf: { etagDoesNotMatch: '*' } });
  expect(first).not.toBeNull();
  const second = await R2.put('probe/a', 'two', { onlyIf: { etagDoesNotMatch: '*' } });
  expect(second).toBeNull();
  expect(await (await R2.get('probe/a'))!.text()).toBe('one');
});

it('etagMatches fails on a stale etag', async () => {
  const a = await R2.put('probe/b', 'one');
  await R2.put('probe/b', 'two');
  expect(await R2.put('probe/b', 'three', { onlyIf: { etagMatches: a!.etag } })).toBeNull();
});
