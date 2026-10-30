// ===========================================================================
// Rendu HTML côté serveur (fiche annonce, pages d'erreur) : échappement
// systématique et gabarit partagé avec les pages statiques.
// ===========================================================================
import config from '../../site.config.json';

export const SITE = config;

export function echapper(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Transforme un texte brut en paragraphes HTML échappés. */
export function paragraphes(texte) {
  return String(texte ?? '')
    .split(/\n{2,}/)
    .map((p) => `<p>${echapper(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function formaterPrix(prix) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(prix) || 0).replace(/\u202f|\u00a0/g, ' ') + ' FCFA';
}

export function formaterDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Bamako' }).format(d);
}

export function lienWhatsapp(numero, message) {
  return `https://wa.me/${encodeURIComponent(numero)}?text=${encodeURIComponent(message)}`;
}

/**
 * Gabarit de page complet. `options` : { titre, description, canonique, image, corps, jsonLd, typeOg, scripts }
 */
export function page(o) {
  const s = SITE;
  const titre = echapper(o.titre ? `${o.titre} – ${s.SITE_NOM}` : s.SITE_NOM);
  const description = echapper(o.description || s.SITE_DESCRIPTION);
  const canonique = echapper(o.canonique || s.SITE_URL);
  const image = echapper(o.image || `${s.SITE_URL}/assets/img/og-default.png`);
  const scripts = (o.scripts || []).map((src) => `<script src="${echapper(src)}" defer></script>`).join('\n  ');
  const jsonLd = o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd).replace(/</g, '\\u003c')}</script>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titre}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonique}">
  <meta property="og:type" content="${echapper(o.typeOg || 'website')}">
  <meta property="og:site_name" content="${echapper(s.SITE_NOM)}">
  <meta property="og:title" content="${titre}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonique}">
  <meta property="og:image" content="${image}">
  <meta property="og:locale" content="fr_ML">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#14532d">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/style.css">
  ${jsonLd}
  <script src="/assets/js/app.js" defer></script>
  ${scripts}
</head>
<body>
<a class="lien-evitement" href="#contenu">Aller au contenu</a>
<header class="entete">
  <div class="conteneur entete__barre">
    <a class="logo" href="/" aria-label="${echapper(s.SITE_NOM)} – accueil">
      <img src="/assets/img/logo.svg" width="40" height="40" alt="">
      <span>${echapper(s.SITE_NOM)}</span>
    </a>
    <button class="menu-bouton" type="button" aria-expanded="false" aria-controls="menu-principal" data-menu-bouton>
      <span class="menu-bouton__barres" aria-hidden="true"></span>
      <span class="visuellement-cache">Menu</span>
    </button>
    <nav id="menu-principal" class="menu" aria-label="Navigation principale">
      <a href="/">Accueil</a>
      <a href="/annonces/" ${o.nav === 'annonces' ? 'aria-current="page"' : ''}>Annonces</a>
      <a href="/services/">Services</a>
      <a href="/a-propos/">À propos &amp; contact</a>
      <a class="bouton bouton--or" href="/deposer-une-annonce/">Déposer une annonce</a>
    </nav>
  </div>
</header>
<main id="contenu" class="principal">
${o.corps}
</main>
<footer class="pied">
  <div class="conteneur pied__grille">
    <div>
      <p class="pied__titre">${echapper(s.SITE_NOM)}</p>
      <p>${echapper(s.SITE_SLOGAN)}</p>
      <p>${echapper(s.SITE_ADRESSE)}</p>
    </div>
    <div>
      <p class="pied__titre">Contact</p>
      <p><a href="tel:+${echapper(s.SITE_TELEPHONE_INTERNATIONAL)}">${echapper(s.SITE_TELEPHONE)}</a> / <a href="tel:+${echapper(s.SITE_TELEPHONE_2_INTERNATIONAL)}">${echapper(s.SITE_TELEPHONE_2)}</a></p>
      <p><a href="https://wa.me/${echapper(s.SITE_TELEPHONE_INTERNATIONAL)}" rel="noopener" target="_blank">WhatsApp</a></p>
      <p><a href="mailto:${echapper(s.SITE_EMAIL)}">${echapper(s.SITE_EMAIL)}</a></p>
    </div>
    <div>
      <p class="pied__titre">Informations</p>
      <p><a href="/services/">Nos services</a></p>
      <p><a href="/a-propos/">À propos &amp; contact</a></p>
      <p><a href="/mentions-legales/">Mentions légales</a></p>
      <p><a href="/mentions-legales/#conditions">Conditions d'utilisation</a></p>
    </div>
  </div>
  <p class="pied__copyright">© ${echapper(s.ANNEE)} ${echapper(s.SITE_NOM)} – ${echapper(s.FORME_JURIDIQUE)}, Mali. Tous droits réservés.</p>
</footer>
<div class="bandeau-cookies" role="region" aria-label="Information sur les cookies" hidden data-bandeau-cookies>
  <p>Ce site n'utilise que des cookies techniques indispensables (session administrateur, sécurité). Aucun cookie publicitaire ni de suivi.</p>
  <button type="button" class="bouton bouton--petit" data-cookies-ok>J'ai compris</button>
</div>
</body>
</html>`;
}

export function pageErreur(statut, titre, message) {
  return page({
    titre,
    description: message,
    corps: `<section class="conteneur section section--etroite centre">
      <p class="erreur-code">${statut}</p>
      <h1>${echapper(titre)}</h1>
      <p>${echapper(message)}</p>
      <p><a class="bouton" href="/annonces/">Voir les annonces</a> <a class="bouton bouton--secondaire" href="/">Retour à l'accueil</a></p>
    </section>`,
  });
}
