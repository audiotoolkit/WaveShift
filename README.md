# WaveShift: Fresh Audio Converter Website

A new, static, responsive audio-converter website. GitHub stores the source code and Netlify builds and hosts the live site. This project is separate from the earlier AudioToolkit website.

## Included pages

- `index.html`: general online audio converter
- `mp3-to-wav.html`: MP3 to WAV converter and guide
- `wav-to-mp3.html`: WAV to MP3 converter and guide
- `wav-compressor.html`: WAV compression tool and guide
- `about.html`, `contact.html`, `privacy.html`, `terms.html`, and `404.html`

## Functionality

- Drag-and-drop and multi-file selection
- Browser-side conversion through FFmpeg WebAssembly
- MP3, WAV, FLAC, OGG, and M4A output choices
- Selectable MP3/M4A bitrate: 128, 192, 256, or 320 kbps
- Sequential batch conversion with individual download links
- No WaveShift audio-upload endpoint or server-side audio storage

The first conversion downloads the single-thread FFmpeg WebAssembly engine from jsDelivr. A small worker file is served from this website so the browser can use a same-origin worker. Conversion runs on the visitor's device. Large files may be limited by available memory and processing power.

## GitHub and Netlify deployment

The `netlify.toml` file configures the build and publish directory. No package installation is required, but the Netlify build uses Node.js to generate the domain-specific SEO files.

1. Extract the ZIP.
2. Open the `waveshift-website` folder. Put the **contents of this folder** at the root of a new GitHub repository. The root should contain `index.html`, `netlify.toml`, `_headers`, `scripts/`, `assets/`, and the other site files. Do not add an extra nested folder unless you also change Netlify's base directory.
3. Push the files to GitHub.
4. In Netlify, choose **Add new project → Import an existing project → GitHub**, authorize GitHub, and select the repository.
5. Netlify should read `netlify.toml`. Confirm the publish directory is `.`. The build command is `node scripts/generate-seo.mjs`.
6. Deploy the site. Netlify's `URL` build variable supplies the site's primary URL, so the build script can generate the canonical URLs, sitemap, robots file, and LLM reference files for the Netlify site automatically.
7. Test the main converter and all three tool pages on the HTTPS Netlify URL before sharing the site.
8. When you add a custom domain, set the `SITE_URL` environment variable in Netlify to the full canonical origin, such as `https://www.example.com`, with no path or trailing slash. Trigger a new deploy after changing it.
9. For later updates, push changes to the connected GitHub branch. Netlify will build and deploy the changes automatically.

A manual drag-and-drop deployment does not run the SEO generation script. Use a Git-connected Netlify deployment for the intended setup.

## SEO files included

The build script creates or updates:

- `sitemap.xml` with the indexable pages. The 404 page is excluded.
- `robots.txt` with a sitemap reference.
- `llms.txt`, a short, structured guide to the site.
- `llms-full.txt`, a longer reference for the site's tools, supported formats, processing model, and limitations.
- Canonical URLs, meta descriptions, Open Graph tags, and Twitter card tags.
- JSON-LD structured data for page information, the website, software tools, and visible FAQ content where included in the page.
- `noindex,follow` on the 404 page.

`llms.txt` is a supplementary discovery document. It is not a guaranteed search-ranking factor and does not replace useful pages, crawlable links, or a valid XML sitemap.

See `SEO_SETUP.md` for domain setup, Search Console submission, and a launch checklist.

## Before publishing publicly

1. Confirm that the canonical domain in Netlify is the domain you want indexed.
2. Add a real public contact email or a working contact form to `contact.html`.
3. Review `privacy.html` and `terms.html` so they match your final hosting, analytics, cookie, and advertising setup. These are starter pages, not legal advice.
4. No Google Tag Manager or analytics code is included. Add tracking only if you decide to use it, and update the privacy policy first.
5. Do not publish an `ads.txt` file with a made-up publisher ID. Add the exact line supplied by Google AdSense only if your account setup requires it.
6. Test conversion on the final Netlify HTTPS URL, including MP3, WAV, FLAC, OGG, and M4A output.
7. Submit the real-domain sitemap in Google Search Console after launch. Sitemap submission helps discovery but does not guarantee indexing or rankings.

## External runtime dependencies and licensing

- `@ffmpeg/ffmpeg` 0.12.10 JavaScript wrapper via jsDelivr CDN
- `@ffmpeg/core` 0.12.10 single-thread WebAssembly core via jsDelivr CDN
- Google Fonts: DM Sans and Manrope

The `@ffmpeg/core` package metadata identifies the core as GPL-2.0-or-later. Review the FFmpeg core and any linked codec or library licences before commercial distribution or monetisation. Loading the core from a CDN does not remove licence obligations.
