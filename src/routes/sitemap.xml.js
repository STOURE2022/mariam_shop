// GET /sitemap.xml — généré dynamiquement (pages statiques + annonces publiées)
import { slugsPublies } from '../lib/db.js';
import { SITE, echapper } from '../lib/html.js';

const PAGES = ['/', '/annonces/', '/deposer-une-annonce/', '/services/', '/a-propos/', '/mentions-legales/'];

export async function onRequestGet({ env }) {
  const base = SITE.SITE_URL.replace(/\/$/, '');
  const annonces = await slugsPublies(env.DB);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const urls = [
    ...PAGES.map((p) => `<url><loc>${echapper(base + p)}</loc><lastmod>${aujourdhui}</lastmod><changefreq>${p === '/annonces/' || p === '/' ? 'daily' : 'monthly'}</changefreq></url>`),
    ...annonces.map((a) => `<url><loc>${echapper(`${base}/annonces/${a.slug}`)}</loc><lastmod>${echapper(String(a.date).slice(0, 10))}</lastmod><changefreq>weekly</changefreq></url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
