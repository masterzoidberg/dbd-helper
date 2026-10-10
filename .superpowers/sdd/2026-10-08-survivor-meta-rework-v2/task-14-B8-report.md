# Task 14 B8 editorial report — 2026-10-10

Scope: I05, R01, R02, R03, R04 only. Reviewed against exact frozen Stage 3A strategy and snapshot, complete Stage 3B article, canonical perk mechanics, V2 contract, schema, model and common renderer. No frozen or shared file changed. All five snapshots have empty `buildImplementations`; guides use advisory options, not a claimed four-slot build. All five guides are REVIEWED, never PUBLISHED. No substitutes were justified by the frozen evidence. Provisional I05/R01/R02 and ranked R03/R04 facts remain derived from the snapshots.

## Independent editorial review

| ID | Identity and practical decision | Trigger, action and exit | Exact dependencies and receipts |
|---|---|---|---|
| I05 | Chase-start broadcast module; useful mainly when a first chase call is missing. | At *your* chase start, runner routes away from revealed teammates and workers use the brief Killer read; discard the read when it expires or target changes. Never force a chase for activation. | `salvations-cry`; strategy definition, snapshot ecosystem/counters, publication How It Works/Solo Q vs SWF, canonical mechanics. |
| R01 | General chest economy; evaluate the actual found item against repair/rescue time. | Take a safe chest on route when missing a useful item; an Appraisal roll is conditional; stop after a usable find or urgent objective. | `plunderers-instinct`, `appraisal`; strategy definition, snapshot ecosystem/counters, publication Representative Builds/Weaknesses, canonical mechanics. |
| R02 | Medical subtype of R01; Pharmacy's chest output is the point. | Open a reachable chest when a kit changes the next heal, deliver/use it, stop farming when inventory is idle or pressure arrives. Pregame Med-Kit remains the simpler choice when available. | `pharmacy`, `plunderers-instinct`; strategy definition, snapshot ecosystem/item/counters, publication Representative Builds, canonical mechanics. |
| R03 | Extend one item's useful lifecycle, not a generic infinite item claim. | Built to Last requires depleted item and safe locker; Streetwise concerns chest items; Scavenger concerns depleted Toolbox and Great basic repair checks plus penalty. Exit on item loss, missed window or poor payback. | `built-to-last`, `streetwise`, `scavenger`; strategy definition, snapshot ecosystem/item/counters, publication Representative Builds, canonical mechanics. |
| R04 | Local boon infrastructure with distinct heal, slug recovery, movement and repair jobs. | Choose task and totem together; maintain while used, relocate only for a named next task, abandon repeatedly snuffed/destroyed/irrelevant zone. Illumination speeds blessing only while a Boon is active. | `boon-circle-of-healing`, `boon-exponential`, `boon-shadow-step`, `boon-illumination`, `boon-steadfast`; strategy definition, snapshot ecosystem/counters, publication Representative Builds/Killer Counterplay, canonical mechanics. |

All authored `enabledBy` references resolve to guide options. Strategy and publication receipts resolve exactly. Optional item declarations, matchup advice, numeric skill claims, substitutes and invented complete builds were omitted. Self-review found no copied canonical membership or ranking in guide JSON and no rendering branch request.

## Coordinator index integration

Initialize these *new* exact perk dependencies in the authoritative shared index at mechanics revision **1**, classified as strategy-significant initial mechanics. Fingerprints were computed with `fingerprintPerkMechanics` from current canonical records; no index write was made in B8.

| Perk ID | Fingerprint | Guides |
|---|---|---|
| `salvations-cry` | `e198e103e14dabe5c43167eb1153bff6011d1031aeebcd266685684a9e0aa0cc` | I05 |
| `plunderers-instinct` | `ed1b0059bcd68aea69e7a7201505588001208602f840ff240decda754812edb5` | R01, R02 |
| `appraisal` | `fb474b5b3500ea96f16c6eb6c2c9266c81339dd7d56248e19024c8acde51f7f5` | R01 |
| `pharmacy` | `260959cd9c4737240426872203cbe286b90cadcc4fd3c95b713f48852c228119` | R02 |
| `streetwise` | `a5a1f5e47f69de21dc9bbcf2ef2890ea06069849275a01a87ffe1fd0a1d847bf` | R03 |
| `scavenger` | `ea3b7879cd212ef0afaf43d5a8398be2bb63f966d36de47287ff768315f2fd45` | R03 |
| `boon-circle-of-healing` | `9b3820264abb56024dee67ee5b812692f8c56deaff8bababd8ace321d83e2547` | R04 |
| `boon-shadow-step` | `904fcc0bea82a3ae8118acc71309d79b0a2cccb9a6116a892ef286a424c7e427` | R04 |

Already classified, retained at revision 1: `built-to-last` (`4d6789c7cc48027ec3941ca6fe76fc794ad95bea5abdbc98a9d090d6bf93ae6c`), `boon-exponential` (`233efbf57b1e9455f7dd0ab62671039baf41abc7a750e8dae92f0cb96c2e349f`), `boon-illumination` (`0db73e899db7948cfa5139418c368d68b1f3b0cd54adf7961dd568c63f4db264`), `boon-steadfast` (`c6cef34ccbe936fab1c8333dfc8e02fdff30352a41b42572b8b682b05b2db735`). No revision bump is proposed.

## Verification and remaining integration

- Catalog CLI: expected counts `6 missing / 7 DRAFT / 44 REVIEWED / 0 PUBLISHED`; nine diagnostics, all `PERK_CHANGE_CLASSIFICATION_REQUIRED` for the eight new index IDs (one used twice). Zero other diagnostics.
- Read-only in-memory index initialization: all five `validateGuide` calls returned zero diagnostics; all five assembled as PLAYER previews and rendered with the shared renderer; frozen article retained in each research model.
- Focused Node schema/validation/model/render set: 44/44 passed. Full Python: 4/4 passed. Artifact drift: matched Git. Full Node: 158/162 passed; four build tests fail because the scoped shared index still lacks the eight classifications. No product or fixture code was changed, so prose mirror tests were not added.
- The 320/390/768/1024/1440 desktop/mobile usefulness matrix was not completed: the preview/build gate rejects the unclassified dependencies and the generated production pages remain research-only. Coordinator must add index entries, rerun catalog/full Node, generate preview outside `site/`, and complete that browser matrix including 390×844, 1440×900, 200% zoom, 10-second/2-minute tasks, original article, keyboard and perk links after integration. This is a release evidence gap, not a claim of browser approval.

Risks: The eight index entries and browser review are required for integrated zero-diagnostic B8 acceptance. This worker cannot make the index or generated output changes under its strict write scope. Re-review any edited advice if coordinator finds a factual issue; keep REVIEWED until coherent release selection.
