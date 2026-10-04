export default function PageConfidentialite() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl text-gray-700">
      <h1 className="text-3xl font-extrabold text-gray-900">Politique de confidentialité</h1>
      <p className="text-sm text-gray-500">RESERVA RDC — dernière mise à jour : 5 septembre 2026</p>

      <h2 className="mt-8 text-xl font-bold text-gray-900">Données collectées</h2>
      <p>
        Nous collectons le nom, le numéro de téléphone, l&apos;e-mail facultatif, l&apos;historique de réservation, les avis,
        et les références de paiement Mobile Money. Les prestataires fournissent également les informations de leur
        établissement.
      </p>

      <h2 className="mt-6 text-xl font-bold text-gray-900">Finalités</h2>
      <p>
        Ces données servent à créer le compte, confirmer les réservations, envoyer les rappels SMS, traiter les
        paiements et versements, prévenir la fraude, et améliorer le service.
      </p>

      <h2 className="mt-6 text-xl font-bold text-gray-900">Conservation</h2>
      <p>
        Les données de compte sont conservées tant que le compte est actif, puis archivées le temps nécessaire aux
        obligations comptables et fiscales congolaises. Les OTP expirent en quelques minutes.
      </p>

      <h2 className="mt-6 text-xl font-bold text-gray-900">Partage</h2>
      <p>
        Le prestataire voit les informations nécessaires à honorer la réservation. Les opérateurs Mobile Money reçoivent
        uniquement les données de transaction. Aucune vente de fichiers clients.
      </p>

      <h2 className="mt-6 text-xl font-bold text-gray-900">Vos droits</h2>
      <p>
        Vous pouvez consulter, corriger ou demander la suppression de vos données depuis votre profil, ou en écrivant
        à l&apos;équipe RESERVA. Certaines données de transaction peuvent être conservées pour la lutte contre la fraude.
      </p>
    </article>
  );
}
