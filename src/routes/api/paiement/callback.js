// ===========================================================================
// POST /api/paiement/callback — PHASE 2 : notification Orange Money WebPay (STUB)
//
// Orange Money appelle cette URL (notif_url) à la fin du paiement avec un JSON :
//   { "status": "SUCCESS" | "FAILED" | ..., "notif_token": "...", "txnid": "..." }
//
// Sécurité prévue :
//   - Retrouver la transaction par `notif_token` (secret partagé par transaction,
//     connu uniquement d'Orange et de notre base) — c'est l'authentification.
//   - Ne jamais faire confiance au montant envoyé : relire `montant` dans la table.
//   - Idempotence : si le statut est déjà 'reussi', répondre 200 sans rien changer.
//   - Optionnel : vérifier le statut via GET {URL_API}/orange-money-webpay/ml/v1/transactionstatus
//     avec { order_id, amount, pay_token } avant de confirmer.
// ===========================================================================
import { json, erreur, lireJson } from '../../../lib/reponse.js';

export async function onRequestPost({ request, env }) {
  if (env.PAIEMENT_ACTIF !== 'true') {
    return erreur('Paiement désactivé.', 503);
  }

  let corps;
  try {
    corps = await lireJson(request);
  } catch (e) {
    return erreur(e.message, 400);
  }

  const notifToken = String(corps.notif_token || '');
  const statut = String(corps.status || '').toUpperCase();
  if (!notifToken || notifToken.length > 200) return erreur('Notification invalide.', 400);

  const paiement = await env.DB.prepare('SELECT id, statut, montant, reference, annonce_id FROM paiements WHERE notif_token = ?').bind(notifToken).first();
  if (!paiement) return erreur('Transaction inconnue.', 404);
  if (paiement.statut === 'reussi') return json({ ok: true }); // idempotent

  // --- TODO phase 2 : vérification optionnelle du statut auprès d'Orange avant confirmation ---

  const nouveauStatut = statut === 'SUCCESS' ? 'reussi' : statut === 'FAILED' ? 'echoue' : 'annule';
  await env.DB.prepare("UPDATE paiements SET statut = ?, date_maj = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
    .bind(nouveauStatut, paiement.id)
    .run();

  // --- TODO phase 2 : si 'reussi', marquer l'annonce comme vendue et/ou notifier l'administrateur ---

  return json({ ok: true });
}
