export default function PageSuppressionCompte() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-10 text-gray-700">
      <h1 className="text-3xl font-extrabold text-gray-900">
        Suppression de compte — RESERVA
      </h1>
      <p className="text-sm text-gray-500">
        Applications RESERVA (Client) et RESERVA Pro — dernière mise à jour : 10 octobre 2026
      </p>

      <p className="mt-6">
        Vous pouvez demander la suppression définitive de votre compte RESERVA et des données
        associées. Cette page concerne les applications mobiles <strong>RESERVA</strong> et{" "}
        <strong>RESERVA Pro</strong> (AfriSoft / RESERVA RDC).
      </p>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Comment supprimer votre compte</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Ouvrez l&apos;application <strong>RESERVA</strong> ou <strong>RESERVA Pro</strong> et
          connectez-vous.
        </li>
        <li>
          Allez dans <strong>Profil</strong> → <strong>Supprimer mon compte</strong>, confirmez en
          tapant <code>SUPPRIMER</code>.
        </li>
        <li>
          La suppression est immédiate dans l&apos;app (profil anonymisé, connexion impossible).
          Certaines données de transaction peuvent être conservées pour obligations légales.
        </li>
        <li>
          Sans accès à l&apos;app : écrivez à{" "}
          <a href="mailto:support@reserva.cd" className="text-primaire">
            support@reserva.cd
          </a>{" "}
          depuis l&apos;adresse ou le numéro lié au compte (objet : « Suppression de compte
          RESERVA »).
        </li>
      </ol>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Données supprimées</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Profil (nom, téléphone, e-mail, photo)</li>
        <li>Préférences, favoris, messages de chat</li>
        <li>Jetons de session et codes PIN / OTP actifs</li>
      </ul>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Données pouvant être conservées</h2>
      <p>
        Certaines données de transaction (réservations, paiements Mobile Money, facturation) peuvent
        être conservées le temps requis par la réglementation comptable et fiscale congolaise et la
        lutte contre la fraude, puis anonymisées ou archivées.
      </p>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Délai</h2>
      <p>
        Traitement sous 30 jours après vérification de l&apos;identité du demandeur. Vous recevrez
        une confirmation lorsque la suppression sera effective.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        Voir aussi la{" "}
        <a href="/confidentialite" className="text-primaire">
          Politique de confidentialité
        </a>
        .
      </p>
    </article>
  );
}
