# Survivor Meta Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the frozen `survivor-meta.zip` 10.2.0-r1 release into the DBD Field Guide with validated canonical ingestion, environment-specific strategy browsing, 57 static encyclopedia routes, navigation/search integration, deterministic generated artifacts, and deployment verification.

**Architecture:** `survivor-meta.zip` remains the sole frozen source. A Python importer validates and extracts the approved Stage 3A/3B release into committed `content/survivor/meta/10.2.0-r1/`; a Node builder converts that content into a compact runtime dataset and 57 static detail pages. A focused browser script powers `/survivor-meta/`, while existing shell/search/offline code receives only the minimal integration changes.

**Tech Stack:** Python 3 standard library, Node.js ESM and `node:test`, vanilla browser JavaScript, static HTML/CSS, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-07-survivor-meta-foundation-design.md`

## Global Constraints

- `survivor-meta.zip` is the sole frozen Survivor Meta 10.2.0-r1 source input.
- Stage 3A remains canonical structured research truth; Stage 3B remains publication truth.
- Never rewrite or normalize frozen Stage 3A/3B files in place.
- Runtime environment IDs are exactly `SURVIVOR_SOLO_Q` and `SURVIVOR_COORDINATED_SWF`, in that order.
- Runtime `strategicCommitment` is a direct alias of canonical `roleCommitment`, not a rescore.
- `RANKED` and `PROVISIONAL` may appear in current S-D groups only when tier is non-null.
- `UNRANKED`, `NOT_APPLICABLE`, `NOT_CURRENT`, Parent Strategy Families, and Legacy entries never receive fabricated current Power/Tier values.
- Exactly 57 Strategy records and 57 detail routes must be produced for 10.2.0-r1.
- Generated/imported Survivor Meta outputs are committed and rebuilt in CI; drift fails deployment.
- PR 1 does not add filter presets, `localStorage` preferences, presentation-taxonomy normalization, Killer Meta, or new canonical Skill/Map/Matchup fields.
- Detail-page Markdown rendering is build-time only and permits no raw HTML.
- Do not precache all 57 detail pages.

## Review Focus

1. **Malformed ZIP paths:** a member containing `../`, an absolute path, or escaping the selected release must fail import before writing outside the output directory. Covered in Task 1 importer unit tests.
2. **Research relationship drift:** manifest `strategyId`/`snapshotId`, parent/subtype references, or counts must fail rather than silently generate partial output. Covered in Tasks 1 and 2 tests.
3. **Non-rankable strategy leakage:** Parent Families, Legacy, C14 SWF `UNRANKED`, and X02 Solo `NOT_APPLICABLE` must never appear in current tier groups or receive synthetic scores. Covered in Tasks 2 and 3 tests.
4. **Unsupported Markdown/raw HTML:** all 57 Stage 3B pages must render without leaked front matter, structural Markdown, or executable raw HTML. Covered in Task 2 corpus tests.
5. **Committed-output drift:** CI must regenerate imported/runtime/detail outputs and fail if the repository differs from deterministic build output. Covered in Task 5 workflow assertions and drift command.

---

### Task 1: Canonical Survivor Meta Importer

**Files:**
- Create: `scripts/import-survivor-meta.py`
- Create: `scripts/tests/test_import_survivor_meta.py`
- Generate/commit: `content/survivor/meta/10.2.0-r1/**`

**Interfaces:**
- Consumes: `survivor-meta.zip`, release name `10.2.0-r1`.
- Produces: `import_survivor_meta(archive: Path, output: Path, release: str = "10.2.0-r1") -> dict[str, int]` and a validated extracted content tree containing Stage 3A JSON plus Stage 3B manifest/QC/pages.

- [ ] **Step 1: Write failing importer unit tests**

Create `scripts/tests/test_import_survivor_meta.py` with four tests:

```python
class ImportSurvivorMetaTests(unittest.TestCase):
    def test_valid_archive_imports_release(self): ...
    def test_rejects_path_traversal_member(self): ...
    def test_rejects_manifest_snapshot_mismatch(self): ...
    def test_rejects_failed_stage3a_or_stage3b_qc(self): ...
```

The valid fixture asserts returned counts `{"strategies": 57, "snapshots": 57, "pages": 57}` for the real archive integration path or equivalent canonical fixture. Security/error fixtures use temporary miniature ZIPs and assert `ValueError`/`SystemExit` messages identify the violated invariant.

- [ ] **Step 2: Run importer tests and verify they fail**

Run:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
```

Expected: FAIL because `scripts/import-survivor-meta.py` and/or `import_survivor_meta` do not exist.

- [ ] **Step 3: Implement the importer**

In `scripts/import-survivor-meta.py`, implement:

```python
def import_survivor_meta(
    archive: Path,
    output: Path,
    release: str = "10.2.0-r1",
) -> dict[str, int]: ...
```

Required behavior:

- reject missing/corrupt archives;
- enumerate ZIP members before extraction and reject absolute paths, `..` traversal, and members outside `<release>/stage3a/` or `<release>/stage3b/` except ignored archive/root documentation material;
- load and validate `strategies.json`, `strategy-snapshots.json`, `validation.json`, `stage3b-qc.json`, and `strategy-pages-manifest.json` directly from the ZIP before writing output;
- require Stage 3A `passed == true`, Stage 3B `passed == true`, exactly 57 strategies/snapshots/pages, unique IDs, one snapshot per Strategy, Survivor side, resolvable parent/subtype links, manifest coverage, and article front matter matching manifest `strategyId` + `snapshotId`;
- replace the destination directory atomically enough for this repository workflow: validate first, remove old destination only after validation passes, then write only the selected release's Stage 3A/Stage 3B inputs into the normalized committed content tree;
- expose CLI flags `--archive`, `--output`, `--release` with defaults matching the repository.

- [ ] **Step 4: Run importer tests and verify they pass**

Run:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
```

Expected: all importer tests PASS.

- [ ] **Step 5: Import the real frozen release and verify committed content**

Run:

```bash
python3 scripts/import-survivor-meta.py \
  --archive survivor-meta.zip \
  --output content/survivor/meta/10.2.0-r1 \
  --release 10.2.0-r1
```

Expected: reports 57 strategies, 57 snapshots, and 57 pages; `content/survivor/meta/10.2.0-r1/` contains only normalized Stage 3A/Stage 3B source material required by the builder.

- [ ] **Step 6: Commit**

```bash
git add scripts/import-survivor-meta.py scripts/tests/test_import_survivor_meta.py content/survivor/meta/10.2.0-r1
git commit -m "feat: import canonical survivor meta research"
```

---

### Task 2: Runtime Dataset and Static Strategy Page Builder

**Files:**
- Create: `scripts/build-survivor-meta.mjs`
- Create: `site/tests/survivor-meta.test.mjs`
- Generate/commit: `site/assets/data-survivor-meta.js`
- Generate/commit: `site/survivor-meta/<slug>/index.html` for 57 Strategy routes

**Interfaces:**
- Consumes: validated `content/survivor/meta/10.2.0-r1/` from Task 1 and existing generated Survivor perk runtime modules.
- Produces:
  - `loadSurvivorMetaSource({ rootDir, release }) -> { strategies, snapshots, manifest, articles }`
  - `buildRuntimeStrategies({ rootDir, release }) -> StrategyRuntime[]`
  - `renderArticleMarkdown(markdown: string) -> string`
  - `writeRuntimeData({ rootDir, release, outputPath }) -> StrategyRuntime[]`
  - `writeDetailPages({ rootDir, release, outputDir }) -> string[]`
  - `buildSurvivorMetaSite(options) -> { strategies, routes }`

- [ ] **Step 1: Write failing canonical/runtime generation tests**

Create `site/tests/survivor-meta.test.mjs` with tests asserting:

```js
test('canonical Survivor Meta source has 57 consistent strategies and snapshots', ...)
test('runtime adapter emits two environment evaluations and preserves null ranking semantics', ...)
test('runtime tier eligibility excludes families legacy and non-rankable evaluations', ...)
test('builder writes 57 unique detail routes plus runtime data', ...)
test('canonical build perk ids resolve against Survivor perk runtime data', ...)
test('all Stage 3B articles render without front matter raw html or unsupported structural syntax', ...)
```

Pin these exact cases:

- `C14` SWF: `rankingStatus === 'UNRANKED'`, `power === null`, `tier === null`, `rankingIndex === null`;
- `X02` Solo: `rankingStatus === 'NOT_APPLICABLE'`, all numeric ranking fields null;
- two Parent Strategy Families;
- two Legacy strategies;
- C01 runtime evaluations ordered Solo then SWF;
- `strategicDiagnostics.strategicCommitment === snapshot.strategicDiagnostics.roleCommitment`;
- 57 unique article paths.

- [ ] **Step 2: Run the new Node tests and verify they fail**

Run:

```bash
node --test site/tests/survivor-meta.test.mjs
```

Expected: FAIL because `scripts/build-survivor-meta.mjs` and generated runtime/detail artifacts do not exist.

- [ ] **Step 3: Implement canonical loading and runtime adaptation**

In `scripts/build-survivor-meta.mjs`, implement the exported source/runtime functions. Runtime records must contain exactly the spec fields and `environmentEvaluations` in the fixed environment order. Derive `articlePath` from the Stage 3B manifest slug, normalized to `survivor-meta/<slug>/`.

Sorting helper for current tier groups must use:

1. Power descending;
2. Meta Stability descending for equal Power;
3. name ascending.

Do not persist ordinal rank positions.

- [ ] **Step 4: Implement the constrained Stage 3B Markdown renderer**

Implement:

```js
export function renderArticleMarkdown(markdown) { ... }
```

Behavior fixed by the spec:

- strip YAML-style front matter;
- escape `& < > "` before supported inline rendering;
- support ATX `#` through `####`, paragraphs, `**strong**`, `*emphasis*`, inline backticks, unordered lists, and two-space hard line breaks;
- reject or surface as a build error unsupported structural constructs instead of interpreting arbitrary raw HTML;
- emitted article HTML must contain no YAML front matter markers and no unrendered ATX/list structural syntax.

- [ ] **Step 5: Implement deterministic runtime/detail generation**

`writeRuntimeData` writes:

```js
window.DBD_DATA.survivorStrategies = [...];
```

`writeDetailPages` removes only generated slug directories under `site/survivor-meta/`, preserving the hand-authored index shell added in Task 3. Each generated page includes the standard dynamic `<base>` bootstrap, existing site CSS/assets, a canonical Stage 3A summary header, and the rendered Stage 3B article body.

Where `buildImplementations[].perkIds` exist, link only those canonical IDs to `survivor/perks/?q=<id>`; leave descriptive perk-ecosystem prose untouched.

- [ ] **Step 6: Run builder tests and generate committed outputs**

Run:

```bash
node --test site/tests/survivor-meta.test.mjs
node scripts/build-survivor-meta.mjs
node --test site/tests/survivor-meta.test.mjs
```

Expected: first command after implementation passes source/runtime unit assertions; build writes `data-survivor-meta.js` and 57 route directories; second test run passes filesystem/output assertions.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-survivor-meta.mjs site/tests/survivor-meta.test.mjs site/assets/data-survivor-meta.js site/survivor-meta/*/index.html
git commit -m "feat: build survivor meta runtime and encyclopedia pages"
```

---

### Task 3: Survivor Meta Browser UI

**Files:**
- Create: `site/survivor-meta/index.html`
- Create: `site/assets/survivor-meta.js`
- Modify: `site/assets/app.css`
- Modify/Test: `site/tests/survivor-meta.test.mjs`

**Interfaces:**
- Consumes: `window.DBD_DATA.survivorStrategies` from Task 2 and common helpers on `window.DBD_CORE`.
- Produces: `window.DBD_SURVIVOR_META` with pure helpers plus `initSurvivorMetaBrowser()`.

- [ ] **Step 1: Add failing browser behavior tests**

Extend `site/tests/survivor-meta.test.mjs` to VM-load `site/assets/survivor-meta.js` and assert pure helpers:

```js
evaluationFor(strategy, 'SURVIVOR_SOLO_Q')
filterStrategies(strategies, state)
groupStrategies(strategies, environmentId)
sortCurrentTier(strategies, environmentId)
```

Tests must prove:

- search matches name, alternate names, definition, classification, roles, mechanics, and tags;
- tier/classification/primary-role filters compose with AND across groups and OR within a group;
- Parent Families are returned only in Families group;
- Legacy/`NOT_CURRENT` are returned only in Legacy group;
- C14 appears in SWF Unranked, not a tier;
- X02 does not appear in Solo tiers;
- Provisional strategies remain in their current tier group with status preserved.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test site/tests/survivor-meta.test.mjs
```

