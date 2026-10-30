// ===========================================================================
// Middleware racine : en-têtes de sécurité sur toutes les réponses des
// Functions + gestion centralisée des erreurs (jamais de trace exposée).
// Les fichiers statiques reçoivent les mêmes en-têtes via public/_headers.
// ===========================================================================
import { appliquerEntetesSecurite, json } from '../lib/reponse.js';

export async function onRequest(contexte) {
  try {
    const reponse = await contexte.next();
    return appliquerEntetesSecurite(reponse);
  } catch (e) {
    console.error('Erreur non gérée :', e && e.stack ? e.stack : e);
    const accepteHtml = (contexte.request.headers.get('Accept') || '').includes('text/html');
    if (accepteHtml) {
      return appliquerEntetesSecurite(new Response('Une erreur interne est survenue.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    }
    return appliquerEntetesSecurite(json({ erreur: 'Une erreur interne est survenue.' }, 500));
  }
}
