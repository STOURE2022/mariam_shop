// ===========================================================================
// Espace administrateur : tableau de bord (annonces par statut, actions),
// édition d'une annonce, messages de contact. Une seule feuille de script,
// la page active est déterminée par l'attribut data-page du <body>.
// ===========================================================================
(function () {
  'use strict';
  const pageActive = document.body.dataset.page;
  const alerte = document.getElementById('alerte');
  const LIBELLES = { en_attente: 'En attente', publiee: 'Publiée', rejetee: 'Rejetée', vendue: 'Vendue' };

  function redirigerSiDeconnecte(e) {
    if (e && e.statut === 401) { location.href = '/admin/connexion'; return true; }
    return false;
  }

  /* ---------- barre commune : déconnexion + compteurs ---------- */
  const btnDeco = document.querySelector('[data-deconnexion]');
  btnDeco && btnDeco.addEventListener('click', async function () {
    try { await MS.api('/api/admin/deconnexion', { method: 'POST', json: {} }); } catch (e) { /* ignorer */ }
    location.href = '/admin/connexion';
  });

  async function chargerCompteurs() {
    try {
      const d = await MS.api('/api/admin/session');
      const c = d.compteurs;
      Object.keys(c).forEach(function (k) {
        const el = document.querySelector('[data-compteur="' + k + '"]');
        if (el) el.textContent = c[k];
      });
      const qui = document.querySelector('[data-admin-nom]');
      if (qui) qui.textContent = d.admin.identifiant;
    } catch (e) {
      redirigerSiDeconnecte(e);
    }
  }
  chargerCompteurs();

  /* ---------- dialogue générique ---------- */
  const dialogue = document.getElementById('dialogue');
  function demander(options) {
    return new Promise(function (resoudre) {
      if (!dialogue || typeof dialogue.showModal !== 'function') {
        const v = options.champ ? window.prompt(options.titre + '\n' + (options.texte || '')) : (window.confirm(options.titre + '\n' + (options.texte || '')) ? true : null);
        return resoudre(v);
      }
      dialogue.querySelector('h2').textContent = options.titre;
      dialogue.querySelector('[data-texte]').textContent = options.texte || '';
      const zone = dialogue.querySelector('textarea');
      zone.hidden = !options.champ;
      zone.value = '';
      zone.required = !!options.champ;
      const ok = dialogue.querySelector('[data-ok]');
      ok.textContent = options.bouton || 'Confirmer';
      ok.className = 'bouton ' + (options.danger ? 'bouton--danger' : '');
      function fermer(valeur) {
        dialogue.close();
        dialogue.querySelector('form').onsubmit = null;
        dialogue.querySelector('[data-annuler]').onclick = null;
        resoudre(valeur);
      }
      dialogue.querySelector('form').onsubmit = function (e) {
        e.preventDefault();
        if (options.champ && zone.value.trim().length < 3) { zone.focus(); return; }
        fermer(options.champ ? zone.value.trim() : true);
      };
      dialogue.querySelector('[data-annuler]').onclick = function () { fermer(null); };
      dialogue.showModal();
      if (options.champ) zone.focus();
    });
  }

  async function changerStatut(id, statut, titre) {
    let motif;
    if (statut === 'rejetee') {
      motif = await demander({ titre: 'Rejeter l’annonce', texte: 'Indiquez le motif du rejet (visible par l’équipe) : « ' + titre + ' »', champ: true, bouton: 'Rejeter', danger: true });
      if (!motif) return false;
    } else if (statut === 'vendue') {
      if (!(await demander({ titre: 'Marquer comme vendue', texte: '« ' + titre + ' » sera affichée comme vendue et le contact vendeur retiré.', bouton: 'Marquer vendue' }))) return false;
    }
    try {
      await MS.api('/api/admin/annonces/' + id, { method: 'PATCH', json: { statut: statut, motif: motif } });
      MS.afficherAlerte(alerte, 'succes', 'Annonce « ' + titre + ' » : ' + LIBELLES[statut].toLowerCase() + '.');
      return true;
    } catch (e) {
      if (!redirigerSiDeconnecte(e)) MS.afficherAlerte(alerte, 'erreur', e.message);
      return false;
    }
  }

  async function supprimerAnnonce(id, titre) {
    if (!(await demander({ titre: 'Supprimer définitivement', texte: '« ' + titre + ' » et ses photos seront supprimées. Cette action est irréversible.', bouton: 'Supprimer', danger: true }))) return false;
    try {
      await MS.api('/api/admin/annonces/' + id, { method: 'DELETE' });
      MS.afficherAlerte(alerte, 'succes', 'Annonce supprimée.');
      return true;
    } catch (e) {
      if (!redirigerSiDeconnecte(e)) MS.afficherAlerte(alerte, 'erreur', e.message);
      return false;
    }
  }

  /* =======================================================================
     TABLEAU DE BORD
     ======================================================================= */
  if (pageActive === 'tableau') {
    const liste = document.getElementById('liste-admin');
    const onglets = document.getElementById('onglets');
    const pagination = document.getElementById('pagination');
    let statut = new URLSearchParams(location.search).get('statut') || 'en_attente';
    let page = 1;

    function majOnglets() {
      onglets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.statut === statut)); });
      document.querySelectorAll('.compteur[data-statut]').forEach(function (c) { c.setAttribute('aria-current', String(c.dataset.statut === statut)); });
      history.replaceState(null, '', '/admin/?statut=' + statut);
    }

    async function charger() {
      majOnglets();
      liste.innerHTML = '<li class="squelette"></li><li class="squelette"></li>';
      try {
        const d = await MS.api('/api/admin/annonces?statut=' + encodeURIComponent(statut) + '&page=' + page);
        if (!d.annonces.length) {
          liste.innerHTML = '<li class="vide">Aucune annonce « ' + MS.echapper(LIBELLES[statut]) + ' ».</li>';
          pagination.innerHTML = '';
          return;
        }
        liste.innerHTML = d.annonces.map(ligne).join('');
        pagination.innerHTML = d.pages > 1
          ? '<button type="button" data-page="' + (d.page - 1) + '" ' + (d.page <= 1 ? 'disabled' : '') + '>‹</button><span>Page ' + d.page + ' / ' + d.pages + '</span><button type="button" data-page="' + (d.page + 1) + '" ' + (d.page >= d.pages ? 'disabled' : '') + '>›</button>'
          : '';
      } catch (e) {
        if (!redirigerSiDeconnecte(e)) liste.innerHTML = '<li class="vide">' + MS.echapper(e.message) + '</li>';
      }
    }

    function ligne(a) {
      const img = a.photo ? '<img src="' + MS.echapper(a.photo) + '" alt="" loading="lazy">' : '<img src="/assets/img/placeholder.svg" alt="">';
      let actions = '';
      if (a.statut !== 'publiee') actions += '<button type="button" class="bouton" data-action="publiee">Valider / publier</button>';
      if (a.statut !== 'rejetee') actions += '<button type="button" class="bouton bouton--secondaire" data-action="rejetee">Rejeter</button>';
      if (a.statut === 'publiee') actions += '<button type="button" class="bouton bouton--or" data-action="vendue">Marquer vendue</button>';
      if (a.statut === 'vendue' || a.statut === 'rejetee') actions += '<button type="button" class="bouton bouton--secondaire" data-action="en_attente">Remettre en attente</button>';
      actions += '<a class="bouton bouton--secondaire" href="/admin/annonce?id=' + a.id + '">Modifier</a>';
      actions += '<button type="button" class="bouton bouton--danger" data-action="supprimer">Supprimer</button>';
      return (
        '<li class="ligne-admin" data-id="' + a.id + '" data-titre="' + MS.echapper(a.titre) + '">' + img +
        '<div class="ligne-admin__corps"><h3>' + MS.echapper(a.titre) + ' <span class="badge badge--' + a.statut + '">' + LIBELLES[a.statut] + '</span></h3>' +
        '<p class="ligne-admin__meta"><strong>' + MS.echapper(MS.prix(a.prix)) + '</strong> · ' + MS.echapper(a.ville) + ' · ' + MS.echapper(a.categorie_nom) + ' · déposée le ' + MS.echapper(MS.dateHeure(a.date_creation)) + '<br>' +
        'Vendeur : ' + MS.echapper(a.nom_vendeur) + ' – <a href="tel:+' + MS.echapper(a.telephone_vendeur) + '">+' + MS.echapper(a.telephone_vendeur) + '</a>' +
        (a.statut === 'publiee' ? ' · <a href="/annonces/' + MS.echapper(a.slug) + '" target="_blank" rel="noopener">Voir la fiche</a>' : '') +
        (a.motif_rejet ? '<br>Motif du rejet : <em>' + MS.echapper(a.motif_rejet) + '</em>' : '') + '</p>' +
        '<p class="ligne-admin__meta">' + MS.echapper(a.description.slice(0, 180)) + (a.description.length > 180 ? '…' : '') + '</p></div>' +
        '<div class="ligne-admin__actions">' + actions + '</div></li>'
      );
    }

    onglets.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-statut]');
      if (!b) return;
      statut = b.dataset.statut; page = 1; charger();
    });
    document.querySelectorAll('.compteur[data-statut]').forEach(function (c) {
      c.addEventListener('click', function (e) { e.preventDefault(); statut = c.dataset.statut; page = 1; charger(); });
    });
    pagination.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-page]');
      if (!b || b.disabled) return;
      page = parseInt(b.dataset.page, 10); charger();
    });
    liste.addEventListener('click', async function (e) {
      const b = e.target.closest('button[data-action]');
      if (!b) return;
      const li = b.closest('.ligne-admin');
      const id = li.dataset.id, titre = li.dataset.titre;
      b.disabled = true;
      const ok = b.dataset.action === 'supprimer' ? await supprimerAnnonce(id, titre) : await changerStatut(id, b.dataset.action, titre);
      b.disabled = false;
      if (ok) { charger(); chargerCompteurs(); }
    });

    charger();
  }

  /* =======================================================================
     ÉDITION D'UNE ANNONCE
     ======================================================================= */
  if (pageActive === 'annonce') {
    const form = document.getElementById('form-edition');
    const id = parseInt(new URLSearchParams(location.search).get('id'), 10);
    const photos = document.getElementById('photos-admin');
    const titrePage = document.getElementById('titre-page');
    if (!id) { location.href = '/admin/'; return; }

    (async function init() {
      try {
        const [cats, a] = await Promise.all([MS.api('/api/categories'), MS.api('/api/admin/annonces/' + id)]);
        cats.categories.forEach(function (c) {
          form.elements.categorie_id.insertAdjacentHTML('beforeend', '<option value="' + c.id + '">' + MS.echapper(c.nom) + '</option>');
        });
        cats.villes.forEach(function (v) {
          form.elements.ville.insertAdjacentHTML('beforeend', '<option value="' + MS.echapper(v) + '">' + MS.echapper(v) + '</option>');
        });
        remplir(a);
      } catch (e) {
        if (!redirigerSiDeconnecte(e)) MS.afficherAlerte(alerte, 'erreur', e.message);
      }
    })();

    function remplir(a) {
      titrePage.textContent = 'Modifier : ' + a.titre;
      ['titre', 'description', 'prix', 'ville', 'categorie_id', 'nom_vendeur', 'telephone_vendeur'].forEach(function (k) { form.elements[k].value = a[k]; });
      document.getElementById('statut-actuel').innerHTML = 'Statut : <span class="badge badge--' + a.statut + '">' + LIBELLES[a.statut] + '</span>' + (a.motif_rejet ? ' – motif : ' + MS.echapper(a.motif_rejet) : '');
      photos.innerHTML = a.photos.length
        ? a.photos.map(function (p) { return '<li><img src="' + MS.echapper(p.url) + '" alt=""><button type="button" data-photo="' + p.id + '" aria-label="Supprimer cette photo">×</button></li>'; }).join('')
        : '<li class="vide">Aucune photo</li>';
      form.hidden = false;
    }

    photos.addEventListener('click', async function (e) {
      const b = e.target.closest('button[data-photo]');
      if (!b) return;
      if (!(await demander({ titre: 'Supprimer la photo', texte: 'Cette photo sera retirée définitivement.', bouton: 'Supprimer', danger: true }))) return;
      try {
        await MS.api('/api/admin/annonces/' + id + '/photos/' + b.dataset.photo, { method: 'DELETE' });
        b.closest('li').remove();
        if (!photos.querySelector('li')) photos.innerHTML = '<li class="vide">Aucune photo</li>';
      } catch (err) {
        if (!redirigerSiDeconnecte(err)) MS.afficherAlerte(alerte, 'erreur', err.message);
      }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      MS.masquerAlerte(alerte);
      const f = form.elements;
      const donnees = {};
      ['titre', 'description', 'prix', 'ville', 'categorie_id', 'nom_vendeur', 'telephone_vendeur'].forEach(function (k) { donnees[k] = f[k].value; });
      try {
        const r = await MS.api('/api/admin/annonces/' + id, { method: 'PUT', json: donnees });
        remplir(r.annonce);
        MS.afficherAlerte(alerte, 'succes', 'Modifications enregistrées.');
      } catch (err) {
        if (!redirigerSiDeconnecte(err)) MS.afficherAlerte(alerte, 'erreur', err.message);
      }
    });

    document.querySelectorAll('[data-statut-action]').forEach(function (b) {
      b.addEventListener('click', async function () {
        const ok = await changerStatut(id, b.dataset.statutAction, form.elements.titre.value);
        if (ok) { const a = await MS.api('/api/admin/annonces/' + id); remplir(a); chargerCompteurs(); }
      });
    });
    const sup = document.querySelector('[data-supprimer]');
    sup && sup.addEventListener('click', async function () {
      if (await supprimerAnnonce(id, form.elements.titre.value)) location.href = '/admin/';
    });
  }

  /* =======================================================================
     MESSAGES DE CONTACT
     ======================================================================= */
  if (pageActive === 'messages') {
    const liste = document.getElementById('liste-messages');
    const pagination = document.getElementById('pagination');
    let page = 1;

    async function charger() {
      liste.innerHTML = '<li class="squelette"></li>';
      try {
        const d = await MS.api('/api/admin/messages?page=' + page);
        if (!d.messages.length) { liste.innerHTML = '<li class="vide">Aucun message reçu.</li>'; pagination.innerHTML = ''; return; }
        liste.innerHTML = d.messages.map(function (m) {
          return (
            '<li class="message-admin' + (m.lu ? ' est-lu' : '') + '" data-id="' + m.id + '">' +
            '<div class="message-admin__entete"><strong>' + MS.echapper(m.nom) + '</strong><span>' + MS.echapper(MS.dateHeure(m.date_creation)) + (m.lu ? '' : ' · <b>Non lu</b>') + '</span></div>' +
            '<p class="ligne-admin__meta">' +
            (m.email ? '<a href="mailto:' + MS.echapper(m.email) + '">' + MS.echapper(m.email) + '</a> ' : '') +
            (m.telephone ? '· <a href="tel:+' + MS.echapper(m.telephone) + '">+' + MS.echapper(m.telephone) + '</a> · <a href="https://wa.me/' + MS.echapper(m.telephone) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</p>' +
            '<p class="message-admin__texte">' + MS.echapper(m.message) + '</p>' +
            '<div class="groupe-boutons">' +
            '<button type="button" class="bouton bouton--secondaire bouton--petit" data-lu="' + (m.lu ? 0 : 1) + '">' + (m.lu ? 'Marquer non lu' : 'Marquer lu') + '</button>' +
            '<button type="button" class="bouton bouton--danger bouton--petit" data-supprimer-message>Supprimer</button></div></li>'
          );
        }).join('');
        pagination.innerHTML = d.pages > 1
          ? '<button type="button" data-page="' + (d.page - 1) + '" ' + (d.page <= 1 ? 'disabled' : '') + '>‹</button><span>Page ' + d.page + ' / ' + d.pages + '</span><button type="button" data-page="' + (d.page + 1) + '" ' + (d.page >= d.pages ? 'disabled' : '') + '>›</button>'
          : '';
      } catch (e) {
        if (!redirigerSiDeconnecte(e)) liste.innerHTML = '<li class="vide">' + MS.echapper(e.message) + '</li>';
      }
    }

    liste.addEventListener('click', async function (e) {
      const li = e.target.closest('.message-admin');
      if (!li) return;
      const id = li.dataset.id;
      try {
        if (e.target.closest('[data-lu]')) {
          await MS.api('/api/admin/messages/' + id, { method: 'PATCH', json: { lu: e.target.closest('[data-lu]').dataset.lu === '1' } });
          charger(); chargerCompteurs();
        } else if (e.target.closest('[data-supprimer-message]')) {
          if (!(await demander({ titre: 'Supprimer le message', texte: 'Ce message sera supprimé définitivement.', bouton: 'Supprimer', danger: true }))) return;
          await MS.api('/api/admin/messages/' + id, { method: 'DELETE' });
          charger(); chargerCompteurs();
        }
      } catch (err) {
        if (!redirigerSiDeconnecte(err)) MS.afficherAlerte(alerte, 'erreur', err.message);
      }
    });
    pagination.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-page]');
      if (!b || b.disabled) return;
      page = parseInt(b.dataset.page, 10); charger();
    });

    charger();
  }
})();
