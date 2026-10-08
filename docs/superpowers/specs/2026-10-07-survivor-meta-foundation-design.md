# Survivor Meta Foundation Design

## Purpose

Integrate the frozen Survivor Meta 10.2.0-r1 research package into the DBD Field Guide as a first-class website subsystem without changing the canonical research. The site must present environment-specific Survivor strategy rankings, static encyclopedia pages, navigation/search integration, and build-time validation while preserving Stage 3A as structured research truth and Stage 3B as publication truth.

This design covers **PR 1: Survivor Meta Foundation** only. Shared filter customization, persistent presets, presentation taxonomy normalization, and broader Perk ↔ Strategy cross-linking are deferred to PR 2.

## User Outcome

A visitor can open `/survivor-meta/`, switch between Solo Q and Coordinated SWF, browse current S-D rankings, see provisional/unranked/not-applicable/legacy states correctly, search strategies, and open a dedicated encyclopedia page for any of the 57 canonical Survivor strategies.

The feature is successful when the same frozen 10.2.0-r1 source deterministically produces the browser data, 57 strategy routes, navigation/search entries, and tests on every deployment.

## Source-of-Truth Hierarchy

The repository root file `survivor-meta.zip` is the frozen release package consumed by the build.

Inside it:

1. **Stage 3A is canonical structured research truth.**
   - `strategies.json`
   - `strategy-snapshots.json`
   - `validation.json`
   - `stage3a-report.md`
2. **Stage 3B is publication truth.**
   - `strategy-pages/*.md`
   - `strategy-pages-manifest.json`
   - `stage3b-qc.json`
   - `stage3b-correction-flags.json`
3. **Generated website artifacts are presentation/runtime output only.** They must never become a competing canonical source.

Historical 10.2.0-r1 records remain frozen. Runtime normalization is allowed, but the importer must not rewrite the source files.

## Architecture

The build gains one Survivor Meta pipeline beside the existing Survivor Perk pipeline:

```text
survivor-meta.zip
        |
        v
scripts/import-survivor-meta.py
        |
        +--> content/survivor/meta/10.2.0-r1/strategies.json
        +--> content/survivor/meta/10.2.0-r1/strategy-snapshots.json
        +--> content/survivor/meta/10.2.0-r1/strategy-pages/*.md
        +--> content/survivor/meta/10.2.0-r1/manifest/qc files
        |
        v
scripts/build-survivor-meta.mjs
        |
        +--> site/assets/data-survivor-meta.js
        +--> site/survivor-meta/<slug>/index.html (57 routes)

hand-authored browser shell
site/survivor-meta/index.html
        |
        +--> site/assets/survivor-meta.js
        +--> site/assets/data-survivor-meta.js
```

The import step validates and extracts the frozen package. The build step joins Strategy identity, the current StrategyPatchSnapshot, and the matching Stage 3B article into generated site artifacts. The index page is a small hand-authored shell, matching the existing Survivor Perks page pattern, and uses generated runtime data in the browser.

No runtime network calls are required by the browser.

## Repository Policy for Generated Files

Match the existing Survivor Perk convention: imported canonical content and generated site artifacts are committed to the repository **and** rebuilt in CI from their frozen ZIP sources.

Commit:

- `content/survivor/meta/10.2.0-r1/**`;
- `site/assets/data-survivor-meta.js`;
- all 57 generated `site/survivor-meta/<slug>/index.html` pages.

The build must be deterministic and must not include generation timestamps or machine-specific paths. CI will rebuild these artifacts and run a scoped `git diff --exit-code` check so committed output cannot drift from `survivor-meta.zip`.

## Importer Responsibilities

Create `scripts/import-survivor-meta.py` using the Python standard library only.

The importer must:

- read `survivor-meta.zip` from the repository root;
- select the `10.2.0-r1` release explicitly;
- extract Stage 3A and Stage 3B inputs into `content/survivor/meta/10.2.0-r1/`;
- reject path traversal or unexpected absolute paths;
- fail if Stage 3A validation does not report `passed: true`;
- verify exactly 57 Strategy records and 57 snapshots;
- verify Strategy IDs are unique;
- verify exactly one current snapshot exists for each Strategy;
- verify every Strategy and snapshot is side `SURVIVOR` where applicable;
- verify parent/subtype references resolve;
- verify Stage 3B QC reports `passed: true` with 57 generated pages;
- verify every Stage 3B manifest Strategy ID exists in Stage 3A;
- verify every Stage 3B article front matter references the expected `strategyId` and `snapshotId`;
- copy no unrelated archive material into the generated content tree.

