// GET /photos/<clé R2> — sert les images depuis R2 avec cache long.
// Seules les images liées à une annonce visible (publiée/vendue) ou demandées
// par un administrateur connecté sont servies.
import { sessionAdmin } from '../../src/lib/securite.js';

export async function onRequestGet({ request, params, env }) {
  const cle = Array.isArray(params.cle) ? params.cle.join('/') : String(params.cle || '');
  if (!/^annonces\/\d+\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(cle)) {
    return new Response('Introuvable', { status: 404 });
  }

  const annonceId = Number(cle.split('/')[1]);
  const ligne = await env.DB
    .prepare('SELECT a.statut FROM photos_annonces p JOIN annonces a ON a.id = p.annonce_id WHERE p.cle_r2 = ? AND a.id = ?')
    .bind(cle, annonceId)
    .first();
  if (!ligne) return new Response('Introuvable', { status: 404 });

  if (ligne.statut !== 'publiee' && ligne.statut !== 'vendue') {
    const admin = await sessionAdmin(request, env);
    if (!admin) return new Response('Introuvable', { status: 404 });
  }

  const objet = await env.PHOTOS.get(cle);
  if (!objet) return new Response('Introuvable', { status: 404 });

  const entetes = new Headers();
  objet.writeHttpMetadata(entetes);
  entetes.set('ETag', objet.httpEtag);
  entetes.set('Cache-Control', ligne.statut === 'publiee' || ligne.statut === 'vendue' ? 'public, max-age=31536000, immutable' : 'private, no-store');
  entetes.set('X-Content-Type-Options', 'nosniff');
  entetes.set('Content-Disposition', 'inline');

  if (request.headers.get('If-None-Match') === objet.httpEtag) {
    return new Response(null, { status: 304, headers: entetes });
  }
  return new Response(objet.body, { headers: entetes });
}
