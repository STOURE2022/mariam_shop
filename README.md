# MARIAM SHOP – site web et plateforme d'annonces

Site vitrine, catalogue d'annonces validées et espace administrateur pour **MARIAM SHOP**, entreprise individuelle au Mali. Interface en français, prix en FCFA, pensé pour le mobile et les connexions 3G.

**Pile technique (100 % Cloudflare, aucun service payant tiers)**

| Brique | Technologie |
|---|---|
| Frontend | HTML, CSS et JavaScript vanilla (aucun framework, aucune dépendance) |
| Hébergement | Cloudflare Pages |
| Backend | Cloudflare Pages Functions (Workers) |
| Base de données | Cloudflare D1 (SQLite) |
| Photos | Cloudflare R2 |
| Anti-spam | Cloudflare Turnstile |
| Paiement (phase 2) | Orange Money WebPay Mali – stub prêt, désactivé |

---

## 1. Arborescence du projet

```
mariam_shop/
├── public/                         # Fichiers statiques (copiés dans dist/ au build)
│   ├── index.html                  # Accueil
│   ├── annonces/index.html         # Catalogue (filtres, recherche, pagination)
│   ├── deposer-une-annonce/index.html
│   ├── services/index.html
│   ├── a-propos/index.html         # Présentation + formulaire de contact
│   ├── mentions-legales/index.html # Mentions légales + conditions + données personnelles
│   ├── 404.html
│   ├── admin/                      # Espace administrateur (pages protégées par middleware)
│   │   ├── connexion.html          # /admin/connexion
│   │   ├── index.html              # /admin/  (tableau de bord)
│   │   ├── annonce.html            # /admin/annonce?id=N  (édition)
│   │   └── messages.html           # /admin/messages
│   ├── assets/
│   │   ├── css/style.css           # Feuille de style unique, mobile first
│   │   ├── js/                     # app.js (commun), accueil, annonces, fiche, deposer, contact, connexion, admin
│   │   └── img/                    # logo.svg, favicon.svg, placeholder.svg, og-default.png
│   ├── _headers                    # En-têtes de sécurité des fichiers statiques
│   ├── _routes.json                # Chemins traités par les Functions
│   └── robots.txt
├── functions/                      # Cloudflare Pages Functions (routage par fichiers)
│   ├── _middleware.js              # En-têtes de sécurité + gestion d'erreurs globale
│   ├── annonces/[slug].js          # Fiche annonce rendue côté serveur (SEO, JSON-LD Product)
│   ├── photos/[[cle]].js           # Sert les photos depuis R2 (contrôle de visibilité)
│   ├── sitemap.xml.js              # Sitemap dynamique
│   ├── admin/_middleware.js        # Protège les pages /admin/* (redirection si pas de session)
│   └── api/
│       ├── categories.js           # GET catégories + villes
│       ├── contact.js              # POST formulaire de contact
│       ├── annonces/index.js       # GET liste publique / POST dépôt d'annonce
│       ├── annonces/[slug].js      # GET fiche publique (JSON)
│       ├── paiement/initier.js     # Stub Orange Money (phase 2)
│       ├── paiement/callback.js    # Stub notification Orange Money (phase 2)
│       └── admin/
│           ├── _middleware.js      # Exige une session valide (+ contrôle Origin)
│           ├── connexion.js        # POST connexion
│           ├── deconnexion.js      # POST déconnexion
│           ├── session.js          # GET admin connecté + compteurs
│           ├── annonces/index.js   # GET liste par statut
│           ├── annonces/[id].js    # GET / PUT / PATCH (statut) / DELETE
│           ├── annonces/[id]/photos/[photoId].js  # DELETE photo
│           ├── messages/index.js   # GET messages de contact
│           └── messages/[id].js    # PATCH lu / DELETE
├── src/lib/                        # Code partagé par les Functions
│   ├── db.js                       # Requêtes D1 paramétrées
│   ├── securite.js                 # PBKDF2, sessions HMAC, cookies
│   ├── validation.js               # Validation serveur de toutes les entrées
│   ├── turnstile.js                # Vérification Turnstile
│   ├── limite.js                   # Limitation de débit (D1)
│   ├── reponse.js                  # Réponses JSON/HTML, en-têtes de sécurité
│   └── html.js                     # Gabarit HTML serveur, échappement
├── scripts/
│   ├── build.mjs                   # public/ → dist/ avec remplacement des {{JETONS}}
│   ├── hash-password.mjs           # Génère le hash d'un mot de passe admin
│   └── generer-og.mjs              # Génère l'image Open Graph par défaut
├── schema.sql                      # Schéma D1
├── seed.sql                        # Catégories de base
├── site.config.json                # Coordonnées et textes publics (source unique)
├── wrangler.toml                   # Configuration Cloudflare (bindings D1, R2, variables)
├── .dev.vars.example               # Modèle de secrets pour le développement local
├── package.json
├── README.md
└── TESTS.md                        # Checklist de tests manuels
```

