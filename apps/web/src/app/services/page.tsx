"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Search } from "lucide-react";
import { Carte } from "../../components/Carte";
import { Champ } from "../../components/Champ";
import { Bouton } from "../../components/Bouton";
import { rechercherServices, ServiceAvecPrestataire } from "../../lib/api-services";
import { extraireMessageErreur } from "../../lib/api-client";
import { toastErreur } from "../../components/Toast";
import { CATEGORIE_SERVICE, LIBELLES_CATEGORIE, CategorieService, formaterMontant } from "@reserva/shared";

function ContenuRecherche() {
  const params = useSearchParams();
  const router = useRouter();

  const [resultats, setResultats] = useState<ServiceAvecPrestataire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [texte, setTexte] = useState(params.get("texte") || "");
  const [ville, setVille] = useState(params.get("ville") || "");
  const categorie = (params.get("categorie") as CategorieService | null) || undefined;

  useEffect(() => {
    lancerRecherche();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function lancerRecherche() {
    setChargement(true);
    try {
      const resultat = await rechercherServices({
        categorie,
        ville: ville || undefined,
        texte: texte || undefined,
        page: 1,
        parPage: 20,
      });
      setResultats(resultat.items);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  function gererSoumissionFiltres(e: React.FormEvent) {
    e.preventDefault();
    const nouveauxParams = new URLSearchParams();
    if (categorie) nouveauxParams.set("categorie", categorie);
    if (texte) nouveauxParams.set("texte", texte);
    if (ville) nouveauxParams.set("ville", ville);
    router.push(`/services?${nouveauxParams.toString()}`);
  }

  function changerCategorie(nouvelleCategorie?: CategorieService) {
    const nouveauxParams = new URLSearchParams();
    if (nouvelleCategorie) nouveauxParams.set("categorie", nouvelleCategorie);
    if (texte) nouveauxParams.set("texte", texte);
    if (ville) nouveauxParams.set("ville", ville);
    router.push(`/services?${nouveauxParams.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rechercher un service</h1>

      <form onSubmit={gererSoumissionFiltres} className="flex flex-wrap gap-3 rounded-card bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="min-w-[200px] flex-1">
          <Champ placeholder="Nom du service ou du prestataire" value={texte} onChange={(e) => setTexte(e.target.value)} />
        </div>
        <div className="min-w-[160px] flex-1">
          <Champ placeholder="Ville (ex: Kinshasa)" value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>
        <Bouton type="submit">
          <Search className="h-4 w-4" /> Rechercher
        </Bouton>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => changerCategorie(undefined)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${!categorie ? "bg-primaire text-white" : "bg-white text-gray-700"}`}
        >
          Toutes
        </button>
        {Object.values(CATEGORIE_SERVICE).map((cat) => (
          <button
            key={cat}
            onClick={() => changerCategorie(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${categorie === cat ? "bg-primaire text-white" : "bg-white text-gray-700"}`}
          >
            {LIBELLES_CATEGORIE[cat]}
          </button>
        ))}
      </div>

      {chargement && <p className="text-gray-500">Chargement des résultats...</p>}

      {!chargement && resultats.length === 0 && (
        <Carte className="text-center text-gray-500">Aucun service trouvé pour ces critères.</Carte>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resultats.map((service) => (
          <Link key={service.id} href={`/services/${service.id}`}>
            <Carte className="h-full transition-transform hover:-translate-y-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primaire">
                {LIBELLES_CATEGORIE[service.prestataire.categorie]}
              </p>
              <h3 className="mb-1 font-bold text-gray-900">{service.nom}</h3>
              <p className="mb-2 text-sm text-gray-600">{service.prestataire.nomEntreprise}</p>
              <div className="mb-3 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {service.prestataire.ville}, {service.prestataire.quartier}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-primaire-700">{formaterMontant(service.prix, service.devise)}</span>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {service.prestataire.noteMoyenne.toFixed(1)} ({service.prestataire.nombreAvis})
                </div>
              </div>
              {service.creneaux.length > 0 && (
                <p className="mt-2 text-xs text-emerald-600">
                  Prochain créneau : {new Date(service.creneaux[0].debut).toLocaleString("fr-FR")}
                </p>
              )}
            </Carte>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PageServices() {
  return (
    <Suspense fallback={<p className="text-gray-500">Chargement...</p>}>
      <ContenuRecherche />
    </Suspense>
  );
}
