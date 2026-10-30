// ===========================================================================
// GET /annonces/:slug — fiche annonce rendue côté serveur (SEO : title, meta,
// Open Graph, JSON-LD Product). Le téléphone du vendeur n'apparaît que dans
// le lien WhatsApp, et uniquement pour une annonce publiée.
// ===========================================================================
import { obtenirAnnoncePublique } from '../../src/lib/db.js';
import { html } from '../../src/lib/reponse.js';
import { page, pageErreur, echapper, paragraphes, formaterPrix, formaterDate, lienWhatsapp, SITE } from '../../src/lib/html.js';

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '');
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return html(pageErreur(404, 'Annonce introuvable', "Cette annonce n'existe pas ou n'est plus disponible."), 404);
  }

  const a = await obtenirAnnoncePublique(env.DB, slug);
  if (!a) {
    return html(pageErreur(404, 'Annonce introuvable', "Cette annonce n'existe pas, n'est pas encore validée ou a été retirée."), 404);
  }

  const urlFiche = `${SITE.SITE_URL}/annonces/${a.slug}`;
  const vendue = a.statut === 'vendue';
  const photos = a.photos.length ? a.photos : ['/assets/img/placeholder.svg'];
  const imageOg = a.photos.length ? `${SITE.SITE_URL}${a.photos[0]}` : undefined;

  const lienVendeur = a.whatsapp_vendeur
    ? lienWhatsapp(a.whatsapp_vendeur, `Bonjour, je suis intéressé(e) par votre annonce « ${a.titre} » vue sur ${SITE.SITE_NOM} : ${urlFiche}`)
    : null;
  const lienCommander = lienWhatsapp(SITE.SITE_TELEPHONE_INTERNATIONAL, `Bonjour ${SITE.SITE_NOM}, je souhaite commander « ${a.titre} » (${urlFiche}).`);

  const diapositives = photos
    .map(
      (src, i) => `<li class="carrousel__diapo" ${i > 0 ? 'hidden' : ''} data-index="${i}">
        <img src="${echapper(src)}" alt="${echapper(a.titre)} – photo ${i + 1}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} width="800" height="600">
      </li>`
    )
    .join('');
  const vignettes = photos.length > 1
    ? `<div class="carrousel__vignettes" role="tablist" aria-label="Choisir une photo">${photos
        .map((src, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-aller="${i}"><img src="${echapper(src)}" alt="" loading="lazy" width="80" height="60"></button>`)
        .join('')}</div>`
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: a.titre,
    description: a.description.slice(0, 500),
    image: a.photos.map((p) => `${SITE.SITE_URL}${p}`),
    category: a.categorie.nom,
    url: urlFiche,
    offers: {
      '@type': 'Offer',
      price: a.prix,
      priceCurrency: 'XOF',
      availability: vendue ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: urlFiche,
      areaServed: { '@type': 'Country', name: 'Mali' },
      seller: { '@type': 'Organization', name: SITE.SITE_NOM },
    },
  };

  const corps = `
<nav class="conteneur fil-ariane" aria-label="Fil d'Ariane">
  <a href="/">Accueil</a> › <a href="/annonces/">Annonces</a> › <a href="/annonces/?categorie=${echapper(a.categorie.slug)}">${echapper(a.categorie.nom)}</a>
</nav>
<article class="conteneur fiche">
  <div class="fiche__galerie">
    <div class="carrousel" data-carrousel>
      <ul class="carrousel__liste">${diapositives}</ul>
      ${photos.length > 1 ? `
      <button type="button" class="carrousel__fleche carrousel__fleche--prec" data-prec aria-label="Photo précédente">‹</button>
      <button type="button" class="carrousel__fleche carrousel__fleche--suiv" data-suiv aria-label="Photo suivante">›</button>
      <p class="carrousel__compteur" aria-live="polite"><span data-compteur>1</span> / ${photos.length}</p>` : ''}
    </div>
    ${vignettes}
  </div>
  <div class="fiche__infos">
    ${vendue ? '<p class="badge badge--vendu">Vendu</p>' : ''}
    <h1 class="fiche__titre">${echapper(a.titre)}</h1>
    <p class="fiche__prix">${formaterPrix(a.prix)}</p>
    <ul class="fiche__meta">
      <li><strong>Ville :</strong> ${echapper(a.ville)}</li>
      <li><strong>Catégorie :</strong> ${echapper(a.categorie.nom)}</li>
      <li><strong>Publiée le :</strong> ${echapper(formaterDate(a.date_publication || a.date_creation))}</li>
      <li><strong>Référence :</strong> MS-${a.id}</li>
    </ul>
    <div class="fiche__actions">
      ${!vendue ? `<a class="bouton bouton--or bouton--large" href="${echapper(lienCommander)}" target="_blank" rel="noopener">Commander</a>` : ''}
      ${lienVendeur ? `<a class="bouton bouton--whatsapp bouton--large" href="${echapper(lienVendeur)}" target="_blank" rel="noopener">Contacter le vendeur sur WhatsApp</a>` : ''}
      ${vendue ? '<p class="note">Cette annonce est terminée. <a href="/annonces/">Voir les annonces disponibles</a>.</p>' : ''}
    </div>
    <section class="fiche__description">
      <h2>Description</h2>
      ${paragraphes(a.description)}
    </section>
    <p class="note note--securite">Conseil de sécurité : privilégiez une remise en main propre dans un lieu public et vérifiez le produit avant de payer. ${echapper(SITE.SITE_NOM)} valide les annonces mais n'est pas partie à la transaction entre particuliers.</p>
  </div>
</article>`;

  return html(
    page({
      titre: `${a.titre} – ${formaterPrix(a.prix)} à ${a.ville}`,
      description: `${a.titre} à ${a.ville}, ${formaterPrix(a.prix)}. ${a.description.slice(0, 120).replace(/\s+/g, ' ')}…`,
      canonique: urlFiche,
      image: imageOg,
      typeOg: 'product',
      nav: 'annonces',
      jsonLd,
      scripts: ['/assets/js/fiche.js'],
      corps,
    }),
    200,
    { 'Cache-Control': 'public, max-age=60, s-maxage=300' }
  );
}
