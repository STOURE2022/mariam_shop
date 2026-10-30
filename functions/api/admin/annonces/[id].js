// ===========================================================================
// /api/admin/annonces/:id
//   GET    → détail complet
//   PUT    → modification des champs
//   PATCH  → changement de statut { statut, motif? }  (valider / rejeter / vendue / remettre en attente)
//   DELETE → suppression (D1 + objets R2)
// ===========================================================================
import { obtenirAnnonceAdmin, modifierAnnonce, changerStatut, supprimerAnnonce, clesPhotos } from '../../../../src/lib/db.js';
import { json, erreur, lireJson } from '../../../../src/lib/reponse.js';
import {
  validerEntier, validerTitre, validerDescription, validerPrix, validerVille, validerNom, validerTelephone, validerStatut, validerMotif,
} from '../../../../src/lib/validation.js';

function idDepuis(params) {
  return validerEntier(params.id, 'Identifiant');
}

export async function onRequestGet({ params, env }) {
  let id;
  try { id = idDepuis(params); } catch (e) { return erreur(e.message, 400); }
  const a = await obtenirAnnonceAdmin(env.DB, id);
  return a ? json(a) : erreur('Annonce introuvable.', 404);
}

export async function onRequestPut({ request, params, env }) {
  let id, corps;
  try { id = idDepuis(params); corps = await lireJson(request); } catch (e) { return erreur(e.message, 400); }

  let d;
  try {
    d = {
      titre: validerTitre(corps.titre),
      description: validerDescription(corps.description),
      prix: validerPrix(corps.prix),
      ville: validerVille(corps.ville),
      categorie_id: validerEntier(corps.categorie_id, 'Catégorie'),
      nom_vendeur: validerNom(corps.nom_vendeur, 'Nom du vendeur'),
      telephone_vendeur: validerTelephone(corps.telephone_vendeur),
    };
  } catch (e) {
    return erreur(e.message, 422);
  }

  const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(d.categorie_id).first();
  if (!cat) return erreur('Catégorie inconnue.', 422);

  const ok = await modifierAnnonce(env.DB, id, d);
  return ok ? json({ ok: true, annonce: await obtenirAnnonceAdmin(env.DB, id) }) : erreur('Annonce introuvable.', 404);
}

export async function onRequestPatch({ request, params, env }) {
  let id, corps;
  try { id = idDepuis(params); corps = await lireJson(request); } catch (e) { return erreur(e.message, 400); }

  let statut, motif = null;
  try {
    statut = validerStatut(corps.statut);
    if (statut === 'rejetee') motif = validerMotif(corps.motif);
  } catch (e) {
    return erreur(e.message, 422);
  }

  const ok = await changerStatut(env.DB, id, statut, motif);
  return ok ? json({ ok: true, statut }) : erreur('Annonce introuvable.', 404);
}

export async function onRequestDelete({ params, env }) {
  let id;
  try { id = idDepuis(params); } catch (e) { return erreur(e.message, 400); }

  const cles = await clesPhotos(env.DB, id);
  const ok = await supprimerAnnonce(env.DB, id);
  if (!ok) return erreur('Annonce introuvable.', 404);
  await Promise.allSettled(cles.map((c) => env.PHOTOS.delete(c)));
  return json({ ok: true });
}
