/**
 * Generate domain-aware SEO files for WaveShift.
 * Netlify provides URL during connected builds. Set SITE_URL in Netlify
 * environment variables when a custom domain should be the canonical host.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fallback = 'https://waveshift.netlify.app';
const rawSiteUrl = process.env.SITE_URL || process.env.URL || fallback;
let siteUrl;
try {
  siteUrl = new URL(rawSiteUrl).origin.replace(/\/$/, '');
} catch {
  console.error(`Invalid SITE_URL/URL value: ${rawSiteUrl}`);
  process.exit(1);
}
const usingFallback = !process.env.SITE_URL && !process.env.URL;
if (usingFallback) {
  console.warn(`WaveShift SEO: SITE_URL/URL not set; using default ${fallback}. Set SITE_URL in Netlify when a custom domain is the canonical host.`);
} else {
  console.log(`WaveShift SEO: generating URLs for ${siteUrl}`);
}

const pageFiles = [
  'index.html',
  'mp3-to-wav.html',
  'wav-to-mp3.html',
  'wav-compressor.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
];
const pageInfo = [];
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const pageUrl = (file) => file === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${file}`;

function getMeta(html, name) {
  const patterns = [
    new RegExp(`<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, 'i'),
    new RegExp(`<meta\\b(?=[^>]*\\bproperty=["']${name}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return match[1];
  }
  return '';
}
function removeTag(html, attribute, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>\\s*`, 'gi');
  return html.replace(re, '');
}
function setJsonLdUrls(html, canonical, title, description) {
  const re = /<script\b([^>]*type=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;
  html = html.replace(re, (whole, attrs, json) => {
    try {
      const data = JSON.parse(json);
      // Replace the generated WebPage and homepage WebSite blocks on every build.
      if (data && data['@type'] === 'WebPage' && data['@id']?.endsWith('#webpage')) return '';
      if (data && data['@type'] === 'WebSite' && String(data['@id'] || '').endsWith('/#website')) return '';
      const walk = (value) => {
        if (Array.isArray(value)) return value.forEach(walk);
        if (value && typeof value === 'object') {
          if (value['@type'] === 'SoftwareApplication') value.url = canonical;
          for (const child of Object.values(value)) walk(child);
        }
      };
      walk(data);
      return `<script${attrs}>${JSON.stringify(data)}</script>`;
    } catch (error) {
      console.warn(`Could not parse an existing JSON-LD block: ${error.message}`);
      return whole;
    }
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
  };
  const schemaTags = [`<script type="application/ld+json">${JSON.stringify(pageSchema)}</script>`];
  if (canonical === `${siteUrl}/`) {
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: 'WaveShift',
      description: 'Browser-based audio conversion tools for MP3, WAV, FLAC, OGG and M4A.',
      inLanguage: 'en',
    };
    schemaTags.push(`<script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>`);
  }
  return html.replace(/\s*<\/head>/i, `${schemaTags.join('')}\n</head>`);
}

for (const file of pageFiles) {
  const fullPath = path.join(root, file);
  let html = await readFile(fullPath, 'utf8');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'WaveShift').trim();
  const description = getMeta(html, 'description').trim();
  const canonical = pageUrl(file);
  const ogImage = `${siteUrl}/assets/og/waveshift-social-preview.png`;

  // Remove previous versions before inserting a single consistent tag for each field.
  html = html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi, '');
  for (const field of ['og:type', 'og:title', 'og:description', 'og:url', 'og:site_name', 'og:locale', 'og:image', 'og:image:width', 'og:image:height', 'og:image:type', 'og:image:alt']) {
    html = removeTag(html, 'property', field);
  }
  for (const field of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    html = removeTag(html, 'name', field);
  }
  if (file === '404.html') {
    html = removeTag(html, 'name', 'robots');
  }

  const metadata = [
    `<link rel="canonical" href="${esc(canonical)}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="WaveShift"/>`,
    `<meta property="og:locale" content="en_US"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(description)}"/>`,
    `<meta property="og:url" content="${esc(canonical)}"/>`,
    `<meta property="og:image" content="${esc(ogImage)}"/>`,
    `<meta property="og:image:width" content="1200"/>`,
    `<meta property="og:image:height" content="630"/>`,
    `<meta property="og:image:type" content="image/png"/>`,
    `<meta property="og:image:alt" content="WaveShift online audio converter"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(description)}"/>`,
    `<meta name="twitter:image" content="${esc(ogImage)}"/>`,
    `<meta name="twitter:image:alt" content="WaveShift online audio converter"/>`,
  ];
  if (file === '404.html') metadata.push('<meta name="robots" content="noindex,follow"/>');
  html = html.replace(/\s*<\/head>/i, `${metadata.join('')}\n</head>`);
  html = setJsonLdUrls(html, canonical, title, description);
  await writeFile(fullPath, html, 'utf8');
  pageInfo.push({ file, title, description, url: canonical });
}


// The 404 page is intentionally excluded from the sitemap and must not be indexed.
const notFoundPath = path.join(root, '404.html');
let notFoundHtml = await readFile(notFoundPath, 'utf8');
notFoundHtml = notFoundHtml.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi, '');
notFoundHtml = removeTag(notFoundHtml, 'name', 'robots');
notFoundHtml = notFoundHtml.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow"/></head>');
await writeFile(notFoundPath, notFoundHtml, 'utf8');


// Sitemap: only canonical, indexable pages. Keep 404.html out of it.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pageInfo.map((page) => `  <url><loc>${page.url.replaceAll('&', '&amp;')}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap, 'utf8');

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
await writeFile(path.join(root, 'robots.txt'), robots, 'utf8');

const toolLinks = [
  ['Online Audio Converter', `${siteUrl}/`, 'Convert supported audio files to MP3, WAV, FLAC, OGG or M4A in a browser.'],
  ['MP3 to WAV Converter', `${siteUrl}/mp3-to-wav.html`, 'Create a WAV version of an MP3 for editing or software that requires WAV.'],
  ['WAV to MP3 Converter', `${siteUrl}/wav-to-mp3.html`, 'Convert WAV audio to MP3 and select an output bitrate.'],
  ['WAV Compressor', `${siteUrl}/wav-compressor.html`, 'Create a smaller MP3 copy or a lossless FLAC copy from a WAV file.'],
];
const infoLinks = [
  ['About WaveShift', `${siteUrl}/about.html`],
  ['Privacy Policy', `${siteUrl}/privacy.html`],
  ['Terms of Use', `${siteUrl}/terms.html`],
  ['Contact', `${siteUrl}/contact.html`],
];
const llms = `# WaveShift\n\n> WaveShift is a browser-based audio conversion website. Visitors can select audio files, choose an output format, convert files in their browser, and download the results.\n\nWaveShift is designed for people who need straightforward audio format conversion and WAV compression. The website is written in English and is intended for a worldwide audience.\n\n## Main tools\n\n${toolLinks.map(([name, url, desc]) => `- [${name}](${url}): ${desc}`).join('\n')}\n\n## About and policies\n\n${infoLinks.map(([name, url]) => `- [${name}](${url})`).join('\n')}\n\n## Supported formats and workflow\n\n- Output formats offered by the main converter: MP3, WAV, FLAC, OGG, and M4A.\n- The file picker accepts common audio extensions including MP3, WAV, M4A, AAC, FLAC, OGG, OGA, OPUS, WMA, AIFF, and AIF. Actual support depends on the codec contained in the file.\n- Multiple files can be selected. The website processes them sequentially and provides a separate download for each converted file.\n- MP3 and M4A output offers bitrate choices of 128, 192, 256, and 320 kbps.\n- WAV compression offers MP3 for smaller lossy output or FLAC for lossless compression.\n\n## Privacy and technical notes\n\n- Audio conversion runs in the visitor's browser. The website does not provide a WaveShift audio-upload endpoint or server-side audio storage.\n- The browser downloads the FFmpeg WebAssembly conversion engine from a public CDN when conversion is first used. This is separate from uploading the visitor's audio file.\n- Large audio files may use significant browser memory and device resources. Conversion speed depends on the visitor's device, browser, file length, and codec.\n- Converting a lossy file to WAV does not restore audio information removed by an earlier lossy encode.\n- The website does not claim that format conversion improves the source recording's sound quality.\n\n## Full reference\n\n- [Full WaveShift reference](${siteUrl}/llms-full.txt): a longer description of the tools, supported formats, browser processing, and practical limitations.\n\n## Preferred sources\n\nFor current tool behavior, use the individual tool pages linked above. For data handling and site policies, use the Privacy Policy and Terms of Use.\n`;
await writeFile(path.join(root, 'llms.txt'), llms, 'utf8');

const llmsFull = `# WaveShift: Site and Tool Reference\n\n## Site purpose\n\nWaveShift provides simple browser-based audio conversion tools. Its main workflow is: choose or drop one or more audio files, select an output format and quality setting, run the conversion, and download the resulting file. An account is not required.\n\n## Main converter\n\nURL: ${siteUrl}/\n\nThe general converter supports MP3, WAV, FLAC, OGG, and M4A output. It accepts common audio-file extensions such as MP3, WAV, M4A, AAC, FLAC, OGG, OGA, OPUS, WMA, AIFF, and AIF. Support can vary with the source codec. Users can select multiple files; the site processes them one at a time and provides individual downloads.\n\n## MP3 to WAV\n\nURL: ${siteUrl}/mp3-to-wav.html\n\nThis tool creates a WAV copy from an MP3 source. WAV may be useful for editing workflows or software that requires WAV. Converting MP3 to WAV does not restore sound information that was removed when the MP3 was encoded. The original MP3 is not modified.\n\n## WAV to MP3\n\nURL: ${siteUrl}/wav-to-mp3.html\n\nThis tool converts WAV audio to MP3. Available bitrate choices are 128, 192, 256, and 320 kbps. A lower bitrate usually produces a smaller file and removes more audio information. A higher bitrate generally creates a larger file. The best setting depends on the intended use and the source recording.\n\n## WAV Compressor\n\nURL: ${siteUrl}/wav-compressor.html\n\nThis tool creates a smaller file from WAV audio. MP3 is a lossy choice for smaller files and easy sharing. FLAC is a lossless choice that preserves the decoded audio data. The amount of space saved by FLAC depends on the source recording.\n\n## Privacy and processing\n\nWaveShift processes audio in the visitor's browser. It does not provide a WaveShift audio-upload endpoint or server-side audio storage. The browser downloads the FFmpeg WebAssembly engine from a public CDN when the first conversion is started. Audio conversion itself happens on the visitor's device. Large files can be limited by available memory, CPU power, and browser support.\n\nPrivacy policy: ${siteUrl}/privacy.html\nTerms of use: ${siteUrl}/terms.html\nAbout: ${siteUrl}/about.html\nContact: ${siteUrl}/contact.html\n\n## General guidance\n\n- Use MP3 when a small, widely supported file is important.\n- Use WAV for uncompressed audio workflows and compatible editing software.\n- Use FLAC when lossless compression is preferred.\n- Do not expect a conversion to improve the sound quality of the source.\n- Keep an original copy of important recordings before converting them.\n`;
await writeFile(path.join(root, 'llms-full.txt'), llmsFull, 'utf8');

console.log(`Generated sitemap.xml, robots.txt, llms.txt and llms-full.txt for ${siteUrl}`);