---

## 2. Avant de commencer : informations à remplacer

Toutes les informations publiques sont centralisées dans **`site.config.json`**. Remplacez les valeurs entre crochets :

| Clé | À renseigner |
|---|---|
| `SITE_URL` | `https://mariam-shop.pages.dev` (adresse gratuite Pages). À remplacer par le domaine personnalisé le jour où il est ajouté (§4.5), sans « / » final. |
| `SITE_EMAIL` | `alertes223@gmail.com` — déjà renseigné |
| `SITE_TELEPHONE` / `SITE_TELEPHONE_2` | Déjà renseignés depuis le certificat d'immatriculation (77 05 56 52 et 60 53 21 31). Le premier sert aux liens WhatsApp. |
| `SITE_TELEPHONE_INTERNATIONAL` | Même numéro sans espaces ni « + » (`22377055652`) |
| `SITE_ADRESSE`, `SITE_VILLE` | Siège social (Siracoro Méguétana, Kati) — déjà renseignés |
| `RAISON_SOCIALE`, `NINA`, `RCCM`, `DATE_RCCM`, `ACTIVITE` | Données du certificat d'immatriculation, affichées dans les mentions légales — déjà renseignées |
| `SITE_HORAIRES` | Horaires d'ouverture (valeur par défaut : lundi – samedi, 8h – 19h) |
| `TURNSTILE_SITE_KEY` | Clé **publique** Turnstile (voir §5.3). La valeur par défaut est une clé de test qui accepte tout. |
| `ANNEE` | Année affichée dans le pied de page |

Après modification, relancez `npm run build`.

> La palette (vert profond + or) se règle dans les variables `:root` au début de `public/assets/css/style.css`. Le logo est `public/assets/img/logo.svg` ; l'image de partage `og-default.png` peut être remplacée par un visuel 1200×630.

---

## 3. Installation locale

Prérequis : **Node.js ≥ 18** et un compte Cloudflare (gratuit). Wrangler s'exécute via `npx`.

```bash
# 1. Dépendances (wrangler)
npm install

# 2. Secrets de développement
cp .dev.vars.example .dev.vars
#    → éditez ADMIN_SESSION_SECRET (64 caractères aléatoires) ; la clé Turnstile de test fournie accepte tout.

# 3. Base de données locale (schéma + catégories)
npm run db:init:local

# 4. Premier administrateur local
node scripts/hash-password.mjs "VotreMotDePasseSolide"
npx wrangler d1 execute mariam-shop-db --local --command "INSERT INTO admins (identifiant, mot_de_passe_hash) VALUES ('mariam', '<hash affiché>');"

# 5. Lancer le site
npm run dev
#    → http://127.0.0.1:8788   (admin : http://127.0.0.1:8788/admin/connexion)
```

`npm run dev` construit `dist/` puis lance `wrangler pages dev ./dist` avec les bindings de `wrangler.toml` (D1 et R2 simulés localement dans `.wrangler/`).

---

## 4. Déploiement sur Cloudflare

### 4.1 Connexion

```bash
npx wrangler login
```

### 4.2 Créer la base D1 et le bucket R2

```bash
npx wrangler d1 create mariam-shop-db
```

