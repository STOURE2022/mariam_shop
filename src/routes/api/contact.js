// POST /api/contact — formulaire de contact (JSON), Turnstile + limitation de débit
import { creerMessage } from '../../lib/db.js';
import { json, erreur, ipClient, lireJson } from '../../lib/reponse.js';
import { verifierTurnstile } from '../../lib/turnstile.js';
import { verifierLimite, entier } from '../../lib/limite.js';
import { validerNom, validerEmail, validerTelephone, validerMessage } from '../../lib/validation.js';

export async function onRequestPost({ request, env }) {
  const ip = ipClient(request);
  try {
    await verifierLimite(env.DB, 'contact', ip, entier(env, 'LIMITE_CONTACT_PAR_HEURE', 5), 3600);
  } catch (e) {
    return erreur(e.message, e.statut || 429);
  }

  let corps;
  try {
    corps = await lireJson(request);
  } catch (e) {
    return erreur(e.message, 400);
  }

  // Champ « pot de miel » : rempli uniquement par les robots
  if (corps.site_web) return json({ ok: true, message: 'Merci, votre message a bien été envoyé.' });

  try {
    await verifierTurnstile(corps['cf-turnstile-response'], ip, env);
  } catch (e) {
    return erreur(e.message, 403);
  }

  let m;
  try {
    m = {
      nom: validerNom(corps.nom),
      email: validerEmail(corps.email, { optionnel: true }),
      telephone: validerTelephone(corps.telephone, { optionnel: true }),
      message: validerMessage(corps.message),
    };
    if (!m.email && !m.telephone) throw new Error('Indiquez au moins un e-mail ou un numéro de téléphone pour que nous puissions vous répondre.');
  } catch (e) {
    return erreur(e.message, 422);
  }

  await creerMessage(env.DB, m);
  return json({ ok: true, message: 'Merci, votre message a bien été envoyé. Nous vous répondrons rapidement.' }, 201);
}
