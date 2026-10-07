/**
 * Démarre core/hotels/booking/transport/gateway pour la CI (régression).
 * Usage: node scripts/ci-start-platform.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const common = {
  JWT_SECRET: process.env.JWT_SECRET || "ci-jwt-secret-reserva-test-only",
  SERVICE_SECRET: process.env.SERVICE_SECRET || "ci-service-secret",
  CRON_SECRET: process.env.CRON_SECRET || "ci-cron-secret",
  MODE_PAIEMENT: "simulation",
  MODE_SMS: "simulation",
  WEB_URL: "http://127.0.0.1:3001",
  NODE_ENV: "development",
  REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
};

const urlCore =
  process.env.DATABASE_URL_CORE ||
  process.env.DATABASE_URL ||
  "postgresql://reserva:reserva@127.0.0.1:5432/reserva?schema=core";
const urlHotels =
  process.env.DATABASE_URL_HOTELS || "postgresql://reserva:reserva@127.0.0.1:5432/reserva?schema=hotels";
const urlBooking =
  process.env.DATABASE_URL_BOOKING || "postgresql://reserva:reserva@127.0.0.1:5432/reserva?schema=booking";
const urlTransport =
  process.env.DATABASE_URL_TRANSPORT || "postgresql://reserva:reserva@127.0.0.1:5432/reserva?schema=transport";

const services = [
  {
    name: "core",
    args: ["run", "start", "-w", "apps/api"],
    env: { ...common, PORT: "4101", DATABASE_URL: urlCore },
  },
  {
    name: "hotels",
    args: ["run", "start", "-w", "@reserva/hotels"],
    env: { ...common, PORT: "4102", DATABASE_URL: urlHotels },
  },
  {
    name: "booking",
    args: ["run", "start", "-w", "@reserva/booking"],
    env: {
      ...common,
      PORT: "4103",
      DATABASE_URL: urlBooking,
      HOTELS_URL: "http://127.0.0.1:4102",
      TRANSPORT_URL: "http://127.0.0.1:4104",
    },
  },
  {
    name: "transport",
    args: ["run", "start", "-w", "@reserva/transport"],
    env: { ...common, PORT: "4104", DATABASE_URL: urlTransport },
  },
  {
    name: "gateway",
    args: ["run", "start", "-w", "@reserva/gateway"],
    env: {
      ...common,
      PORT: "4000",
      CORE_URL: "http://127.0.0.1:4101",
      HOTELS_URL: "http://127.0.0.1:4102",
      BOOKING_URL: "http://127.0.0.1:4103",
      TRANSPORT_URL: "http://127.0.0.1:4104",
    },
  },
];

for (const s of services) {
  const child = spawn("npm", s.args, {
    env: { ...process.env, ...s.env },
    stdio: ["ignore", "inherit", "inherit"],
    shell: true,
    detached: false,
  });
  child.on("exit", (code) => console.error(`[${s.name}] exit ${code}`));
}

for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch("http://127.0.0.1:4000/api/sante");
    if (res.ok) {
      console.log("✓ Gateway CI prêt");
      await new Promise(() => {});
    }
  } catch {
    /* retry */
  }
  await sleep(2000);
}
throw new Error("Gateway CI non prêt");