Copiez le `database_id` affiché dans `wrangler.toml` (ligne `database_id = "..."`), puis :

```bash
npx wrangler d1 execute mariam-shop-db --remote --file=./schema.sql
npx wrangler d1 execute mariam-shop-db --remote --file=./seed.sql
npx wrangler r2 bucket create mariam-shop-photos
```

### 4.3 Créer le projet Pages et déployer

```bash
npm run build
npx wrangler pages project create mariam-shop --production-branch=main   # première fois seulement
npx wrangler pages deploy ./dist
```

Les bindings D1 (`DB`) et R2 (`PHOTOS`) déclarés dans `wrangler.toml` sont appliqués automatiquement au projet Pages lors du déploiement.

> Alternative : connecter un dépôt Git dans le tableau de bord Pages avec la commande de build `npm run build` et le dossier de sortie `dist`. Chaque `git push` déploie alors automatiquement.

### 4.4 Variables d'environnement et secrets

Dans **Cloudflare Dashboard → Workers & Pages → mariam-shop → Settings → Environment variables** (production), ou en ligne de commande :

```bash
npx wrangler pages secret put TURNSTILE_SECRET
npx wrangler pages secret put ADMIN_SESSION_SECRET
```

| Variable | Type | Obligatoire | Description |
|---|---|---|---|
| `TURNSTILE_SECRET` | Secret | **Oui** | Clé secrète Turnstile. Sans elle, les formulaires publics refusent tout envoi. |
| `ADMIN_SESSION_SECRET` | Secret | **Oui** | Chaîne aléatoire ≥ 32 caractères signant les cookies de session admin. Générer : `openssl rand -hex 32` |
| `ENVIRONNEMENT` | Texte | Non | `production` (défaut dans wrangler.toml). Force le drapeau `Secure` des cookies. |
| `ADMIN_SESSION_DUREE` | Texte | Non | Durée de session en secondes (défaut `43200` = 12 h) |
| `LIMITE_ANNONCES_PAR_HEURE` | Texte | Non | Dépôts d'annonces max par IP et par heure (défaut `5`) |
| `LIMITE_CONTACT_PAR_HEURE` | Texte | Non | Messages de contact max par IP et par heure (défaut `5`) |
| `LIMITE_CONNEXION_PAR_QUART_HEURE` | Texte | Non | Tentatives de connexion admin par IP / 15 min (défaut `10`) |
| `PAIEMENT_ACTIF` | Texte | Non | `false` (défaut). Passer à `true` uniquement en phase 2 avec les clés ci-dessous. |
| `ORANGE_MONEY_MERCHANT_KEY` | Secret | Phase 2 | Clé marchand Orange Money Mali |
| `ORANGE_MONEY_CLIENT_ID` | Secret | Phase 2 | Identifiant OAuth (developer.orange.com) |
| `ORANGE_MONEY_CLIENT_SECRET` | Secret | Phase 2 | Secret OAuth |
| `ORANGE_MONEY_URL_API` | Texte | Phase 2 | `https://api.orange.com` |

Après avoir ajouté des variables, redéployez (`npx wrangler pages deploy ./dist`) pour qu'elles soient prises en compte.

### 4.5 Domaine personnalisé (plus tard)

Le site démarre sur l'adresse gratuite `https://mariam-shop.pages.dev` : rien à configurer, HTTPS inclus. Le nom `mariam-shop` doit être disponible lors de `wrangler pages project create` ; sinon choisissez un autre nom et reportez-le dans `wrangler.toml` (`name`) et `site.config.json` (`SITE_URL`). Le jour où vous achetez un domaine :

