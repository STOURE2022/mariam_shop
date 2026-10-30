// Fiche annonce : carrousel accessible (flèches, vignettes, clavier, balayage tactile)
(function () {
  'use strict';
  const c = document.querySelector('[data-carrousel]');
  if (!c) return;
  const diapos = Array.from(c.querySelectorAll('.carrousel__diapo'));
  if (diapos.length < 2) return;
  const vignettes = Array.from(document.querySelectorAll('[data-aller]'));
  const compteur = c.querySelector('[data-compteur]');
  let index = 0;

  function aller(i) {
    index = (i + diapos.length) % diapos.length;
    diapos.forEach(function (d, j) { d.hidden = j !== index; });
    vignettes.forEach(function (v, j) { v.setAttribute('aria-selected', String(j === index)); });
    if (compteur) compteur.textContent = String(index + 1);
  }

  c.querySelector('[data-prec]').addEventListener('click', function () { aller(index - 1); });
  c.querySelector('[data-suiv]').addEventListener('click', function () { aller(index + 1); });
  vignettes.forEach(function (v) {
    v.addEventListener('click', function () { aller(parseInt(v.dataset.aller, 10)); });
  });

  c.setAttribute('tabindex', '0');
  c.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); aller(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); aller(index + 1); }
  });

  let departX = null;
  c.addEventListener('touchstart', function (e) { departX = e.touches[0].clientX; }, { passive: true });
  c.addEventListener('touchend', function (e) {
    if (departX === null) return;
    const delta = e.changedTouches[0].clientX - departX;
    if (Math.abs(delta) > 40) aller(delta < 0 ? index + 1 : index - 1);
    departX = null;
  }, { passive: true });
})();
