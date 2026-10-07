# Survivor perk content model

Survivor perk site data is authored as JSON. Each file represents one publicly approved perk and preserves its rank from the complete v15 global ranking.

## Layout

Published records are grouped into five-rank folders based on their global rank. Because publication follows perk identity, folders and ranks may have gaps.

```text
content/survivor/perks/
  001-005/
    001-will-to-live.json
    004-resurgence.json
    005-unbreakable.json
  ...
  046-050/
    050-windows-of-opportunity.json
```

Each perk file keeps factual mechanics separate from editorial judgment:

- `mechanics`: live name/source/effect/activation/patch context verified against the canonical mechanics dataset.
- `editorial`: global rank, tier, roles, ratings, use cases, counters, synergies, pros/cons, long analysis, verdict, review metadata, and publication status.

`editorialStatus` is review metadata and is not emitted into the browser record. `publicationStatus` controls whether a record is emitted. The public value is `published`.

## Build

Run:

```bash
node scripts/build-survivor-data.mjs
```

The generator validates unique IDs and unique positive global ranks, emits only `publicationStatus: "published"` records, keeps their global rank numbers unchanged, synchronizes the visible live patch metadata, and writes five browser modules under `site/assets/data-perks-01.js` through `data-perks-05.js`.

GitHub Pages runs the generator and the data tests before uploading the site artifact, so JSON is the source of truth and the browser modules are generated delivery artifacts.

## Publishing another perk

Publication is a deliberate identity-based action. To publish a prepared perk from the canonical v15 master:

1. Export that perk's mechanics/editorial record into its global-rank folder.
2. Set `editorial.publicationStatus` to `published`.
3. Keep the global rank unchanged. Do not renumber the public subset.
4. Run the generator and all data tests.
5. Push only after verification passes.

Reranking alone must never publish or unpublish a perk.