1. Dans **Workers & Pages → mariam-shop → Custom domains → Set up a custom domain**, saisissez `[DOMAINE]` (ex. `mariamshop.ml`) puis `www.[DOMAINE]`.
2. Si le domaine est déjà géré par Cloudflare (DNS sur Cloudflare), l'enregistrement CNAME est créé automatiquement. Sinon, ajoutez chez votre registrar un `CNAME` pointant vers `mariam-shop.pages.dev` (ou transférez d'abord la zone DNS vers Cloudflare, recommandé).
3. Le certificat HTTPS est émis automatiquement (quelques minutes).
4. Mettez à jour `SITE_URL` dans `site.config.json`, relancez `npm run build` et redéployez : les balises canoniques, Open Graph, le sitemap et robots.txt utiliseront le bon domaine.
5. Dans **Turnstile**, ajoutez le domaine à la liste des hostnames autorisés du widget.
6. Facultatif : **Rules → Redirect Rules** pour rediriger `www.` vers le domaine nu (ou l'inverse).

---

## 5. Configuration de la sécurité

### 5.1 Ajouter un administrateur

Les mots de passe sont hachés en PBKDF2-SHA256 (310 000 itérations, sel aléatoire) via Web Crypto. Il n'existe volontairement **aucune route d'inscription** : les comptes se créent en ligne de commande.

```bash
node scripts/hash-password.mjs "MotDePasseTresSolide2026!"
# → pbkdf2$310000$<sel>$<hash>

npx wrangler d1 execute mariam-shop-db --remote --command "INSERT INTO admins (identifiant, mot_de_passe_hash) VALUES ('mariam', 'pbkdf2$310000$<sel>$<hash>');"
```

Changer un mot de passe : `UPDATE admins SET mot_de_passe_hash = '<nouveau hash>' WHERE identifiant = 'mariam';`
Supprimer un compte : `DELETE FROM admins WHERE identifiant = 'ancien';`
Révoquer toutes les sessions en cours : changez `ADMIN_SESSION_SECRET` et redéployez.

### 5.2 Ce que fait le code

- Requêtes SQL **toutes paramétrées** (`.bind()`), aucune concaténation de valeurs utilisateur.
- Validation serveur de chaque champ (longueurs, format du téléphone malien, ville dans la liste, prix entier ≥ 0).
- Images : type réel vérifié par **signature binaire** (JPEG/PNG/WebP), 5 Mo max par photo, 5 photos max.
- Turnstile obligatoire sur dépôt d'annonce et contact ; champ « pot de miel » supplémentaire sur le contact.
- Limitation de débit par IP en D1 (table `limites_debit`) sur annonces, contact et connexion admin.
- Session admin : cookie `HttpOnly; Secure; SameSite=Strict`, jeton signé HMAC-SHA256 avec expiration. Contrôle de l'en-tête `Origin` sur les requêtes modifiantes.
- En-têtes : CSP stricte (aucun script inline), `X-Frame-Options: DENY`, `Referrer-Policy`, `HSTS`, `X-Content-Type-Options`, `Permissions-Policy`.
- Échappement HTML systématique côté serveur (`echapper()`) et côté client (`MS.echapper()`).
- Les API publiques ne renvoient **jamais** `nom_vendeur` ni `telephone_vendeur`. Seul un lien `wa.me` est fourni pour une annonce **publiée** ; il disparaît dès qu'elle est vendue.
- Les photos d'une annonce non publiée ne sont servies qu'à un administrateur connecté.

### 5.3 Turnstile

1. Dashboard Cloudflare → **Turnstile → Add widget**, mode « Managed », hostnames : votre domaine (+ `localhost` pour les tests).
2. Copiez la **Site key** dans `site.config.json` (`TURNSTILE_SITE_KEY`) puis `npm run build`.
3. Mettez la **Secret key** dans la variable `TURNSTILE_SECRET` (secret Pages).

Pour le développement local, les clés de test `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` acceptent toujours.

### 5.4 Limitation de débit côté Cloudflare (recommandé en plus)

Dashboard → **Security → WAF → Rate limiting rules** : par exemple `URI Path contains "/api/"` et méthode `POST`, 20 requêtes / 10 s par IP → bloquer 1 min. Le plan gratuit inclut une règle.

---

## 6. Fonctionnement

### Cycle de vie d'une annonce

```
Visiteur dépose  →  en_attente  →  [admin] publiee  →  [admin] vendue
                                 ↘  [admin] rejetee (avec motif)
```

- `en_attente` / `rejetee` : invisible au public (fiche → 404, photos → 404).
- `publiee` : visible, boutons « Commander » (WhatsApp MARIAM SHOP) et « Contacter le vendeur sur WhatsApp ».
- `vendue` : fiche encore visible avec badge « Vendu », sans aucun lien vers le vendeur.
- Un administrateur peut aussi remettre une annonce en attente, la modifier, supprimer des photos ou supprimer l'annonce (D1 + R2).

### Optimisation pour la 3G

- Pages HTML ≈ 7 Ko, CSS ≈ 23 Ko, JS commun ≈ 5 Ko (avant compression Brotli par Cloudflare : ≈ 12 Ko au total).
- Aucune police externe, aucune bibliothèque ; un seul script tiers (Turnstile) uniquement sur les pages de formulaire.
- Photos **compressées côté client** (redimensionnées à 1600 px max, converties en WebP) avant envoi, puis servies avec cache d'un an depuis R2 via le CDN Cloudflare.
- `loading="lazy"` sur toutes les images hors écran, `fetchpriority="high"` sur la première photo de la fiche.

### SEO

- `title`, `meta description`, `canonical`, Open Graph sur chaque page ; fiche annonce rendue côté serveur.
- URL propres : `/annonces/slug-de-l-annonce` (slug ASCII généré du titre, accents supprimés, suffixe en cas de doublon).
- `/sitemap.xml` dynamique (pages + annonces publiées), `robots.txt` excluant admin/API/photos.
- JSON-LD `LocalBusiness` (accueil, à propos), `Product` + `Offer` (fiche), `ItemList` (services).

---

## 7. Paiement Orange Money (phase 2, non activé)

Les routes `POST /api/paiement/initier` et `POST /api/paiement/callback` existent avec le flux complet documenté en commentaires (OAuth2, création de transaction WebPay, notification, idempotence). La table `paiements` est déjà créée par `schema.sql`.

Pour activer : obtenir les identifiants marchands auprès d'Orange Mali, renseigner les 4 variables `ORANGE_MONEY_*` en secrets, décommenter le bloc marqué `TODO phase 2` dans `functions/api/paiement/initier.js`, créer les pages `/paiement/retour` et `/paiement/annule`, puis passer `PAIEMENT_ACTIF` à `true`. Aucune clé ne doit jamais figurer dans le code.

---

## 8. Hypothèses prises

- **Palette** : vert profond `#14532d` et or `#d4a017` sur fond crème, selon la suggestion du cahier des charges.
- **Villes** : liste fixe des régions du Mali + « Autre » (modifiable dans `src/lib/validation.js`, constante `VILLES`).
- **Téléphone** : format malien à 8 chiffres accepté avec ou sans `+223` ; stocké en international sans « + ».
- **Conversion WebP** : réalisée dans le navigateur (les Workers ne transforment pas d'images sans le service payant Cloudflare Images) ; JPEG/PNG restent acceptés en secours.
- **Conditions d'utilisation** : intégrées à la page Mentions légales (ancre `#conditions`) plutôt qu'une page séparée.
- **Mentions légales** : seule Mariam Touré est citée comme responsable ; aucun co-gérant n'est mentionné.
- **Annonce vendue** : la fiche reste consultable (avec badge) pour ne pas casser les liens partagés ; le contact vendeur est retiré.
- **Catégories** : 12 catégories de base dans `seed.sql`, modifiables en SQL (pas d'interface d'édition des catégories en v1).

## 9. Commandes utiles

| Commande | Effet |
|---|---|
| `npm run build` | Génère `dist/` à partir de `public/` et `site.config.json` |
| `npm run dev` | Build + serveur local sur le port 8788 |
| `npm run deploy` | Build + déploiement Pages |
| `npm run db:init:local` / `db:init:remote` | Schéma + catégories (local / production) |
| `npm run admin:hash -- "motdepasse"` | Hash PBKDF2 d'un mot de passe |
| `node scripts/generer-og.mjs` | Régénère l'image Open Graph par défaut |
| `npx wrangler d1 execute mariam-shop-db --remote --command "SELECT ..."` | Requête SQL sur la production |
| `npx wrangler pages deployment tail` | Journaux en direct des Functions |