The importer fails with a non-zero exit code and a human-readable message when an invariant is violated.

## Importer Tests

Add Python standard-library unit tests under `scripts/tests/` and run them with `python3 -m unittest discover -s scripts/tests -p 'test_*.py'`.

At minimum test:

- a valid archive imports successfully;
- a ZIP member containing `../` is rejected;
- a manifest/snapshot mismatch is rejected;
- a failed Stage 3A or Stage 3B QC flag is rejected.

Tests may build tiny temporary fixture archives rather than copying the full research package.

## Runtime Data Model

`site/assets/data-survivor-meta.js` registers a compact `survivorStrategies` array on the existing `window.DBD_DATA` object. It is generated, not hand-edited.

Each runtime Strategy record contains:

- `id`
- `name`
- `alternateNames`
- `slug`
- `structuralClassification`
- `parentId`
- `subtypeIds`
- `relatedStrategyIds`
- `generalStrategicDefinition`
- `primaryRoles`
- `secondaryRoles`
- `conceptualMechanics`
- `generalTags`
- `currentStatus`
- `trend`
- `patchVolatility`
- `prevalence`
- `metaStability`
- `stabilityLabel`
- `dependencyTypes`
- `strategicDiagnostics`
- `environmentEvaluations`
- `articlePath`

`environmentEvaluations` always contains two entries in this order:

```json
[
  {
    "environmentId": "SURVIVOR_SOLO_Q",
    "rankingStatus": "RANKED",
    "power": 79,
    "tier": "A",
    "rankingIndex": 81.2,
    "confidence": "MEDIUM"
  },
  {
    "environmentId": "SURVIVOR_COORDINATED_SWF",
    "rankingStatus": "RANKED",
    "power": 86,
    "tier": "A",
    "rankingIndex": 86.8,
    "confidence": "MEDIUM"
  }
]
```

Values come directly from Stage 3A `solo` and `swf`; the frozen source remains unchanged.

Runtime `strategicDiagnostics` exposes `strategicCommitment`, mapped directly from Stage 3A `roleCommitment`. It does not reinterpret or rescore the value.

## Ranking Semantics

The site must preserve Stage 3A ranking semantics exactly.

### Current tiers

Only `RANKED` and `PROVISIONAL` entries with a non-null tier appear in S-D groups for the selected environment.

`PROVISIONAL` entries display their current tier and power with a visible Provisional badge.

### Unranked

`UNRANKED` entries are current but do not receive a fabricated tier or power. They render in a dedicated Unranked section for the selected environment.

### Not applicable

`NOT_APPLICABLE` entries are not forced into tiers. Parent Strategy Families render in a separate Families section and link to their children. X02 remains not applicable in Solo Q.

### Not current / Legacy

`NOT_CURRENT` / `LEGACY` entries render in a separate Legacy section. They never appear in current S-D tier groups and never receive a synthetic D-tier or zero score.

No ordinal rank position is stored canonically. Browser ordering is calculated from current generated data.

Within a tier, sort by:

1. Power descending;
2. Meta Stability descending when Power is equal;
3. Strategy name ascending as deterministic final tie-break.

## Survivor Meta Browser

Create the hand-authored `site/survivor-meta/index.html` using the existing site shell and visual language. Put Survivor-Meta-specific browser logic in the new focused file `site/assets/survivor-meta.js` instead of further enlarging `app-pages.js`.

The browser provides:

- a prominent `Solo Q` / `Coordinated SWF` environment switch;
- text search across Strategy name, alternate names, definition, classification, roles, mechanics, and tags;
- Tier chips for S, A, B, C, D;
- Structural Classification filters;
- Primary Role filters using canonical Stage 3A values for PR 1;
- visible result counts;
- collapsible tier sections consistent with the existing perk browser behavior;
- separate current Unranked, Parent Families, and Legacy sections;
- clear badges for Current Status, Ranking Status, Stability label, Trend, and Classification.

PR 1 does **not** add persistent filter preferences or customizable filter visibility. Those are PR 2.

