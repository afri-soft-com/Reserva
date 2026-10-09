/**
 * Checkout hôtel + transport — skip si GATEWAY_URL absent.
 */
import { describe, it, expect, beforeAll } from "vitest";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const CLIENT = process.env.SMOKE_CLIENT_PHONE || "+243991234567";
const run = Boolean(GATEWAY);

function datePlus(jours: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, data: json.donnees ?? json };
}

describe.skipIf(!run)("checkout hôtel + transport", () => {
  let token = "";

  beforeAll(async () => {
    const auth = await api("POST", "/auth/connexion", { telephone: CLIENT, pin: PIN });
    expect(auth.status).toBeLessThan(400);
    token = auth.data.token || auth.data.accessToken;
    expect(token).toBeTruthy();
  });

  it("hôtel : hold → payer → annuler", async () => {
    const arrivee = datePlus(6);
    const depart = datePlus(8);
    const hotels = await api(
      "GET",
      `/hotels?ville=Kinshasa&arrivee=${arrivee}&depart=${depart}&adultes=2`,
      undefined,
      token
    );
    expect(hotels.status).toBe(200);
    const liste = hotels.data.items || hotels.data || [];
    const hotel = Array.isArray(liste) ? liste[0] : null;
    expect(hotel?.id).toBeTruthy();

    const detail = await api(
      "GET",
      `/hotels/${hotel.id}?arrivee=${arrivee}&depart=${depart}&adultes=2`,
      undefined,
      token
    );
    const chambre =
      (detail.data.chambres || []).find((c: { tarifs?: unknown[] }) => (c.tarifs || []).length > 0) ||
      detail.data.chambres?.[0];
    const tarif = chambre?.tarifs?.[0];
    expect(chambre?.id).toBeTruthy();
    expect(tarif?.id).toBeTruthy();

    const hold = await api(
      "POST",
      "/checkout/hold",
      {
        hotelId: hotel.id,
        typeChambreId: chambre.id,
        planTarifId: tarif.id,
        arrivee,
        depart,
        adultes: 2,
        enfants: 0,
      },
      token
    );
    expect(hold.status).toBeLessThan(400);
    const sejourId = hold.data.id;
    expect(sejourId).toBeTruthy();

    const montant = hold.data.montantTotal || hold.data.total || tarif.prixParNuit || 85;
    const pay = await api(
      "POST",
      `/checkout/sejours/${sejourId}/payer`,
      {
        operateur: "MPESA",
        telephonePaiement: CLIENT,
        montant: Number(montant),
        idempotencyKey: `vitest-hotel-${Date.now()}`,
      },
      token
    );
    expect(pay.status).toBeLessThan(400);

    const annuler = await api("POST", `/checkout/sejours/${sejourId}/annuler`, {}, token);
    expect(annuler.status).toBeLessThan(400);
  });

  it("transport : hold → payer → annuler", async () => {
    const date = datePlus(4);
    const search = await api(
      "GET",
      `/transport/rechercher?origine=Kinshasa&destination=Matadi&date=${date}&places=1`,
      undefined,
      token
    );
    expect(search.status).toBe(200);
    const trajets = search.data.items || search.data.trajets || search.data || [];
    const trajet = Array.isArray(trajets) ? trajets[0] : null;
    expect(trajet?.id).toBeTruthy();

    const hold = await api("POST", "/checkout/billets/hold", { trajetId: trajet.id, places: 1 }, token);
    expect(hold.status).toBeLessThan(400);
    const billetId = hold.data.id;
    expect(billetId).toBeTruthy();

    const montant = hold.data.montantTotal || hold.data.total || trajet.prix || 45000;
    const pay = await api(
      "POST",
      `/checkout/billets/${billetId}/payer`,
      {
        operateur: "MPESA",
        telephonePaiement: CLIENT,
        montant: Number(montant),
        idempotencyKey: `vitest-bus-${Date.now()}`,
      },
      token
    );
    expect(pay.status).toBeLessThan(400);

    const annuler = await api("POST", `/checkout/billets/${billetId}/annuler`, {}, token);
    expect(annuler.status).toBeLessThan(400);
  });
});
