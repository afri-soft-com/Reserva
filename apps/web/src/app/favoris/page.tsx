"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MapPin, Star, ChevronLeft, RefreshCw } from "lucide-react";
import { Carte } from "../../components/Carte";
import { Bouton } from "../../components/Bouton";
import { toastErreur, toastSucces } from "../../components/Toast";
import { extraireMessageErreur } from "../../lib/api-client";
import { listerFavoris, supprimerFavori, FavoriAvecService } from "../../lib/api-favoris";
import { LIBELLES_CATEGORIE, formaterMontant, type CategorieService } from "@reserva/shared";
import { useAuthStore } from "../../lib/store-auth";

export default function PageFavoris() {
  const router = useRouter();
  const { estConnecte } = useAuthStore();
  const [favoris, setFavoris] = useState<FavoriAvecService[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!estConnecte) {
      router.push("/connexion");
      return;
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estConnecte, page]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerFavoris(page, 20);
      setFavoris(resultat.items);
      setTotal(resultat.total);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererRetrait(serviceId: string) {
    try {
      await supprimerFavori(serviceId);
      toastSucces("Service retiré de vos favoris.");
      charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
          <p className="text-sm text-gray-500">Vos services enregistrés pour y revenir plus vite.</p>
        </div>
        <div className="flex items-center gap-2">
          <Bouton variante="fantome" taille="sm" onClick={charger}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Bouton>
          <Bouton variante="fantome" taille="sm" onClick={() => router.push("/services")}>
            <ChevronLeft className="h-4 w-4" /> Rechercher
          </Bouton>
        </div>
      </div>

      {chargement && <p className="text-gray-500">Chargement de vos favoris...</p>}

      {!chargement && favoris.length === 0 && (
        <Carte className="text-center text-gray-500">
          Aucun favori pour le moment. Touchez le cœur sur un service pour l'ajouter.
        </Carte>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {favoris.map((favori) => {
          const service = favori.service;
          return (
            <Carte key={favori.id}>
              <div className="mb-1 flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-primaire">
                  {LIBELLES_CATEGORIE[service.prestataire.categorie as CategorieService]}
                </p>
                <button
                  onClick={() => gererRetrait(service.id)}
                  className="rounded-full p-1 text-red-500 hover:bg-red-50"
                  title="Retirer des favoris"
                >
                  <Heart className="h-5 w-5 fill-red-500" />
                </button>
              </div>
              <Link href={`/services/${service.id}`} className="block">
                <h3 className="mb-1 font-bold text-gray-900 hover:text-primaire">{service.nom}</h3>
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
              </Link>
            </Carte>
          );
        })}
      </div>

      {!chargement && favoris.length < total && (
        <div className="flex justify-center">
          <Bouton variante="secondaire" onClick={() => setPage(page + 1)}>
            Afficher plus ({favoris.length}/{total})
          </Bouton>
        </div>
      )}
    </div>
  );
}
