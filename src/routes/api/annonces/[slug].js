// GET /api/annonces/:slug — fiche publique. Le téléphone du vendeur n'est
// jamais renvoyé : seul un lien wa.me est fourni, et uniquement si l'annonce est publiée.
import { obtenirAnnoncePublique } from '../../../lib/db.js';
import { json, erreur } from '../../../lib/reponse.js';
import { lienWhatsapp, SITE } from '../../../lib/html.js';

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '').slice(0, 120);
  if (!/^[a-z0-9-]+$/.test(slug)) return erreur('Annonce introuvable.', 404);

  const a = await obtenirAnnoncePublique(env.DB, slug);
  if (!a) return erreur('Annonce introuvable.', 404);

  const { whatsapp_vendeur, ...publique } = a;
  const urlFiche = `${SITE.SITE_URL}/annonces/${a.slug}`;
  publique.lien_whatsapp = whatsapp_vendeur
    ? lienWhatsapp(whatsapp_vendeur, `Bonjour, je suis intéressé(e) par votre annonce « ${a.titre} » vue sur ${SITE.SITE_NOM} : ${urlFiche}`)
    : null;
  publique.lien_commander = lienWhatsapp(
    SITE.SITE_TELEPHONE_INTERNATIONAL,
    `Bonjour ${SITE.SITE_NOM}, je souhaite commander « ${a.titre} » (${urlFiche}).`
  );

  return json(publique, 200, { 'Cache-Control': 'public, max-age=60' });
}
