// Formulaire de contact : envoi JSON avec Turnstile
(function () {
  'use strict';
  const form = document.getElementById('form-contact');
  if (!form) return;
  const alerte = document.getElementById('alerte-contact');
  const bouton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    MS.masquerAlerte(alerte);
    const f = form.elements;
    Array.from(form.elements).forEach(function (el) { el.removeAttribute && el.removeAttribute('aria-invalid'); });

    if (f.nom.value.trim().length < 2) { f.nom.setAttribute('aria-invalid', 'true'); f.nom.focus(); return MS.afficherAlerte(alerte, 'erreur', 'Indiquez votre nom.'); }
    if (!f.email.value.trim() && !f.telephone.value.trim()) { f.telephone.setAttribute('aria-invalid', 'true'); f.telephone.focus(); return MS.afficherAlerte(alerte, 'erreur', 'Indiquez un e-mail ou un numéro de téléphone.'); }
    if (f.message.value.trim().length < 10) { f.message.setAttribute('aria-invalid', 'true'); f.message.focus(); return MS.afficherAlerte(alerte, 'erreur', 'Votre message est trop court (10 caractères minimum).'); }
    const jeton = form.querySelector('[name="cf-turnstile-response"]');
    if (!jeton || !jeton.value) return MS.afficherAlerte(alerte, 'erreur', 'Veuillez patienter : la vérification anti-robot se termine.');

    bouton.disabled = true;
    try {
      const r = await MS.api('/api/contact', {
        method: 'POST',
        json: {
          nom: f.nom.value, email: f.email.value, telephone: f.telephone.value, message: f.message.value,
          site_web: f.site_web.value, 'cf-turnstile-response': jeton.value,
        },
      });
      form.reset();
      MS.resetTurnstile();
      MS.afficherAlerte(alerte, 'succes', r.message);
    } catch (err) {
      MS.afficherAlerte(alerte, 'erreur', err.message);
      MS.resetTurnstile();
    } finally {
      bouton.disabled = false;
    }
  });
})();
