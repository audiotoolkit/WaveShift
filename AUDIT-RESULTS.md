# WaveShift Audit Results

Audit date: 2026-11-14. Original project backed up before changes (source: WaveShift-main.zip).
Environment: sandbox with **no outbound network**, Chromium 153 via Playwright. Firefox and WebKit are not installed.
Status key: PASS / FAIL / BLOCKED / NOT TESTED / NOT APPLICABLE. Evidence JSON is in `audit/results/`.

## Issues confirmed and fixed

| # | Severity | Issue | Root cause | Fix | Re-test |
|---|----------|-------|------------|-----|---------|
| 1 | High | Canonicals, og:url/og:image, JSON-LD URLs, sitemap.xml, robots.txt, llms.txt all pointed to placeholder `your-netlify-site.netlify.app` (baseline: 34 FAIL) | Committed generated files used a placeholder; generator fallback was the placeholder | Generator fallback set to `https://waveshift.netlify.app`; files regenerated | static audit: 104 PASS / 0 FAIL |
| 2 | Medium | Stale placeholder `WebSite` JSON-LD block survived regeneration and a second `WebSite` block was added | Generator only removed blocks whose `@id` matched the *current* origin | Match any `/#website` `@id` | Single WebSite block on index; no placeholder strings remain |
| 3 | Low | Generator not idempotent (blank line added before `</head>` on each run) | Insertion did not trim preceding whitespace | Trim whitespace before insertion | Output md5 identical across consecutive runs |
| 4 | Medium | `wav-compressor.html` horizontal overflow (34px) at 320px viewport | Format table wider than viewport | Table wrapped in focusable scroll region (`.table-scroll`) on 4 pages | browser audit: 0 overflow at all 6 viewports on all 8 pages |
| 5 | Medium | Hidden file `<input>` had no accessible name and was an invisible tab stop | Visually hidden input without label | `aria-label` + `tabindex="-1"` (the visible Browse button is the keyboard path) | DOM a11y check PASS on all pages |
| 6 | Low | Misleading generator warning ("placeholder domain") | Compared against fallback value | Warn only when SITE_URL/URL unset | Run output verified |
| 7 | Low | No clickjacking protection header | Missing from `_headers` | Added `X-Frame-Options: DENY` | File inspected only; **live header not verified** |

## Test results by category

| Category | Method | Status | Notes |
|---|---|---|---|
| Route discovery | Static: directory + nav/footer links | PASS | 8 indexable pages + 404.html + google verification file. Static site, no dynamic routes. |
| Internal links and anchors | Static script | PASS | All local hrefs/srcs resolve; all `#anchors` exist. External links NOT TESTED (no network). |
| Orphan pages | Static script | PASS | 404.html intentionally unlinked (excluded). |
| HTTP status (local server) | Browser | PASS | 8 pages 200; unknown path returns 404. Netlify behavior itself NOT TESTED. |
| Sitemap | Static | PASS | Namespace, no duplicates, correct origin, files exist, 404 excluded. XML schema validator NOT RUN. Live fetch BLOCKED. |
| robots.txt | Static | PASS | Allow all, sitemap reference correct. Live fetch BLOCKED. |
| Metadata and canonicals | Static | PASS | Unique titles/descriptions, lang, viewport, one h1, canonical per page, 404 noindex. |
| Alt text/images | Static | NOT APPLICABLE / PASS | No `<img>` elements in pages. OG image 1200x630 PNG referenced; its file exists. |
| Structured data | JSON-LD parse | PASS (syntax only) | External validators BLOCKED. FAQPage markup is valid but Google restricts FAQ rich results to authoritative gov/health sites; kept as harmless. |
| Responsive (Chromium emulation) | Browser | PASS | 320x568, 375x812, 430x932, 768x1024, 1366x768, 1920x1080, all 8 pages, no horizontal overflow. Not physical devices. |
| Mobile menu | Browser | PASS | Open/close and `aria-expanded`. |
| Tool UI (index, mp3-to-wav, wav-to-mp3, wav-compressor) | Browser | PASS | Button disabled when empty, files list, remove, clear, compressor rejects non-WAV with notice, bitrate toggle by format. |
| **Actual audio conversion output** | Browser | **BLOCKED** | FFmpeg core/wrapper load from jsDelivr; sandbox has no network. Conversion correctness, copy/download of results, MP3/WAV/FLAC/OGG/M4A outputs, large-file limits and memory behavior are **NOT VERIFIED**. Test on the live HTTPS site before relying on it. |
| FAQ accordion | Browser | PASS | One open at a time. |
| Accessibility | Automated DOM checks only | PARTIAL | Names for controls, landmark, skip link, no skipped heading levels: PASS. axe/Lighthouse, color contrast, screen reader, keyboard focus order, zoom NOT TESTED. Not proof of WCAG 2.2 AA. |
| Performance | Local lab PerformanceObserver | PASS (lab only) | LCP 104-188 ms, CLS 0 on 3 pages x 2 viewports, local server without throttling or CDN fonts. Not field data. Lighthouse, INP NOT TESTED. |
| Console errors | Browser | PASS | No JS errors or local-resource errors. External Google Fonts/CDN requests untestable offline. |
| Browser compatibility | Chromium only | PASS (Chromium) / NOT TESTED (Firefox, WebKit/Safari, Edge, mobile browsers) | |
| Security | Static inspection | PARTIAL | No server code, no secrets found in source, no cookies/storage use found, DOM built with textContent (no innerHTML in converter). `npm audit` NOT APPLICABLE (no npm dependencies). No CSP, and no SRI on CDN code: not added because it cannot be validated offline and a wrong CSP would break conversion. Recommended: add CSP allowing jsdelivr, Google Fonts, `blob:` workers and `wasm-unsafe-eval` after testing on a Netlify deploy preview. |
| Privacy | Static review | PARTIAL | No analytics/tracking found. Pages state processing is in-browser, consistent with code. privacy.html discloses the jsDelivr engine download and Google Fonts (verified by reading the page text). No analytics, cookie or storage code found by grep in assets/js and HTML. |
| Deployment and HTTP (HTTPS, redirects, headers, TLS, caching) | | BLOCKED | No network. Live site not reached. |
| Content/niche | Manual read of source | PARTIAL | No placeholder text except contact page, below. |

## Unresolved items (need your action)

1. **contact.html has no real public email or form** (README already flags this). Not fabricated here.
2. Converter output must be verified on the live site (see BLOCKED above).
3. Licensing: FFmpeg core is GPL-2.0-or-later (see README) before monetisation.
4. Netlify sets `URL` per deploy; deploy previews/branch deploys will emit canonicals for their own URL. Set `SITE_URL` in the production context only.
5. Google Search Console submission, indexing status: NOT TESTED.

## Reproduce
`npm run audit` (see README). Baseline (before fixes): `audit/results/baseline-static-BEFORE-fixes.json`.
