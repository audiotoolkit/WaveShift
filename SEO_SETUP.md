# WaveShift SEO files and launch setup

WaveShift generates domain-specific SEO files during the Git-connected Netlify build. The build script reads the actual Netlify site URL or the custom canonical URL that you set in Netlify.

## Files and metadata

- `sitemap.xml`: lists the homepage, the three primary tool pages, and the About, Contact, Privacy, and Terms pages. It excludes `404.html`.
- `robots.txt`: allows normal crawling and points crawlers to the sitemap.
- `llms.txt`: concise site and tool information for AI assistants and language-model crawlers.
- `llms-full.txt`: a longer reference covering the tools, supported formats, browser processing, privacy model, and limitations.
- Canonical links on indexable HTML pages.
- Meta descriptions, Open Graph metadata, and Twitter large-image card metadata.
- JSON-LD structured data for WebPage, WebSite, SoftwareApplication, and the FAQ content that appears on relevant pages.
- `noindex,follow` on the 404 page. The 404 page is not listed in the sitemap.
- A 1200 x 630 social preview image at `assets/og/waveshift-social-preview.png`.

The `llms.txt` files are supplementary discovery documents. They are not a guaranteed Google ranking factor, do not guarantee that an AI system will cite the website, and do not replace normal SEO work.

## Domain handling

The generator reads `SITE_URL` first and then Netlify's read-only `URL` build variable. Netlify documents `URL` as the main address for the site, which can be the Netlify subdomain or a configured custom domain. See the [Netlify build environment variable documentation](https://docs.netlify.com/build/configure-builds/environment-variables/).

When you add a custom domain and want it to be canonical:

1. Open **Netlify → Site configuration → Environment variables**.
2. Add a variable named `SITE_URL`.
3. Set its value to the full origin, for example `https://www.example.com`, with no page path and no trailing slash.
4. Make sure the variable is available to Builds.
5. Trigger a new production deploy.

The sitemap, robots file, canonical URLs, Open Graph URLs, JSON-LD URLs, and LLM reference links will then use that domain.

If the build runs outside Netlify and `SITE_URL` is not set, the script uses a clearly marked placeholder domain. Do not submit that placeholder sitemap to search engines. Set `SITE_URL` before a production build outside Netlify.

## Netlify build settings

Use a Git-connected Netlify deployment so `scripts/generate-seo.mjs` runs. The `netlify.toml` file sets:

- Build command: `node scripts/generate-seo.mjs`
- Publish directory: `.`

No npm packages need to be installed for the SEO generation script. A manual drag-and-drop deploy does not run the build command, so it will not refresh domain-specific files.

## Search engine submission

After the site is live on its intended canonical domain:

1. Open `/sitemap.xml` and check that all listed URLs use the canonical domain.
2. Open `/robots.txt` and check that its `Sitemap:` line points to that same domain.
3. Add the domain property to Google Search Console and submit the sitemap.
4. Optionally add the site to Bing Webmaster Tools and submit the sitemap there.
5. Use the actual verification value supplied by Google or Bing if you choose HTML verification. Do not invent a verification token.
6. Check URL Inspection for the homepage and the three tool pages after they have been deployed.

A valid sitemap helps search engines discover URLs. Submission does not guarantee crawling, indexing, rankings, or traffic.

## AdSense file

Do not create `ads.txt` with a guessed publisher ID. Add the exact `ads.txt` line supplied by Google AdSense only after you have your publisher ID and the account setup requires it.

## Launch checklist

- [ ] Replace the temporary Netlify site URL with your final canonical domain when ready.
- [ ] Confirm HTTPS works on the canonical domain.
- [ ] Confirm sitemap and robots file return successfully.
- [ ] Confirm the 404 page is not in the sitemap and has `noindex,follow`.
- [ ] Check page titles, descriptions, canonical URLs, and social preview image.
- [ ] Test structured data with Google's Rich Results Test or Schema Markup Validator. Structured data does not guarantee rich results.
- [ ] Test all converters on desktop and mobile browsers.
- [ ] Add accurate contact details and review privacy and terms pages.
- [ ] Add analytics and advertising code only after deciding what data is collected and updating privacy disclosures.
