// ===========================================================================
// Point d'entrée du Worker MARIAM SHOP.
//
// Le site est déployé comme un Worker avec fichiers statiques (dossier dist/,
// binding ASSETS). Ce fichier reproduit le routage par fichiers de Cloudflare
// Pages Functions : chaque module de src/routes/ exporte onRequestGet,
// onRequestPost… et reçoit un contexte { request, env, params, data, next }.
// Aucune logique métier ici : uniquement la table des routes et les middlewares.
// ===========================================================================
import * as mwRacine from './routes/_middleware.js';
import * as mwPagesAdmin from './routes/admin/_middleware.js';
import * as mwApiAdmin from './routes/api/admin/_middleware.js';

import * as categories from './routes/api/categories.js';
import * as contact from './routes/api/contact.js';
import * as annoncesApi from './routes/api/annonces/index.js';
import * as annonceApi from './routes/api/annonces/[slug].js';
import * as paiementInitier from './routes/api/paiement/initier.js';
import * as paiementCallback from './routes/api/paiement/callback.js';

import * as adminConnexion from './routes/api/admin/connexion.js';
import * as adminDeconnexion from './routes/api/admin/deconnexion.js';
import * as adminSession from './routes/api/admin/session.js';
import * as adminAnnonces from './routes/api/admin/annonces/index.js';
import * as adminAnnonce from './routes/api/admin/annonces/[id].js';
import * as adminPhoto from './routes/api/admin/annonces/[id]/photos/[photoId].js';
import * as adminMessages from './routes/api/admin/messages/index.js';
import * as adminMessage from './routes/api/admin/messages/[id].js';

import * as ficheAnnonce from './routes/annonces/[slug].js';
import * as photos from './routes/photos/[[cle]].js';
import * as sitemap from './routes/sitemap.xml.js';

/**
 * Table des routes. `motif` : `:nom` = un segment, `*nom` = le reste du chemin.
 * Les routes sont testées dans l'ordre ; la première qui correspond gagne.
 * `statique: true` = après les middlewares, servir le fichier statique.
 */
const ROUTES = [
  // --- API publique ---
  { motif: '/api/categories', module: categories },
  { motif: '/api/contact', module: contact },
  { motif: '/api/annonces', module: annoncesApi },
  { motif: '/api/annonces/:slug', module: annonceApi },
  { motif: '/api/paiement/initier', module: paiementInitier },
  { motif: '/api/paiement/callback', module: paiementCallback },

  // --- API administrateur (middleware de session) ---
  { motif: '/api/admin/connexion', module: adminConnexion, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/deconnexion', module: adminDeconnexion, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/session', module: adminSession, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/annonces', module: adminAnnonces, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/annonces/:id', module: adminAnnonce, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/annonces/:id/photos/:photoId', module: adminPhoto, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/messages', module: adminMessages, middlewares: [mwApiAdmin] },
  { motif: '/api/admin/messages/:id', module: adminMessage, middlewares: [mwApiAdmin] },

  // --- pages rendues côté serveur et fichiers R2 ---
  { motif: '/annonces/:slug', module: ficheAnnonce },
  { motif: '/photos/*cle', module: photos },
  { motif: '/sitemap.xml', module: sitemap },

  // --- pages statiques de l'espace admin, protégées par middleware ---
  { motif: '/admin', statique: true, middlewares: [mwPagesAdmin] },
  { motif: '/admin/*reste', statique: true, middlewares: [mwPagesAdmin] },
];

const compilees = ROUTES.map((r) => {
  const noms = [];
  const source = r.motif
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([a-zA-Z]+)/g, (_, n) => { noms.push({ n, reste: false }); return '/([^/]+)'; })
    .replace(/\/\*([a-zA-Z]+)/g, (_, n) => { noms.push({ n, reste: true }); return '(?:/(.*))?'; });
  return { ...r, regex: new RegExp(`^${source}/?$`), noms };
});

function trouverRoute(chemin) {
  for (const r of compilees) {
    const m = r.regex.exec(chemin);
    if (!m) continue;
    const params = {};
    r.noms.forEach((p, i) => {
      const valeur = m[i + 1] === undefined ? '' : decodeURIComponent(m[i + 1]);
      params[p.n] = p.reste ? valeur.split('/').filter(Boolean) : valeur;
    });
    return { route: r, params };
  }
  return null;
}

function reponseApi(message, statut) {
  return new Response(JSON.stringify({ erreur: message }), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Exécute une chaîne de middlewares puis le gestionnaire final, à la manière de Pages Functions. */
function executer(chaine, contexte) {
  let index = 0;
  const suivant = async () => {
    const etape = chaine[index++];
    return etape(contexte);
  };
  contexte.next = suivant;
  return suivant();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const chemin = url.pathname;
    const correspondance = trouverRoute(chemin);

    const contexte = {
      request,
      env,
      params: correspondance ? correspondance.params : {},
      data: {},
      waitUntil: (p) => ctx.waitUntil(p),
      passThroughOnException: () => ctx.passThroughOnException(),
      functionPath: chemin,
      next: null,
    };

    const chaine = [mwRacine.onRequest];

    if (correspondance) {
      const { route } = correspondance;
      for (const mw of route.middlewares || []) chaine.push(mw.onRequest);

      if (route.statique) {
        chaine.push(() => env.ASSETS.fetch(request));
      } else {
        chaine.push((c) => {
          const methode = request.method === 'HEAD' ? 'Get' : request.method[0] + request.method.slice(1).toLowerCase();
          const gestionnaire = route.module[`onRequest${methode}`] || route.module.onRequest;
          if (!gestionnaire) return reponseApi('Méthode non autorisée.', 405);
          return gestionnaire(c);
        });
      }
    } else {
      // Fichiers statiques (HTML, CSS, JS, images) ; 404.html servi automatiquement par ASSETS
      chaine.push(() => env.ASSETS.fetch(request));
    }

    return executer(chaine, contexte);
  },
};
