-- ===========================================================================
-- MARIAM SHOP — Schéma de base de données Cloudflare D1 (SQLite)
-- Exécuter : npx wrangler d1 execute mariam-shop-db --remote --file=./schema.sql
-- (ajouter --local pour la base locale de développement)
-- ===========================================================================

PRAGMA foreign_keys = ON;

-- Catégories d'annonces
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nom           TEXT    NOT NULL,
  slug          TEXT    NOT NULL UNIQUE
);

-- Annonces déposées par les visiteurs, validées par l'administrateur
CREATE TABLE IF NOT EXISTS annonces (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  titre              TEXT    NOT NULL,
  slug               TEXT    NOT NULL UNIQUE,
  description        TEXT    NOT NULL,
  prix               INTEGER NOT NULL CHECK (prix >= 0),
  devise             TEXT    NOT NULL DEFAULT 'XOF',
  ville              TEXT    NOT NULL,
  categorie_id       INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  statut             TEXT    NOT NULL DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente', 'publiee', 'rejetee', 'vendue')),
  -- Données personnelles du vendeur : JAMAIS renvoyées par les API publiques
  nom_vendeur        TEXT    NOT NULL,
  telephone_vendeur  TEXT    NOT NULL,
  date_creation      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  date_publication   TEXT,
  motif_rejet        TEXT
);

CREATE INDEX IF NOT EXISTS idx_annonces_statut_date ON annonces(statut, date_publication DESC);
CREATE INDEX IF NOT EXISTS idx_annonces_categorie    ON annonces(categorie_id);
CREATE INDEX IF NOT EXISTS idx_annonces_ville        ON annonces(ville);

-- Photos stockées dans R2 ; cle_r2 est la clé de l'objet dans le bucket
CREATE TABLE IF NOT EXISTS photos_annonces (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  annonce_id  INTEGER NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
  cle_r2      TEXT    NOT NULL UNIQUE,
  ordre       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_photos_annonce ON photos_annonces(annonce_id, ordre);

-- Messages reçus via le formulaire de contact
CREATE TABLE IF NOT EXISTS messages_contact (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT    NOT NULL,
  email          TEXT,
  telephone      TEXT,
  message        TEXT    NOT NULL,
  date_creation  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  lu             INTEGER NOT NULL DEFAULT 0 CHECK (lu IN (0, 1))
);

-- Comptes administrateurs (mot de passe haché PBKDF2-SHA256 via Web Crypto)
CREATE TABLE IF NOT EXISTS admins (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant        TEXT    NOT NULL UNIQUE,
  mot_de_passe_hash  TEXT    NOT NULL,
  date_creation      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Compteurs de limitation de débit (par IP et par action, fenêtre fixe)
CREATE TABLE IF NOT EXISTS limites_debit (
  cle         TEXT    PRIMARY KEY,   -- ex : "annonce:1.2.3.4"
  compteur    INTEGER NOT NULL DEFAULT 0,
  expire_le   INTEGER NOT NULL        -- timestamp Unix (secondes) de fin de fenêtre
);

-- Transactions de paiement (phase 2, Orange Money WebPay).
-- Table prête mais inutilisée tant que PAIEMENT_ACTIF = "false".
CREATE TABLE IF NOT EXISTS paiements (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  annonce_id       INTEGER REFERENCES annonces(id) ON DELETE SET NULL,
  reference        TEXT    NOT NULL UNIQUE,   -- order_id transmis à Orange Money
  montant          INTEGER NOT NULL,
  devise           TEXT    NOT NULL DEFAULT 'XOF',
  statut           TEXT    NOT NULL DEFAULT 'initie'
                   CHECK (statut IN ('initie', 'en_attente', 'reussi', 'echoue', 'annule')),
  fournisseur      TEXT    NOT NULL DEFAULT 'orange_money',
  pay_token        TEXT,
  notif_token      TEXT,
  telephone_client TEXT,
  date_creation    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  date_maj         TEXT
);
