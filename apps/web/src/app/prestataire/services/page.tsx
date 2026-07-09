"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, DollarSign } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  listerMesServices,
  creerServiceOffert,
  modifierServiceOffert,
  creerCreneauxRecurrents,
  CreerServiceOffertInput,
} from "../../../lib/api-prestataires";
import { ServiceOffert, formaterMontant } from "@reserva/shared";

export default function PageGestionServices() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [serviceSelectionne, setServiceSelectionne] = useState<string | null>(null);

  function formaterDuree(minutes: number): string {
    if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} j`;
    if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} h`;
    return `${minutes} min`;
  }

  // Formulaire nouveau service
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [dureeValeur, setDureeValeur] = useState(1);
  const [dureeUnite, setDureeUnite] = useState<"heures" | "minutes" | "jours">("heures");
  const [prix, setPrix] = useState(0);
  const [devise, setDevise] = useState<"CDF" | "USD">("CDF");
  const [chargementAction, setChargementAction] = useState(false);

  function dureeEnMinutes(): number {
    const val = dureeValeur;
    switch (dureeUnite) {
      case "jours": return val * 1440;
      case "heures": return val * 60;
      default: return val;
    }
  }

  // Formulaire créneaux récurrents
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [heuresTexte, setHeuresTexte] = useState("09:00, 10:00, 14:00");
  const [capacite, setCapacite] = useState(1);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerMesServices();
      setServices(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererCreationService(e: React.FormEvent) {
    e.preventDefault();
    setChargementAction(true);
    try {
      const input: CreerServiceOffertInput = { nom, description: description || undefined, dureeMinutes: dureeEnMinutes(), prix, devise };
      await creerServiceOffert(input);
      toastSucces("Service créé avec succès !");
      setAfficherFormulaire(false);
      setNom("");
      setDescription("");
      setPrix(0);
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  async function gererBasculeActif(service: ServiceOffert) {
    try {
      await modifierServiceOffert(service.id, { actif: !service.actif });
      toastSucces(service.actif ? "Service désactivé" : "Service activé");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  async function gererCreationCreneaux(serviceId: string) {
    setChargementAction(true);
    try {
      const heuresCreneaux = heuresTexte.split(",").map((h) => h.trim());
      const resultat = await creerCreneauxRecurrents({
        serviceId,
        dateDebut,
        dateFin,
        heuresCreneaux,
        dureeMinutes: dureeEnMinutes(),
        capaciteParCreneau: capacite,
      });
      toastSucces(`${resultat.nombreCreneauxCrees} créneaux créés !`);
      setServiceSelectionne(null);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes services</h1>
        <Bouton onClick={() => setAfficherFormulaire(!afficherFormulaire)}>
          <Plus className="h-4 w-4" /> Nouveau service
        </Bouton>
      </div>

      {afficherFormulaire && (
        <Carte>
          <h2 className="mb-3 font-bold text-gray-900">Créer un nouveau service</h2>
          <form onSubmit={gererCreationService} className="space-y-4">
            <Champ libelle="Nom du service" value={nom} onChange={(e) => setNom(e.target.value)} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-champ border border-gray-300 bg-gray-50 p-3 focus:border-primaire focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Durée</label>
                <input
                  type="number"
                  value={dureeValeur}
                  onChange={(e) => setDureeValeur(Number(e.target.value))}
                  required
                  className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 focus:border-primaire focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Unité</label>
                <select
                  value={dureeUnite}
                  onChange={(e) => {
                    const ancienne = dureeUnite;
                    const nouvelle = e.target.value as "heures" | "minutes" | "jours";
                    if (dureeValeur > 0) {
                      let minutes = dureeValeur;
                      if (ancienne === "jours") minutes *= 1440;
                      else if (ancienne === "heures") minutes *= 60;
                      let nouvelleVal = minutes;
                      if (nouvelle === "jours") nouvelleVal = Math.floor(minutes / 1440);
                      else if (nouvelle === "heures") nouvelleVal = Math.floor(minutes / 60);
                      if (nouvelleVal > 0) setDureeValeur(nouvelleVal);
                    }
                    setDureeUnite(nouvelle);
                  }}
                  className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 focus:border-primaire focus:outline-none"
                >
                  <option value="minutes">Minutes</option>
                  <option value="heures">Heures</option>
                  <option value="jours">Jours</option>
                </select>
              </div>
              <Champ libelle="Prix" type="number" value={prix} onChange={(e) => setPrix(Number(e.target.value))} required />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Devise</label>
                <select
                  value={devise}
                  onChange={(e) => setDevise(e.target.value as "CDF" | "USD")}
                  className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 focus:border-primaire focus:outline-none"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <Bouton type="submit" chargement={chargementAction}>
              Créer le service
            </Bouton>
          </form>
        </Carte>
      )}

      {chargement && <p className="text-gray-500">Chargement...</p>}

      <div className="space-y-3">
        {services.map((service) => (
          <Carte key={service.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{service.nom}</h3>
                {service.description && <p className="text-sm text-gray-600">{service.description}</p>}
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formaterDuree(service.dureeMinutes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> {formaterMontant(service.prix, service.devise)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.actif ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {service.actif ? "Actif" : "Inactif"}
                </span>
                <button onClick={() => gererBasculeActif(service)} className="text-xs text-primaire hover:underline">
                  {service.actif ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              {serviceSelectionne === service.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Ajouter des créneaux récurrents</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Champ libelle="Date de début" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                    <Champ libelle="Date de fin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                  </div>
                  <Champ
                    libelle="Heures (séparées par des virgules)"
                    value={heuresTexte}
                    onChange={(e) => setHeuresTexte(e.target.value)}
                    aide="Format HH:MM, ex: 09:00, 10:00, 14:00"
                  />
                  <Champ
                    libelle="Capacité par créneau"
                    type="number"
                    value={capacite}
                    onChange={(e) => setCapacite(Number(e.target.value))}
                  />
                  <div className="flex gap-2">
                    <Bouton taille="sm" chargement={chargementAction} onClick={() => gererCreationCreneaux(service.id)}>
                      Générer les créneaux
                    </Bouton>
                    <Bouton taille="sm" variante="fantome" onClick={() => setServiceSelectionne(null)}>
                      Annuler
                    </Bouton>
                  </div>
                </div>
              ) : (
                <button onClick={() => setServiceSelectionne(service.id)} className="text-sm font-semibold text-primaire hover:underline">
                  + Gérer les créneaux de disponibilité
                </button>
              )}
            </div>
          </Carte>
        ))}
      </div>
    </div>
  );
}
