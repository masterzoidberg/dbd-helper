# Survivor perk content model

Survivor perk ranking data is authored as JSON and grouped in five-rank folders.

## Layout

```text
content/survivor/perks/
  001-005/
    001-will-to-live.json
    ...
  006-010/
    ...
```

Each perk file keeps factual mechanics separate from editorial judgment:

- `mechanics`: live name/source/effect/activation/patch context verified against the canonical mechanics audit.
- `editorial`: rank, tier, roles, quick summary, ratings, use cases, counters, synergies, pros/cons, long analysis, verdict, and editorial status.

`editorialStatus` is metadata and is not emitted into the browser record. Current published values are `complete`, `patch-watch`, and `needs-rerank`.

## Build

Run:

```bash
node scripts/build-survivor-data.mjs
```

The generator validates unique IDs, unique contiguous ranks, required mechanics/editorial fields, and then emits five browser modules under `site/assets/data-perks-01.js` through `data-perks-05.js`.

GitHub Pages runs the generator and the data tests before uploading the site artifact, so the JSON files are the source of truth. Generated browser modules are delivery artifacts.

## Adding the next five

For ranks 11-15, create `content/survivor/perks/011-015/` and add five JSON files named with rank plus slug. Keep the factual mechanics copied from the verified live dataset and write the editorial layer separately. Then run the generator and verification suite before publishing.
