// ===========================================================================
// Sécurité : hachage des mots de passe (PBKDF2-SHA256), sessions signées
// (HMAC-SHA256), cookies et utilitaires d'encodage. Web Crypto uniquement.
// ===========================================================================

const PBKDF2_ITERATIONS = 310000;
const NOM_COOKIE = 'ms_session';

const enc = new TextEncoder();

/* ---------- encodage ---------- */

export function versBase64Url(octets) {
  let s = '';
  for (const o of new Uint8Array(octets)) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function depuisBase64Url(chaine) {
  const b64 = chaine.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((chaine.length + 3) % 4);
  const bin = atob(b64);
  const octets = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return octets;
}

export function aleatoireHex(nbOctets = 16) {
  const o = crypto.getRandomValues(new Uint8Array(nbOctets));
  return Array.from(o, (b) => b.toString(16).padStart(2, '0')).join('');
}

function egalConstant(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- mots de passe ---------- */

async function deriver(motDePasse, sel, iterations) {
  const cle = await crypto.subtle.importKey('raw', enc.encode(motDePasse), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations },
    cle,
    256
  );
  return versBase64Url(bits);
}

/** Retourne une chaîne « pbkdf2$<itérations>$<sel>$<hash> ». */
export async function hacherMotDePasse(motDePasse) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriver(motDePasse, sel, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${versBase64Url(sel)}$${hash}`;
}

export async function verifierMotDePasse(motDePasse, chaineHash) {
  try {
    const [algo, it, selB64, hashAttendu] = String(chaineHash).split('$');
    if (algo !== 'pbkdf2') return false;
    const calcule = await deriver(motDePasse, depuisBase64Url(selB64), Number(it));
    return egalConstant(calcule, hashAttendu);
  } catch {
    return false;
  }
}

/* ---------- jetons de session signés ---------- */

async function cleHmac(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/**
 * Crée un jeton « <payload base64url>.<signature base64url> ».
 * payload = { id, identifiant, exp }
 */
export async function creerJetonSession(secret, donnees, dureeSecondes) {
  const payload = { ...donnees, exp: Math.floor(Date.now() / 1000) + dureeSecondes, n: aleatoireHex(8) };
  const corps = versBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await cleHmac(secret), enc.encode(corps));
  return `${corps}.${versBase64Url(sig)}`;
}

export async function verifierJetonSession(secret, jeton) {
  if (!jeton || typeof jeton !== 'string' || !jeton.includes('.')) return null;
  const [corps, sig] = jeton.split('.');
  try {
    const valide = await crypto.subtle.verify('HMAC', await cleHmac(secret), depuisBase64Url(sig), enc.encode(corps));
    if (!valide) return null;
    const payload = JSON.parse(new TextDecoder().decode(depuisBase64Url(corps)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------- cookies ---------- */

export function lireCookie(request, nom = NOM_COOKIE) {
  const entete = request.headers.get('Cookie') || '';
  for (const partie of entete.split(';')) {
    const [k, ...v] = partie.trim().split('=');
    if (k === nom) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieSession(valeur, dureeSecondes, secure = true) {
  return [
    `${NOM_COOKIE}=${encodeURIComponent(valeur)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${dureeSecondes}`,
    secure ? 'Secure' : null,
  ].filter(Boolean).join('; ');
}

export function cookieSuppression(secure = true) {
  return cookieSession('', 0, secure);
}

/** Retourne la session admin ({id, identifiant}) ou null. */
export async function sessionAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const jeton = lireCookie(request);
  const payload = await verifierJetonSession(env.ADMIN_SESSION_SECRET, jeton);
  if (!payload || !payload.id) return null;
  return { id: payload.id, identifiant: payload.identifiant };
}

export function estSecurise(request, env) {
  // En développement local (http://localhost) le drapeau Secure empêcherait le cookie d'être posé.
  const url = new URL(request.url);
  return url.protocol === 'https:' || env.ENVIRONNEMENT === 'production';
}
