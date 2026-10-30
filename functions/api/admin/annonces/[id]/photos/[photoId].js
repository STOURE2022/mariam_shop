// DELETE /api/admin/annonces/:id/photos/:photoId — retire une photo (D1 + R2)
import { supprimerPhoto } from '../../../../../../src/lib/db.js';
import { json, erreur } from '../../../../../../src/lib/reponse.js';
import { validerEntier } from '../../../../../../src/lib/validation.js';

export async function onRequestDelete({ params, env }) {
  let id, photoId;
  try {
    id = validerEntier(params.id, 'Identifiant');
    photoId = validerEntier(params.photoId, 'Photo');
  } catch (e) {
    return erreur(e.message, 400);
  }
  const cle = await supprimerPhoto(env.DB, id, photoId);
  if (!cle) return erreur('Photo introuvable.', 404);
  await env.PHOTOS.delete(cle).catch(() => {});
  return json({ ok: true });
}
