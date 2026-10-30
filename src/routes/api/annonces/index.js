// ===========================================================================
// GET  /api/annonces  — liste publique paginée (annonces publiées uniquement)
// POST /api/annonces  — dépôt d'une annonce (multipart/form-data, Turnstile,
//                       limitation de débit, validation serveur, photos → R2)
// ===========================================================================
import { listerAnnoncesPubliques, annoncesRecentes, creerAnnonce, ajouterPhotos, slugUnique } from '../../../lib/db.js';
import { json, erreur, ipClient } from '../../../lib/reponse.js';
import { verifierTurnstile } from '../../../lib/turnstile.js';
import { verifierLimite, entier } from '../../../lib/limite.js';
import {
  validerTitre, validerDescription, validerPrix, validerVille, validerNom, validerTelephone,
  validerConsentement, validerEntier, validerImage, slugifier, LIMITES,
} from '../../../lib/validation.js';
import { aleatoireHex } from '../../../lib/securite.js';

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const p = u.searchParams;

  if (p.get('recentes') === '1') {
    const annonces = await annoncesRecentes(env.DB, 6);
    return json({ annonces }, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  const nombre = (cle) => {
    const v = p.get(cle);
    if (v === null || v.trim() === '') return undefined;
    const n = Number(v.replace(/\s/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const filtres = {
    page: Math.min(500, Math.max(1, parseInt(p.get('page') || '1', 10) || 1)),
    categorie: (p.get('categorie') || '').slice(0, 80).replace(/[^a-z0-9-]/g, '') || undefined,
    ville: (p.get('ville') || '').slice(0, 40) || undefined,
    prix_min: nombre('prix_min'),
    prix_max: nombre('prix_max'),
    q: (p.get('q') || '').trim().slice(0, 80) || undefined,
  };

  const resultat = await listerAnnoncesPubliques(env.DB, filtres);
  return json(resultat, 200, { 'Cache-Control': 'public, max-age=60' });
}

export async function onRequestPost({ request, env }) {
  const ip = ipClient(request);

  try {
    await verifierLimite(env.DB, 'annonce', ip, entier(env, 'LIMITE_ANNONCES_PAR_HEURE', 5), 3600);
  } catch (e) {
    return erreur(e.message, e.statut || 429);
  }

  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('multipart/form-data')) return erreur('Format de requête invalide.', 415);

  // Garde-fou global : 5 photos × 5 Mo + champs texte
  const longueur = Number(request.headers.get('Content-Length') || 0);
  if (longueur > LIMITES.PHOTOS_MAX * LIMITES.PHOTO_OCTETS_MAX + 512 * 1024) {
    return erreur('Envoi trop volumineux : 5 photos de 5 Mo maximum.', 413);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return erreur('Formulaire illisible.', 400);
  }

  // 1. Anti-spam
  try {
    await verifierTurnstile(form.get('cf-turnstile-response'), ip, env);
  } catch (e) {
    return erreur(e.message, 403);
  }

  // 2. Validation des champs
  let donnees;
  try {
    donnees = {
      titre: validerTitre(form.get('titre')),
      description: validerDescription(form.get('description')),
      prix: validerPrix(form.get('prix')),
      ville: validerVille(form.get('ville')),
      categorie_id: validerEntier(form.get('categorie_id'), 'Catégorie'),
      nom_vendeur: validerNom(form.get('nom_vendeur'), 'Votre nom'),
      telephone_vendeur: validerTelephone(form.get('telephone_vendeur')),
    };
    validerConsentement(form.get('consentement'));
  } catch (e) {
    return erreur(e.message, 422);
  }

  const categorie = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(donnees.categorie_id).first();
  if (!categorie) return erreur('Catégorie inconnue.', 422);

  // 3. Photos : type réel vérifié par signature, taille ≤ 5 Mo, 5 maximum
  const fichiers = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (fichiers.length > LIMITES.PHOTOS_MAX) return erreur('Vous pouvez envoyer au maximum 5 photos.', 422);

  const photosValidees = [];
  for (const f of fichiers) {
    try {
      const info = await validerImage(f);
      photosValidees.push({ fichier: f, ...info });
    } catch (e) {
      return erreur(e.message, 422);
    }
  }

  // 4. Enregistrement : annonce puis photos (R2 puis D1)
  const slug = await slugUnique(env.DB, slugifier(donnees.titre));
  const annonceId = await creerAnnonce(env.DB, { ...donnees, slug });

  const cles = [];
  try {
    for (const p of photosValidees) {
      const cle = `annonces/${annonceId}/${aleatoireHex(12)}.${p.extension}`;
      await env.PHOTOS.put(cle, p.fichier.stream(), {
        httpMetadata: { contentType: p.mime, cacheControl: 'public, max-age=31536000, immutable' },
        customMetadata: { annonce: String(annonceId) },
      });
      cles.push(cle);
    }
    await ajouterPhotos(env.DB, annonceId, cles);
  } catch (e) {
    console.error('Échec envoi photos :', e);
    // Les photos déjà envoyées restent liées si l'insertion D1 a réussi ; sinon on nettoie R2.
    await Promise.allSettled(cles.map((c) => env.PHOTOS.delete(c)));
    await env.DB.prepare('DELETE FROM annonces WHERE id = ?').bind(annonceId).run();
    return erreur("L'envoi des photos a échoué. Veuillez réessayer avec des images plus légères.", 500);
  }

  return json(
    { ok: true, message: 'Votre annonce a bien été reçue. Elle sera publiée après validation par notre équipe.', reference: annonceId },
    201
  );
}
