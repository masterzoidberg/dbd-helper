# Survivor perk content model

Survivor perk site data is JSON-first. The canonical source is `dbd-local-data-v15-release-candidate.zip`, which contains the frozen live mechanics dataset and the v15 editorial ranking.

## Generated layout

Run:

```bash
python3 scripts/import-survivor-v15.py
```

The importer joins mechanics and editorial by perk ID, validates the complete 1–176 ranking, publishes all 176 records, and regenerates one site JSON file per perk under five-rank folders:

```text
content/survivor/perks/
  001-005/
    001-will-to-live.json
    002-lithe.json
    003-dead-hard.json
    004-resurgence.json
    005-unbreakable.json
  ...
  176-180/
    176-invocation-treacherous-crows.json
```

Each record keeps factual mechanics separate from editorial judgment:

- `mechanics`: live name/source/effect/activation/patch context derived from `survivor-mechanics.json`.
- `editorial`: global rank, tier, roles, ratings, use cases, counters, synergies, pros/cons, long analysis, verdict, and review metadata derived from `survivor-editorial.json`.

The importer also reconstructs display-friendly synergy names from the ID-based relationship fields. The canonical source files are not modified.

## Browser build

After importing, run:

```bash
node scripts/build-survivor-data.mjs
```

The generator validates the records, preserves global rank numbers, synchronizes the visible live patch metadata, and writes five browser modules under `site/assets/data-perks-01.js` through `data-perks-05.js`.

GitHub Pages runs the canonical import, generator, and full data tests before uploading the site artifact. The live site therefore comes from the checked-in v15 archive rather than hand-edited browser data.
