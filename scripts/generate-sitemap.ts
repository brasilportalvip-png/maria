import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://maria-padilha-rainha-das-7-encruzil.vercel.app';

interface SitemapEntry {
  loc: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

const PUBLIC_ROUTES: SitemapEntry[] = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/privacidade', changefreq: 'monthly', priority: 0.5 },
  { loc: '/termos', changefreq: 'monthly', priority: 0.5 },
];

export function generateSitemapXml(): string {
  const today = new Date().toISOString().split('T')[0];

  const xmlEntries = PUBLIC_ROUTES.map((route) => `  <url>
    <loc>${BASE_URL}${route.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

// Write to public/sitemap.xml
const targetPath = path.resolve(process.cwd(), 'public/sitemap.xml');
fs.writeFileSync(targetPath, generateSitemapXml(), 'utf-8');
console.log(`[generate-sitemap] Successfully wrote sitemap to ${targetPath}`);
