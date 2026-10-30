// ===========================================================================
// POST /api/paiement/initier — PHASE 2 : Orange Money WebPay Mali (STUB)
//
// État actuel : DÉSACTIVÉ tant que PAIEMENT_ACTIF !== "true" et que les
// identifiants marchands ne sont pas fournis dans les variables d'environnement :
//   ORANGE_MONEY_MERCHANT_KEY   — clé marchand fournie par Orange Mali
//   ORANGE_MONEY_CLIENT_ID      — identifiant OAuth de l'application (developer.orange.com)
//   ORANGE_MONEY_CLIENT_SECRET  — secret OAuth
//   ORANGE_MONEY_URL_API        — https://api.orange.com (production) ou l'URL de bac à sable
//
// Flux prévu (documentation : https://developer.orange.com/apis/om-webpay) :
//   1. Obtenir un jeton OAuth2 : POST {URL_API}/oauth/v3/token  (Basic base64(client_id:client_secret), grant_type=client_credentials)
//   2. Créer la transaction : POST {URL_API}/orange-money-webpay/ml/v1/webpayment
//        { merchant_key, currency: "OUV" (bac à sable) | "XOF", order_id, amount,
//          return_url, cancel_url, notif_url, lang: "fr", reference }
//      → réponse { payment_url, pay_token, notif_token }
//   3. Enregistrer la transaction dans la table `paiements` (statut 'initie', pay_token, notif_token)
//   4. Rediriger le client vers payment_url
//   5. Orange appelle notre /api/paiement/callback avec { status, notif_token, txnid }
// ===========================================================================
import { json, erreur, lireJson } from '../../../lib/reponse.js';
import { aleatoireHex } from '../../../lib/securite.js';

export async function onRequestPost({ request, env }) {
  if (env.PAIEMENT_ACTIF !== 'true') {
    return erreur('Le paiement en ligne n’est pas encore disponible. Commandez via WhatsApp en attendant.', 503);
  }
  if (!env.ORANGE_MONEY_MERCHANT_KEY || !env.ORANGE_MONEY_CLIENT_ID || !env.ORANGE_MONEY_CLIENT_SECRET) {
    console.error('Paiement activé mais identifiants Orange Money manquants.');
    return erreur('Paiement indisponible : configuration incomplète.', 503);
  }

  let corps;
  try {
    corps = await lireJson(request);
  } catch (e) {
    return erreur(e.message, 400);
  }

  const annonceId = Number(corps.annonce_id);
  if (!Number.isInteger(annonceId) || annonceId <= 0) return erreur('Annonce invalide.', 422);

  const annonce = await env.DB.prepare("SELECT id, titre, prix FROM annonces WHERE id = ? AND statut = 'publiee'").bind(annonceId).first();
  if (!annonce) return erreur('Annonce introuvable ou non disponible.', 404);

  const reference = `MS-${annonceId}-${aleatoireHex(6)}`;

  // --- TODO phase 2 : décommenter et compléter lorsque les identifiants seront fournis ---
  // const jeton = await obtenirJetonOAuth(env);
  // const base = env.ORANGE_MONEY_URL_API || 'https://api.orange.com';
  // const reponse = await fetch(`${base}/orange-money-webpay/ml/v1/webpayment`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  //   body: JSON.stringify({
  //     merchant_key: env.ORANGE_MONEY_MERCHANT_KEY,
  //     currency: env.ENVIRONNEMENT === 'production' ? 'XOF' : 'OUV',
  //     order_id: reference,
  //     amount: annonce.prix,
  //     return_url: `${SITE.SITE_URL}/paiement/retour?ref=${reference}`,
  //     cancel_url: `${SITE.SITE_URL}/paiement/annule?ref=${reference}`,
  //     notif_url: `${SITE.SITE_URL}/api/paiement/callback`,
  //     lang: 'fr',
  //     reference: SITE.SITE_NOM,
  //   }),
  // });
  // const resultat = await reponse.json();
  // if (!reponse.ok || !resultat.payment_url) return erreur('Impossible d’initier le paiement.', 502);
  // await env.DB.prepare(
  //   'INSERT INTO paiements (annonce_id, reference, montant, statut, pay_token, notif_token) VALUES (?, ?, ?, ?, ?, ?)'
  // ).bind(annonceId, reference, annonce.prix, 'en_attente', resultat.pay_token, resultat.notif_token).run();
  // return json({ ok: true, url_paiement: resultat.payment_url, reference });

  await env.DB.prepare('INSERT INTO paiements (annonce_id, reference, montant, statut) VALUES (?, ?, ?, ?)')
    .bind(annonceId, reference, annonce.prix, 'initie')
    .run();
  return json({ ok: false, reference, message: 'Stub : intégration Orange Money à compléter (voir commentaires du fichier).' }, 501);
}

// Helper prévu pour la phase 2 (non appelé pour l'instant)
// async function obtenirJetonOAuth(env) {
//   const base = env.ORANGE_MONEY_URL_API || 'https://api.orange.com';
//   const identifiants = btoa(`${env.ORANGE_MONEY_CLIENT_ID}:${env.ORANGE_MONEY_CLIENT_SECRET}`);
//   const r = await fetch(`${base}/oauth/v3/token`, {
//     method: 'POST',
//     headers: { Authorization: `Basic ${identifiants}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
//     body: 'grant_type=client_credentials',
//   });
//   const j = await r.json();
//   if (!r.ok || !j.access_token) throw new Error('OAuth Orange Money échoué');
//   return j.access_token;
// }