PR 1 also does not invent Skill Floor, Skill Ceiling, Execution Reliability, Map Dependence, or Matchup Coverage filters because those fields are not canonicalized in 10.2.0-r1.

## Strategy Cards

Each strategy card shows enough information to understand the ranking without opening the article:

- Strategy name and ID;
- structural classification;
- current status;
- selected-environment tier/power when rankable;
- ranking status;
- Meta Stability and Stability label;
- Trend;
- primary roles;
- short strategic definition;
- link to the encyclopedia page.

A Provisional card must be visually distinguishable from a fully Ranked card without treating Provisional as a lower tier.

## Strategy Detail Pages

Generate exactly 57 static routes from the Stage 3B manifest. Preserve the canonical Stage 3B slug family under `/survivor-meta/<slug>/`.

Each page has two layers:

1. **Generated canonical summary header** from Stage 3A/StrategyPatchSnapshot:
   - name and Strategy ID;
   - classification/status;
   - Solo Q evaluation;
   - Coordinated SWF evaluation;
   - Meta Stability;
   - Trend;
   - patch baseline and research revision.
2. **Stage 3B article body** rendered from the matching Markdown source.

The renderer is build-time only and supports the exact structural Markdown used by the frozen Stage 3B corpus:

- ATX headings (`#` through `####`);
- paragraphs;
- strong/emphasis text;
- inline code;
- unordered lists;
- Markdown hard line breaks using two trailing spaces.

The renderer removes YAML-style front matter before rendering. It HTML-escapes source text before applying supported inline markup and does not permit arbitrary raw HTML. The frozen corpus does not require fenced code blocks, blockquotes, ordered lists, Markdown links, or Markdown tables, so PR 1 does not implement them.

The build includes a corpus test that renders all 57 pages and fails if unsupported structural Markdown remains in generated article HTML.

## Build Implementations and Perk References

Canonical `buildImplementations[].perkIds` are trusted as structured identifiers because Stage 3A validation audits them against the Survivor perk dataset.

When a BuildImplementation exists, generated detail-page canonical summary content may link those perk IDs to `survivor/perks/?q=<perk-id>`.

`perkEcosystem.typicalDefiningPerks` is descriptive research text and must not be silently converted into canonical IDs. It remains article text in PR 1.

A complete reverse Strategy ↔ Perk index belongs to PR 2.

## Navigation and Global Search

Modify `site/assets/app-core.js` to add `Survivor Meta` to the Survivor navigation group.

Desktop Survivor navigation becomes:

- Survivor Perks
- Survivor Meta
- How to Play Survivor

The mobile navigation remains the existing compact Home / Survivor / Killer / Search layout. No additional fifth mobile icon is added in PR 1.

Modify `site/assets/app-pages.js` only for global/home search integration. Home search indexes Survivor Meta Strategy names, alternate names, classification, and short description and links directly to strategy detail routes.

## Styling

Extend the existing `site/assets/app.css` rather than creating a disconnected visual system.

Add focused styles for:

- environment switch;
- Strategy cards;
- rank/status badges;
- Stability presentation;
- family/unranked/legacy groups;
- article layout;
- rendered inline code;
- responsive behavior.

The design remains readable on the existing mobile breakpoint and reuses existing chips, tags, tier headings, cards, spacing, and typography wherever practical.

## Service Worker / Offline Behavior

Bump the service-worker cache version.

Precache:

- `survivor-meta/`;
- `assets/data-survivor-meta.js`;
- `assets/survivor-meta.js`.

Do **not** precache all 57 encyclopedia pages. Detail pages continue to use navigation network-first behavior and become cached opportunistically after visits.

## Build and Deployment Workflow

Extend `.github/workflows/pages.yml` in this order:

1. checkout;
2. import canonical Survivor Perk data;
3. build Survivor Perk data;
4. import Survivor Meta 10.2.0-r1 from `survivor-meta.zip`;
5. build Survivor Meta runtime/detail pages;
6. run Python importer unit tests;
7. run all Node site tests;
8. run a scoped `git diff --exit-code` against committed Survivor Meta generated/imported outputs;
9. configure/deploy Pages;
10. live smoke test.

No deployment occurs if Survivor Meta import, build, tests, or drift detection fails.

## Automated Site Tests

Add dedicated Node tests under `site/tests/` for generated Survivor Meta output.

