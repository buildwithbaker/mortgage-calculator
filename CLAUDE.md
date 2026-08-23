# CLAUDE.md - mortgage-calculator

See @README.md for what this project is.

A standalone home-affordability calculator PWA, live at
https://mortgage.buildwithbaker.io/. Everything runs in the browser - no login, no
tracking, nothing leaves the device.

## Run locally
No build step. A service worker will not register from `file://`, so serve over HTTP:
`python -m http.server 8080`, then open http://localhost:8080.

## Deploy
GitHub Pages serves `main` at the repo root; `CNAME` holds the custom domain
(`mortgage.buildwithbaker.io`). The site goes live when a PR merges to `main`.

## Branching (main is protected - PR only)

`main` is protected: direct pushes are rejected. **Never run `git push origin main`.**

1. `git checkout main && git pull origin main` - start from an up-to-date main
2. `git checkout -b <type>/<slug>` - branch BEFORE staging, so local `main` never diverges
3. edit, then `git add -- <explicit paths>` - never `git add -A`
4. `git commit -m "<message>"`
5. `git push -u origin <branch>`
6. `gh pr create --base main --fill`
7. `gh pr checks <branch> --watch` - wait for the required checks
8. `gh pr merge <branch> --squash --delete-branch`
9. `git checkout main && git pull origin main`

Never merge while a required check is failing or pending, and never disable a check to
force a merge through - stop and report instead.

## Synced files (byte-identical with buildwithbaker)
`css/styles.css`, `css/mortgage-calculator.css`, and `js/mortgage-calculator.js` are kept
byte-identical to their counterparts in the `buildwithbaker` repo so they can be re-synced
with a straight copy. **Fix bugs in `buildwithbaker` first, then copy across** - editing
them here forks the two copies silently. Standalone-only changes belong in `css/app.css`
and `js/app.js`.

## Do not touch
- **Bump `CACHE` in `sw.js` whenever any asset changes**, or returning visitors keep
  serving the old copy from cache.
- The page ships a strict CSP (`script-src 'self'`, no `unsafe-inline`) - all JavaScript
  must stay in external files. No inline `<script>`, no inline event handlers.
- `CNAME` is the custom domain - do not modify or remove.
- Light/dark uses the `html[data-theme]` palette from `styles.css`; the toggle is
  reimplemented in `js/app.js` against the same `bwb-theme` storage key the parent site
  uses. Keep that key.
