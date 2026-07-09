import Link from "next/link";
import { Stethoscope, Bus, Hotel, UtensilsCrossed, Users, Building2, GraduationCap, ArrowRight } from "lucide-react";
import { LIBELLES_CATEGORIE, CategorieService } from "@reserva/shared";
import { BannierePublicite } from "../components/BannierePublicite";

const ICONES_CATEGORIE: Record<CategorieService, React.ElementType> = {
  SANTE: Stethoscope,
  TRANSPORT: Bus,
  HOTELLERIE: Hotel,
  RESTAURATION: UtensilsCrossed,
  SALLE_REUNION: Users,
  ADMINISTRATIF: Building2,
  EDUCATION: GraduationCap,
};

const CATEGORIES_AFFICHEES: CategorieService[] = [
  "SANTE",
  "TRANSPORT",
  "HOTELLERIE",
  "RESTAURATION",
  "SALLE_REUNION",
  "ADMINISTRATIF",
  "EDUCATION",
];

export default function PageAccueil() {
  return (
    <div className="space-y-12">
      <section className="rounded-card bg-gradient-to-br from-primaire-700 to-primaire-500 px-6 py-16 text-center text-white sm:py-24">
        <h1 className="text-3xl font-extrabold sm:text-5xl">Réservez. Sereinement.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-primaire-50 sm:text-lg">
          Médecins, transport, hôtels et plus encore — réservez vos services à l&apos;avance partout en RDCongo,
          payez avec M-Pesa, Airtel Money ou Orange Money.
        </p>
        <Link
          href="/services"
          className="mt-8 inline-flex items-center gap-2 rounded-bouton bg-accent px-6 py-3 font-semibold text-primaire-700 hover:bg-amber-400"
        >
          Trouver un service <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <BannierePublicite />

      <section>
        <h2 className="mb-5 text-xl font-bold text-gray-900">Catégories de services</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {CATEGORIES_AFFICHEES.map((categorie) => {
            const Icone = ICONES_CATEGORIE[categorie];
            return (
              <Link
                key={categorie}
                href={`/services?categorie=${categorie}`}
                className="flex flex-col items-center gap-3 rounded-card bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primaire-50 text-primaire">
                  <Icone className="h-7 w-7" />
                </div>
                <span className="font-medium text-gray-800">{LIBELLES_CATEGORIE[categorie]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-card bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Vous proposez un service ?</h2>
        <p className="mb-4 text-gray-600">
          Inscrivez votre établissement sur RESERVA et gérez vos réservations facilement, où que vous soyez en RDCongo.
        </p>
        <Link
          href="/prestataire/inscription"
          className="inline-flex items-center gap-2 rounded-bouton border-2 border-primaire px-5 py-2.5 font-semibold text-primaire hover:bg-primaire-50"
        >
          Devenir prestataire <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
