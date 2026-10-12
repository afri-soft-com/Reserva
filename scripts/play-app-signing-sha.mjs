#!/usr/bin/env node
/**
 * Affiche SHA-1 / SHA-256 du certificat Play App Signing (APK généré).
 *
 * Usage:
 *   PLAY_SA_JSON=./play-service-account.json node scripts/play-app-signing-sha.mjs
 */
import { createSign, createHash, X509Certificate } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

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

async function api(token, method, path, { body, raw } = {}) {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'follow',
  });
  if (raw) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: res.ok, status: res.status, buf, headers: res.headers };
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function fmtSha(buf) {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

/** Extraire le certificat de signature d'un APK (ZIP) via apksigner/keytool si dispo, sinon parse META-INF. */
function fingerprintsFromApk(apkPath) {
  try {
    const out = execFileSync(
      'keytool',
      ['-printcert', '-jarfile', apkPath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const sha1 = out.match(/SHA1:\s*([0-9A-Fa-f:]+)/)?.[1];
    const sha256 = out.match(/SHA256:\s*([0-9A-Fa-f:]+)/)?.[1];
    if (sha1 || sha256) return { sha1, sha256, via: 'keytool' };
  } catch {
    /* fall through */
  }

  // Parse ZIP pour CERT.RSA / CERT.DSA
  const apk = readFileSync(apkPath);
  const names = ['META-INF/CERT.RSA', 'META-INF/CERT.DSA', 'META-INF/ANDROIDD.RSA', 'META-INF/UPLOAD.RSA'];
  // Recherche naive des entrées .RSA dans le ZIP central directory
  let certDer = null;
  const cdSig = Buffer.from('PK\x01\x02');
  let idx = apk.lastIndexOf(cdSig);
  // Parcourir toutes les occurrences de .RSA/.DSA dans le fichier
  const re = /META-INF\/[A-Za-z0-9._-]+\.(RSA|DSA|EC)/g;
  const textProbe = apk.toString('binary');
  const matches = [...textProbe.matchAll(re)].map((m) => m[0]);
  const unique = [...new Set(matches)];
  for (const entryName of unique.length ? unique : names) {
    // Local file header signature
    const nameBuf = Buffer.from(entryName);
    let pos = 0;
    while (pos < apk.length) {
      const found = apk.indexOf(nameBuf, pos);
      if (found < 0) break;
      // Local header starts 30 bytes before name (signature 4 + ver 2 + flag 2 + method 2 + time 2 + date 2 + crc 4 + csize 4 + size 4 + namelen 2 + extralen 2)
      const headerStart = found - 30;
      if (headerStart >= 0 && apk.readUInt32LE(headerStart) === 0x04034b50) {
        const compression = apk.readUInt16LE(headerStart + 8);
        const compSize = apk.readUInt32LE(headerStart + 18);
        const nameLen = apk.readUInt16LE(headerStart + 26);
        const extraLen = apk.readUInt16LE(headerStart + 28);
        const dataStart = headerStart + 30 + nameLen + extraLen;
        const data = apk.subarray(dataStart, dataStart + compSize);
        if (compression === 0) {
          certDer = data;
          break;
        }
      }
      pos = found + 1;
    }
    if (certDer) break;
  }

  if (!certDer) return null;

  // PKCS#7 SignedData — extraire le premier certificat X.509
  try {
    // Chercher séquence SEQUENCE + certificate (tag 0x30) typique ; utiliser X509Certificate sur sous-blocs
    for (let i = 0; i < certDer.length - 4; i++) {
      if (certDer[i] !== 0x30) continue;
      const lenByte = certDer[i + 1];
      let len;
      let hdr;
      if (lenByte < 0x80) {
        len = lenByte;
        hdr = 2;
      } else if (lenByte === 0x82) {
        len = (certDer[i + 2] << 8) | certDer[i + 3];
        hdr = 4;
      } else if (lenByte === 0x81) {
        len = certDer[i + 2];
        hdr = 3;
      } else continue;
      if (len < 200 || i + hdr + len > certDer.length) continue;
      const slice = certDer.subarray(i, i + hdr + len);
      try {
        const x509 = new X509Certificate(slice);
        const der = x509.raw;
        return {
          sha1: fmtSha(createHash('sha1').update(der).digest()),
          sha256: fmtSha(createHash('sha256').update(der).digest()),
          via: 'pkcs7-parse',
          subject: x509.subject,
        };
      } catch {
        /* try next */
      }
    }
  } catch (e) {
    console.log('  cert parse error:', e.message);
  }
  return null;
}

async function dumpPackage(token, packageName) {
  console.log(`\n═══ ${packageName} ═══`);
  const enc = encodeURIComponent(packageName);

  const editRes = await api(token, 'POST', `/applications/${enc}/edits`, { body: {} });
  if (!editRes.ok) {
    console.log(`edit create → HTTP ${editRes.status}: ${JSON.stringify(editRes.json)}`);
    return;
  }
  const editId = editRes.json.id;
  try {
    const track = await api(token, 'GET', `/applications/${enc}/edits/${editId}/tracks/internal`);
    const versionCodes =
      track.json?.releases?.flatMap((r) => r.versionCodes || [])?.map(Number) || [];
    const vc = versionCodes.sort((a, b) => b - a)[0];
    if (!vc) {
      console.log('  aucun versionCode sur track internal');
      return;
    }
    console.log(`  track internal versionCode=${vc}`);

    const gen = await api(token, 'GET', `/applications/${enc}/generatedApks/${vc}`);
    if (!gen.ok) {
      console.log(`  generatedApks → HTTP ${gen.status}: ${JSON.stringify(gen.json)}`);
      return;
    }

    const first = gen.json.generatedApks?.[0];
    const sha256Api = first?.certificateSha256Hash;
    if (sha256Api) console.log(`  [Play API] SHA-256: ${sha256Api}`);

    const split =
      first?.generatedSplitApks?.find((s) => s.moduleName === 'base' && !s.splitId) ||
      first?.generatedSplitApks?.[0];
    if (!split?.downloadId) {
      console.log('  pas de downloadId pour APK généré');
      return;
    }

    const dlPath = `/applications/${enc}/generatedApks/${vc}/downloads/${encodeURIComponent(split.downloadId)}:download`;
    let dl = await api(token, 'GET', dlPath, { raw: true });
    // Certains comptes renvoient un JSON { downloadUrl } au lieu du binaire
    if (dl.ok && dl.buf?.length && dl.buf[0] === 0x7b /* { */) {
      try {
        const meta = JSON.parse(dl.buf.toString('utf8'));
        if (meta.downloadUrl) {
          const r = await fetch(meta.downloadUrl);
          dl = { ok: r.ok, status: r.status, buf: Buffer.from(await r.arrayBuffer()) };
        }
      } catch {
        /* keep original */
      }
    }
    if (!dl.ok || !dl.buf?.length) {
      console.log(`  download APK → HTTP ${dl.status} size=${dl.buf?.length || 0}`);
      return;
    }

    const dir = join(tmpdir(), `reserva-play-sha-${packageName.replace(/\./g, '-')}`);
    mkdirSync(dir, { recursive: true });
    const apkPath = join(dir, 'base.apk');
    writeFileSync(apkPath, dl.buf);
    const magic = dl.buf.subarray(0, 4).toString('hex');
    console.log(`  downloaded ${dl.buf.length} bytes (magic=${magic}) → ${apkPath}`);
    if (magic !== '504b0304') {
      console.log(`  WARNING: not a ZIP/APK, head=${dl.buf.subarray(0, 120).toString('utf8')}`);
    }

    // unzip + openssl en secours (souvent plus fiable que keytool -jarfile sur splits)
    try {
      execFileSync('unzip', ['-o', '-q', apkPath, 'META-INF/*'], { cwd: dir, stdio: 'pipe' });
      const metaInf = join(dir, 'META-INF');
      const { readdirSync } = await import('node:fs');
      const rsa = readdirSync(metaInf).find((f) => /\.(RSA|DSA|EC)$/i.test(f));
      if (rsa) {
        const pem = execFileSync(
          'openssl',
          ['pkcs7', '-inform', 'DER', '-in', join(metaInf, rsa), '-print_certs'],
          { encoding: 'utf8' },
        );
        const x509 = new X509Certificate(pem);
        const der = x509.raw;
        console.log(`  [App Signing] SHA-1  : ${fmtSha(createHash('sha1').update(der).digest())}`);
        console.log(`  [App Signing] SHA-256: ${fmtSha(createHash('sha256').update(der).digest())}`);
        console.log(`  subject: ${x509.subject}`);
        console.log('  (via openssl pkcs7)');
        rmSync(dir, { recursive: true, force: true });
        return;
      }
    } catch (e) {
      console.log(`  openssl path: ${e.message}`);
    }

    const fp = fingerprintsFromApk(apkPath);
    if (fp) {
      console.log(`  [App Signing] SHA-1  : ${fp.sha1}`);
      console.log(`  [App Signing] SHA-256: ${fp.sha256}`);
      if (fp.subject) console.log(`  subject: ${fp.subject}`);
      console.log(`  (via ${fp.via})`);
    } else {
      console.log('  impossible d\'extraire le certificat');
    }
    rmSync(dir, { recursive: true, force: true });
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
  '\n→ Ajoutez chaque SHA-1 [App Signing] dans Google Cloud → Credentials → OAuth client Android (même package).',
);
