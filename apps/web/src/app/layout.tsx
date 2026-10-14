import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EnTete } from "../components/EnTete";
import { PiedDePage } from "../components/PiedDePage";
import { ConteneurToasts } from "../components/Toast";
import { InitialiseurAuth } from "../components/InitialiseurAuth";
import { GardeConsole } from "../components/GardeConsole";
import { BanniereMiseAJour } from "../components/BanniereMiseAJour";
import { EnregistreurPwa } from "../components/EnregistreurPwa";

export const metadata: Metadata = {
  title: "RESERVA — Console d'administration",
  description: "Console d'administration RESERVA. Clients et prestataires utilisent l'application mobile.",
  applicationName: "RESERVA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RESERVA",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1A56DB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div id="splash-ecran" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A56DB] transition-opacity duration-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/app-icon.svg" alt="RESERVA" width={80} height={80} className="animate-pulse brightness-0 invert" />
          <h1 className="mb-2 mt-6 text-4xl font-extrabold tracking-wide text-white">RESERVA</h1>
          <p className="text-lg text-blue-100">Réservez. Sereinement.</p>
          <div className="mt-8 flex gap-1.5">
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0s" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.15s" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
        <EnregistreurPwa />
        <InitialiseurAuth>
          <BanniereMiseAJour />
          <EnTete />
          <main className="animate-fade-in-up">
            <GardeConsole>{children}</GardeConsole>
          </main>
          <PiedDePage />
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
