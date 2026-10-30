// Connexion administrateur
(function () {
  'use strict';
  const form = document.getElementById('form-connexion');
  if (!form) return;
  const alerte = document.getElementById('alerte');
  const bouton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    MS.masquerAlerte(alerte);
    bouton.disabled = true;
    try {
      await MS.api('/api/admin/connexion', {
        method: 'POST',
        json: { identifiant: form.elements.identifiant.value, mot_de_passe: form.elements.mot_de_passe.value },
      });
      location.href = '/admin/';
    } catch (err) {
      MS.afficherAlerte(alerte, 'erreur', err.message);
      form.elements.mot_de_passe.value = '';
      form.elements.mot_de_passe.focus();
    } finally {
      bouton.disabled = false;
    }
  });
})();
