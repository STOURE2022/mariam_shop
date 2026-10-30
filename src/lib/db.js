// ===========================================================================
// Accès aux données D1 — requêtes paramétrées uniquement.
// Les fonctions « publiques » ne renvoient JAMAIS nom_vendeur / telephone_vendeur.
// ===========================================================================

export const PAR_PAGE = 12;

const COLONNES_PUBLIQUES = `
  a.id, a.titre, a.slug, a.description, a.prix, a.devise, a.ville, a.statut,
  a.date_creation, a.date_publication,
  c.nom AS categorie_nom, c.slug AS categorie_slug,
  (SELECT p.cle_r2 FROM photos_annonces p WHERE p.annonce_id = a.id ORDER BY p.ordre ASC LIMIT 1) AS photo_principale
`;

export async function listerCategories(db) {
  const { results } = await db.prepare('SELECT id, nom, slug FROM categories ORDER BY nom COLLATE NOCASE').all();
  return results;
}

/**
 * Liste paginée des annonces publiées avec filtres.
 * @param {object} f { page, categorie (slug), ville, prix_min, prix_max, q }
 */
export async function listerAnnoncesPubliques(db, f = {}) {
  const conditions = ["a.statut = 'publiee'"];
  const params = [];

  if (f.categorie) { conditions.push('c.slug = ?'); params.push(f.categorie); }
  if (f.ville) { conditions.push('a.ville = ?'); params.push(f.ville); }
  if (Number.isFinite(f.prix_min)) { conditions.push('a.prix >= ?'); params.push(f.prix_min); }
  if (Number.isFinite(f.prix_max)) { conditions.push('a.prix <= ?'); params.push(f.prix_max); }
  if (f.q) {
    // Recherche simple insensible à la casse ; les caractères spéciaux LIKE sont échappés.
    const motif = '%' + f.q.replace(/[%_\\]/g, '\\$&') + '%';
    conditions.push("(a.titre LIKE ? ESCAPE '\\' OR a.description LIKE ? ESCAPE '\\')");
    params.push(motif, motif);
  }

  const where = conditions.join(' AND ');
  const page = Math.max(1, f.page || 1);
  const decalage = (page - 1) * PAR_PAGE;

  const total = await db
    .prepare(`SELECT COUNT(*) AS n FROM annonces a JOIN categories c ON c.id = a.categorie_id WHERE ${where}`)
    .bind(...params)
    .first('n');

  const { results } = await db
    .prepare(
      `SELECT ${COLONNES_PUBLIQUES}
       FROM annonces a JOIN categories c ON c.id = a.categorie_id
       WHERE ${where}
       ORDER BY a.date_publication DESC, a.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, PAR_PAGE, decalage)
    .all();

  return { annonces: results.map(formaterPublique), total, page, pages: Math.max(1, Math.ceil(total / PAR_PAGE)), par_page: PAR_PAGE };
}

export async function annoncesRecentes(db, limite = 6) {
  const { results } = await db
    .prepare(
      `SELECT ${COLONNES_PUBLIQUES}
       FROM annonces a JOIN categories c ON c.id = a.categorie_id
       WHERE a.statut = 'publiee'
       ORDER BY a.date_publication DESC, a.id DESC LIMIT ?`
    )
    .bind(limite)
    .all();
  return results.map(formaterPublique);
}

/**
 * Fiche publique d'une annonce publiée (ou vendue : la fiche reste visible,
 * marquée « vendue », mais sans lien WhatsApp).
 * Le téléphone n'est utilisé que pour construire le lien wa.me, uniquement si statut = publiee.
 */
export async function obtenirAnnoncePublique(db, slug) {
  const a = await db
    .prepare(
      `SELECT ${COLONNES_PUBLIQUES}, a.telephone_vendeur
       FROM annonces a JOIN categories c ON c.id = a.categorie_id
       WHERE a.slug = ? AND a.statut IN ('publiee', 'vendue')`
    )
    .bind(slug)
    .first();
  if (!a) return null;

  const { results: photos } = await db
    .prepare('SELECT cle_r2 FROM photos_annonces WHERE annonce_id = ? ORDER BY ordre ASC')
    .bind(a.id)
    .all();

  const publique = formaterPublique(a);
  publique.photos = photos.map((p) => `/photos/${p.cle_r2}`);
  publique.whatsapp_vendeur = a.statut === 'publiee' ? a.telephone_vendeur : null; // retiré par l'appelant après construction du lien
  return publique;
}

function formaterPublique(l) {
  return {
    id: l.id,
    titre: l.titre,
    slug: l.slug,
    description: l.description,
    prix: l.prix,
    devise: l.devise,
    ville: l.ville,
    statut: l.statut,
    categorie: { nom: l.categorie_nom, slug: l.categorie_slug },
    date_publication: l.date_publication,
    date_creation: l.date_creation,
    photo: l.photo_principale ? `/photos/${l.photo_principale}` : null,
    url: `/annonces/${l.slug}`,
  };
}

/* ---------- création ---------- */

export async function slugUnique(db, base) {
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const existe = await db.prepare('SELECT 1 FROM annonces WHERE slug = ?').bind(slug).first();
    if (!existe) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function creerAnnonce(db, a) {
  const r = await db
    .prepare(
      `INSERT INTO annonces (titre, slug, description, prix, devise, ville, categorie_id, statut, nom_vendeur, telephone_vendeur)
       VALUES (?, ?, ?, ?, 'XOF', ?, ?, 'en_attente', ?, ?) RETURNING id`
    )
    .bind(a.titre, a.slug, a.description, a.prix, a.ville, a.categorie_id, a.nom_vendeur, a.telephone_vendeur)
    .first();
  return r.id;
}

export async function ajouterPhotos(db, annonceId, cles) {
  if (!cles.length) return;
  const lots = cles.map((cle, i) =>
    db.prepare('INSERT INTO photos_annonces (annonce_id, cle_r2, ordre) VALUES (?, ?, ?)').bind(annonceId, cle, i)
  );
  await db.batch(lots);
}

/* ---------- administration ---------- */

export async function compterParStatut(db) {
  const { results } = await db.prepare('SELECT statut, COUNT(*) AS n FROM annonces GROUP BY statut').all();
  const compte = { en_attente: 0, publiee: 0, rejetee: 0, vendue: 0 };
  for (const l of results) compte[l.statut] = l.n;
  const nonLus = await db.prepare('SELECT COUNT(*) AS n FROM messages_contact WHERE lu = 0').first('n');
  return { ...compte, messages_non_lus: nonLus };
}

export async function listerAnnoncesAdmin(db, statut, page = 1) {
  const params = [];
  let where = '1=1';
  if (statut) { where = 'a.statut = ?'; params.push(statut); }
  const decalage = (Math.max(1, page) - 1) * 20;
  const total = await db.prepare(`SELECT COUNT(*) AS n FROM annonces a WHERE ${where}`).bind(...params).first('n');
  const { results } = await db
    .prepare(
      `SELECT a.*, c.nom AS categorie_nom,
         (SELECT p.cle_r2 FROM photos_annonces p WHERE p.annonce_id = a.id ORDER BY p.ordre LIMIT 1) AS photo_principale
       FROM annonces a JOIN categories c ON c.id = a.categorie_id
       WHERE ${where} ORDER BY a.date_creation DESC LIMIT 20 OFFSET ?`
    )
    .bind(...params, decalage)
    .all();
  return { annonces: results.map((l) => ({ ...l, photo: l.photo_principale ? `/photos/${l.photo_principale}` : null })), total, page, pages: Math.max(1, Math.ceil(total / 20)) };
}

export async function obtenirAnnonceAdmin(db, id) {
  const a = await db
    .prepare('SELECT a.*, c.nom AS categorie_nom FROM annonces a JOIN categories c ON c.id = a.categorie_id WHERE a.id = ?')
    .bind(id)
    .first();
  if (!a) return null;
  const { results: photos } = await db
    .prepare('SELECT id, cle_r2, ordre FROM photos_annonces WHERE annonce_id = ? ORDER BY ordre')
    .bind(id)
    .all();
  return { ...a, photos: photos.map((p) => ({ ...p, url: `/photos/${p.cle_r2}` })) };
}

export async function changerStatut(db, id, statut, motif = null) {
  const datePub = statut === 'publiee' ? "COALESCE(date_publication, strftime('%Y-%m-%dT%H:%M:%fZ','now'))" : 'date_publication';
  const r = await db
    .prepare(`UPDATE annonces SET statut = ?, motif_rejet = ?, date_publication = ${datePub} WHERE id = ?`)
    .bind(statut, statut === 'rejetee' ? motif : null, id)
    .run();
  return r.meta.changes > 0;
}

export async function modifierAnnonce(db, id, a) {
  const r = await db
    .prepare('UPDATE annonces SET titre = ?, description = ?, prix = ?, ville = ?, categorie_id = ?, nom_vendeur = ?, telephone_vendeur = ? WHERE id = ?')
    .bind(a.titre, a.description, a.prix, a.ville, a.categorie_id, a.nom_vendeur, a.telephone_vendeur, id)
    .run();
  return r.meta.changes > 0;
}

export async function clesPhotos(db, annonceId) {
  const { results } = await db.prepare('SELECT cle_r2 FROM photos_annonces WHERE annonce_id = ?').bind(annonceId).all();
  return results.map((p) => p.cle_r2);
}

export async function supprimerAnnonce(db, id) {
  // Les photos sont supprimées en cascade (FK) ; la suppression R2 est faite par l'appelant.
  await db.prepare('DELETE FROM photos_annonces WHERE annonce_id = ?').bind(id).run();
  const r = await db.prepare('DELETE FROM annonces WHERE id = ?').bind(id).run();
  return r.meta.changes > 0;
}

export async function supprimerPhoto(db, annonceId, photoId) {
  const p = await db.prepare('SELECT cle_r2 FROM photos_annonces WHERE id = ? AND annonce_id = ?').bind(photoId, annonceId).first();
  if (!p) return null;
  await db.prepare('DELETE FROM photos_annonces WHERE id = ?').bind(photoId).run();
  return p.cle_r2;
}

/* ---------- messages de contact ---------- */

export async function creerMessage(db, m) {
  await db
    .prepare('INSERT INTO messages_contact (nom, email, telephone, message) VALUES (?, ?, ?, ?)')
    .bind(m.nom, m.email || null, m.telephone || null, m.message)
    .run();
}

export async function listerMessages(db, page = 1) {
  const decalage = (Math.max(1, page) - 1) * 20;
  const total = await db.prepare('SELECT COUNT(*) AS n FROM messages_contact').first('n');
  const { results } = await db
    .prepare('SELECT * FROM messages_contact ORDER BY lu ASC, date_creation DESC LIMIT 20 OFFSET ?')
    .bind(decalage)
    .all();
  return { messages: results, total, page, pages: Math.max(1, Math.ceil(total / 20)) };
}

export async function marquerMessageLu(db, id, lu) {
  const r = await db.prepare('UPDATE messages_contact SET lu = ? WHERE id = ?').bind(lu ? 1 : 0, id).run();
  return r.meta.changes > 0;
}

export async function supprimerMessage(db, id) {
  const r = await db.prepare('DELETE FROM messages_contact WHERE id = ?').bind(id).run();
  return r.meta.changes > 0;
}

/* ---------- admins ---------- */

export async function trouverAdmin(db, identifiant) {
  return db.prepare('SELECT id, identifiant, mot_de_passe_hash FROM admins WHERE identifiant = ?').bind(identifiant).first();
}

/* ---------- sitemap ---------- */

export async function slugsPublies(db) {
  const { results } = await db
    .prepare("SELECT slug, COALESCE(date_publication, date_creation) AS date FROM annonces WHERE statut = 'publiee' ORDER BY date_publication DESC LIMIT 5000")
    .all();
  return results;
}
