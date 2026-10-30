// GET /api/admin/session — informations sur l'admin connecté + compteurs du tableau de bord
import { compterParStatut } from '../../../src/lib/db.js';
import { json } from '../../../src/lib/reponse.js';

export async function onRequestGet({ env, data }) {
  const compteurs = await compterParStatut(env.DB);
  return json({ admin: data.admin, compteurs });
}
