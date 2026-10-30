// GET /api/admin/messages?page=1 — messages de contact reçus
import { listerMessages } from '../../../../lib/db.js';
import { json } from '../../../../lib/reponse.js';

export async function onRequestGet({ request, env }) {
  const page = Math.max(1, parseInt(new URL(request.url).searchParams.get('page') || '1', 10) || 1);
  return json(await listerMessages(env.DB, page));
}
