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

## Synced files

`css/styles.css`, `css/mortgage-calculator.css`, and `js/mortgage-calculator.js`
are copies of files that live in the
[buildwithbaker](https://github.com/buildwithbaker/buildwithbaker) repo. They are
copies, not links - nothing in git holds them together, so they drift. They have
drifted before: this repo served a calculator carrying seven arithmetic and
input-handling bugs that had already been fixed on the main site, plus a console
error on every load, while the README claimed the files were byte-identical.

What catches drift now is the `Synced files` GitHub Actions job in
`.github/workflows/sync-check.yml`. It clones buildwithbaker, diffs all three
files, prints the diff, and fails the build on any difference - on every push and
pull request, and once a week so drift introduced upstream after the last sync
surfaces too. The upstream ref it compares against is `UPSTREAM_REF` in that
workflow.

The same check by hand:

```bash
git clone --depth 1 https://github.com/buildwithbaker/buildwithbaker /tmp/bwb
for f in css/styles.css css/mortgage-calculator.css js/mortgage-calculator.js; do
  diff -u "/tmp/bwb/$f" "$f" && echo "ok  $f"
done
```

Fix bugs in buildwithbaker first, then copy the file across. Editing these three
files here forks the two copies silently. Standalone-only changes belong in
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

GitHub Pages serves `main` / root. `main` is protected, so changes ship through a pull
request: branch, commit, push the branch, open a PR, squash-merge. It goes live on the
merge. See `CLAUDE.md` for the full flow.

## License

MIT - see [LICENSE](LICENSE).
