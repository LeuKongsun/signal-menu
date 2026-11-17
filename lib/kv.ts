/**
 * Minimal key-value store.
 *
 * In production it talks to Upstash Redis over its REST API (added on Vercel via
 * Storage → Marketplace → Upstash for Redis). Vercel injects KV_REST_API_URL and
 * KV_REST_API_TOKEN; the UPSTASH_REDIS_REST_* names work too.
 *
 * Without those variables it falls back to process memory, which is fine for
 * local development but loses data between Vercel function instances.
 */

type MemoryEntry = { value: string; expiresAt: number | null };

const globalForKv = globalThis as typeof globalThis & {
  __signalKvMemory?: Map<string, MemoryEntry>;
  __signalKvWarned?: boolean;
};

function restConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function memory() {
  if (!globalForKv.__signalKvMemory) {
    globalForKv.__signalKvMemory = new Map();
    if (process.env.VERCEL && !globalForKv.__signalKvWarned) {
      globalForKv.__signalKvWarned = true;
      console.warn(
        "[kv] No Upstash Redis configured — orders are kept in memory and will be lost between requests on Vercel."
      );
    }
  }
  return globalForKv.__signalKvMemory;
}

async function redis<T>(command: (string | number)[]): Promise<T> {
  const config = restConfig()!;
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || data.error) {
    throw new Error(`Redis ${command[0]} failed: ${data.error || res.status}`);
  }
  return data.result as T;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (restConfig()) {
    const raw = await redis<string | null>(["GET", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const entry = memory().get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory().delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

/** Returns false when `onlyIfNew` is set and the key already exists. */
export async function kvSet(
  key: string,
  value: unknown,
  options: { ttlSeconds?: number; onlyIfNew?: boolean } = {}
): Promise<boolean> {
  const raw = JSON.stringify(value);

  if (restConfig()) {
    const command: (string | number)[] = ["SET", key, raw];
    if (options.ttlSeconds) command.push("EX", options.ttlSeconds);
    if (options.onlyIfNew) command.push("NX");
    const result = await redis<string | null>(command);
    return result === "OK";
  }

  if (options.onlyIfNew && (await kvGet(key)) !== null) return false;
  memory().set(key, {
    value: raw,
    expiresAt: options.ttlSeconds ? Date.now() + options.ttlSeconds * 1000 : null,
  });
  return true;
}
