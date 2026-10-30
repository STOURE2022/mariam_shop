// POST /api/admin/deconnexion — supprime le cookie de session
import { json } from '../../../lib/reponse.js';
import { cookieSuppression, estSecurise } from '../../../lib/securite.js';

export async function onRequestPost({ request, env }) {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSuppression(estSecurise(request, env)) });
}
