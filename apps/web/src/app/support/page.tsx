import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aide et support — RESERVA",
  description:
    "Contactez le support RESERVA et RESERVA Pro : questions, problème de réservation, paiement Mobile Money, compte prestataire.",
};

const EMAIL_SUPPORT = "support@reserva.cd";

const QUESTIONS: { q: string; r: string }[] = [
  {
    q: "Je n'ai pas reçu le code SMS de connexion.",
    r: "Vérifiez le numéro saisi (format +243…), attendez une minute puis touchez « Renvoyer le code ». Si le problème continue, écrivez-nous avec votre numéro.",
  },
  {
    q: "Comment annuler ou modifier une réservation ?",
    r: "Dans l'application RESERVA, ouvrez Réservations, choisissez la réservation puis « Modifier » ou « Annuler ». Les conditions de remboursement dépendent du délai avant le rendez-vous.",
  },
  {
    q: "Mon paiement Mobile Money a été débité mais la réservation n'est pas confirmée.",
    r: "La confirmation peut prendre quelques minutes. Sinon, envoyez-nous le numéro de réservation (RSV-…) et la référence de la transaction : nous vérifions et régularisons.",
  },
  {
    q: "Je suis prestataire : comment activer mon compte RESERVA Pro ?",
    r: "Après l'inscription, complétez votre profil et vos documents. Le code d'activation vous est envoyé par SMS une fois votre dossier validé par l'équipe RESERVA.",
  },
  {
    q: "Comment supprimer mon compte ?",
    r: "Dans l'application : Profil → Supprimer mon compte. Vous pouvez aussi suivre la procédure de la page Suppression de compte.",
  },
];

export default function PageSupport() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-10 text-gray-700">
      <h1 className="text-3xl font-extrabold text-gray-900">Aide et support — RESERVA</h1>
      <p className="text-sm text-gray-500">
        Applications RESERVA (clients) et RESERVA Pro (prestataires) — AfriSoft / RESERVA RDC
      </p>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Nous contacter</h2>
      <p>
        Pour toute question, un problème de réservation, de paiement ou de compte, écrivez-nous à{" "}
        <a href={`mailto:${EMAIL_SUPPORT}?subject=Support%20RESERVA`} className="text-primaire">
          {EMAIL_SUPPORT}
        </a>
        . Nous répondons en français ou en anglais, dans les meilleurs délais.
      </p>
      <p>Pour un traitement plus rapide, indiquez :</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>l&apos;application concernée (RESERVA ou RESERVA Pro) et votre téléphone (Android / iPhone) ;</li>
        <li>le numéro de téléphone lié à votre compte ;</li>
        <li>le numéro de réservation (RSV-…) ou la référence de paiement, s&apos;il y en a un ;</li>
        <li>une description du problème et, si possible, une capture d&apos;écran.</li>
      </ul>
      <p>
        Dans l&apos;application, vous pouvez aussi écrire directement au prestataire depuis le détail
        d&apos;une réservation (onglet Messages).
      </p>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Questions fréquentes</h2>
      <dl className="space-y-4">
        {QUESTIONS.map(({ q, r }) => (
          <div key={q}>
            <dt className="font-semibold text-gray-900">{q}</dt>
            <dd className="mt-1">{r}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Liens utiles</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <a href="/cgu" className="text-primaire">Conditions d&apos;utilisation</a>
        </li>
        <li>
          <a href="/confidentialite" className="text-primaire">Politique de confidentialité</a>
        </li>
        <li>
          <a href="/suppression-compte" className="text-primaire">Suppression de compte</a>
        </li>
      </ul>
    </article>
  );
}
