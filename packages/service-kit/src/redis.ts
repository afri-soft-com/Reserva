import Redis from "ioredis";

let client: Redis | null = null;

/** Client Redis partagé (lazy). Absent si REDIS_URL non défini. */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", (err) => {
      console.warn("[redis]", err.message);
    });
  }
  return client;
}

export async function redisPing(): Promise<"ok" | "absent" | "erreur"> {
  const r = getRedis();
  if (!r) return "absent";
  try {
    if (r.status !== "ready") await r.connect();
    const pong = await r.ping();
    return pong === "PONG" ? "ok" : "erreur";
  } catch {
    return "erreur";
  }
}

export async function cacheGet(cle: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    if (r.status !== "ready") await r.connect();
    return await r.get(cle);
  } catch {
    return null;
  }
}

export async function cacheSet(cle: string, valeur: string, ttlSecondes = 300): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (r.status !== "ready") await r.connect();
    await r.set(cle, valeur, "EX", ttlSecondes);
  } catch {
    /* cache best-effort */
  }
}

export async function cacheDel(cle: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (r.status !== "ready") await r.connect();
    await r.del(cle);
  } catch {
    /* ignore */
  }
}