The suite verifies at minimum:

- 57 runtime Strategy records;
- 57 generated detail routes;
- 2 Parent Strategy Families;
- 2 Legacy strategies;
- all Strategy IDs are unique;
- all parent/subtype relationships resolve;
- no Parent Strategy Family appears in S-D tier groups;
- no Legacy Strategy appears in current S-D tier groups;
- C14 SWF remains `UNRANKED` with null Power/Tier/Index;
- X02 Solo remains `NOT_APPLICABLE` with null Power/Tier/Index;
- Stage 3B manifest/article/snapshot relationships remain consistent;
- generated routes are unique;
- representative build canonical perk IDs resolve against generated Survivor perk data;
- the index page and representative META, Parent Family, and Legacy detail pages exist;
- all 57 Markdown articles render without unsupported structural syntax leaking into article HTML.

Existing Survivor Perk tests continue to pass unchanged unless a shared navigation assertion legitimately needs updating.

## Live Smoke Tests

Extend the Pages workflow smoke test to verify:

- `survivor-meta/` loads and contains `Survivor Meta` plus patch `10.2.0`;
- `assets/data-survivor-meta.js` exists and contains Strategy `C01` and `X02`;
- `assets/survivor-meta.js` exists;
- `/survivor-meta/general-chase-looping/` loads;
- one Parent Strategy Family page loads;
- one Legacy page loads;
- generated pages contain the expected Strategy ID/name and a non-empty article body.

## Error Handling

Import/build failures are build failures, not runtime warnings.

Examples that stop deployment:

- corrupt `survivor-meta.zip`;
- missing 10.2.0-r1 source subtree;
- Stage 3A `validation.json` fails;
- Stage 3B QC fails;
- count differs from 57;
- article front matter points at the wrong snapshot;
- duplicate generated route;
- unresolved canonical BuildImplementation perk ID;
- invalid parent/subtype relationship.

The browser is not responsible for repairing or guessing malformed canonical data.

## Files Expected to Change

### New

- `docs/superpowers/specs/2026-10-07-survivor-meta-foundation-design.md`
- `scripts/import-survivor-meta.py`
- `scripts/build-survivor-meta.mjs`
- `scripts/tests/test_import_survivor_meta.py`
- `content/survivor/meta/10.2.0-r1/**` (committed imported output)
- `site/assets/data-survivor-meta.js` (committed generated output)
- `site/assets/survivor-meta.js`
- `site/survivor-meta/index.html`
- `site/survivor-meta/<slug>/index.html` for 57 committed generated routes
- `site/tests/survivor-meta.test.mjs`

### Modified

- `.github/workflows/pages.yml`
- `site/assets/app-core.js`
- `site/assets/app-pages.js`
- `site/assets/app.css`
- `site/sw.js`

`site/manifest.webmanifest` is unchanged in PR 1.

## Explicit Non-Goals for PR 1

- Killer Meta implementation;
- shared Survivor/Killer schema migration of frozen research;
- editing or correcting Stage 3A/3B source artifacts;
- configurable filter visibility;
- Recommended / Solo / SWF / All / Custom filter presets;
- persistent filter preferences in `localStorage`;
- normalized presentation taxonomy map;
- canonical Skill Floor / Skill Ceiling / Execution Reliability;
- canonical Map Dependence / Matchup Coverage;
- full reverse Perk ↔ Strategy relationship index;
- pre-caching every detail article.

## Acceptance Criteria

PR 1 is complete when:

1. `survivor-meta.zip` is the sole frozen source input for Survivor Meta 10.2.0-r1;
2. the import/build pipeline deterministically validates and generates all 57 Strategies and detail routes;
3. `/survivor-meta/` provides correct Solo Q and Coordinated SWF ranking views;
4. Parent Family, Unranked, Not Applicable, Provisional, and Legacy semantics match Stage 3A without fabricated values;
5. all 57 Stage 3B articles render as static HTML beneath their canonical route family;
6. Survivor Meta is discoverable through site navigation and global search;
7. Python importer tests and Node site tests pass;
8. CI drift detection confirms committed generated output matches the frozen source;
9. GitHub Pages deployment succeeds;
10. live smoke tests pass for the Meta index, runtime assets, and representative detail routes;
11. existing Survivor Perk functionality remains intact.
