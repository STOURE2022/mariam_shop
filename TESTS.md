# Checklist de tests manuels – MARIAM SHOP

Cochez chaque point avant la mise en ligne, puis après chaque déploiement important.
Les tests marqués **(auto)** ont déjà été vérifiés en local par requêtes HTTP lors de la construction du projet ; ils restent à rejouer en production.

## 0. Préparation
- [ ] Clé publique Turnstile réelle dans `site.config.json` (`TURNSTILE_SITE_KEY`) et `npm run build` relancé
- [ ] Secrets `TURNSTILE_SECRET` et `ADMIN_SESSION_SECRET` définis sur le Worker (Variables and Secrets)
- [ ] Schéma et catégories exécutés sur la base distante, au moins un administrateur créé
- [ ] Site accessible en HTTPS sur `https://mariam-shop.touresoumailou19.workers.dev`

## 1. Dépôt d'annonce (page /deposer-une-annonce/)
- [ ] Les listes Catégorie et Ville se remplissent
- [ ] Envoi avec titre < 5 caractères → message d'erreur, champ mis en évidence, pas d'envoi
- [ ] Case « conditions » décochée → erreur
- [ ] Téléphone invalide (ex. « 123 ») → erreur ; « 76 12 34 56 », « +223 76 12 34 56 » → acceptés
- [ ] Ajout de 6 photos → seules 5 acceptées, message d'alerte
- [ ] Ajout d'un fichier PDF renommé en .jpg → refusé **(auto, côté serveur : 422)**
- [ ] Photo de 8 Mo depuis un téléphone → compressée et envoyée sans erreur
- [ ] Bouton « × » retire une photo de l'aperçu
- [ ] Widget Turnstile affiché ; envoi sans validation → message « vérification anti-robot »
- [ ] Envoi complet → message « Votre annonce sera publiée après validation » avec référence MS-N **(auto)**
- [ ] L'annonce n'apparaît PAS dans /annonces/ tant qu'elle n'est pas validée **(auto)**
- [ ] 6e dépôt en moins d'une heure depuis la même connexion → message « Trop de tentatives » (429) **(auto)**
- [ ] Titre avec accents (« Réfrigérateur à Ségou ») → slug `refrigerateur-a-segou` **(auto)**
- [ ] Titre contenant `<script>` → affiché en texte brut, jamais exécuté **(auto)**

## 2. Espace administrateur
### Connexion (/admin/connexion)
- [ ] Mauvais mot de passe → « Identifiant ou mot de passe incorrect » **(auto)**
- [ ] 11 tentatives échouées en 15 min → 429 **(auto)**
- [ ] Bon mot de passe → redirection vers /admin/ **(auto)**
- [ ] Cookie `ms_session` présent avec HttpOnly, Secure, SameSite=Strict (onglet Application des outils de développement)
- [ ] Accès direct à /admin/, /admin/messages, /admin/annonce?id=1 sans session → redirection vers /admin/connexion **(auto)**
- [ ] Appel direct à /api/admin/session sans session → 401 **(auto)**
- [ ] Déconnexion → retour à la connexion, /admin/ redirige à nouveau **(auto)**
- [ ] Session expirée (après 12 h) → redirection vers la connexion

### Tableau de bord (/admin/)
- [ ] Les 5 compteurs (en attente, publiées, rejetées, vendues, messages non lus) sont corrects
- [ ] Les onglets filtrent la liste ; l'URL `?statut=` se met à jour
- [ ] Chaque ligne affiche photo, titre, prix, ville, catégorie, date, nom et téléphone du vendeur (lien `tel:`)
- [ ] **Valider** → annonce passe en « Publiée », compteurs mis à jour, fiche publique accessible **(auto)**
- [ ] **Rejeter** sans motif → impossible (3 caractères min) ; avec motif → statut « Rejetée », motif affiché **(auto)**
- [ ] **Marquer vendue** → confirmation, fiche publique affiche « Vendu », plus de bouton WhatsApp vendeur **(auto)**
- [ ] **Remettre en attente** depuis Rejetée/Vendue → fonctionne
- [ ] **Supprimer** → confirmation, annonce et photos disparaissent (fiche → 404, photo → 404) **(auto)**
- [ ] Appuyer sur Échap ou « Annuler » dans la boîte de dialogue n'effectue aucune action

### Édition (/admin/annonce?id=N)
- [ ] Formulaire pré-rempli (titre, catégorie, ville, description, prix, vendeur)
- [ ] Prix négatif → erreur serveur affichée **(auto)**
- [ ] Modification du titre/prix → « Modifications enregistrées », fiche publique mise à jour **(auto)**
- [ ] Suppression d'une photo → confirmation, photo retirée **(auto)**
- [ ] Les boutons de statut fonctionnent depuis cette page

### Messages (/admin/messages)
- [ ] Liste triée : non lus d'abord
- [ ] Liens mailto:, tel: et WhatsApp corrects
- [ ] « Marquer lu » / « Marquer non lu » → compteur du menu mis à jour **(auto)**
- [ ] Suppression avec confirmation **(auto)**

