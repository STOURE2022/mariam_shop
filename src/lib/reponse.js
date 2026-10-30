// ===========================================================================
// Aides pour les réponses HTTP (JSON, HTML, erreurs) et en-têtes de sécurité.
// ===========================================================================

export const ENTETES_SECURITE = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    // 'unsafe-inline' pour les styles : nécessaire au widget Turnstile (dimensions de l'iframe) ;
    // aucun script inline n'est autorisé, ce qui reste la protection principale contre le XSS.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export function appliquerEntetesSecurite(reponse) {
  const r = new Response(reponse.body, reponse);
  for (const [k, v] of Object.entries(ENTETES_SECURITE)) {
    if (!r.headers.has(k)) r.headers.set(k, v);
  }
  return r;
}

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...entetes },
  });
}

export function erreur(message, statut = 400, details) {
  return json({ erreur: message, ...(details ? { details } : {}) }, statut);
}

export function html(contenu, statut = 200, entetes = {}) {
  return new Response(contenu, {
    status: statut,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...entetes },
  });
}

/** Adresse IP du client (Cloudflare fournit CF-Connecting-IP). */
export function ipClient(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '0.0.0.0';
}

/** Lit un corps JSON en toute sécurité (taille limitée). */
export async function lireJson(request, maxOctets = 64 * 1024) {
  const longueur = Number(request.headers.get('Content-Length') || 0);
  if (longueur > maxOctets) throw new Error('Corps trop volumineux');
  const texte = await request.text();
  if (texte.length > maxOctets) throw new Error('Corps trop volumineux');
  try {
    return JSON.parse(texte || '{}');
  } catch {
    throw new Error('JSON invalide');
  }
}
