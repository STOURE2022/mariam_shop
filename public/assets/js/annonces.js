// ===========================================================================
// Catalogue : filtres (catégorie, ville, prix, recherche), pagination,
// synchronisation avec l'URL (partage de lien possible).
// ===========================================================================
(function () {
  'use strict';
  const form = document.getElementById('filtres');
  const liste = document.getElementById('liste-annonces');
  const info = document.getElementById('resultats-info');
  const pagination = document.getElementById('pagination');
  if (!form || !liste) return;

  const champs = {
    q: form.elements.q,
    categorie: form.elements.categorie,
    ville: form.elements.ville,
    prix_min: form.elements.prix_min,
    prix_max: form.elements.prix_max,
  };
  let page = 1;
  let requeteEnCours = null;

  // 1. Remplir catégories et villes
  MS.api('/api/categories')
    .then(function (d) {
      d.categories.forEach(function (c) {
        champs.categorie.insertAdjacentHTML('beforeend', '<option value="' + MS.echapper(c.slug) + '">' + MS.echapper(c.nom) + '</option>');
      });
      d.villes.forEach(function (v) {
        champs.ville.insertAdjacentHTML('beforeend', '<option value="' + MS.echapper(v) + '">' + MS.echapper(v) + '</option>');
      });
      lireUrl();
      charger();
    })
    .catch(function () {
      lireUrl();
      charger();
    });

  function lireUrl() {
    const p = new URLSearchParams(location.search);
    Object.keys(champs).forEach(function (k) {
      if (p.has(k)) champs[k].value = p.get(k);
    });
    page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
  }

  function ecrireUrl() {
    const p = new URLSearchParams();
    Object.keys(champs).forEach(function (k) {
      const v = champs[k].value.trim();
      if (v) p.set(k, v);
    });
    if (page > 1) p.set('page', String(page));
    const q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
    return q;
  }

  function charger() {
    const q = ecrireUrl();
    liste.innerHTML = '<li class="squelette"></li><li class="squelette"></li><li class="squelette"></li><li class="squelette"></li>';
    info.textContent = 'Chargement…';
    pagination.innerHTML = '';

    const ctrl = new AbortController();
    if (requeteEnCours) requeteEnCours.abort();
    requeteEnCours = ctrl;

    MS.api('/api/annonces' + (q ? '?' + q : ''), { signal: ctrl.signal })
      .then(function (d) {
        if (!d.annonces.length) {
          liste.innerHTML = '<li class="vide">Aucune annonce ne correspond à votre recherche. <button type="button" class="bouton--lien" data-reinitialiser>Réinitialiser les filtres</button></li>';
          info.textContent = '0 annonce';
          return;
        }
        liste.innerHTML = d.annonces.map(MS.carteAnnonce).join('');
        info.textContent = d.total + (d.total > 1 ? ' annonces' : ' annonce') + (d.pages > 1 ? ' – page ' + d.page + ' sur ' + d.pages : '');
        rendrePagination(d.page, d.pages);
      })
      .catch(function (e) {
        if (e.name === 'AbortError') return;
        liste.innerHTML = '<li class="vide">' + MS.echapper(e.message) + '</li>';
        info.textContent = '';
      });
  }

  function rendrePagination(courante, total) {
    if (total <= 1) return;
    let html = '<button type="button" data-page="' + (courante - 1) + '" ' + (courante <= 1 ? 'disabled' : '') + ' aria-label="Page précédente">‹</button>';
    const debut = Math.max(1, courante - 2);
    const fin = Math.min(total, debut + 4);
    for (let i = debut; i <= fin; i++) {
      html += '<button type="button" data-page="' + i + '" ' + (i === courante ? 'aria-current="page"' : '') + '>' + i + '</button>';
    }
    html += '<button type="button" data-page="' + (courante + 1) + '" ' + (courante >= total ? 'disabled' : '') + ' aria-label="Page suivante">›</button>';
    pagination.innerHTML = html;
  }

  pagination.addEventListener('click', function (e) {
    const b = e.target.closest('button[data-page]');
    if (!b || b.disabled) return;
    page = parseInt(b.dataset.page, 10);
    charger();
    window.scrollTo({ top: form.offsetTop - 80, behavior: 'smooth' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    page = 1;
    charger();
  });

  [champs.categorie, champs.ville].forEach(function (el) {
    el.addEventListener('change', function () { page = 1; charger(); });
  });

  liste.addEventListener('click', function (e) {
    if (e.target.closest('[data-reinitialiser]')) {
      form.reset();
      page = 1;
      charger();
    }
  });

  const reinit = form.querySelector('[data-reinitialiser]');
  reinit && reinit.addEventListener('click', function () {
    form.reset();
    page = 1;
    charger();
  });
})();
