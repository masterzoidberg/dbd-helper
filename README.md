# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perks are being ranked and added five at a time.

## Live site

GitHub Pages is configured to publish the `site/` directory automatically whenever `main` changes.

Expected URL: `https://masterzoidberg.github.io/dbd-helper/`

The workflow lives at `.github/workflows/pages.yml`.

## Run locally

```bash
cd site
./serve.sh
```

Then open `http://localhost:4173`.

A local web server is required for service-worker/PWA behavior. The site is base-path aware, so the same source works locally at `/` and on GitHub Pages under `/dbd-helper/`. PWA installation requires localhost or HTTPS.

## Phase 1 includes

- Dark responsive desktop/mobile shell
- Home quick search
- Separate Survivor Perks and Killer Perks destinations
- Separate Killer Guides and general Survivor Guide destinations
- Survivor top-ten ranking seeded with live 10.1.2a mechanics
- Live-as-you-type perk search
- Tier and role filters that compose with search
- Collapsible tier groups
- Independent **Important Details** and **Full Analysis** expansions
- Glossary hover/focus/tap definitions plus a dedicated Glossary page
- PWA manifest, install icons, service-worker shell caching
- Canonical audited 10.1.2a Survivor and Killer mechanics datasets

## Canonical mechanics data

- `site/data/survivor-perks-live-10.1.2a.json` — 176 verified Survivor perk records
- `site/data/killer-perks-live-10.1.2a.json` — 151 verified Killer perk records
- `site/data/audits/` — second-pass audit reports

Mechanics and editorial ranking are intentionally separated. Later phases add rank, tier, roles, synergies, counters, and long analysis without rewriting the mechanics source of truth.

## Verify

```bash
./verify.sh
```

The browser verification uses the installed Python Playwright package when available. In this managed build environment Chromium blocks network navigation, so the verification script loads the exact generated HTML/CSS/JS in memory while the shell separately checks actual HTTP routes with a local server.

## Implementation note

The approved architecture targeted Next.js/React. The build environment used for this Phase 1 could not resolve `registry.npmjs.org`, so Phase 1 is delivered as a zero-dependency static PWA with the same information architecture and data separation. It can be migrated to Next.js later without changing the canonical JSON or editorial content model.