Expected: FAIL because browser helpers/shell do not exist.

- [ ] **Step 3: Implement `site/assets/survivor-meta.js`**

Expose:

```js
window.DBD_SURVIVOR_META = {
  evaluationFor,
  filterStrategies,
  groupStrategies,
  sortCurrentTier,
  initSurvivorMetaBrowser
};
```

`initSurvivorMetaBrowser()` binds to `[data-survivor-meta-browser]`, defaults environment to `SURVIVOR_SOLO_Q`, renders environment switch, search, S/A/B/C/D chips, classification chips, canonical Primary Role chips, result count, collapsible tier sections, then separate Unranked/Families/Legacy sections.

No persistence or customizable filter visibility in PR 1.

- [ ] **Step 4: Create the hand-authored browser shell**

Create `site/survivor-meta/index.html` mirroring the existing Survivor Perks shell pattern. Load assets in this order:

1. `assets/data-meta.js`
2. `assets/data-survivor-meta.js`
3. `assets/app-core.js`
4. `assets/app-pages.js`
5. `assets/survivor-meta.js`

On DOM ready call:

```js
DBD_APP.injectShell('survivor-meta');
DBD_SURVIVOR_META.initSurvivorMetaBrowser();
```

Visible copy must identify `Survivor Meta`, patch `10.2.0`, and the 57-strategy encyclopedia/ranking scope.

