// GET /api/categories — liste des catégories et des villes (données publiques, en cache)
import { listerCategories } from '../../lib/db.js';
import { VILLES } from '../../lib/validation.js';
import { json } from '../../lib/reponse.js';

export async function onRequestGet({ env }) {
  const categories = await listerCategories(env.DB);
  return json({ categories, villes: VILLES }, 200, { 'Cache-Control': 'public, max-age=3600' });
}
