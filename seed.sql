-- ===========================================================================
-- MARIAM SHOP — Données initiales (catégories de base)
-- Exécuter : npx wrangler d1 execute mariam-shop-db --remote --file=./seed.sql
-- Ce script est idempotent (INSERT OR IGNORE).
-- Pour créer un administrateur : voir README.md, section « Ajouter un administrateur ».
-- ===========================================================================

INSERT OR IGNORE INTO categories (nom, slug) VALUES
  ('Téléphones & accessoires', 'telephones-accessoires'),
  ('Informatique & électronique', 'informatique-electronique'),
  ('Mode & vêtements', 'mode-vetements'),
  ('Beauté & cosmétiques', 'beaute-cosmetiques'),
  ('Maison & électroménager', 'maison-electromenager'),
  ('Alimentation & produits locaux', 'alimentation-produits-locaux'),
  ('Véhicules & pièces', 'vehicules-pieces'),
  ('Immobilier & location', 'immobilier-location'),
  ('Services & prestations', 'services-prestations'),
  ('Emploi & formation', 'emploi-formation'),
  ('Enfants & bébés', 'enfants-bebes'),
  ('Autres', 'autres');