- [ ] **Step 5: Add focused styles to `site/assets/app.css`**

Add classes only for Survivor Meta concerns: environment toggle, strategy card/header, power/stability cells, Provisional marker, family/unranked/legacy section treatment, article layout, inline code, and responsive stacking. Reuse existing `.chip`, `.tag`, `.tier-section`, `.tier-heading`, `.tier-badge`, `.page-head`, and typography patterns rather than duplicating them.

- [ ] **Step 6: Run browser/output tests**

Run:

```bash
node --test site/tests/survivor-meta.test.mjs
```

Expected: PASS including browser-helper and shell assertions.

- [ ] **Step 7: Commit**

```bash
git add site/survivor-meta/index.html site/assets/survivor-meta.js site/assets/app.css site/tests/survivor-meta.test.mjs
git commit -m "feat: add survivor meta browser"
```

---

### Task 4: Navigation, Home Search, and Offline Shell Integration

**Files:**
- Modify: `site/assets/app-core.js`
- Modify: `site/assets/app-pages.js`
- Modify: `site/index.html`
- Modify: `site/sw.js`
- Modify/Test: `site/tests/survivor-meta.test.mjs`
- Modify/Test if needed: `site/tests/survivor-json-source.test.mjs`

**Interfaces:**
- Consumes: `window.DBD_DATA.survivorStrategies` and existing `siteHref`, `normalize`, navigation-shell functions.
- Produces: desktop Survivor Meta navigation link, home quick-search results for strategies, and offline precache for Meta index/runtime assets.

