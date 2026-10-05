# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perks are being ranked and added five at a time.

## Live site

https://masterzoidberg.github.io/dbd-helper/

GitHub Pages deploys automatically from `.github/workflows/pages.yml` whenever `main` changes. The workflow builds Survivor perk runtime data from JSON, runs the data tests, then publishes the static `site/` directory.

## Current content

- Dark responsive desktop/mobile shell
- Home quick search
- Survivor Perks, Killer Perks, Killer Guides, Survivor Guide, and Glossary
- Survivor perks ranked through #15
- Live-as-you-type perk search
- Tier and role filters
- Independent Important Details and Full Analysis panels
- PWA manifest and service worker
- Mechanics baseline verified against live 10.1.2a on 2026-10-05

## Survivor data workflow

The source of truth for ranked Survivor perks is JSON under `content/survivor/perks/`, grouped in five-rank folders such as `001-005`, `006-010`, and `011-015`. Each perk file keeps verified factual mechanics separate from editorial ranking, roles, synergies, counters, analysis, and verdict.

`scripts/build-survivor-data.mjs` validates the JSON, enforces unique contiguous ranks, and generates the five browser data modules used by the site. That means future batches such as #16-20 are data additions rather than hand-edits to perk-card JavaScript.

See `content/survivor/README.md` for the file layout and batch workflow.

## Canonical mechanics

The ranked JSON records are copied from the audited live mechanics baseline covering 176 Survivor perks. The full canonical audit JSON is maintained separately from the lean GitHub Pages runtime because the large archival file exceeds the connector-safe size used for repository writes.

Editorial judgment remains separate from mechanics so a balance patch can update factual effects without silently rewriting tier placement or analysis.

## Hosting

The site is base-path aware, so the same static source works locally at `/` and on GitHub Pages under `/dbd-helper/`.
