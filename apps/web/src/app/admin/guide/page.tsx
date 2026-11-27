import type { Metadata } from "next";
import Link from "next/link";
import { Carte } from "../../../components/Carte";

export const metadata: Metadata = {
  title: "Guide de la console — RESERVA",
};

/**
 * Guide d'utilisation de la console d'administration (équipe RESERVA).
 * À tenir à jour quand une page ou une procédure change.
 */

type Rubrique = { href: string; titre: string; texte: string };
type Section = { titre: string; rubriques: Rubrique[] };

const SECTIONS: Section[] = [
  {
    titre: "Pilotage",
    rubriques: [
      {
        href: "/admin/pilotage",
        titre: "Vue d'ensemble",
        texte:
          "Le tableau de bord du jour : prestataires à valider, versements en attente, abonnements critiques et dernières réservations. Les boutons « Traiter » et « Voir tout » mènent à la page concernée.",
      },
      {
        href: "/admin/statistiques",
        titre: "Statistiques",
        texte:
          "Réservations par statut, revenus du mois, utilisateurs et prestataires, évolution mensuelle. Filtrez par catégorie et par ville.",
      },
      {
        href: "/admin/reservations",
        titre: "Réservations",
        texte:
          "Toutes les réservations de la plateforme avec client, prestataire, créneau, montant, commission et état du paiement. Recherche, filtre par période, impression et export.",
      },
    ],
  },
  {
    titre: "Économie",
    rubriques: [
      {
        href: "/admin/finances",
        titre: "Finances",
        texte: "Commissions, frais de service (CDF et USD), abonnements encaissés et dernières écritures.",
      },
      {
        href: "/admin/ledger",
        titre: "Journal comptable",
        texte: "Chaque mouvement d'argent, filtrable par compte, type et devise. C'est la référence en cas de question comptable.",
      },
      {
        href: "/admin/soldes",
        titre: "Soldes prestataires",
        texte:
          "Pour chaque prestataire : brut crédité, versé, en attente (séquestre de 48 h après la prestation) et disponible, par devise.",
      },
      {
        href: "/admin/versements",
        titre: "Versements",
        texte:
          "Les demandes de versement faites par les prestataires depuis l'app Pro. Vérifiez le montant et le numéro Mobile Money, puis « Marquer payé » ou « Refuser » (avec une note interne si besoin).",
      },
      {
        href: "/admin/tarifications",
        titre: "Tarifications",
        texte: "Paramètres économiques de la plateforme (commissions, frais). À modifier avec prudence : ils s'appliquent aux nouvelles réservations.",
      },
      {
        href: "/admin/abonnements",
        titre: "Abonnements",
        texte: "Plans proposés aux prestataires et souscriptions actives.",
      },
    ],
  },
  {
    titre: "Catalogue",
    rubriques: [
      {
        href: "/admin/prestataires",
        titre: "Prestataires",
        texte:
          "Liste des établissements et de leur dossier. Ouvrez un prestataire pour voir ses informations et documents, puis « Approuver le profil » ou « Rejeter » avec un motif. À l'approbation, un code d'activation part par SMS (et par e-mail si le compte en a un) ; la fenêtre « Activation du compte » affiche ce code au cas où il faudrait le communiquer par téléphone.",
      },
      {
        href: "/admin/documents-kyc",
        titre: "Documents & KYC",
        texte: "Définit, catégorie par catégorie, quels documents sont exigés des prestataires et à partir de quand.",
      },
      {
        href: "/admin/hotels",
        titre: "Hôtels",
        texte: "Catalogue des hôtels : créer, modifier ou retirer une fiche. Un hôtel créé avec un prix reçoit une « Chambre standard » réservable (10 chambres par nuit sur 12 mois, complétées chaque jour).",
      },
      {
        href: "/admin/transport",
        titre: "Transport",
        texte: "Trajets de bus (origine, destination, classe) : modifier ou désactiver.",
      },
      {
        href: "/admin/categories",
        titre: "Catégories",
        texte: "Catégories affichées dans l'app (libellé, couleur, icône, actif/inactif). Le code d'une catégorie ne peut pas être modifié.",
      },
      {
        href: "/admin/utilisateurs",
        titre: "Utilisateurs",
        texte: "Tous les comptes (clients, prestataires, agents, admins) : rechercher, bloquer ou débloquer.",
      },
    ],
  },
  {
    titre: "Croissance et relation client",
    rubriques: [
      { href: "/admin/publicites", titre: "Publicités", texte: "Campagnes affichées dans l'app (cible, dates, tarif au clic ou aux mille impressions)." },
      { href: "/admin/agents", titre: "Agents quartier", texte: "Activer un utilisateur comme agent de terrain." },
      { href: "/admin/codes-promos", titre: "Codes promo", texte: "Créer et désactiver des codes de réduction avec leurs dates de validité." },
      {
        href: "/admin/litiges",
        titre: "Litiges / médiation",
        texte: "Litiges ouverts par les clients sur une réservation. Lisez le motif, puis tranchez : « Avoir total » (le client est remboursé en avoir) ou « Rejeter ».",
      },
      { href: "/admin/notifications", titre: "Notifications", texte: "Diffuser une annonce aux utilisateurs de l'app." },
      { href: "/admin/messages", titre: "Messages", texte: "Conversations avec les utilisateurs." },
    ],
  },
  {
    titre: "Technique et conformité",
    rubriques: [
      {
        href: "/admin/versions",
        titre: "Versions apps",
        texte:
          "Règle les bannières de mise à jour des apps et de la console. La CI met à jour minSoft après chaque publication sur les stores : ne montez jamais minSoft au-dessus de la version disponible sur le store.",
      },
      { href: "/admin/confidentialite", titre: "Confidentialité", texte: "Texte de la politique de confidentialité (super-admin uniquement)." },
      { href: "/admin/exports", titre: "Exports", texte: "Téléchargements CSV pour la comptabilité et les opérations." },
      { href: "/admin/audits", titre: "Audit", texte: "Historique des actions des administrateurs (blocages, versements, abonnements…)." },
    ],
  },
];

