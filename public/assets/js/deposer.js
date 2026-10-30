// ===========================================================================
// Dépôt d'annonce : aperçu des photos, compression côté client (WebP, max
// 1600 px) pour les connexions lentes, validation et envoi multipart.
// ===========================================================================
(function () {
  'use strict';
  const form = document.getElementById('form-annonce');
  if (!form) return;

  const alerte = document.getElementById('alerte');
  const entreePhotos = form.elements.photos;
  const apercus = document.getElementById('apercus');
  const compteurDesc = document.getElementById('compteur-description');
  const bouton = form.querySelector('button[type="submit"]');
  const MAX_PHOTOS = 5;
  const MAX_OCTETS = 5 * 1024 * 1024;
  let fichiers = []; // { fichier: File, url: string }

  // Catégories et villes
  MS.api('/api/categories').then(function (d) {
    d.categories.forEach(function (c) {
      form.elements.categorie_id.insertAdjacentHTML('beforeend', '<option value="' + c.id + '">' + MS.echapper(c.nom) + '</option>');
    });
    d.villes.forEach(function (v) {
      form.elements.ville.insertAdjacentHTML('beforeend', '<option value="' + MS.echapper(v) + '">' + MS.echapper(v) + '</option>');
    });
  }).catch(function (e) { MS.afficherAlerte(alerte, 'erreur', e.message); });

  // Compteur de caractères
  form.elements.description.addEventListener('input', function () {
    compteurDesc.textContent = this.value.length + ' / 3000';
  });

  // Photos
  entreePhotos.addEventListener('change', function () {
    const nouveaux = Array.from(entreePhotos.files || []);
    entreePhotos.value = '';
    MS.masquerAlerte(alerte);
    for (const f of nouveaux) {
      if (fichiers.length >= MAX_PHOTOS) { MS.afficherAlerte(alerte, 'erreur', 'Vous pouvez ajouter au maximum ' + MAX_PHOTOS + ' photos.'); break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { MS.afficherAlerte(alerte, 'erreur', 'Format non accepté pour « ' + f.name + ' » : utilisez JPEG, PNG ou WebP.'); continue; }
      if (f.size > 25 * 1024 * 1024) { MS.afficherAlerte(alerte, 'erreur', '« ' + f.name + ' » est trop lourde (25 Mo max avant compression).'); continue; }
      fichiers.push({ fichier: f, url: URL.createObjectURL(f) });
    }
    rendreApercus();
  });

  function rendreApercus() {
    apercus.innerHTML = fichiers.map(function (f, i) {
      return '<li><img src="' + f.url + '" alt="Aperçu photo ' + (i + 1) + '"><button type="button" data-retirer="' + i + '" aria-label="Retirer la photo ' + (i + 1) + '">×</button></li>';
    }).join('');
    document.getElementById('nb-photos').textContent = fichiers.length + ' / ' + MAX_PHOTOS + ' photo(s)';
  }

  apercus.addEventListener('click', function (e) {
    const b = e.target.closest('[data-retirer]');
    if (!b) return;
    const i = parseInt(b.dataset.retirer, 10);
    URL.revokeObjectURL(fichiers[i].url);
    fichiers.splice(i, 1);
    rendreApercus();
  });

  /** Redimensionne et convertit en WebP si cela réduit la taille. */
  function compresser(fichier) {
    return new Promise(function (resoudre) {
      if (fichier.size < 300 * 1024 && fichier.type !== 'image/png') return resoudre(fichier);
      const img = new Image();
      const url = URL.createObjectURL(fichier);
      img.onload = function () {
        URL.revokeObjectURL(url);
        const MAX = 1600;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (!blob || blob.type !== 'image/webp' || blob.size >= fichier.size) {
            // Repli JPEG si WebP non supporté ou pas plus léger
            canvas.toBlob(function (jpeg) {
              if (jpeg && jpeg.size < fichier.size) return resoudre(new File([jpeg], renommer(fichier.name, 'jpg'), { type: 'image/jpeg' }));
              resoudre(fichier);
            }, 'image/jpeg', 0.82);
            return;
          }
          resoudre(new File([blob], renommer(fichier.name, 'webp'), { type: 'image/webp' }));
        }, 'image/webp', 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resoudre(fichier); };
      img.src = url;
    });
  }

  function renommer(nom, ext) {
    return nom.replace(/\.[^.]+$/, '') + '.' + ext;
  }

  function invalide(el, message) {
    el.setAttribute('aria-invalid', 'true');
    el.focus();
    MS.afficherAlerte(alerte, 'erreur', message);
    return false;
  }

  function validerLocalement() {
    Array.from(form.elements).forEach(function (el) { el.removeAttribute && el.removeAttribute('aria-invalid'); });
    const f = form.elements;
    if (f.titre.value.trim().length < 5) return invalide(f.titre, 'Le titre doit contenir au moins 5 caractères.');
    if (!f.categorie_id.value) return invalide(f.categorie_id, 'Veuillez choisir une catégorie.');
    if (f.description.value.trim().length < 20) return invalide(f.description, 'La description doit contenir au moins 20 caractères.');
    if (f.prix.value === '' || Number(f.prix.value) < 0) return invalide(f.prix, 'Indiquez un prix en FCFA (0 si gratuit ou à négocier).');
    if (!f.ville.value) return invalide(f.ville, 'Veuillez choisir une ville.');
    if (f.nom_vendeur.value.trim().length < 2) return invalide(f.nom_vendeur, 'Indiquez votre nom.');
    if (!/^(\+?223|00223)?\s*\d[\d\s.-]{6,}\d$/.test(f.telephone_vendeur.value.trim())) return invalide(f.telephone_vendeur, 'Numéro de téléphone invalide (ex. 76 12 34 56).');
    if (!f.consentement.checked) return invalide(f.consentement, "Vous devez accepter les conditions d'utilisation.");
    const jeton = form.querySelector('[name="cf-turnstile-response"]');
    if (!jeton || !jeton.value) { MS.afficherAlerte(alerte, 'erreur', 'Veuillez patienter : la vérification anti-robot se termine.'); return false; }
    return true;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    MS.masquerAlerte(alerte);
    if (!validerLocalement()) return;

    bouton.disabled = true;
    const texteInitial = bouton.textContent;
    bouton.textContent = 'Préparation des photos…';

    try {
      const donnees = new FormData(form);
      donnees.delete('photos');
      for (const f of fichiers) {
        const compresse = await compresser(f.fichier);
        if (compresse.size > MAX_OCTETS) throw new Error('La photo « ' + f.fichier.name + ' » dépasse 5 Mo même après compression.');
        donnees.append('photos', compresse, compresse.name);
      }

      bouton.textContent = 'Envoi en cours…';
      const r = await MS.api('/api/annonces', { method: 'POST', body: donnees });

      form.hidden = true;
      const succes = document.getElementById('succes');
      succes.hidden = false;
      succes.querySelector('[data-reference]').textContent = 'MS-' + r.reference;
      succes.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      MS.afficherAlerte(alerte, 'erreur', err.message);
      MS.resetTurnstile();
    } finally {
      bouton.disabled = false;
      bouton.textContent = texteInitial;
    }
  });
})();
