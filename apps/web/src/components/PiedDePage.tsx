import Link from "next/link";

export function PiedDePage() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="text-lg font-extrabold text-primaire">RESERVA</p>
          <p className="mt-2 text-sm text-gray-600">
            Console d&apos;administration. Clients et prestataires utilisent l&apos;application Android et iOS.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Légal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/cgu" className="text-gray-700 hover:text-primaire">Conditions d&apos;utilisation</Link></li>
            <li><Link href="/confidentialite" className="text-gray-700 hover:text-primaire">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} RESERVA RDC — Console administration.
      </div>
    </footer>
  );
}
