# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perks are being ranked and added five at a time.

## Live site

https://masterzoidberg.github.io/dbd-helper/

GitHub Pages deploys automatically from `.github/workflows/pages.yml` whenever `main` changes. The workflow publishes the static `site/` directory directly.

## Current content

- Dark responsive desktop/mobile shell
- Home quick search
- Survivor Perks, Killer Perks, Killer Guides, Survivor Guide, and Glossary
- Survivor perks ranked through #10
- Live-as-you-type perk search
- Tier and role filters
- Independent Important Details and Full Analysis panels
- PWA manifest and service worker
- Mechanics baseline verified against live 10.1.2a on 2026-10-05

## Data model

The public runtime keeps factual mechanics separate from editorial ranking and analysis. The current ranked top ten are derived from the audited mechanics datasets covering 176 Survivor perks and 151 Killer perks.

The full canonical audit JSON files are maintained separately from the lean GitHub Pages runtime so large archival datasets do not block deployment. They can be synced into the repository independently without changing the live site.

## Hosting

The site is base-path aware, so the same static source works locally at `/` and on GitHub Pages under `/dbd-helper/`.
