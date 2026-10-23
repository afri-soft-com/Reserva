"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuthStore } from "../../../lib/store-auth";
import {
  DocumentPrivacy,
  enregistrerPrivacyAdmin,
  lirePrivacyAdmin,
} from "../../../lib/api-legal";
import { extraireMessageErreur } from "../../../lib/api-client";
import { toastErreur, toastSucces } from "../../../components/Toast";

const SUPERADMIN_PHONES = (process.env.NEXT_PUBLIC_SUPERADMIN_PHONES || "+243900000001")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const SUPERADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || "celestinkas@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function estSuperAdmin(u: { telephone?: string | null; email?: string | null } | null) {
  if (!u) return false;
  if (u.telephone && SUPERADMIN_PHONES.includes(u.telephone)) return true;
  const email = (u.email || "").trim().toLowerCase();
  return Boolean(email && SUPERADMIN_EMAILS.includes(email));
}

export default function PageAdminConfidentialite() {
  const { utilisateur } = useAuthStore();
  const autorise = estSuperAdmin(utilisateur);
  const [form, setForm] = useState<DocumentPrivacy | null>(null);
  const [chargement, setChargement] = useState(true);
  const [sauve, setSauve] = useState(false);

  useEffect(() => {
    if (!autorise) {
      setChargement(false);
      return;
    }
    lirePrivacyAdmin()
      .then(setForm)
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [autorise]);

  if (!autorise) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Accès réservé au SuperAdmin. La politique de confidentialité n&apos;est pas éditable avec votre compte.
      </div>
    );
  }

  if (chargement || !form) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSauve(true);
    try {
      const next = await enregistrerPrivacyAdmin({
        title: form.title,
        version: form.version,
        body: form.body,
        format: form.format || "markdown",
      });
      setForm(next);
      toastSucces("Politique de confidentialité enregistrée");
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setSauve(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Politique de confidentialité</h1>
        <p className="mt-1 text-sm text-gray-500">
          SuperAdmin uniquement. Version publiée sur le site et dans l&apos;aide mobile.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Version</span>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.version}
              onChange={(ev) => setForm({ ...form, version: ev.target.value })}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Format</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.format}
              onChange={(ev) => setForm({ ...form, format: ev.target.value })}
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="plain">Texte</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Titre</span>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={form.title}
            onChange={(ev) => setForm({ ...form, title: ev.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Texte</span>
          <textarea
            className="mt-1 min-h-[320px] w-full rounded-lg border border-gray-300 p-3 font-mono text-sm"
            value={form.body}
            onChange={(ev) => setForm({ ...form, body: ev.target.value })}
            required
          />
        </label>
        <button
          type="submit"
          disabled={sauve}
          className="rounded-lg bg-primaire px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sauve ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
