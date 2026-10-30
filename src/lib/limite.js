// ===========================================================================
// Limitation de débit simple en D1 : compteur par clé (action:IP) sur une
// fenêtre fixe. Complémentaire aux règles « Rate Limiting » du tableau de bord
// Cloudflare (WAF) que l'on recommande d'activer aussi (voir README).
// ===========================================================================

/**
 * Incrémente le compteur et lève une erreur si la limite est dépassée.
 * @param {D1Database} db
 * @param {string} action  ex. "annonce", "contact", "connexion"
 * @param {string} ip
 * @param {number} maximum nombre de requêtes autorisées par fenêtre
 * @param {number} fenetreSecondes durée de la fenêtre
 */
export async function verifierLimite(db, action, ip, maximum, fenetreSecondes) {
  const cle = `${action}:${ip}`;
  const maintenant = Math.floor(Date.now() / 1000);
  const expire = maintenant + fenetreSecondes;

  // Nettoyage opportuniste (1 fois sur ~20) des entrées expirées
  if (Math.random() < 0.05) {
    await db.prepare('DELETE FROM limites_debit WHERE expire_le < ?').bind(maintenant).run();
  }

  const ligne = await db
    .prepare(
      `INSERT INTO limites_debit (cle, compteur, expire_le) VALUES (?, 1, ?)
       ON CONFLICT(cle) DO UPDATE SET
         compteur  = CASE WHEN limites_debit.expire_le < ? THEN 1 ELSE limites_debit.compteur + 1 END,
         expire_le = CASE WHEN limites_debit.expire_le < ? THEN ? ELSE limites_debit.expire_le END
       RETURNING compteur, expire_le`
    )
    .bind(cle, expire, maintenant, maintenant, expire)
    .first();

  if (ligne && ligne.compteur > maximum) {
    const attente = Math.max(1, Math.ceil((ligne.expire_le - maintenant) / 60));
    const e = new Error(`Trop de tentatives. Veuillez réessayer dans ${attente} minute(s).`);
    e.statut = 429;
    throw e;
  }
}

export function entier(env, nom, defaut) {
  const n = Number(env[nom]);
  return Number.isFinite(n) && n > 0 ? n : defaut;
}
