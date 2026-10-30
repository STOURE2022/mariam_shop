// POST /api/admin/connexion — identifiant + mot de passe → cookie de session signé
import { trouverAdmin } from '../../../lib/db.js';
import { json, erreur, ipClient, lireJson } from '../../../lib/reponse.js';
import { verifierLimite, entier } from '../../../lib/limite.js';
import { verifierMotDePasse, creerJetonSession, cookieSession, estSecurise } from '../../../lib/securite.js';

// Hachage factice pour que le temps de réponse soit identique que l'identifiant existe ou non
const HASH_FACTICE = 'pbkdf2$310000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) {
    console.error('ADMIN_SESSION_SECRET manquant ou trop court (32 caractères minimum).');
    return erreur('Espace administrateur non configuré.', 503);
  }

  const ip = ipClient(request);
  try {
    await verifierLimite(env.DB, 'connexion', ip, entier(env, 'LIMITE_CONNEXION_PAR_QUART_HEURE', 10), 900);
  } catch (e) {
    return erreur(e.message, e.statut || 429);
  }

  let corps;
  try {
    corps = await lireJson(request, 4096);
  } catch (e) {
    return erreur(e.message, 400);
  }

  const identifiant = String(corps.identifiant || '').trim().slice(0, 80);
  const motDePasse = String(corps.mot_de_passe || '').slice(0, 200);
  if (!identifiant || !motDePasse) return erreur('Identifiant et mot de passe requis.', 422);

  const admin = await trouverAdmin(env.DB, identifiant);
  const valide = await verifierMotDePasse(motDePasse, admin ? admin.mot_de_passe_hash : HASH_FACTICE);
  if (!admin || !valide) return erreur('Identifiant ou mot de passe incorrect.', 401);

  const duree = entier(env, 'ADMIN_SESSION_DUREE', 43200);
  const jeton = await creerJetonSession(env.ADMIN_SESSION_SECRET, { id: admin.id, identifiant: admin.identifiant }, duree);

  return json(
    { ok: true, admin: { identifiant: admin.identifiant } },
    200,
    { 'Set-Cookie': cookieSession(jeton, duree, estSecurise(request, env)) }
  );
}
