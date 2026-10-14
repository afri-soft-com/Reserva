"use client";

import { useEffect, useRef, useState } from "react";

const CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "473749172261-74ardi53uajb5f3m992kcsvg4u0jes7i.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type Props = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

/** Bouton Google Identity Services (idToken JWT) pour la console admin. */
export function BoutonGoogleAdmin({ onCredential, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (disabled) return;
    let annule = false;

    function monterBouton() {
      if (annule || !ref.current || !window.google?.accounts?.id) return;
      ref.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (reponse: { credential?: string }) => {
          if (reponse.credential) callbackRef.current(reponse.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(ref.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 320,
        locale: "fr",
      });
      setPret(true);
    }

    if (window.google?.accounts?.id) {
      monterBouton();
      return;
    }

    const existant = document.querySelector<HTMLScriptElement>('script[data-reserva-gsi="1"]');
    if (existant) {
      existant.addEventListener("load", monterBouton);
      return () => {
        annule = true;
        existant.removeEventListener("load", monterBouton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.reservaGsi = "1";
    script.onload = monterBouton;
    script.onerror = () => setErreur("Impossible de charger Google Sign-In.");
    document.head.appendChild(script);

    return () => {
      annule = true;
    };
  }, [disabled]);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {!pret && !erreur && (
        <p className="text-xs text-gray-400">Chargement Google…</p>
      )}
      <div
        ref={ref}
        className={`flex min-h-[44px] w-full justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />
    </div>
  );
}