const TACHES: { titre: string; etapes: string[] }[] = [
  {
    titre: "Valider un nouveau prestataire",
    etapes: [
      "Pilotage → « Prestataires à valider » → Traiter (ou Catalogue → Prestataires).",
      "Vérifiez les informations et les documents du dossier.",
      "« Approuver le profil » : le prestataire reçoit son code d'activation et ouvre son espace dans l'app Pro.",
      "Sinon « Rejeter » avec un motif clair : il le verra dans l'app.",
    ],
  },
  {
    titre: "Le prestataire n'a pas reçu son code d'activation",
    etapes: [
      "Dans l'app Pro, il peut toucher « Renvoyer par SMS » ou « Recevoir par e-mail ».",
      "À défaut, communiquez-lui le code affiché dans la fenêtre « Activation du compte » au moment de l'approbation.",
    ],
  },
  {
    titre: "Traiter une demande de versement",
    etapes: [
      "Économie → Versements, filtre « En attente ».",
      "Contrôlez le solde disponible dans Soldes prestataires.",
      "« Marquer payé » une fois le Mobile Money envoyé, ou « Refuser » avec une note.",
    ],
  },
  {
    titre: "Résoudre un litige",
    etapes: [
      "Croissance → Litiges, filtre « Ouvert » ou « En médiation ».",
      "Consultez la réservation concernée et échangez avec les deux parties si besoin (Messages).",
      "Tranchez : « Avoir total » ou « Rejeter ». La décision est enregistrée dans l'audit.",
    ],
  },
  {
    titre: "Après une nouvelle version sur les stores",
    etapes: [
      "Vérifiez dans Versions apps que minSoft correspond à la version publiée.",
      "Ne forcez la mise à jour (minForce) que pour un correctif indispensable.",
    ],
  },
];

export default function PageGuideConsole() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Guide de la console</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          À quoi sert chaque page de la console d&apos;administration, et comment faire les tâches courantes.
          Les clients et les prestataires ont leur propre guide dans l&apos;app (Profil → Aide) et la page publique{" "}
          <Link href="/support" className="text-primaire underline">
            Aide et support
          </Link>
          .
        </p>
      </div>

      <Carte>
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900">Tâches courantes</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {TACHES.map((t) => (
              <div key={t.titre}>
                <h3 className="font-semibold text-gray-900">{t.titre}</h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
                  {t.etapes.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </Carte>

      {SECTIONS.map((section) => (
        <section key={section.titre}>
          <h2 className="mb-3 text-lg font-bold text-gray-900">{section.titre}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.rubriques.map((r) => (
              <Link key={r.href} href={r.href} className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primaire">
                <p className="font-semibold text-gray-900">{r.titre}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{r.texte}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
