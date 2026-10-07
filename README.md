# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perk mechanics and editorial ranking are kept separate so balance updates do not silently rewrite opinionated analysis.

## Live site

https://masterzoidberg.github.io/dbd-helper/

GitHub Pages deploys automatically from `.github/workflows/pages.yml` whenever `main` changes. The workflow builds Survivor perk runtime data from JSON, runs the data tests, then publishes the static `site/` directory.

## Current content

- Dark responsive desktop/mobile shell
- Home quick search
- Survivor Perks, Killer Perks, Killer Guides, Survivor Guide, and Glossary
- Complete 176-perk Survivor editorial ranking stored in the v15 master dataset
- 10 Survivor perks currently approved for publication, displayed at their true global ranks
- Live-as-you-type perk search
- Tier and role filters
- Independent Important Details and Full Analysis panels
- PWA manifest and service worker
- Survivor mechanics baseline verified against live 10.2.0 on 2026-10-06

## Survivor data workflow

The website consumes JSON records under `content/survivor/perks/`. Each published perk file keeps verified factual mechanics separate from editorial ranking, roles, synergies, counters, analysis, and verdict.

`scripts/build-survivor-data.mjs` validates perk IDs and global ranks, filters runtime records by `publicationStatus: "published"`, preserves their true global ranks, synchronizes visible patch metadata, and generates the five browser data modules used by the site.

Publication is identity-based. Reranking a perk does not automatically publish or unpublish it.

See `content/survivor/README.md` for the file layout and publication workflow.

## Canonical mechanics and editorial

The full Survivor master data is maintained separately from the lean GitHub Pages runtime. The current v15 master contains all 176 Survivor mechanics/editorial records. The GitHub site source contains the records deliberately approved for public display.

Editorial judgment remains separate from mechanics so a balance patch can update factual effects without silently rewriting tier placement or analysis.

## Hosting

The site is base-path aware, so the same static source works locally at `/` and on GitHub Pages under `/dbd-helper/`.
