# Mortgage Calculator

A free home affordability calculator, installable as a PWA.
Live at **[mortgage.buildwithbaker.io](https://mortgage.buildwithbaker.io/)**.

Estimate your monthly payment, front/back-end DTI ratios, closing costs, when PMI
drops off, and how extra payments shorten the loan. Everything runs in the
browser — no login, no tracking, nothing leaves the device.

## Running locally

No build step. Serve the folder over HTTP (a service worker won't register from
`file://`):

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Layout

```
index.html               the whole app
manifest.webmanifest     PWA manifest
sw.js                    cache-first service worker
CNAME                    custom domain for GitHub Pages
css/styles.css           Build with Baker base styles (synced from buildwithbaker)
css/mortgage-calculator.css  calculator-specific styles (synced from buildwithbaker)
css/app.css              standalone-only overrides (nav, install button, toast)
css/fonts/               self-hosted Inter (400/500/600/700)
js/mortgage-calculator.js    calculator logic (synced from buildwithbaker)
js/app.js                service-worker registration, install prompt, theme toggle
images/                  icons and the Open Graph card
```

`css/styles.css`, `css/mortgage-calculator.css`, and `js/mortgage-calculator.js`
are kept byte-identical to their counterparts in the
[buildwithbaker](https://github.com/buildwithbaker/buildwithbaker) repo so they
can be re-synced with a straight copy. Standalone-only changes live in
`css/app.css` and `js/app.js`.

## Notes

- The page ships a strict CSP (`script-src 'self'`, no `unsafe-inline`), so all
  JavaScript must stay in external files.
- Light/dark mode uses the `html[data-theme]` palette already in `styles.css`.
  On the parent site the toggle lives in `js/nav.js`, which this app doesn't
  ship — it's reimplemented in `js/app.js` (same `bwb-theme` storage key).
- **Bump `CACHE` in `sw.js` whenever an asset changes**, or returning visitors
  keep serving the old copy from cache.

## Deploying

GitHub Pages serves `main` / root. Push to `main` and it goes live.

## License

MIT
