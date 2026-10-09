# Survivor Meta V2 execution ledger

Tracks actual guide files, not a second plan. NOT_STARTED means no record; DRAFT means authored content with display review still pending. Canonical facts remain in the frozen research and prepared perk records.

Task 7 reviewer: Codex (author self-review), 2026-10-08 America/New_York. No independent or owner gameplay approval is claimed. Every authored guide remains DRAFT with reviewedDate null. Standalone desktop/mobile, link/display and comprehension evidence is pending Task 8; production-renderer preview is deferred to Task 12.

Base: `41d3f882050a76d29ecb2190e7593486704fd7eb`. Owner-supplied fixture repair: `ed7fc2ada175bbd93ab9879162b21ed2cd1316f7` (34/34 source/review tests). Only those two test assertions were changed; no production tooling changes.

## Canonical coverage

| ID | Canonical name | Kind | State | Review evidence | Commit reference |
|---|---|---|---|---|---|
| C01 | General Chase / Looping | STANDARD | DRAFT | [Content/source review](#c01-content-review); Task 8 display pending. | Group 1 introducing commit; see below. |
| C02 | Exhaustion Mobility Chase | STANDARD | NOT_STARTED | No record; review not started. | — |
| C03 | Vault / Window Specialist | STANDARD | NOT_STARTED | No record; review not started. | — |
| C04 | Pallet / Resource Specialist | STANDARD | NOT_STARTED | No record; review not started. | — |
| C05 | Fragile-Pallet Restoration | STANDARD | NOT_STARTED | No record; review not started. | — |
| C06 | Chase Information / Routing | STANDARD | NOT_STARTED | No record; review not started. | — |
| C07 | Stealth / Chase Avoidance | STANDARD | NOT_STARTED | No record; review not started. | — |
| C08 | Chase Reset / Disappearance | STANDARD | NOT_STARTED | No record; review not started. | — |
| C09 | Anti-Tunnel Package | STANDARD | NOT_STARTED | No record; review not started. | — |
| C10 | Anti-Slug / Self-Recovery Package | STANDARD | NOT_STARTED | No record; review not started. | — |
| C11 | Hook-State Transfer | STANDARD | NOT_STARTED | No record; review not started. | — |
| C12 | Deterministic Self-Unhook | STANDARD | NOT_STARTED | No record; review not started. | — |
| C13 | Luck-Based Self-Unhook | LEGACY | NOT_STARTED | No record; review not started. | — |
| C14 | Self-Sustain / Self-Heal | STANDARD | NOT_STARTED | No record; review not started. | — |
| C15 | Haste / Movement Stack | STANDARD | NOT_STARTED | No record; review not started. | — |
| G01 | General Generator Pressure | STANDARD | NOT_STARTED | No record; review not started. | — |
| G02 | Toolbox Generator Specialist | STANDARD | DRAFT | [Content/source review](#g02-content-review); Task 8 display pending. | Group 1 introducing commit; see below. |
| G03 | Critical-Generator / Three-Gen Breaker | STANDARD | NOT_STARTED | No record; review not started. | — |
| G04 | Cooperative Repair / Gen Duo | STANDARD | NOT_STARTED | No record; review not started. | — |
| G05 | Manual Skill-Check Generator | STANDARD | NOT_STARTED | No record; review not started. | — |
| G06 | Classic Stake Out–Hyperfocus Engine | LEGACY | NOT_STARTED | No record; review not started. | — |
| G07 | Boon: Steadfast Repair Zone | STANDARD | NOT_STARTED | No record; review not started. | — |
| G08 | Road Life Repair-to-Self-Heal | STANDARD | NOT_STARTED | No record; review not started. | — |
| G09 | Fast Track Rescue-to-Repair Tempo | STANDARD | NOT_STARTED | No record; review not started. | — |
| G10 | Fruits of Your Labor Objective-to-Reset Hybrid | STANDARD | NOT_STARTED | No record; review not started. | — |
| A01 | Hook Rescue / Post-Unhook Reset | STANDARD | NOT_STARTED | No record; review not started. | — |
| A02 | Anti-Camp / Hook-Timer Control | STANDARD | NOT_STARTED | No record; review not started. | — |
| A03 | Dedicated Healer / Triage | STANDARD | NOT_STARTED | No record; review not started. | — |
| A04 | Hook-State-Scaled Fast Healing | STANDARD | NOT_STARTED | No record; review not started. | — |
| A05 | Protection-Hit / Tank | STANDARD | NOT_STARTED | No record; review not started. | — |
| A06 | Hook-Trade / Carry Bodyblock Protector | STANDARD | NOT_STARTED | No record; review not started. | — |
| A07 | Endgame Rescue | STANDARD | NOT_STARTED | No record; review not started. | — |
| P01 | Flashlight Save | STANDARD | NOT_STARTED | No record; review not started. | — |
| P02 | Flashbang Save | STANDARD | NOT_STARTED | No record; review not started. | — |
| P03 | Sabotage / Hook Denial | STANDARD | NOT_STARTED | No record; review not started. | — |
| P04 | Breakout / Carry Interference | STANDARD | NOT_STARTED | No record; review not started. | — |
| P05 | Teammate Pallet Save | STANDARD | NOT_STARTED | No record; review not started. | — |
| P06 | Carry-Escape / Wiggle Denial | STANDARD | NOT_STARTED | No record; review not started. | — |
| I01 | Solo-Q Information Shell | STANDARD | NOT_STARTED | No record; review not started. | — |
| I02 | Killer Tracking / Aura Seer | STANDARD | NOT_STARTED | No record; review not started. | — |
| I03 | Teammate Tracking / Support Information | STANDARD | NOT_STARTED | No record; review not started. | — |
| I04 | Objective / Resource Routing | STANDARD | NOT_STARTED | No record; review not started. | — |
| I05 | Chase Broadcast / Salvation's Cry | STANDARD | NOT_STARTED | No record; review not started. | — |
| R01 | Chest / Loot Scavenger | STANDARD | NOT_STARTED | No record; review not started. | — |
| R02 | Pharmacy / Med-Kit Farming | STANDARD | NOT_STARTED | No record; review not started. | — |
| R03 | Item Recharge / Recursion | STANDARD | NOT_STARTED | No record; review not started. | — |
| R04 | Boon Support Network | STANDARD | NOT_STARTED | No record; review not started. | — |
| R05 | Totem Hunter / Cleanser | STANDARD | NOT_STARTED | No record; review not started. | — |
| R06 | Invocation Ritual | STANDARD | NOT_STARTED | No record; review not started. | — |
| R07 | Locker Utility / Head On | STANDARD | NOT_STARTED | No record; review not started. | — |
| R08 | Distraction / Misdirection | STANDARD | NOT_STARTED | No record; review not started. | — |
| R09 | Obsession / High-Risk Aggro-Info | STANDARD | NOT_STARTED | No record; review not started. | — |
| R10 | Endgame Gate / Escape Shell | STANDARD | NOT_STARTED | No record; review not started. | — |
| X01 | Solo-Q Generalist | STANDARD | DRAFT | [Content/source review](#x01-content-review); Task 8 display pending. | Group 1 introducing commit; see below. |
| X02 | Coordinated SWF Flex Generalist | TEAM | NOT_STARTED | No record; review not started. | — |
| P00 | Pickup Interception / Save Family | FAMILY | NOT_STARTED | No record; review not started. | — |
| A00 | Rescue-and-Reset Support Family | FAMILY | NOT_STARTED | No record; review not started. | — |

## Task 7 group 1 — X01/C01/G02

Reviewer: Codex, 2026-10-08. Each of X01, C01 and G02 separately completed source/snapshot/full-article inspection, exact perk mechanics review, authored meaning, receipts, optional-substitute assessment, Trial action/exit review and enabledBy review (editorial cycle 1–8). Each passed the catalog CLI after creation (step 9). Steps 10–12 remain deferred as specified: no Task 12 renderer preview, no Task 8 desktop/mobile evidence and no REVIEWED transition. Step 13 is this ledger. Step 14 now passes: focused schema/source/review/validation tests 95/95 after the authorized fixture repair. Group 1 is introduced by the content commit immediately following `7e7e09456f0c48f4680cb3da6bd2a1a989159254`, message `content: draft Survivor guide prototypes (X01/C01/G02)`. Its SHA will be recorded in the next group; this reference avoids a self-referential commit hash.

### X01 content review

Source receipts: `X01#/generalStrategicDefinition`, `X01@10.2.0-r1#/buildImplementations/0`, `X01@10.2.0-r1#/changeSummary`, `X01#How It Works`, `X01#Solo Q vs SWF`, plus each referenced perk's `#/mechanics`. All 10 receipts resolve.

Canonical build `X01@10.2.0-r1:solo-representative` derives fixed slots lithe/deja-vu/will-to-live and choose-one slot 4 kindred/well-make-it. Exact set: five perks, all revision 1. Decisive Strike is the current display alias of will-to-live, not another ID. The generic ecosystem pattern and open flex note do not authorize extra membership or substitutes. Item null remains canonical; no item requirement invented.

Reviewed decisions: highlighted objective versus pressure, vault-to-next-route, conditional Kindred rescue coverage, conditional We'll Make It reset and post-unhook escape. Each genuinely tool-enabled row links its perk; strategic aborts require no invented enabler. Protection deactivation and endgame availability checked. Weakness is incomplete team coverage, not fabricated Killer counterplay; no optional counterplay section filled with boilerplate. Validator after creation: missing 56 / DRAFT 1, no diagnostics.

### C01 content review

Source receipts: `C01#/generalStrategicDefinition`, `C01@10.2.0-r1#/buildImplementations`, `C01@10.2.0-r1#/dependencyTypes`, `C01#How It Works`, `C01#Killer Counterplay`, plus each referenced perk's `#/mechanics`. All 12 receipts resolve.

Both owned builds retained: `C01@10.2.0-r1:solo-representative` (lithe/resilience/finesse/will-to-live), and `C01@10.2.0-r1:swf-representative` (slot 1 sprint-burst or dead-hard; slots 2–4 finesse/resilience/five-moves-ahead). Exact union: seven perks, all revision 1. “Chase info” is not fuzzy-mapped: five-moves-ahead comes from the explicit build ID. Both canonical item nulls remain intact. No substitute or matchup assertions added.

Reviewed healthy Finesse versus injured Resilience, Exhausted mobility availability, prior-unhook Dead Hard constraint, pallet-only Five Moves Ahead and cooldown, conditional safety and refusal-of-chase exit. Inherent resource depletion, deliberate target-switch denial and player routing mistakes are separate. Slot enabler preserves conditional choice; no advice claims both Exhaustion options are equipped. Validator after creation: missing 55 / DRAFT 2, no diagnostics.

### G02 content review

Source receipts: `G02#/generalStrategicDefinition`, `G02@10.2.0-r1#/perkEcosystem/typicalDefiningPerks`, `G02@10.2.0-r1#/itemEcosystem`, `G02@10.2.0-r1#/counters`, `G02#Representative Builds`, `G02#Common Mistakes`, `built-to-last#/mechanics`. All seven receipts resolve.

One-slot EXAMPLE MODULE `toolbox-recharge`, not a fabricated canonical or complete build. Toolbox is REQUIRED because strategy definition makes it indispensable, not just because ITEM is a dependency. Built to Last is CORE, not an individually mandatory identity for every toolbox strategy. Exact guide reference set: built-to-last at revision 1.

Mapping decision: “Streetwise/Scavenger-type support” is a descriptive research phrase, not an interchangeable slot. Read exact streetwise and scavenger mechanics: current Streetwise charge benefit is for chest-found items; Scavenger has its own depleted-toolbox/Great-check recharge and repair penalty. Neither is asserted as a substitute. “Objective info” does not resolve a specific perk. No named add-on is established, so no add-on recipe is invented. These inspected-but-unused perks are not added to perkReviews or the index.

Reviewed burst target, safe depleted-item recharge, declining recharge return, urgent-rescue override and lost-item exit. Perk/item enablers used only for actual recharge/charge advice. Weakness: finite charges/downtime; denial: item/repair-window pressure; mistakes: low-impact spending and unnecessary locker trips. Validator after creation: missing 54 / DRAFT 3, no diagnostics.

### Serial initial classifications

The existing impact CLI was called separately and serially for the 11 entries below:
`node scripts/survivor-meta-perk-review.mjs --perk <id> --classification PRESENTATION_ONLY --reason "<exact reason below>"`.

All calls exited 0; old fingerprint/revision null, new revision 1, affectedStrategyIds empty. PRESENTATION_ONLY here initializes the first reviewed baseline; it does not claim an unseen mechanics change is harmless. Current full fingerprints are retained in perk-review-index.json and were compared to fingerprintPerkMechanics for every actual guide dependency. No canonical mechanics were edited, and no entries were removed/reset.

| Perk ID | Exact classification reason |
|---|---|
| lithe | Initial reviewed use for X01/C01: checked current rushed-vault activation and Exhausted gating; no mechanics change. |
| deja-vu | Initial reviewed use for X01: checked current grouped-generator routing and highlighted-target context; no mechanics change. |
| will-to-live | Initial reviewed use for X01/C01: exact Decisive Strike alias, post-unhook availability and deactivation reviewed; no mechanics change. |
| kindred | Initial reviewed X01 slot-four choice: hook information and asymmetric sharing reviewed; no mechanics change. |
| well-make-it | Initial reviewed X01 slot-four choice: rescuer activation and altruistic-only healing reviewed; no mechanics change. |
| resilience | Initial reviewed C01 build member: injured-state actions reviewed separately from healthy Finesse; no mechanics change. |
| finesse | Initial reviewed C01 build member: healthy fast-vault availability and cooldown reviewed; no mechanics change. |
| sprint-burst | Initial reviewed C01 SWF choice: starting-run activation and Exhausted constraint reviewed; no mechanics change. |
| dead-hard | Initial reviewed C01 SWF choice: prior unhook, injury, running and Exhausted constraints reviewed; no mechanics change. |
| five-moves-ahead | Initial reviewed C01 SWF routing tool: pallet-only information and post-drop cooldown reviewed; no mechanics change. |
| built-to-last | Initial reviewed G02 example module: depleted held item, locker interruption and declining limited recharges reviewed; no mechanics change. |

### Resolved prerequisite fixture issues

Owner-supplied fixes were explicitly authorized and committed separately: `ed7fc2a` removes real-index-empty assumptions; `7e7e09456f0c48f4680cb3da6bd2a1a989159254` excludes copied real guide records from the temporary catalog fixture while retaining metadata. Prior failures were reproduced before repair. No production validator/schema/source/review code changed.

Fresh verification: catalog fixture suite 23/23; focused schema/source/review/validation 95/95, exit 0. Real catalog CLI: three DRAFT, 54 missing, no diagnostics. Artifact checker clean. Earlier failed runs are retained in the implementer report history, not current blockers.

## Remaining prototype evidence

Full strategy/snapshot/article inspection also completed for P02, P00, G06 and X02; supporting child records P01/P03/P04/P05 and successor G05 were read, along with flashbang/background-player/bond/empathy/stake-out/hyperfocus/shoulder-the-burden mechanics. No guide drafting, classification, completed content review or commit is claimed for those four IDs; their rows remain NOT_STARTED.

## Pending display evidence

Task 8: standalone 320/390/768/1440 desktop/mobile review, exact displayed choices/perk links, source-versus-purpose separation, full article access, owner 10-second/two-minute comprehension and approval. Task 12: actual renderer preview. None was attempted. All existing guides are DRAFT with reviewedDate null.

