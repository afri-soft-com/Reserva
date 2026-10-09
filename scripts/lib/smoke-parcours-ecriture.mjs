/**
 * Parcours d'écriture anti-régression :
 * 1) réservation service → acceptation pro → paiement sim → annulation
 * 2) KYC admin (reviser EN_REVUE)
 * 3) hôtel hold → payer → annuler
 * 4) transport billet hold → payer → annuler
 *
 * Activé si opts.ecriture === true ou SMOKE_WRITE=1 (défaut local = true).
 */
import { get, post } from "./smoke-parcours.mjs";

function datePlus(jours) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

async function login(gateway, telephone, pin) {
  const auth = await post(gateway, "/auth/connexion", { telephone, pin });
  const token = auth.token || auth.accessToken;
  if (!token) throw new Error(`Pas de token pour ${telephone}`);
  return { token, utilisateur: auth.utilisateur };
}

function itemsOf(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.resultats || data?.hotels || data?.trajets || [];
}

export async function executerParcoursEcriture(opts) {
  const gateway = opts.gateway.replace(/\/$/, "");
  const pin = opts.pin || process.env.SMOKE_ADMIN_PIN || "1234";
  const clientPhone = opts.clientPhone || process.env.SMOKE_CLIENT_PHONE || "+243991234567";
  const proPhone = opts.proPhone || process.env.SMOKE_PRO_PHONE || "+243970000001";
  const adminPhone = opts.adminPhone || process.env.SMOKE_ADMIN_PHONE || "+243900000001";
  const uid = `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("\n══ Écriture métier (anti-régression) ══");

  // --- 1. Cycle réservation ---
  console.log("→ Login client");
  const client = await login(gateway, clientPhone, pin);

  console.log("→ Recherche service SANTE");
  const servicesData = await get(gateway, "/services?categorie=SANTE&ville=Kinshasa&parPage=10", client.token);
  const services = itemsOf(servicesData);
  const service = services.find((s) => (s.creneaux || []).length > 0) || services[0];
  if (!service?.id) throw new Error("Aucun service SANTE trouvé (seed manquant ?)");

  let creneau = (service.creneaux || [])[0];
  if (!creneau?.id) {
    const detail = await get(gateway, `/services/${service.id}`, client.token);
    creneau = (detail.creneaux || []).find((c) => (c.capaciteReservee ?? 0) < (c.capaciteTotale ?? 1));
  }
  if (!creneau?.id) throw new Error(`Aucun créneau dispo pour service ${service.id}`);

  console.log("→ Créer réservation", service.nom || service.id);
  const reservation = await post(
    gateway,
    "/reservations",
    {
      serviceId: service.id,
      creneauId: creneau.id,
      notes: `Smoke écriture ${uid}`,
      garantieActive: true,
      acomptePourcent: 30,
    },
    client.token
  );
  const reservationId = reservation.id || reservation.reservationId;
  if (!reservationId) throw new Error("Réservation créée sans id");
  console.log("  numéro", reservation.numero, "statut", reservation.statut);

  console.log("→ Pro accepte");
  const pro = await login(gateway, proPhone, pin);
  await post(gateway, `/reservations/${reservationId}/repondre`, { accepter: true }, pro.token);

  const detailAvantPay = await get(gateway, `/reservations/${reservationId}`, client.token);
  console.log("  statut après accept", detailAvantPay.statut);

  const montant =
    detailAvantPay.montantAcompte ||
    detailAvantPay.montantTotal ||
    reservation.montantAcompte ||
    reservation.montantTotal ||
    service.prix ||
    15000;

  console.log("→ Paiement simulation MPESA", montant);
  const paiement = await post(
    gateway,
    "/paiements",
    {
      reservationId,
      operateur: "MPESA",
      telephonePaiement: clientPhone,
      montant: Number(montant),
      acompteUniquement: true,
      idempotencyKey: `${uid}-pay-resa`,
    },
    client.token
  );
  console.log("  paiement", paiement.statut || paiement.transaction?.statut || "ok");

  console.log("→ Annulation client");
  const annulee = await post(
    gateway,
    "/reservations/annuler",
    {
      reservationId,
      motif: "Smoke test annulation",
      modeRemboursement: "AVOIR",
    },
    client.token
  );
  if (!annulee.annule && annulee.statut !== "ANNULEE") {
    throw new Error(`Annulation inattendue: ${JSON.stringify(annulee).slice(0, 200)}`);
  }
  console.log("  annule", annulee.annule, "remboursé", annulee.montantRembourse);

  // --- 2. KYC admin ---
  console.log("→ KYC admin reviser (si dossier EN_REVUE)");
  const admin = await login(gateway, adminPhone, pin);
  const kycListe = await get(gateway, "/prestataires/admin/kyc", admin.token);
  const dossiers = itemsOf(kycListe);
  const enRevue = dossiers.find((d) => (d.kycStatut || d.statut) === "EN_REVUE") || dossiers[0];
  if (enRevue?.id || enRevue?.prestataireId) {
    const prestataireId = enRevue.prestataireId || enRevue.id;
    const reviser = await post(
      gateway,
      "/prestataires/admin/kyc/reviser",
      {
        prestataireId,
        decision: "INFO_MANQUANTE",
        motif: `Smoke KYC ${uid} — info complémentaire demandée`,
        approuverProfil: false,
      },
      admin.token
    );
    console.log("  reviser", reviser.kycStatut || reviser.statut || "ok");
  } else {
    console.log("  aucun dossier KYC — skip");
  }

  // --- 3. Hôtel checkout ---
  console.log("→ Hôtel search → hold → payer → annuler");
  const arrivee = datePlus(5);
  const depart = datePlus(7);
  const hotelsData = await get(
    gateway,
    `/hotels?ville=Kinshasa&arrivee=${arrivee}&depart=${depart}&adultes=2`,
    client.token
  );
  const hotels = itemsOf(hotelsData);
  const hotel = hotels[0];
  if (!hotel?.id) throw new Error("Aucun hôtel trouvé");

  const detailHotel = await get(
    gateway,
    `/hotels/${hotel.id}?arrivee=${arrivee}&depart=${depart}&adultes=2`,
    client.token
  );
  const typeChambre = (detailHotel.chambres || []).find((c) => (c.tarifs || []).length > 0) || detailHotel.chambres?.[0];
  const planTarif = typeChambre?.tarifs?.[0];
  if (!typeChambre?.id || !planTarif?.id) throw new Error("Hôtel sans chambre/tarif (detail)");

  const hold = await post(
    gateway,
    "/checkout/hold",
    {
      hotelId: hotel.id,
      typeChambreId: typeChambre.id,
      planTarifId: planTarif.id,
      arrivee,
      depart,
      adultes: 2,
      enfants: 0,
      notes: `Smoke hotel ${uid}`,
    },
    client.token
  );
  const sejourId = hold.id || hold.sejourId;
  if (!sejourId) throw new Error("Hold hôtel sans id");
  const montantHotel = hold.montantTotal || hold.total || planTarif.prixParNuit || 85;
  console.log("  hold", sejourId, "montant", montantHotel);

  await post(
    gateway,
    `/checkout/sejours/${sejourId}/payer`,
    {
      operateur: "MPESA",
      telephonePaiement: clientPhone,
      montant: Number(montantHotel),
      idempotencyKey: `${uid}-pay-hotel`,
    },
    client.token
  );
  console.log("  payé");

  await post(gateway, `/checkout/sejours/${sejourId}/annuler`, {}, client.token);
  console.log("  séjour annulé");

  // --- 4. Transport billet ---
  console.log("→ Transport rechercher → hold → payer → annuler");
  const dateTrajet = datePlus(3);
  const trajetsData = await get(
    gateway,
    `/transport/rechercher?origine=Kinshasa&destination=Matadi&date=${dateTrajet}&places=1`,
    client.token
  );
  const trajets = itemsOf(trajetsData);
  const trajet = trajets[0];
  if (!trajet?.id) throw new Error("Aucun trajet Kinshasa→Matadi");

  const billetHold = await post(
    gateway,
    "/checkout/billets/hold",
    { trajetId: trajet.id, places: 1, notes: `Smoke bus ${uid}` },
    client.token
  );
  const billetId = billetHold.id || billetHold.billetId;
  if (!billetId) throw new Error("Hold billet sans id");
  const montantBus = billetHold.montantTotal || billetHold.total || trajet.prix || 45000;
  console.log("  billet", billetId, "montant", montantBus);

  await post(
    gateway,
    `/checkout/billets/${billetId}/payer`,
    {
      operateur: "MPESA",
      telephonePaiement: clientPhone,
      montant: Number(montantBus),
      idempotencyKey: `${uid}-pay-bus`,
    },
    client.token
  );
  console.log("  billet payé");

  await post(gateway, `/checkout/billets/${billetId}/annuler`, {}, client.token);
  console.log("  billet annulé");

  console.log("✓ Parcours écriture OK");
  return { reservationId, sejourId, billetId };
}
