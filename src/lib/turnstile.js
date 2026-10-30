// ===========================================================================
// Vérification du jeton Cloudflare Turnstile côté serveur.
// Doc : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// ===========================================================================

export async function verifierTurnstile(jeton, ip, env) {
  if (!env.TURNSTILE_SECRET) {
    // Refus explicite : ne jamais accepter un formulaire si la protection n'est pas configurée.
    throw new Error('Protection anti-spam non configurée (TURNSTILE_SECRET manquant).');
  }
  if (!jeton || typeof jeton !== 'string' || jeton.length > 2048) {
    throw new Error('Veuillez valider la vérification anti-robot.');
  }

  const corps = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: jeton });
  if (ip && ip !== '0.0.0.0') corps.set('remoteip', ip);

  const reponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corps,
  });
  const resultat = await reponse.json().catch(() => ({ success: false }));
  if (!resultat.success) {
    throw new Error('La vérification anti-robot a échoué. Veuillez réessayer.');
  }
  return true;
}
