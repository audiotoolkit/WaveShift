// Repeatable static audit: routes, links, metadata, alt text, sitemap, robots.
// Usage: node audit/static-audit.mjs [expectedOrigin]
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = process.argv[2] || process.env.SITE_URL || 'https://waveshift.netlify.app';
const results = []; const rec = (area, name, status, detail='') => results.push({ area, name, status, detail });
const files = (await readdir(root)).filter(f => f.endsWith('.html') && !f.startsWith('google'));
const exists = async p => access(p).then(() => true, () => false);
const attr = (tag, n) => (tag.match(new RegExp(`\\b${n}=("([^"]*)"|'([^']*)')`, 'i')) || [])[2] ?? (tag.match(new RegExp(`\\b${n}=("([^"]*)"|'([^']*)')`, 'i')) || [])[3];
const inbound = new Map(files.map(f => [f, 0]));
const titles = new Map(), descs = new Map();
for (const f of files) {
  const html = await readFile(path.join(root, f), 'utf8');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const desc = (html.match(/<meta[^>]+name="description"[^>]*>/i) || [])[0];
  const descC = desc && attr(desc, 'content');
  const canon = (html.match(/<link[^>]+rel="canonical"[^>]*>/i) || [])[0];
  const canonH = canon && attr(canon, 'href');
  const is404 = f === '404.html';
  rec('meta', `${f} title`, title ? 'PASS' : 'FAIL', title);
  rec('meta', `${f} description`, descC ? 'PASS' : 'FAIL', descC);
  titles.set(title, [...(titles.get(title) || []), f]); descs.set(descC, [...(descs.get(descC) || []), f]);
  rec('meta', `${f} html lang`, /<html[^>]+lang="en"/i.test(html) ? 'PASS' : 'FAIL');
  rec('meta', `${f} viewport`, /name="viewport"/i.test(html) ? 'PASS' : 'FAIL');
  rec('meta', `${f} one h1`, (html.match(/<h1[\s>]/gi) || []).length === 1 ? 'PASS' : 'FAIL', `${(html.match(/<h1[\s>]/gi) || []).length} h1`);
  if (!is404) {
    const want = f === 'index.html' ? `${expected}/` : `${expected}/${f}`;
    rec('canonical', `${f} canonical`, canonH === want ? 'PASS' : 'FAIL', `${canonH} (expected ${want})`);
    rec('meta', `${f} not noindex`, /noindex/i.test(html) ? 'FAIL' : 'PASS');
  } else rec('meta', '404.html noindex', /name="robots"[^>]*noindex|noindex[^>]*name="robots"/i.test(html) ? 'PASS' : 'FAIL');
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) rec('images', `${f} img alt`, attr(m[0], 'alt') !== undefined ? 'PASS' : 'FAIL', m[0].slice(0, 80));
  for (const m of html.matchAll(/<(?:a|link|script|img)\b[^>]*\b(?:href|src)="([^"]+)"[^>]*>/gi)) {
    const u = m[1]; if (/^(https?:|mailto:|tel:|data:)/i.test(u)) { if (u.includes('your-netlify-site')) rec('links', `${f} placeholder domain`, 'FAIL', u); continue; }
    const [p, hash] = u.split('#'); const target = p ? p.split('?')[0] : f;
    const ok = await exists(path.join(root, target));
    if (!ok) rec('links', `${f} -> ${u}`, 'FAIL', 'missing target');
    else { if (/\.html$/.test(target) && /^<a/i.test(m[0]) && target !== f) inbound.set(target, (inbound.get(target) || 0) + 1);
      if (hash && target.endsWith('.html')) { const th = await readFile(path.join(root, target), 'utf8'); if (!new RegExp(`id="${hash}"`).test(th)) rec('links', `${f} -> ${u}`, 'FAIL', 'missing anchor'); } }
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) { try { JSON.parse(m[1]); rec('structured-data', `${f} JSON-LD parses`, 'PASS'); } catch (e) { rec('structured-data', `${f} JSON-LD parses`, 'FAIL', e.message); } }
}
for (const [k, v] of titles) if (v.length > 1) rec('meta', 'duplicate title', 'FAIL', v.join(','));
for (const [k, v] of descs) if (v.length > 1) rec('meta', 'duplicate description', 'FAIL', v.join(','));
for (const [f, n] of inbound) if (n === 0 && f !== 'index.html' && f !== '404.html') rec('architecture', `${f} orphan check`, 'FAIL', 'no inbound anchor links');
const sm = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
rec('sitemap', 'namespace', sm.includes('http://www.sitemaps.org/schemas/sitemap/0.9') ? 'PASS' : 'FAIL');
rec('sitemap', 'no duplicates', new Set(locs).size === locs.length ? 'PASS' : 'FAIL');
for (const l of locs) {
  const u = new URL(l); const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
  rec('sitemap', `${l} origin`, u.origin === expected ? 'PASS' : 'FAIL', `origin ${u.origin}`);
  rec('sitemap', `${l} file exists`, await exists(path.join(root, f)) ? 'PASS' : 'FAIL');
}
for (const f of files.filter(f => f !== '404.html')) { const want = f === 'index.html' ? `${expected}/` : `${expected}/${f}`; rec('sitemap', `${f} listed`, locs.includes(want) ? 'PASS' : 'FAIL'); }
rec('sitemap', '404 excluded', locs.some(l => l.includes('404')) ? 'FAIL' : 'PASS');
const rb = await readFile(path.join(root, 'robots.txt'), 'utf8');
rec('robots', 'sitemap reference', rb.includes(`Sitemap: ${expected}/sitemap.xml`) ? 'PASS' : 'FAIL', rb.trim());
rec('robots', 'no Disallow /', /Disallow:\s*\/\s*$/m.test(rb) ? 'FAIL' : 'PASS');
const tally = {}; for (const r of results) tally[r.status] = (tally[r.status] || 0) + 1;
for (const r of results.filter(r => r.status === 'FAIL')) console.log(`FAIL [${r.area}] ${r.name} ${r.detail}`);
console.log(JSON.stringify(tally));
if (process.env.JSON_OUT) (await import('node:fs')).writeFileSync(process.env.JSON_OUT, JSON.stringify(results, null, 1));
process.exit(tally.FAIL ? 1 : 0);
