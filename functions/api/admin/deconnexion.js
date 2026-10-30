// POST /api/admin/deconnexion — supprime le cookie de session
import { json } from '../../../src/lib/reponse.js';
import { cookieSuppression, estSecurise } from '../../../src/lib/securite.js';

export async function onRequestPost({ request, env }) {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSuppression(estSecurise(request, env)) });
}
