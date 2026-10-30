// GET /api/admin/annonces?statut=en_attente&page=1 — liste complète (avec coordonnées vendeur)
import { listerAnnoncesAdmin } from '../../../../lib/db.js';
import { json, erreur } from '../../../../lib/reponse.js';
import { STATUTS } from '../../../../lib/validation.js';

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const statut = p.get('statut') || '';
  if (statut && !STATUTS.includes(statut)) return erreur('Statut invalide.', 400);
  const page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
  return json(await listerAnnoncesAdmin(env.DB, statut || null, page));
}
