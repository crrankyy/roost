// R2 JSON documents with optimistic concurrency (PLAN 3.3).

export class ApiError extends Error {
  constructor(public status: number, public code: string, message = code, public field?: string) {
    super(message);
  }
}

const BACKOFF_MS = [25, 50, 100, 200, 400];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getJson<T>(bucket: R2Bucket, key: string): Promise<{ doc: T; etag: string } | null> {
  const obj = await bucket.get(key);
  return obj ? { doc: (await obj.json()) as T, etag: obj.etag } : null;
}

/**
 * Read-modify-write with an ETag precondition. `mutate` gets the current document (null when absent)
 * and returns the new one plus a result; it must be pure, because it reruns on every conflict.
 * A missing document is created with `etagDoesNotMatch: '*'`, so two creators cannot both win.
 */
export async function casUpdate<T, R>(
  bucket: R2Bucket, key: string, mutate: (doc: T | null) => { doc: T; result: R },
): Promise<R> {
  for (let attempt = 0; ; attempt++) {
    const cur = await getJson<T>(bucket, key);
    const { doc, result } = mutate(cur ? structuredClone(cur.doc) : null);
    const put = await bucket.put(key, JSON.stringify(doc), {
      httpMetadata: { contentType: 'application/json' },
      onlyIf: cur ? { etagMatches: cur.etag } : { etagDoesNotMatch: '*' },
    });
    if (put) return result;
    if (attempt >= BACKOFF_MS.length) throw new ApiError(409, 'cas_exhausted', `Too many concurrent writes to ${key}`);
    await sleep(BACKOFF_MS[attempt] * (0.5 + Math.random()));
  }
}

/** Writes only when the key is absent. Returns false if something is already there. */
export async function putIfAbsent(bucket: R2Bucket, key: string, body: ReadableStream | ArrayBuffer | string, opts: R2PutOptions = {}) {
  return (await bucket.put(key, body, { ...opts, onlyIf: { etagDoesNotMatch: '*' } })) !== null;
}
