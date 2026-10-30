// ===========================================================================
// Script de build : copie `public/` vers `dist/` en remplaçant les jetons
// {{CLE}} par les valeurs de `site.config.json` dans les fichiers texte.
// Aucune dépendance externe : Node.js >= 18 suffit.
// ===========================================================================
import { cp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(racine, 'public');
const cible = join(racine, 'dist');
const config = JSON.parse(await readFile(join(racine, 'site.config.json'), 'utf8'));

const EXTENSIONS_TEXTE = new Set(['.html', '.txt', '.xml', '.json', '.webmanifest', '.js', '.css', '.svg']);

await rm(cible, { recursive: true, force: true });
await mkdir(cible, { recursive: true });
await cp(source, cible, { recursive: true });

let fichiers = 0;
for await (const chemin of parcourir(cible)) {
  if (!EXTENSIONS_TEXTE.has(extname(chemin))) continue;
  const contenu = await readFile(chemin, 'utf8');
  const remplace = contenu.replace(/\{\{([A-Z0-9_]+)\}\}/g, (tout, cle) => {
    if (cle in config) return echapperHtml(String(config[cle]));
    console.warn(`  ! Jeton inconnu ${tout} dans ${chemin}`);
    return tout;
  });
  if (remplace !== contenu) {
    await writeFile(chemin, remplace, 'utf8');
    fichiers++;
  }
}

async function* parcourir(dossier) {
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) yield* parcourir(chemin);
    else yield chemin;
  }
}

function echapperHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log(`Build terminé : dist/ généré, ${fichiers} fichier(s) avec jetons remplacés.`);
