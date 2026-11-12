# WaveShift — Fresh Audio Converter Website

A new, static, responsive audio-converter website designed for GitHub as the source-code repository and Netlify for hosting/deployment. This project is separate from the earlier AudioToolkit website.

## Included pages

- `index.html` — general online audio converter
- `mp3-to-wav.html` — dedicated MP3 to WAV tool and guide
- `wav-to-mp3.html` — dedicated WAV to MP3 tool and guide
- `wav-compressor.html` — WAV compression tool and guide (MP3 for smaller lossy files, FLAC for lossless compression)
- `about.html`, `privacy.html`, `terms.html`, `contact.html`, `404.html`

## Functionality

- Drag/drop and multi-file selection
- Browser-side conversion through FFmpeg WebAssembly
- MP3, WAV, FLAC, OGG and M4A output choices
- Selectable MP3/M4A bitrate (128, 192, 256, 320 kbps)
- Sequential batch conversion with individual download links
- No audio upload endpoint or server-side file storage

The first conversion downloads the single-thread FFmpeg WebAssembly engine from jsDelivr. A small worker bridge is served from this website to avoid trying to create the FFmpeg worker from a cross-origin CDN URL. Conversion itself runs in the visitor's browser. Large files may be limited by available device memory.

## GitHub + Netlify deployment

This folder contains a `netlify.toml` configured for a static site. No Node.js build or package installation is needed.

1. Extract the ZIP.
2. Open the `waveshift-website` folder. Put the **contents of this folder** (including `index.html`, `netlify.toml`, `_headers`, `assets/`, and `404.html`) at the root of a new GitHub repository. Do not leave them nested inside an extra `waveshift-website/` folder unless you also configure that folder as Netlify's base directory.
3. Push the files to GitHub.
4. In Netlify, choose **Add new project → Import an existing project → GitHub**, authorize GitHub, and select the repository.
5. Netlify should detect `netlify.toml`. Confirm the settings are: build command `echo 'WaveShift is a static site; no build step required.'` and publish directory `.` (repository root). Then select **Deploy**.
6. Netlify will provide a temporary `*.netlify.app` URL. Test all pages and conversions there.
7. For later updates, push commits to the connected GitHub branch. Netlify will automatically build/deploy each push. You do not need to upload the ZIP again.
8. Add a custom domain in Netlify only after choosing the final domain. Then update canonical URLs, `sitemap.xml`, and `robots.txt` to use that domain.

You can also deploy once by dragging the extracted project folder into Netlify Drop, but GitHub-connected deployment is recommended because future GitHub pushes deploy automatically.

## Before publishing publicly

1. Choose the final domain and add canonical URLs and a `sitemap.xml` with that real domain.
2. Add the owner's real public contact email or a functioning contact form to `contact.html`.
3. Review `privacy.html` and `terms.html` to match the final hosting, analytics, consent and advertising setup. The supplied pages are starter information, not legal advice.
4. The Google Tag Manager container `GTM-TMVGCV79` from the previous project is included on all HTML pages. Check that its tags and consent configuration are correct for the new site.
5. Configure AdSense only after approval. Add the actual publisher ID, ads.txt entry, consent handling and ad units supplied by Google; no placeholder ads or invented publisher ID are included.
6. Verify the browser conversion engine and all output formats on the final Netlify HTTPS URL before launch.

## SEO notes

The first launch focuses on the homepage, MP3 to WAV, WAV to MP3, and WAV compressor based on the uploaded Semrush Australia Keyword Magic export. The content is original and includes explanatory sections and user-question FAQs. Keyword metrics are not embedded in public pages because they change over time and should be monitored in Semrush.

## External runtime dependency and licensing

- `@ffmpeg/ffmpeg` 0.12.10 JavaScript wrapper via jsDelivr CDN.
- `@ffmpeg/core` 0.12.10 single-thread WebAssembly core via jsDelivr CDN.
- A same-origin worker bridge at `assets/js/ffmpeg-worker.js`.
- Google Fonts: DM Sans and Manrope.

The `@ffmpeg/core` package metadata identifies the core as GPL-2.0-or-later. Review the FFmpeg core and any linked codec/library licenses with a qualified professional before distributing the site commercially or monetizing it with ads. Do not assume that loading the core from a CDN removes license obligations.