## 3. Affichage public
### Accueil (/)
- [ ] Bannière, 3 atouts, 6 annonces récentes maximum (ou message « Aucune annonce »)
- [ ] Boutons « Voir les annonces » et « Déposer une annonce » fonctionnent
- [ ] Bandeau cookies affiché à la première visite, disparaît après « J'ai compris » et ne revient pas

### Catalogue (/annonces/)
- [ ] 12 annonces par page, pagination ‹ 1 2 3 ›
- [ ] Filtre catégorie, ville, prix min/max, recherche par mot-clé ; combinables **(auto : API)**
- [ ] L'URL reflète les filtres (ex. `/annonces/?categorie=mode-vetements&ville=Bamako`) et peut être partagée
- [ ] « Réinitialiser » vide les filtres
- [ ] Carte : photo (ou visuel « Pas de photo »), titre, prix « 150 000 FCFA », ville, date

### Fiche (/annonces/slug)
- [ ] Carrousel : flèches, vignettes, compteur « 1 / 3 », balayage tactile, flèches clavier
- [ ] Prix, ville, catégorie, date, référence MS-N, description avec paragraphes conservés
- [ ] « Commander » ouvre WhatsApp vers MARIAM SHOP avec le titre et le lien de l'annonce pré-remplis
- [ ] « Contacter le vendeur sur WhatsApp » ouvre WhatsApp vers le vendeur avec message pré-rempli **(auto)**
- [ ] Le numéro du vendeur n'apparaît nulle part en texte (seulement dans le lien wa.me) **(auto)**
- [ ] Annonce en attente ou rejetée → page 404 **(auto)**
- [ ] Code source : `<title>`, meta description, og:image = première photo, JSON-LD Product **(auto)**
- [ ] Partage du lien sur WhatsApp/Facebook → aperçu avec titre, prix et photo

### Autres pages
- [ ] /services/ : 6 services, liens WhatsApp et contact
- [ ] /a-propos/ : coordonnées, lien Google Maps, formulaire de contact
- [ ] /mentions-legales/ : raison sociale MARIAM SHOP, entreprise individuelle, Mariam Touré, adresse, téléphone ; ancre #conditions
- [ ] /page-inexistante → page 404 personnalisée **(auto)**
- [ ] /sitemap.xml liste les pages et les annonces publiées ; /robots.txt pointe vers le sitemap **(auto)**

## 4. Formulaire de contact (/a-propos/#contact)
- [ ] Nom manquant, message < 10 caractères → erreurs locales
- [ ] Ni e-mail ni téléphone → erreur « Indiquez au moins un e-mail ou un numéro » **(auto)**
- [ ] Envoi valide → message de succès, formulaire vidé, message visible dans /admin/messages **(auto)**
- [ ] Accents et caractères spéciaux conservés (« Aïcha Koné », « à Ségou ») **(auto)**
- [ ] 6e envoi en moins d'une heure → 429 **(auto)**

## 5. Sécurité
- [ ] En-têtes présents sur une page statique ET sur une fiche (Worker) : Content-Security-Policy, X-Frame-Options: DENY, Referrer-Policy, Strict-Transport-Security, X-Content-Type-Options **(auto)**
- [ ] Aucune erreur CSP dans la console du navigateur (y compris avec le widget Turnstile)
- [ ] Le site refuse d'être affiché dans une iframe externe
- [ ] /api/annonces ne contient ni `telephone_vendeur` ni `nom_vendeur` **(auto)**
- [ ] /photos/… d'une annonce non publiée → 404 pour un visiteur, 200 pour l'admin **(auto)**
- [ ] Requête admin modifiante avec en-tête Origin étranger → 403 **(auto)**
- [ ] Test sur https://securityheaders.com → note A ou A+
- [ ] Aucune trace technique (stack) dans les réponses d'erreur **(auto : message générique)**

## 6. Mobile et performance
- [ ] Test sur un téléphone Android d'entrée de gamme en 3G : accueil affiché en moins de 2 s (vérifier aussi Lighthouse mobile, profil « Slow 4G » : Performance ≥ 90)
- [ ] Menu hamburger : ouverture/fermeture, fermeture avec Échap, focus visible
- [ ] Tous les boutons et liens ont une zone tactile ≥ 44 px
- [ ] Formulaires utilisables au clavier (Tab), labels lus par un lecteur d'écran, erreurs annoncées (`role="alert"`)
- [ ] Contraste : texte vert sur crème et or sur vert ≥ 4,5:1 (vérifier avec l'outil de contraste des DevTools)
- [ ] Photos : WebP ou JPEG < 500 Ko après compression, lazy loading effectif (onglet Réseau)
- [ ] Affichage correct à 320 px, 768 px et 1280 px de large ; aucun défilement horizontal
- [ ] Page fiche : première photo nette, carrousel utilisable au doigt

## 7. Après mise en production
- [ ] Soumettre `https://mariam-shop.touresoumailou19.workers.dev/sitemap.xml` dans Google Search Console
- [ ] Vérifier l'aperçu de partage avec https://developers.facebook.com/tools/debug/
- [ ] Activer une règle Rate Limiting WAF (voir README §5.4)
- [ ] Sauvegarde : `npx wrangler d1 export mariam-shop-db --remote --output=sauvegarde.sql` planifiée régulièrement