- [ ] **Step 1: Add failing integration assertions**

Extend tests to assert:

- `app-core.js` contains nav id `survivor-meta` with href `survivor-meta/` and places it between Survivor Perks and How to Play Survivor in desktop navigation;
- `site/index.html` loads `assets/data-survivor-meta.js` before `app-pages.js`;
- `app-pages.js` maps `data.survivorStrategies` into home search items using strategy name, alternate names, classification, definition, and direct `articlePath` links;
- `site/sw.js` uses cache `dbd-field-guide-v6` and precaches `survivor-meta/`, `assets/data-survivor-meta.js`, and `assets/survivor-meta.js` but contains no list of all 57 slug routes.

Update the existing `survivor-json-source.test.mjs` service-worker version assertion from v5 to v6 as the one legitimate shared assertion change.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test site/tests/*.test.mjs
```

Expected: FAIL on the new navigation/search/offline assertions.

- [ ] **Step 3: Update desktop navigation**

In `site/assets/app-core.js`, add:

```js
['survivor-meta','survivor-meta/','◇','Survivor Meta']
```

Adjust Survivor grouping indices so desktop order is Survivor Perks → Survivor Meta → How to Play Survivor. Keep existing four-item mobile navigation unchanged.

- [ ] **Step 4: Integrate home search**

In `site/index.html`, load `assets/data-survivor-meta.js` before `app-pages.js`.

In `site/assets/app-pages.js`, extend `staticItems` with `data.survivorStrategies || []`, using search text composed from name, alternate names, classification, and definition, and link to `siteHref(strategy.articlePath)`.

- [ ] **Step 5: Update service worker**

Change cache name to `dbd-field-guide-v6`. Add only the Meta index and new Meta assets to `SHELL_PATHS`; do not add generated detail routes.

- [ ] **Step 6: Run all Node tests**

Run:

```bash
node --test site/tests/*.test.mjs
```

Expected: all Node tests PASS.

- [ ] **Step 7: Commit**

```bash
git add site/assets/app-core.js site/assets/app-pages.js site/index.html site/sw.js site/tests/survivor-meta.test.mjs site/tests/survivor-json-source.test.mjs
git commit -m "feat: integrate survivor meta navigation and search"
```

---

### Task 5: Deterministic CI, Drift Detection, and Live Smoke Tests

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify/Test: `site/tests/survivor-meta.test.mjs`
- Modify/Test: `site/tests/survivor-json-source.test.mjs`

**Interfaces:**
- Consumes: importer/build commands from Tasks 1-2 and committed generated outputs.
- Produces: deployment pipeline that blocks on import/build/test/drift failures and live-verifies Meta routes.

- [ ] **Step 1: Add failing workflow-order and smoke-test assertions**

Extend tests so `.github/workflows/pages.yml` must contain these commands in order before `actions/upload-pages-artifact`:

```text
python3 scripts/import-survivor-v15.py
node scripts/build-survivor-data.mjs
python3 scripts/import-survivor-meta.py
node scripts/build-survivor-meta.mjs
python3 -m unittest discover -s scripts/tests -p 'test_*.py'
node --test site/tests/*.test.mjs
git diff --exit-code -- content/survivor/meta/10.2.0-r1 site/assets/data-survivor-meta.js site/survivor-meta
```

Also assert smoke checks reference:

- `survivor-meta/`
- `assets/data-survivor-meta.js`
- `assets/survivor-meta.js`
- `survivor-meta/general-chase-looping/`
- one Parent Family route
- one Legacy route.

- [ ] **Step 2: Run Node tests and verify workflow assertions fail**

Run:

```bash
node --test site/tests/*.test.mjs
```

Expected: FAIL because workflow has not yet integrated Survivor Meta.

- [ ] **Step 3: Extend `.github/workflows/pages.yml`**

After Survivor Perk build, add the exact Meta import/build commands. Then run Python tests, Node tests, and scoped drift detection before Pages configuration/upload.

Extend live smoke logic to verify:

```text
survivor-meta/
assets/data-survivor-meta.js
assets/survivor-meta.js
survivor-meta/general-chase-looping/
survivor-meta/pickup-interception-save-family/
survivor-meta/classic-stake-out-hyperfocus-engine/
```

Smoke assertions must check `Survivor Meta`, patch `10.2.0`, runtime IDs `C01` and `X02`, representative page Strategy name/ID, and non-empty article-body marker.

- [ ] **Step 4: Regenerate from scratch and verify zero drift locally**

Run:

```bash
python3 scripts/import-survivor-v15.py --archive dbd-local-data-v15-release-candidate.zip --output content/survivor/perks
node scripts/build-survivor-data.mjs
python3 scripts/import-survivor-meta.py --archive survivor-meta.zip --output content/survivor/meta/10.2.0-r1 --release 10.2.0-r1
node scripts/build-survivor-meta.mjs
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
node --test site/tests/*.test.mjs
git diff --exit-code -- content/survivor/meta/10.2.0-r1 site/assets/data-survivor-meta.js site/survivor-meta
```

Expected: all tests PASS and scoped `git diff` exits 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pages.yml site/tests/survivor-meta.test.mjs site/tests/survivor-json-source.test.mjs
git commit -m "ci: validate and deploy survivor meta"
```

---

### Task 6: Whole-Branch Verification and Pull Request

**Files:**
- Verify all files changed by Tasks 1-5.
- No feature code should be added in this task unless verification exposes a defect; fixes receive their own test and commit.

**Interfaces:**
- Consumes: complete feature branch.
- Produces: evidence-backed PR ready for merge.

- [ ] **Step 1: Run complete local verification**

Run:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
node --test site/tests/*.test.mjs
python3 scripts/import-survivor-meta.py --archive survivor-meta.zip --output content/survivor/meta/10.2.0-r1 --release 10.2.0-r1
node scripts/build-survivor-meta.mjs
git diff --exit-code -- content/survivor/meta/10.2.0-r1 site/assets/data-survivor-meta.js site/survivor-meta
```

Expected: all tests PASS, importer reports 57/57/57, builder reports 57 routes, and drift check exits 0.

- [ ] **Step 2: Inspect representative generated outputs**

Verify manually or with grep:

```text
site/survivor-meta/index.html
site/survivor-meta/general-chase-looping/index.html
site/survivor-meta/pickup-interception-save-family/index.html
site/survivor-meta/classic-stake-out-hyperfocus-engine/index.html
site/assets/data-survivor-meta.js
```

Confirm C01 has A/79 Solo and A/86 SWF, Parent Family has no aggregate tier/power, and Legacy page does not present a current D-tier score.

- [ ] **Step 3: Compare branch to main**

Run:

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: no whitespace errors; changes are limited to Survivor Meta foundation plus required shared integration files.

- [ ] **Step 4: Request whole-branch review**

Use the required code-review workflow on the complete branch. Any discovered bug must first receive a reproducing test, then a fix, then re-run Step 1.

- [ ] **Step 5: Create PR**

Create a PR from `feature/survivor-meta-foundation` to `main` titled:

```text
Add Survivor Meta foundation
```

PR body must summarize canonical import, 57 strategy pages, Solo/SWF browser, nav/search integration, deterministic CI/drift checks, and verification commands.

- [ ] **Step 6: Verify GitHub Actions before merge**

Wait for the Pages workflow/checks on the PR branch to pass. Do not claim deployment success from local tests alone.

- [ ] **Step 7: Merge only after approval/checks**

After review and green checks, merge using the repository's established PR workflow. Then verify the post-merge Pages run and live smoke results before declaring the feature complete.
