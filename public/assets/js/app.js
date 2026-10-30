// ===========================================================================
// Script commun : menu mobile, bandeau cookies, utilitaires partagés (MS.*)
// Aucune dépendance externe.
// ===========================================================================
(function () {
  'use strict';

  /* ---------- utilitaires globaux ---------- */
  const MS = (window.MS = window.MS || {});

  MS.echapper = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  MS.prix = function (n) {
    const s = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0);
    return s.replace(/[  ]/g, ' ') + ' FCFA';
  };

  MS.date = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };

  MS.dateHeure = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  /** fetch JSON avec gestion d'erreur uniforme. Lève une Error(message). */
  MS.api = async function (url, options) {
    options = options || {};
    const entetes = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (options.json !== undefined) {
      entetes['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
    }
    let reponse;
    try {
      reponse = await fetch(url, Object.assign({}, options, { headers: entetes, credentials: 'same-origin' }));
    } catch (e) {
      throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
    }
    let donnees = null;
    try { donnees = await reponse.json(); } catch (e) { /* corps vide */ }
    if (!reponse.ok) {
      const err = new Error((donnees && donnees.erreur) || 'Une erreur est survenue (' + reponse.status + ').');
      err.statut = reponse.status;
      throw err;
    }
    return donnees;
  };

  /** Carte d'annonce (HTML) commune à l'accueil et au catalogue. */
  MS.carteAnnonce = function (a) {
    const img = a.photo
      ? '<img src="' + MS.echapper(a.photo) + '" alt="" loading="lazy" width="400" height="300">'
      : '<img src="/assets/img/placeholder.svg" alt="" loading="lazy" width="400" height="300">';
    return (
      '<li class="carte"><a href="' + MS.echapper(a.url) + '">' +
      '<div class="carte__image">' + img + '</div>' +
      '<div class="carte__corps">' +
      '<h3 class="carte__titre">' + MS.echapper(a.titre) + '</h3>' +
      '<p class="carte__prix">' + MS.echapper(MS.prix(a.prix)) + '</p>' +
      '<p class="carte__meta"><span>' + MS.echapper(a.ville) + '</span><span>' + MS.echapper(MS.date(a.date_publication || a.date_creation)) + '</span></p>' +
      '</div></a></li>'
    );
  };

  MS.afficherAlerte = function (el, type, message) {
    if (!el) return;
    el.className = 'alerte alerte--' + type;
    el.textContent = message;
    el.hidden = false;
    el.setAttribute('role', type === 'erreur' ? 'alert' : 'status');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  MS.masquerAlerte = function (el) {
    if (el) el.hidden = true;
  };

  /** Réinitialise le widget Turnstile si présent. */
  MS.resetTurnstile = function () {
    try { if (window.turnstile) window.turnstile.reset(); } catch (e) { /* ignorer */ }
  };

  /* ---------- menu mobile ---------- */
  const bouton = document.querySelector('[data-menu-bouton]');
  const menu = document.getElementById('menu-principal');
  if (bouton && menu) {
    bouton.addEventListener('click', function () {
      const ouvert = menu.classList.toggle('est-ouvert');
      bouton.setAttribute('aria-expanded', String(ouvert));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('est-ouvert')) {
        menu.classList.remove('est-ouvert');
        bouton.setAttribute('aria-expanded', 'false');
        bouton.focus();
      }
    });
  }

  /* ---------- bandeau cookies (information uniquement : cookies techniques) ---------- */
  const bandeau = document.querySelector('[data-bandeau-cookies]');
  if (bandeau) {
    let vu = false;
    try { vu = localStorage.getItem('ms_cookies_info') === '1'; } catch (e) { /* stockage indisponible */ }
    if (!vu) {
      bandeau.hidden = false;
      const ok = bandeau.querySelector('[data-cookies-ok]');
      ok && ok.addEventListener('click', function () {
        bandeau.hidden = true;
        try { localStorage.setItem('ms_cookies_info', '1'); } catch (e) { /* ignorer */ }
      });
    }
  }
})();
