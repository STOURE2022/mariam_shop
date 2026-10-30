// ===========================================================================
// Middleware API admin : toute route /api/admin/* exige une session valide,
// sauf POST /api/admin/connexion. Protection CSRF supplémentaire : pour les
// requêtes modifiantes, l'en-tête Origin doit correspondre au site
// (le cookie SameSite=Strict en est déjà la première barrière).
// ===========================================================================
import { sessionAdmin } from '../../../src/lib/securite.js';
import { erreur } from '../../../src/lib/reponse.js';

export async function onRequest(contexte) {
  const { request, env } = contexte;
  const url = new URL(request.url);

  if (url.pathname === '/api/admin/connexion' && request.method === 'POST') {
    return contexte.next();
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    const origine = request.headers.get('Origin');
    if (origine && origine !== url.origin) return erreur('Origine non autorisée.', 403);
    const type = request.headers.get('Content-Type') || '';
    if (!type.startsWith('application/json') && request.method !== 'DELETE') {
      return erreur('Content-Type JSON requis.', 415);
    }
  }

  const admin = await sessionAdmin(request, env);
  if (!admin) return erreur('Authentification requise.', 401);

  contexte.data.admin = admin;
  return contexte.next();
}
