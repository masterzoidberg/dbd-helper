# DBD Field Guide

A fast Dead by Daylight companion designed for a second monitor or phone while playing. Survivor perks are being ranked and added five at a time.

## Live site

Expected URL: https://masterzoidberg.github.io/dbd-helper/

GitHub Pages deploys automatically from `.github/workflows/pages.yml` whenever `main` changes. The workflow extracts the verified repository snapshot in `source/dbd-helper-full-source.zip` and publishes its `site/` directory.

## Current content

- Dark responsive desktop/mobile shell
- Home quick search
- Survivor Perks, Killer Perks, Killer Guides, Survivor Guide, and Glossary
- Survivor perks ranked through #10
- Live-as-you-type perk search
- Tier and role filters
- Independent Important Details and Full Analysis panels
- PWA manifest and service worker
- Canonical audited live 10.1.2a mechanics data: 176 Survivor perks and 151 Killer perks

## Source

`source/dbd-helper-full-source.zip` is the complete verified project snapshot, including site source, tests, build/verification scripts, design/implementation docs, canonical perk JSON, audit reports, and PWA assets.

The site is base-path aware, so the same snapshot works locally at `/` and on GitHub Pages under `/dbd-helper/`.
