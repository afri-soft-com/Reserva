/**
 * Parcours smoke partagé (local + production).
 * Couvre : santé, auth, admin, économie, KYC, réservations, hotels, transport, OpenAPI.
 */
export async function get(gateway, path, token) {
  const res = await fetch(`${gateway}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`${path} → ${res.status} ${json?.erreur?.message || res.statusText}`);
  }
  return json.donnees ?? json;
}

export async function post(gateway, path, body, token) {
  const res = await fetch(`${gateway}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`${path} → ${res.status} ${json?.erreur?.message || res.statusText}`);
  }
  return json.donnees ?? json;
}

export async function attendreSante(gateway, { maxAttempts = 36, delayMs = 10000 } = {}) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const sante = await get(gateway, "/sante");
      if (sante.statut === "operationnel" || sante.statut === "degrade" || sante.base === "ok") {
        console.log(`  santé OK (tentative ${i})`, JSON.stringify(sante).slice(0, 240));
        return sante;
      }
      console.log(`  santé partielle (tentative ${i}):`, sante.statut);
    } catch (e) {
      console.log(`  santé indisponible (tentative ${i}):`, e.message);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Gateway non healthy après attente");
}

/** Vérifie que la doc OpenAPI est servie (contrat basique). */
export async function verifierOpenApi(gateway) {
  const base = gateway.replace(/\/api\/?$/, "");
  const urls = [`${base}/api-docs`, `${base}/api-docs.json`, `${gateway}/../api-docs`];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        console.log(`  OpenAPI/UI OK via ${url} (${ct.slice(0, 40)})`);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  console.log("  ⚠ OpenAPI UI non trouvée (non bloquant si swagger derrière gateway)");
  return false;
}

/**
 * Parcours métier admin + lectures catalogues.
 * @param {{ gateway: string, phone: string, pin: string, waitHealth?: boolean }} opts
 */
export async function executerParcoursSmoke(opts) {
  const gateway = opts.gateway.replace(/\/$/, "");
  const phone = opts.phone;
  const pin = opts.pin;

  if (opts.waitHealth !== false) {
    console.log("→ Attente santé gateway");
    await attendreSante(gateway, {
      maxAttempts: opts.maxAttempts ?? (opts.waitHealth === "short" ? 15 : 36),
      delayMs: opts.delayMs ?? (opts.waitHealth === "short" ? 2000 : 10000),
    });
  } else {
    console.log("→ Santé gateway");
    console.log("  ", JSON.stringify(await get(gateway, "/sante")).slice(0, 220));
  }

  console.log("→ OpenAPI / docs");
  await verifierOpenApi(gateway);

  console.log("→ Login admin");
  const auth = await post(gateway, "/auth/connexion", { telephone: phone, pin });
  const token = auth.token || auth.accessToken;
  if (!token) throw new Error("Pas de token admin");
  console.log("  OK", auth.utilisateur?.nom || auth.utilisateur?.role || auth.utilisateur?.email);

  console.log("→ Profil /auth/profil");
  const profil = await get(gateway, "/auth/profil", token);
  console.log("  role", profil.role, "tel", profil.telephone);

  console.log("→ Pilotage admin");
  const pilotage = await get(gateway, "/admin/pilotage", token);
  console.log("  alertes", pilotage.alertes);

  console.log("→ Stats admin");
  const stats = await get(gateway, "/admin/statistiques", token);
  console.log("  clés", Object.keys(stats || {}).slice(0, 8).join(","));

  console.log("→ Réservations admin");
  const reservations = await get(gateway, "/admin/reservations", token);
  const nbRes = reservations.total ?? reservations.items?.length ?? reservations.length ?? 0;
  console.log("  count", nbRes);

  console.log("→ Prestataires admin");
  const prestas = await get(gateway, "/admin/prestataires", token);
  console.log("  count", prestas.total ?? prestas.items?.length ?? prestas.length ?? 0);

  console.log("→ KYC en revue");
  const kyc = await get(gateway, "/prestataires/admin/kyc", token);
  console.log("  count", kyc.total ?? kyc.items?.length ?? (Array.isArray(kyc) ? kyc.length : 0));

  console.log("→ Exigence documents KYC");
  const exigence = await get(gateway, "/admin/exigence-documents", token);
  console.log("  config", typeof exigence === "object" ? "ok" : exigence);

  console.log("→ Finances économie");
  const finances = await get(gateway, "/economie/admin/finances?periode=mois", token);
  console.log("  GMV", finances.gmv, "takeRate", finances.takeRate);

  console.log("→ Plans publics");
  const plans = await get(gateway, "/economie/plans", token);
  console.log("  plans", Array.isArray(plans) ? plans.length : plans.items?.length ?? "ok");

  console.log("→ Hôtels");
  const hotels = await get(gateway, "/hotels", token);
  console.log("  items", hotels.total ?? hotels.items?.length);

  console.log("→ Transport villes");
  const villes = await get(gateway, "/transport/villes", token);
  console.log("  villes", Array.isArray(villes) ? villes.length : villes);

  console.log("→ Simulation tarification");
  const sim = await get(gateway, "/economie/simulation?montant=10000&devise=CDF", token);
  console.log("  sim", JSON.stringify(sim).slice(0, 120));

  return { token, profil };
}
