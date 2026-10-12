#!/usr/bin/env node
/**
 * Affiche les empreintes SHA des certificats Play via Android Publisher API.
 *
 * Usage:
 *   PLAY_SA_JSON=./play-service-account.json node scripts/play-app-signing-sha.mjs
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const packages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['com.reserva.client', 'com.reserva.pro'];

function loadSa() {
  const path =
    process.env.PLAY_SA_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    'play-service-account.json';
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function fmtSha(hexOrColon) {
  if (!hexOrColon) return null;
  const h = String(hexOrColon).replace(/:/g, '').toLowerCase();
  return h.match(/.{1,2}/g)?.join(':').toUpperCase() ?? hexOrColon;
}

function printCerts(label, obj) {
  if (!obj || typeof obj !== 'object') return false;
  const sha1 =
    obj.sha1CertificateFingerprint || obj.certificateSha1Hash || obj.sha1Fingerprint || obj.sha1;
  const sha256 =
    obj.sha256CertificateFingerprint ||
    obj.certificateSha256Hash ||
    obj.sha256Fingerprint ||
    obj.sha256;
  if (!sha1 && !sha256) return false;
  console.log(`  [${label}] SHA-1  : ${fmtSha(sha1) || '—'}`);
  console.log(`  [${label}] SHA-256: ${fmtSha(sha256) || '—'}`);
  return true;
}

async function dumpPackage(token, packageName) {
  console.log(`\n═══ ${packageName} ═══`);
  const enc = encodeURIComponent(packageName);

  const si = await api(token, 'GET', `/applications/${enc}/signingInfo`);
  if (si.ok) {
    const info = si.json;
    const printed =
      printCerts('appSigning', info.appSigningKeyCertificate || info.appSigningCertificate) ||
      printCerts('upload', info.uploadKeyCertificate || info.uploadCertificate);
    if (!printed) console.log('signingInfo raw:', JSON.stringify(info, null, 2));
  } else {
    console.log(
      `signingInfo → HTTP ${si.status}: ${si.json?.error?.message || JSON.stringify(si.json)}`,
    );
  }

  const editRes = await api(token, 'POST', `/applications/${enc}/edits`, {});
  if (!editRes.ok) {
    console.log(
      `edit create → HTTP ${editRes.status}: ${editRes.json?.error?.message || JSON.stringify(editRes.json)}`,
    );
    return;
  }
  const editId = editRes.json.id;
  try {
    const apks = await api(token, 'GET', `/applications/${enc}/edits/${editId}/apks`);
    if (apks.ok && Array.isArray(apks.json.apks)) {
      for (const apk of apks.json.apks) {
        console.log(
          `  apk versionCode=${apk.versionCode} SHA-1=${fmtSha(apk.certificateSha1Hash) || '—'}`,
        );
      }
    }

    const track = await api(token, 'GET', `/applications/${enc}/edits/${editId}/tracks/internal`);
    const versionCodes =
      track.json?.releases?.flatMap((r) => r.versionCodes || [])?.map(Number) || [];
    const vc = versionCodes.sort((a, b) => b - a)[0];
    if (vc) {
      console.log(`  track internal latest versionCode=${vc}`);
      const gen = await api(token, 'GET', `/applications/${enc}/generatedApks/${vc}`);
      if (gen.ok) {
        console.log('  generatedApks:', JSON.stringify(gen.json, null, 2).slice(0, 1500));
      } else {
        console.log(
          `  generatedApks → HTTP ${gen.status}: ${gen.json?.error?.message || JSON.stringify(gen.json)}`,
        );
      }
    }
  } finally {
    await api(token, 'DELETE', `/applications/${enc}/edits/${editId}`);
  }
}

const sa = loadSa();
const token = await getAccessToken(sa);
console.log(`Service account: ${sa.client_email}`);
for (const pkg of packages) {
  await dumpPackage(token, pkg);
}
console.log(
  '\n→ Ajoutez chaque SHA-1 App Signing dans Google Cloud → Credentials → OAuth Android (package correspondant).',
);
