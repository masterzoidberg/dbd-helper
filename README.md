# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perk mechanics and editorial ranking are kept separate so balance updates do not silently rewrite opinionated analysis.

## Live site

https://masterzoidberg.github.io/dbd-helper/

GitHub Pages deploys automatically from `.github/workflows/pages.yml` whenever `main` changes. The workflow imports the canonical Survivor v15 archive into site JSON, builds the browser data, runs the data tests, then publishes the static `site/` directory.

## Current content

- Dark responsive desktop/mobile shell
- Home quick search
- Survivor Perks, Killer Perks, Killer Guides, Survivor Guide, and Glossary
- Complete 176-perk Survivor editorial ranking
- All 176 Survivor perks published at their true global ranks
- Live-as-you-type perk search
- Tier and role filters
- Independent Important Details and Full Analysis panels
- Mobile off-canvas filter drawer
- PWA manifest and service worker
- Survivor mechanics baseline verified against live 10.2.0 on 2026-10-06

## Survivor data workflow

`dbd-local-data-v15-release-candidate.zip` is the canonical Survivor source checked into the repository. It contains the frozen `survivor-mechanics.json` and the v15 `survivor-editorial.json`.

`scripts/import-survivor-v15.py` joins those two datasets by perk ID and deterministically regenerates `content/survivor/perks/` as one JSON record per perk. The import publishes all 176 perks while preserving their global ranks and keeping mechanics separate from editorial judgment.

`scripts/build-survivor-data.mjs` validates perk IDs and ranks, synchronizes visible patch metadata, and generates the five browser data modules used by the site.

The GitHub Pages workflow performs import → build → tests → deploy. The live smoke test verifies both #1 Will to Live and #176 Invocation: Treacherous Crows.

See `content/survivor/README.md` for the generated record layout.

## Canonical mechanics and editorial

Editorial judgment remains separate from mechanics so a balance patch can update factual effects without silently rewriting tier placement or analysis. The current baseline is live patch 10.2.0, verified 2026-10-06.

## Hosting

The site is base-path aware, so the same static source works locally at `/` and on GitHub Pages under `/dbd-helper/`.
