// ===========================================================================
// Génère un hachage PBKDF2-SHA256 compatible avec src/lib/securite.js
// Usage : node scripts/hash-password.mjs "MonMotDePasseSolide"
// Puis :
//   npx wrangler d1 execute mariam-shop-db --remote \
//     --command "INSERT INTO admins (identifiant, mot_de_passe_hash) VALUES ('mariam', '<hash>');"
// ===========================================================================
import { webcrypto } from 'node:crypto';
import { hacherMotDePasse } from '../src/lib/securite.js';

globalThis.crypto ??= webcrypto;

const motDePasse = process.argv[2];
if (!motDePasse || motDePasse.length < 10) {
  console.error('Usage : node scripts/hash-password.mjs "<mot de passe d\'au moins 10 caractères>"');
  process.exit(1);
}
console.log(await hacherMotDePasse(motDePasse));
