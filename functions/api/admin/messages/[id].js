// PATCH  /api/admin/messages/:id  { lu: true|false }
// DELETE /api/admin/messages/:id
import { marquerMessageLu, supprimerMessage } from '../../../../src/lib/db.js';
import { json, erreur, lireJson } from '../../../../src/lib/reponse.js';
import { validerEntier } from '../../../../src/lib/validation.js';

export async function onRequestPatch({ request, params, env }) {
  let id, corps;
  try { id = validerEntier(params.id); corps = await lireJson(request, 1024); } catch (e) { return erreur(e.message, 400); }
  const ok = await marquerMessageLu(env.DB, id, corps.lu !== false);
  return ok ? json({ ok: true }) : erreur('Message introuvable.', 404);
}

export async function onRequestDelete({ params, env }) {
  let id;
  try { id = validerEntier(params.id); } catch (e) { return erreur(e.message, 400); }
  const ok = await supprimerMessage(env.DB, id);
  return ok ? json({ ok: true }) : erreur('Message introuvable.', 404);
}
