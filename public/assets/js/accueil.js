// Accueil : chargement des annonces récentes
(function () {
  'use strict';
  const liste = document.getElementById('annonces-recentes');
  if (!liste) return;

  MS.api('/api/annonces?recentes=1')
    .then(function (d) {
      if (!d.annonces || !d.annonces.length) {
        liste.innerHTML = '<li class="vide">Aucune annonce publiée pour le moment. <a href="/deposer-une-annonce/">Soyez le premier à déposer une annonce</a>.</li>';
        return;
      }
      liste.innerHTML = d.annonces.map(MS.carteAnnonce).join('');
    })
    .catch(function (e) {
      liste.innerHTML = '<li class="vide">' + MS.echapper(e.message) + '</li>';
    });
})();
