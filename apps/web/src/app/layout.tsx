import type { Metadata } from "next";
import "./globals.css";
import { EnTete } from "../components/EnTete";
import { ConteneurToasts } from "../components/Toast";
import { InitialiseurAuth } from "../components/InitialiseurAuth";

export const metadata: Metadata = {
  title: "RESERVA — Réservez. Sereinement.",
  description: "Réservez vos services à l'avance en RDCongo : santé, transport, hôtellerie et plus.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div id="splash-ecran" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A56DB] transition-opacity duration-500">
          <svg width="80" height="80" viewBox="0 0 48 48" fill="none" className="animate-pulse">
            <circle cx="38" cy="12" r="3" fill="#F5A623" />
            <path d="M22 44V4h8.5a7 7 0 0 1 5.25 2.1A7.5 7.5 0 0 1 38 12a7.5 7.5 0 0 1-2.25 5.9A7 7 0 0 1 30.5 20H27v24h-5Zm5-12h3a3.5 3.5 0 0 0 2.625-1.05A3.75 3.75 0 0 0 34 12a3.75 3.75 0 0 0-1.375-2.95A3.5 3.5 0 0 0 30 8h-3v24Z" fill="white" />
          </svg>
          <h1 className="mb-2 mt-6 text-4xl font-extrabold tracking-wide text-white">RESERVA</h1>
          <p className="text-lg text-blue-100">Réservez. Sereinement.</p>
          <div className="mt-8 flex gap-1.5">
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0s" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.15s" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
        <InitialiseurAuth>
          <EnTete />
          <main className="mx-auto max-w-6xl px-4 py-8 animate-fade-in-up">{children}</main>
          <ConteneurToasts />
        </InitialiseurAuth>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var el = document.getElementById('splash-ecran');
                if (!el) return;
                setTimeout(function(){
                  el.style.opacity = '0';
                  setTimeout(function(){ el.remove(); }, 500);
                }, 2000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
