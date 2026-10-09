/**
 * Perf légère post-smoke (non bloquante par défaut).
 * PERF_FAIL_ON_SLOW=1 pour faire échouer si p95 > PERF_P95_MS (défaut 3000).
 */
const GATEWAY = (process.env.GATEWAY_URL || "http://127.0.0.1:4000/api").replace(/\/$/, "");
const N = Number(process.env.PERF_SAMPLES || 20);
const budget = Number(process.env.PERF_P95_MS || 3000);
const fail = process.env.PERF_FAIL_ON_SLOW === "1";

async function sample() {
  const t0 = performance.now();
  const res = await fetch(`${GATEWAY}/sante`);
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`sante ${res.status}`);
  return ms;
}

async function main() {
  console.log(`→ Perf smoke ${N}× GET /sante (budget p95=${budget}ms)`);
  const times = [];
  for (let i = 0; i < N; i++) {
    times.push(await sample());
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const max = times[times.length - 1];
  console.log(`  p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms max=${max.toFixed(0)}ms`);
  if (fail && p95 > budget) {
    throw new Error(`p95 ${p95.toFixed(0)}ms > budget ${budget}ms`);
  }
  console.log(fail ? "✓ Perf OK" : "✓ Perf OK (informatif)");
}

main().catch((e) => {
  console.error("✗ Perf:", e.message);
  process.exit(fail ? 1 : 0);
});
