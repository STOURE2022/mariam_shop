// ===========================================================================
// Protection des PAGES de l'espace admin (/admin/*). Sans session valide,
// toute page autre que /admin/connexion redirige vers la connexion.
// Les fichiers HTML eux-mêmes sont servis par Pages après ce contrôle.
// ===========================================================================
import { sessionAdmin } from '../../src/lib/securite.js';

export async function onRequest(contexte) {
  const { request, env } = contexte;
  const url = new URL(request.url);
  const chemin = url.pathname.replace(/\/+$/, '') || '/admin';

  const admin = await sessionAdmin(request, env);

  if (chemin === '/admin/connexion') {
    if (admin) return Response.redirect(`${url.origin}/admin/`, 302);
    return marquerPrive(await contexte.next());
  }

  if (!admin) {
    return Response.redirect(`${url.origin}/admin/connexion`, 302);
  }
  return marquerPrive(await contexte.next());
}

function marquerPrive(reponse) {
  const r = new Response(reponse.body, reponse);
  r.headers.set('Cache-Control', 'private, no-store');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return r;
}
