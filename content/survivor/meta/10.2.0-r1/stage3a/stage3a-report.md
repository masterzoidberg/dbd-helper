# Dead by Daylight Survivor Meta Database — Stage 3A

**Canonical baseline:** Patch 10.2.0  
**Research cutoff:** October 7, 2026  
**Revision:** 1  
**Scope:** Standard 1v4 Survivor strategy ecology, with independent Solo Q and coordinated-SWF evaluations.

## 1. Executive Summary

Stage 3A converts the completed discovery, catalog, and adversarial-ranking work into a canonical, patch-versioned Survivor strategy database.

The canonical dataset contains **57 Strategy records**: all **55** Stage 1.5 catalog entries plus **2** explicit parent-family records required by Stage 2's reclassification of Pickup Interception and Rescue-and-Reset. Every Strategy has one current `StrategyPatchSnapshot` for 10.2.0-r1. No Stage 1.5 strategy silently disappears.

The strongest current **Solo Q construction** is **X01 Solo-Q Generalist** at **S / 90**. The strongest current **coordinated team framework** is **X02 Coordinated SWF Flex Generalist** at **S / 93**. Among individual specialist metas, **G01 General Generator Pressure** is **A / 84 Solo** and **S / 92 SWF**, while **C01 General Chase / Looping** is **A / 79 Solo** and **A / 86 SWF**.

Stage 3A preserves Stage 2 Power values rather than rerunning the ranking model. The only changes are schema-level normalizations where Stage 3 semantics require them: Legacy entries no longer occupy current D tier; X02 is not numerically ranked in Solo Q; C14 remains unranked in SWF because Stage 2 did not establish a SWF Power score; and the two family nodes are non-aggregate navigation objects.

## 2. Methodology and Evidence Limits

Stage 2 remains the primary analytical authority for current classifications, Power scores, environment comparisons, and disputed findings. Stage 3A adds the canonical identity/snapshot architecture, Meta Stability, ranking indices, relationship integrity, build normalization, and explicit rankability states.

**Power** is the existing Stage 2 model-based comparative-strength score. It is **not** an observed escape probability. Tier thresholds remain: S 88–100, A 78–87, B 66–77, C 50–65, D 0–49.

**Meta Stability** is a new Stage 3 durability model, not current strength and not evidence confidence. It sums six required components: Structural Independence (25), Core Mechanic Durability (20), Replacement Depth (15), Environmental Breadth (15), Counter-Meta Independence (10), and Patch Durability (15). The scoring uses the strategy's structural type plus documented dependencies, patch sensitivity, environmental breadth, item/map reliance, opponent-behavior dependence, and emerging/experimental status. It should be treated as a transparent research-model inference rather than telemetry.

**Evidence timing remains the central limitation.** Patch 10.2.0 went live on October 6, 2026, roughly one day before the cutoff. Official Behaviour notes can establish mechanics, but rolling community statistics are transitional/mixed-patch evidence and cannot establish settled post-10.2 outcomes or prevalence. Freshly changed strategies are therefore marked `PROVISIONAL` or `UNRANKED` where numerical certainty would be false precision.

### Stage 2 → Stage 3A normalization log

| ID | Normalization | Reason |
| --- | --- | --- |
| C13 | Stage 2 historical D20/D20 presentation normalized to NOT_CURRENT with null current Power/Tier/Index. | Stage 3 legacy semantics explicitly prohibit putting Legacy strategies in current D tier. |
| G06 | Stage 2 historical D18/D18 presentation normalized to NOT_CURRENT with null current Power/Tier/Index. | Stage 3 legacy semantics explicitly prohibit putting Legacy strategies in current D tier. |
| X02 | Stage 2 Solo B68 outside-environment score normalized to NOT_APPLICABLE for Solo Q. | X02 is a coordinated four-player team architecture; a unified Solo competitive score is conceptually inapplicable under the Stage 3 ranking gate. |
| C14 | SWF ranking set to UNRANKED with null Power/Tier/Index. | Stage 2 supplies a Solo score (69) but no independently established SWF score; Stage 3 prohibits inventing Power. |
| X01 | SWF Power 77 retained/recovered in the canonical snapshot. | Stage 2 omitted X01 from one final SWF tier-list table but explicitly reported SWF 77 in its environment-comparison/high-priority analysis. |
| P00 | New canonical parent-family navigation record; rankings NOT_APPLICABLE. | Stage 2 reclassified Pickup Interception / Save Specialist as a parent strategy family whose children require independent scoring. |
| A00 | New canonical parent-family navigation record; rankings NOT_APPLICABLE. | Stage 2 reclassified Rescue-and-Reset Support as a parent strategy family whose children require independent scoring. |

## 3. Final Solo Q Meta / Strategy Ranking

### S Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X01 — Solo-Q Generalist | GENERALIST SHELL | ESTABLISHED | RANKED | 90 | 92 | 90.4 | MEDIUM | RISING | Broad self-sufficient coverage is the strongest Solo construction because it survives random role allocation and changing match states. |

### A Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G03 — Critical-Generator / Three-Gen Breaker | META SUBTYPE | ESTABLISHED | RANKED | 85 | 80 | 84.0 | MEDIUM | STABLE | Prevent late-game positional lock. |
| C09 — Anti-Tunnel Package | STRATEGIC MODULE | ESTABLISHED | RANKED | 85 | 77 | 83.4 | MEDIUM | STABLE | Punish or survive repeat targeting. |
| I01 — Solo-Q Information Shell | STRATEGIC MODULE | ESTABLISHED | RANKED | 85 | 77 | 83.4 | MEDIUM | RISING | Avoid duplicated rescues, find work and read danger. |
| G01 — General Generator Pressure | META | ESTABLISHED | RANKED | 84 | 92 | 85.6 | MEDIUM | STABLE | Direct generator tempo remains highly valuable even without comms, especially through critical-generator routing and self-contained item value. |
| C02 — Exhaustion Mobility Chase | META SUBTYPE | ESTABLISHED | RANKED | 84 | 77 | 82.6 | MEDIUM | RE-FORMING | Reliable chase extension without total build commitment. |
| G02 — Toolbox Generator Specialist | META SUBTYPE | ESTABLISHED | RANKED | 84 | 75 | 82.2 | MEDIUM | STABLE | Concentrated repair tempo; add-ons are excluded from DR. |
| I04 — Objective / Resource Routing | STRATEGIC MODULE | ESTABLISHED | RANKED | 82 | 75 | 80.6 | MEDIUM | RE-FORMING | Reduce dead travel and dangerous gen choices. |
| A01 — Hook Rescue / Post-Unhook Reset | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 80 | 74 | 78.8 | MEDIUM | RISING | Prevent hooks from snowballing. |
| C01 — General Chase / Looping | META | ESTABLISHED | RANKED | 79 | 90 | 81.2 | MEDIUM | STABLE | Reliable chase extension buys objective time, but pure four-slot chase commitment can lose value when the Killer refuses the chase. |

### B Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C03 — Vault / Window Specialist | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 74 | 59 | 71.0 | LOW_MEDIUM | RE-FORMING | Exploit strong window structures; placement remains provisional because 10.2 post-patch evidence is immature. |
| C06 — Chase Information / Routing | STRATEGIC MODULE | ESTABLISHED | PROVISIONAL | 72 | 77 | 73.0 | LOW_MEDIUM | RISING | Reduce pathing mistakes and teach map/resource state; placement remains provisional because 10.2 post-patch evidence is immature. |
| C11 — Hook-State Transfer | STRATEGIC MODULE | ESTABLISHED | PROVISIONAL | 72 | 76 | 72.8 | LOW_MEDIUM | TOO EARLY TO TELL | Preserve fourth player and deny early elimination; placement remains provisional because 10.2 post-patch evidence is immature. |
| C12 — Deterministic Self-Unhook | STRATEGIC MODULE | ESTABLISHED | RANKED | 71 | 76 | 72.0 | MEDIUM | STABLE | Save team travel/time when hooked. |
| C10 — Anti-Slug / Self-Recovery Package | STRATEGIC MODULE | ESTABLISHED | RANKED | 71 | 75 | 71.8 | MEDIUM | STABLE | Force Killer to respect downed Survivors. |
| A03 — Dedicated Healer / Triage | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 70 | 74 | 70.8 | MEDIUM | RISING | Restore team health efficiently. |
| G05 — Manual Skill-Check Generator | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 70 | 59 | 67.8 | LOW_MEDIUM | RE-FORMING | High ceiling without relying on old Stake Out automation; placement remains provisional because 10.2 post-patch evidence is immature. |
| C14 — Self-Sustain / Self-Heal | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 69 | 74 | 70.0 | MEDIUM | STABLE | Independence and reduced teammate travel. |
| I02 — Killer Tracking / Aura Seer | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 69 | 61 | 67.4 | LOW_MEDIUM | RISING | Make earlier rotation/stealth/chase decisions; placement remains provisional because 10.2 post-patch evidence is immature. |
| C04 — Pallet / Resource Specialist | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 69 | 61 | 67.4 | LOW_MEDIUM | RISING | Avoid dead zones and waste fewer pallets; placement remains provisional because 10.2 post-patch evidence is immature. |
| I03 — Teammate Tracking / Support Information | STRATEGIC MODULE | ESTABLISHED | RANKED | 68 | 77 | 69.8 | MEDIUM | STABLE | Enables support without voice. |
| G08 — Road Life Repair-to-Self-Heal | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 68 | 54 | 65.2 | LOW_MEDIUM | TOO EARLY TO TELL | Combines objective time with future independence; placement remains provisional because 10.2 post-patch evidence is immature. |
| C08 — Chase Reset / Disappearance | META SUBTYPE | ESTABLISHED | RANKED | 67 | 79 | 69.4 | MEDIUM | STABLE | Turn one LOS break into a full reset. |
| R03 — Item Recharge / Recursion | MECHANIC-CENTERED BUILD | ESTABLISHED | RANKED | 67 | 57 | 65.0 | MEDIUM | STABLE | Multiply value of strong item/add-ons. |
| G04 — Cooperative Repair / Gen Duo | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 66 | 73 | 67.4 | MEDIUM | STABLE | Burst key gens and exploit partner effects. |

### C Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A02 — Anti-Camp / Hook-Timer Control | STRATEGIC MODULE | ESTABLISHED | RANKED | 65 | 74 | 66.8 | MEDIUM | STABLE | Counter proxy/camp pressure without suicidal trade. |
| I05 — Chase Broadcast / Salvation's Cry | STRATEGIC MODULE | EMERGING | PROVISIONAL | 65 | 70 | 66.0 | LOW_MEDIUM | TOO EARLY TO TELL | Communicate chase state without voice; placement remains provisional because 10.2 post-patch evidence is immature. |
| G09 — Fast Track Rescue-to-Repair Tempo | META SUBTYPE | ESTABLISHED | RANKED | 64 | 79 | 67.0 | MEDIUM | RISING | A rescue does double strategic duty. |
| P02 — Flashbang Save | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 64 | 73 | 65.8 | MEDIUM | STABLE | Save without dedicating hand slot to flashlight. |
| G10 — Fruits of Your Labor Objective-to-Reset Hybrid | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 64 | 54 | 62.0 | LOW_MEDIUM | TOO EARLY TO TELL | Rewards doing the main objective without full specialization; placement remains provisional because 10.2 post-patch evidence is immature. |
| C07 — Stealth / Chase Avoidance | NICHE STRATEGY | ESTABLISHED | RANKED | 62 | 55 | 60.6 | MEDIUM | STABLE | Stay productive while avoiding Killer attention. |
| G07 — Boon: Steadfast Repair Zone | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 62 | 53 | 60.2 | LOW_MEDIUM | TOO EARLY TO TELL | Teamwide localized objective value; placement remains provisional because 10.2 post-patch evidence is immature. |
| A07 — Endgame Rescue | STRATEGIC MODULE | ESTABLISHED | RANKED | 61 | 73 | 63.4 | MEDIUM | RISING | Dramatically improve exit-stage saves. |
| P01 — Flashlight Save | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 61 | 67 | 62.2 | MEDIUM | STABLE | Convert a down into no hook and force pickup caution. |
| R02 — Pharmacy / Med-Kit Farming | ROLE SPECIALIZATION | EXPERIMENTAL | PROVISIONAL | 60 | 63 | 60.6 | LOW_MEDIUM | TOO EARLY TO TELL | Produce repeatable healing resources for self/team; placement remains provisional because 10.2 post-patch evidence is immature. |
| A04 — Hook-State-Scaled Fast Healing | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 60 | 53 | 58.6 | LOW_MEDIUM | TOO EARLY TO TELL | Stronger assistance where death risk is greatest; placement remains provisional because 10.2 post-patch evidence is immature. |
| R10 — Endgame Gate / Escape Shell | STRATEGIC MODULE | ESTABLISHED | RANKED | 59 | 71 | 61.4 | MEDIUM | RE-FORMING | Convert close endgames into escapes/rescues. |
| R09 — Obsession / High-Risk Aggro-Info | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 59 | 51 | 57.4 | LOW_MEDIUM | RE-FORMING | Turn Obsession state and mutual information into intentional macro; placement remains provisional because 10.2 post-patch evidence is immature. |
| P03 — Sabotage / Hook Denial | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 58 | 71 | 60.6 | MEDIUM | STABLE | Force drop/wiggle or longer carry route. |
| R04 — Boon Support Network | MECHANIC-CENTERED BUILD | ESTABLISHED | RANKED | 58 | 58 | 58.0 | MEDIUM | RE-FORMING | Teamwide effects can serve several roles. |
| A05 — Protection-Hit / Tank | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 56 | 73 | 59.4 | MEDIUM | STABLE | Save vulnerable teammates and force extra Killer hits. |
| R01 — Chest / Loot Scavenger | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 56 | 50 | 54.8 | LOW_MEDIUM | RISING | Flexible item economy without committing lobby item; placement remains provisional because 10.2 post-patch evidence is immature. |
| C15 — Haste / Movement Stack | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 55 | 53 | 54.6 | LOW_MEDIUM | TOO EARLY TO TELL | Unusual rotations and chase spacing; placement remains provisional because 10.2 post-patch evidence is immature. |
| P06 — Carry-Escape / Wiggle Denial | NICHE STRATEGY | ESTABLISHED | RANKED | 52 | 50 | 51.6 | MEDIUM | STABLE | Exploit hook geometry and Killer carry decisions. |

### D Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P04 — Breakout / Carry Interference | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 48 | 72 | 52.8 | MEDIUM | STABLE | Turn marginal carry distances into escapes. |
| A06 — Hook-Trade / Carry Bodyblock Protector | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 48 | 72 | 52.8 | MEDIUM | STABLE | Convert health states into prevented hook tempo. |
| R05 — Totem Hunter / Cleanser | NICHE STRATEGY | ESTABLISHED | RANKED | 48 | 55 | 49.4 | MEDIUM | RISING | Answer dangerous Hexes and trigger cleanse rewards. |
| R07 — Locker Utility / Head On | NICHE STRATEGY | ESTABLISHED | RANKED | 47 | 55 | 48.6 | MEDIUM | STABLE | Ambushes, resets and multi-purpose utility. |
| C05 — Fragile-Pallet Restoration | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 46 | 54 | 47.6 | LOW_MEDIUM | TOO EARLY TO TELL | Restore otherwise exhausted tiles; placement remains provisional because 10.2 post-patch evidence is immature. |
| R08 — Distraction / Misdirection | NICHE STRATEGY | ESTABLISHED | RANKED | 43 | 54 | 45.2 | MEDIUM | STABLE | Create rotations or waste Killer time indirectly. |
| P05 — Teammate Pallet Save | NICHE STRATEGY | ESTABLISHED | RANKED | 43 | 51 | 44.6 | MEDIUM | STABLE | Itemless save opportunity. |
| R06 — Invocation Ritual | NICHE STRATEGY | ESTABLISHED | RANKED | 42 | 54 | 44.4 | MEDIUM | STABLE | Obtain effects unavailable through ordinary actions. |

### SOLO Q UNRANKED
None.

### SOLO Q NOT APPLICABLE
| ID | Strategy | Reason |
| --- | --- | --- |
| X02 | Coordinated SWF Flex Generalist | Coordinated team architecture is conceptually inapplicable to Solo Q. |
| P00 | Pickup Interception / Save Family | Parent family: children are too strategically different for a meaningful aggregate competitive score. |
| A00 | Rescue-and-Reset Support Family | Parent family: children are too strategically different for a meaningful aggregate competitive score. |

## 4. Final Coordinated SWF Meta / Strategy Ranking

### S Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X02 — Coordinated SWF Flex Generalist | GENERALIST SHELL | ESTABLISHED | RANKED | 93 | 89 | 92.2 | MEDIUM_HIGH | RE-FORMING | The strongest coordinated framework because the team allocates runner, objective, reset, and flex responsibilities instead of duplicating tools. |
| G01 — General Generator Pressure | META | ESTABLISHED | RANKED | 92 | 92 | 92.0 | MEDIUM_HIGH | STABLE | Coordination lets teams route repair burst to the generators that matter most, producing the strongest specialist-meta score. |
| G03 — Critical-Generator / Three-Gen Breaker | META SUBTYPE | ESTABLISHED | RANKED | 91 | 80 | 88.8 | MEDIUM | STABLE | Prevent late-game positional lock. |
| G02 — Toolbox Generator Specialist | META SUBTYPE | ESTABLISHED | RANKED | 91 | 75 | 87.8 | MEDIUM | STABLE | Concentrated repair tempo; add-ons are excluded from DR. |

### A Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C11 — Hook-State Transfer | STRATEGIC MODULE | ESTABLISHED | PROVISIONAL | 87 | 76 | 84.8 | LOW_MEDIUM | TOO EARLY TO TELL | Preserve fourth player and deny early elimination; placement remains provisional because 10.2 post-patch evidence is immature. |
| C01 — General Chase / Looping | META | ESTABLISHED | RANKED | 86 | 90 | 86.8 | MEDIUM | STABLE | Role assignment lets a strong runner convert chase time into predictable team objective tempo. |
| C02 — Exhaustion Mobility Chase | META SUBTYPE | ESTABLISHED | RANKED | 86 | 77 | 84.2 | MEDIUM | RE-FORMING | Reliable chase extension without total build commitment. |
| A01 — Hook Rescue / Post-Unhook Reset | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 85 | 74 | 82.8 | MEDIUM | RISING | Prevent hooks from snowballing. |
| C09 — Anti-Tunnel Package | STRATEGIC MODULE | ESTABLISHED | RANKED | 82 | 77 | 81.0 | MEDIUM | STABLE | Punish or survive repeat targeting. |
| G04 — Cooperative Repair / Gen Duo | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 80 | 73 | 78.6 | MEDIUM | STABLE | Burst key gens and exploit partner effects. |
| P02 — Flashbang Save | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 79 | 73 | 77.8 | MEDIUM | STABLE | Save without dedicating hand slot to flashlight. |
| C10 — Anti-Slug / Self-Recovery Package | STRATEGIC MODULE | ESTABLISHED | RANKED | 78 | 75 | 77.4 | MEDIUM | STABLE | Force Killer to respect downed Survivors. |

### B Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X01 — Solo-Q Generalist | GENERALIST SHELL | ESTABLISHED | RANKED | 77 | 92 | 80.0 | MEDIUM | RISING | Still useful, but coordinated teams can outperform it by assigning higher-ceiling specialist roles. |
| C12 — Deterministic Self-Unhook | STRATEGIC MODULE | ESTABLISHED | RANKED | 77 | 76 | 76.8 | MEDIUM | STABLE | Save team travel/time when hooked. |
| A02 — Anti-Camp / Hook-Timer Control | STRATEGIC MODULE | ESTABLISHED | RANKED | 77 | 74 | 76.4 | MEDIUM | STABLE | Counter proxy/camp pressure without suicidal trade. |
| P01 — Flashlight Save | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 77 | 67 | 75.0 | MEDIUM | STABLE | Convert a down into no hook and force pickup caution. |
| C03 — Vault / Window Specialist | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 76 | 59 | 72.6 | LOW_MEDIUM | RE-FORMING | Exploit strong window structures; placement remains provisional because 10.2 post-patch evidence is immature. |
| A03 — Dedicated Healer / Triage | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 74 | 74 | 74.0 | MEDIUM | RISING | Restore team health efficiently. |
| R03 — Item Recharge / Recursion | MECHANIC-CENTERED BUILD | ESTABLISHED | RANKED | 74 | 57 | 70.6 | MEDIUM | STABLE | Multiply value of strong item/add-ons. |
| I04 — Objective / Resource Routing | STRATEGIC MODULE | ESTABLISHED | RANKED | 73 | 75 | 73.4 | MEDIUM | RE-FORMING | Reduce dead travel and dangerous gen choices. |
| P03 — Sabotage / Hook Denial | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 73 | 71 | 72.6 | MEDIUM | STABLE | Force drop/wiggle or longer carry route. |
| C04 — Pallet / Resource Specialist | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 73 | 61 | 70.6 | LOW_MEDIUM | RISING | Avoid dead zones and waste fewer pallets; placement remains provisional because 10.2 post-patch evidence is immature. |
| G05 — Manual Skill-Check Generator | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 73 | 59 | 70.2 | LOW_MEDIUM | RE-FORMING | High ceiling without relying on old Stake Out automation; placement remains provisional because 10.2 post-patch evidence is immature. |
| G09 — Fast Track Rescue-to-Repair Tempo | META SUBTYPE | ESTABLISHED | RANKED | 71 | 79 | 72.6 | MEDIUM | RISING | A rescue does double strategic duty. |
| A07 — Endgame Rescue | STRATEGIC MODULE | ESTABLISHED | RANKED | 70 | 73 | 70.6 | MEDIUM | RISING | Dramatically improve exit-stage saves. |
| G07 — Boon: Steadfast Repair Zone | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 70 | 53 | 66.6 | LOW_MEDIUM | TOO EARLY TO TELL | Teamwide localized objective value; placement remains provisional because 10.2 post-patch evidence is immature. |
| C08 — Chase Reset / Disappearance | META SUBTYPE | ESTABLISHED | RANKED | 69 | 79 | 71.0 | MEDIUM | STABLE | Turn one LOS break into a full reset. |
| A05 — Protection-Hit / Tank | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 69 | 73 | 69.8 | MEDIUM | STABLE | Save vulnerable teammates and force extra Killer hits. |
| P04 — Breakout / Carry Interference | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 68 | 72 | 68.8 | MEDIUM | STABLE | Turn marginal carry distances into escapes. |
| A06 — Hook-Trade / Carry Bodyblock Protector | ROLE SPECIALIZATION | ESTABLISHED | RANKED | 68 | 72 | 68.8 | MEDIUM | STABLE | Convert health states into prevented hook tempo. |
| R04 — Boon Support Network | MECHANIC-CENTERED BUILD | ESTABLISHED | RANKED | 68 | 58 | 66.0 | MEDIUM | RE-FORMING | Teamwide effects can serve several roles. |
| G10 — Fruits of Your Labor Objective-to-Reset Hybrid | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 67 | 54 | 64.4 | LOW_MEDIUM | TOO EARLY TO TELL | Rewards doing the main objective without full specialization; placement remains provisional because 10.2 post-patch evidence is immature. |
| A04 — Hook-State-Scaled Fast Healing | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 67 | 53 | 64.2 | LOW_MEDIUM | TOO EARLY TO TELL | Stronger assistance where death risk is greatest; placement remains provisional because 10.2 post-patch evidence is immature. |
| R09 — Obsession / High-Risk Aggro-Info | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 67 | 51 | 63.8 | LOW_MEDIUM | RE-FORMING | Turn Obsession state and mutual information into intentional macro; placement remains provisional because 10.2 post-patch evidence is immature. |

### C Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R10 — Endgame Gate / Escape Shell | STRATEGIC MODULE | ESTABLISHED | RANKED | 64 | 71 | 65.4 | MEDIUM | RE-FORMING | Convert close endgames into escapes/rescues. |
| C15 — Haste / Movement Stack | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 64 | 53 | 61.8 | LOW_MEDIUM | TOO EARLY TO TELL | Unusual rotations and chase spacing; placement remains provisional because 10.2 post-patch evidence is immature. |
| R02 — Pharmacy / Med-Kit Farming | ROLE SPECIALIZATION | EXPERIMENTAL | PROVISIONAL | 62 | 63 | 62.2 | LOW_MEDIUM | TOO EARLY TO TELL | Produce repeatable healing resources for self/team; placement remains provisional because 10.2 post-patch evidence is immature. |
| G08 — Road Life Repair-to-Self-Heal | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 62 | 54 | 60.4 | LOW_MEDIUM | TOO EARLY TO TELL | Combines objective time with future independence; placement remains provisional because 10.2 post-patch evidence is immature. |
| C06 — Chase Information / Routing | STRATEGIC MODULE | ESTABLISHED | PROVISIONAL | 61 | 77 | 64.2 | LOW_MEDIUM | RISING | Reduce pathing mistakes and teach map/resource state; placement remains provisional because 10.2 post-patch evidence is immature. |
| P05 — Teammate Pallet Save | NICHE STRATEGY | ESTABLISHED | RANKED | 58 | 51 | 56.6 | MEDIUM | STABLE | Itemless save opportunity. |
| R01 — Chest / Loot Scavenger | MECHANIC-CENTERED BUILD | EMERGING | PROVISIONAL | 58 | 50 | 56.4 | LOW_MEDIUM | RISING | Flexible item economy without committing lobby item; placement remains provisional because 10.2 post-patch evidence is immature. |
| I01 — Solo-Q Information Shell | STRATEGIC MODULE | ESTABLISHED | RANKED | 57 | 77 | 61.0 | MEDIUM | RISING | Avoid duplicated rescues, find work and read danger. |
| I02 — Killer Tracking / Aura Seer | MECHANIC-CENTERED BUILD | ESTABLISHED | PROVISIONAL | 56 | 61 | 57.0 | LOW_MEDIUM | RISING | Make earlier rotation/stealth/chase decisions; placement remains provisional because 10.2 post-patch evidence is immature. |
| P06 — Carry-Escape / Wiggle Denial | NICHE STRATEGY | ESTABLISHED | RANKED | 56 | 50 | 54.8 | MEDIUM | STABLE | Exploit hook geometry and Killer carry decisions. |
| R07 — Locker Utility / Head On | NICHE STRATEGY | ESTABLISHED | RANKED | 52 | 55 | 52.6 | MEDIUM | STABLE | Ambushes, resets and multi-purpose utility. |
| C07 — Stealth / Chase Avoidance | NICHE STRATEGY | ESTABLISHED | RANKED | 52 | 55 | 52.6 | MEDIUM | STABLE | Stay productive while avoiding Killer attention. |
| C05 — Fragile-Pallet Restoration | MECHANIC-CENTERED BUILD | EXPERIMENTAL | PROVISIONAL | 52 | 54 | 52.4 | LOW_MEDIUM | TOO EARLY TO TELL | Restore otherwise exhausted tiles; placement remains provisional because 10.2 post-patch evidence is immature. |
| I03 — Teammate Tracking / Support Information | STRATEGIC MODULE | ESTABLISHED | RANKED | 50 | 77 | 55.4 | MEDIUM | STABLE | Enables support without voice. |

### D Tier
| Name | Classification | Status | Rank status | Power | Stability | Index | Confidence | Trend | Why here |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I05 — Chase Broadcast / Salvation's Cry | STRATEGIC MODULE | EMERGING | PROVISIONAL | 49 | 70 | 53.2 | LOW_MEDIUM | TOO EARLY TO TELL | Communicate chase state without voice; placement remains provisional because 10.2 post-patch evidence is immature. |
| R06 — Invocation Ritual | NICHE STRATEGY | ESTABLISHED | RANKED | 49 | 54 | 50.0 | MEDIUM | STABLE | Obtain effects unavailable through ordinary actions. |
| R08 — Distraction / Misdirection | NICHE STRATEGY | ESTABLISHED | RANKED | 48 | 54 | 49.2 | MEDIUM | STABLE | Create rotations or waste Killer time indirectly. |
| R05 — Totem Hunter / Cleanser | NICHE STRATEGY | ESTABLISHED | RANKED | 45 | 55 | 47.0 | MEDIUM | RISING | Answer dangerous Hexes and trigger cleanse rewards. |

### SWF UNRANKED
| ID | Strategy | Reason |
| --- | --- | --- |
| C14 | Self-Sustain / Self-Heal | Current and meaningful, but Stage 2 did not establish an independent SWF Power score, so Stage 3 leaves it unranked rather than guessing. |

### SWF NOT APPLICABLE
| ID | Strategy | Reason |
| --- | --- | --- |
| P00 | Pickup Interception / Save Family | Parent family: children are too strategically different for a meaningful aggregate competitive score. |
| A00 | Rescue-and-Reset Support Family | Parent family: children are too strategically different for a meaningful aggregate competitive score. |

## 5. Unranked / Provisional Strategies

The following strategies carry at least one provisional environment placement because the available evidence supports an estimate but not a mature post-10.2 conclusion:

| ID | Strategy | Status | Trend | Solo | SWF |
| --- | --- | --- | --- | --- | --- |
| A04 | Hook-State-Scaled Fast Healing | EXPERIMENTAL | TOO EARLY TO TELL | PROVISIONAL C 60 | PROVISIONAL B 67 |
| C03 | Vault / Window Specialist | ESTABLISHED | RE-FORMING | PROVISIONAL B 74 | PROVISIONAL B 76 |
| C04 | Pallet / Resource Specialist | ESTABLISHED | RISING | PROVISIONAL B 69 | PROVISIONAL B 73 |
| C05 | Fragile-Pallet Restoration | EXPERIMENTAL | TOO EARLY TO TELL | PROVISIONAL D 46 | PROVISIONAL C 52 |
| C06 | Chase Information / Routing | ESTABLISHED | RISING | PROVISIONAL B 72 | PROVISIONAL C 61 |
| C11 | Hook-State Transfer | ESTABLISHED | TOO EARLY TO TELL | PROVISIONAL B 72 | PROVISIONAL A 87 |
| C15 | Haste / Movement Stack | EMERGING | TOO EARLY TO TELL | PROVISIONAL C 55 | PROVISIONAL C 64 |
| G05 | Manual Skill-Check Generator | ESTABLISHED | RE-FORMING | PROVISIONAL B 70 | PROVISIONAL B 73 |
| G07 | Boon: Steadfast Repair Zone | EMERGING | TOO EARLY TO TELL | PROVISIONAL C 62 | PROVISIONAL B 70 |
| G08 | Road Life Repair-to-Self-Heal | EXPERIMENTAL | TOO EARLY TO TELL | PROVISIONAL B 68 | PROVISIONAL C 62 |
| G10 | Fruits of Your Labor Objective-to-Reset Hybrid | EXPERIMENTAL | TOO EARLY TO TELL | PROVISIONAL C 64 | PROVISIONAL B 67 |
| I02 | Killer Tracking / Aura Seer | ESTABLISHED | RISING | PROVISIONAL B 69 | PROVISIONAL C 56 |
| I05 | Chase Broadcast / Salvation's Cry | EMERGING | TOO EARLY TO TELL | PROVISIONAL C 65 | PROVISIONAL D 49 |
| R01 | Chest / Loot Scavenger | EMERGING | RISING | PROVISIONAL C 56 | PROVISIONAL C 58 |
| R02 | Pharmacy / Med-Kit Farming | EXPERIMENTAL | TOO EARLY TO TELL | PROVISIONAL C 60 | PROVISIONAL C 62 |
| R09 | Obsession / High-Risk Aggro-Info | EMERGING | RE-FORMING | PROVISIONAL C 59 | PROVISIONAL B 67 |

**C14 Self-Sustain / Self-Heal** is separately **UNRANKED in coordinated SWF** because Stage 2 did not establish an independent SWF Power score. Its Solo result remains B / 69.

## 6. Parent Strategy Families

Stage 2 established that Pickup Interception and Rescue-and-Reset are useful strategic families but are too internally heterogeneous for one honest aggregate Power score. Stage 3A therefore creates explicit parent records and ranks the children independently.

### P00 — Pickup Interception / Save Family

Family of strategies that deliberately try to prevent a teammate's down from converting into a hook through pickup denial, hook denial, or carry interference. The children manipulate different resources and therefore are not one rankable archetype.

| Child | Strategy | Classification | Solo | SWF |
| --- | --- | --- | --- | --- |
| P01 | Flashlight Save | ROLE SPECIALIZATION | C 61 | B 77 |
| P02 | Flashbang Save | ROLE SPECIALIZATION | C 64 | A 79 |
| P03 | Sabotage / Hook Denial | ROLE SPECIALIZATION | C 58 | B 73 |
| P04 | Breakout / Carry Interference | ROLE SPECIALIZATION | D 48 | B 68 |
| P05 | Teammate Pallet Save | NICHE STRATEGY | D 43 | C 58 |

### A00 — Rescue-and-Reset Support Family

Family of strategies that preserve team hook-state economy and stabilize injured or hooked teammates through rescue, rapid resetting, protection, anti-camp timing, or hook-state redistribution. Its children are too strategically different for one aggregate Power score.

| Child | Strategy | Classification | Solo | SWF |
| --- | --- | --- | --- | --- |
| A01 | Hook Rescue / Post-Unhook Reset | ROLE SPECIALIZATION | A 80 | A 85 |
| A03 | Dedicated Healer / Triage | ROLE SPECIALIZATION | B 70 | B 74 |
| A05 | Protection-Hit / Tank | ROLE SPECIALIZATION | C 56 | B 69 |
| C11 | Hook-State Transfer | STRATEGIC MODULE | B 72 | A 87 |

## 7. Legacy Strategies

| ID | Strategy | Historical function | Why legacy now | Current replacement / successor |
| --- | --- | --- | --- | --- |
| C13 | Luck-Based Self-Unhook | Luck-based self-unhook packages attempted to convert hook-state risk through luck and self-unhook probability. | Stage 2 classified the strategy as Legacy; Stage 3 therefore removes its historical D20 score from current ranking semantics. | C12 Deterministic Self-Unhook and broader anti-hook-state modules provide the current deterministic path. |
| G06 | Classic Stake Out–Hyperfocus Engine | The classic Stake Out + Hyperfocus engine converted stored tokens into repeated high-value generator skill checks. | Stage 2 classified the classic engine as Legacy after the generator skill-check ecosystem re-formed; Stage 3 therefore removes its historical D18 score from current ranking semantics. | G05 Manual Skill-Check Generator is the current parent concept for the re-formed mechanic-centered strategy. |

Legacy records remain in `strategies.json` for history, relationships, and future patch comparison. Their current snapshots use `NOT_CURRENT`, with null current Power, Tier, Ranking Index, Trend, and Meta Stability.

## 8. Complete Strategy Catalog

This is the Stage 3A completeness table. It contains every canonical Strategy, including parent families and Legacy records.

| ID | Name | Classification | Parent | Status | Solo status | Solo Tier/Power | SWF status | SWF Tier/Power | Stability | Trend | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A00 | Rescue-and-Reset Support Family | PARENT STRATEGY FAMILY | — | ESTABLISHED | NOT_APPLICABLE | — | NOT_APPLICABLE | — | 86 | RISING | Parent family introduced in Stage 3A to implement Stage 2 classification. |
| A01 | Hook Rescue / Post-Unhook Reset | ROLE SPECIALIZATION | A00 — Rescue-and-Reset Support Family | ESTABLISHED | RANKED | A / 80 | RANKED | A / 85 | 74 | RISING | Hook rescue/post-unhook reset |
| A02 | Anti-Camp / Hook-Timer Control | STRATEGIC MODULE | A01 — Hook Rescue / Post-Unhook Reset | ESTABLISHED | RANKED | C / 65 | RANKED | B / 77 | 74 | STABLE | Anti-camp timing |
| A03 | Dedicated Healer / Triage | ROLE SPECIALIZATION | A00 — Rescue-and-Reset Support Family | ESTABLISHED | RANKED | B / 70 | RANKED | B / 74 | 74 | RISING | Healer/triage |
| A04 | Hook-State-Scaled Fast Healing | MECHANIC-CENTERED BUILD | A03 — Dedicated Healer / Triage | EXPERIMENTAL | PROVISIONAL | C / 60 | PROVISIONAL | B / 67 | 53 | TOO EARLY TO TELL | Hook-state-scaled triage |
| A05 | Protection-Hit / Tank | ROLE SPECIALIZATION | A00 — Rescue-and-Reset Support Family | ESTABLISHED | RANKED | C / 56 | RANKED | B / 69 | 73 | STABLE | Protection-hit play |
| A06 | Hook-Trade / Carry Bodyblock Protector | ROLE SPECIALIZATION | A01 — Hook Rescue / Post-Unhook Reset | ESTABLISHED | RANKED | D / 48 | RANKED | B / 68 | 72 | STABLE | Hook trade/bodyblock |
| A07 | Endgame Rescue | STRATEGIC MODULE | A01 — Hook Rescue / Post-Unhook Reset | ESTABLISHED | RANKED | C / 61 | RANKED | B / 70 | 73 | RISING | Endgame rescue |
| C01 | General Chase / Looping | META | — | ESTABLISHED | RANKED | A / 79 | RANKED | A / 86 | 90 | STABLE | Confirmed major archetype |
| C02 | Exhaustion Mobility Chase | META SUBTYPE | C01 — General Chase / Looping | ESTABLISHED | RANKED | A / 84 | RANKED | A / 86 | 77 | RE-FORMING | Exhaustion mobility branch of C01 |
| C03 | Vault / Window Specialist | MECHANIC-CENTERED BUILD | C01 — General Chase / Looping | ESTABLISHED | PROVISIONAL | B / 74 | PROVISIONAL | B / 76 | 59 | RE-FORMING | Current window/vault specialization |
| C04 | Pallet / Resource Specialist | MECHANIC-CENTERED BUILD | C01 — General Chase / Looping | ESTABLISHED | PROVISIONAL | B / 69 | PROVISIONAL | B / 73 | 61 | RISING | Pallet-resource specialization |
| C05 | Fragile-Pallet Restoration | MECHANIC-CENTERED BUILD | C04 — Pallet / Resource Specialist | EXPERIMENTAL | PROVISIONAL | D / 46 | PROVISIONAL | C / 52 | 54 | TOO EARLY TO TELL | Fragile-pallet restoration |
| C06 | Chase Information / Routing | STRATEGIC MODULE | C01 — General Chase / Looping | ESTABLISHED | PROVISIONAL | B / 72 | PROVISIONAL | C / 61 | 77 | RISING | Chase information/routing |
| C07 | Stealth / Chase Avoidance | NICHE STRATEGY | — | ESTABLISHED | RANKED | C / 62 | RANKED | C / 52 | 55 | STABLE | Stealth/chase avoidance |
| C08 | Chase Reset / Disappearance | META SUBTYPE | C01 — General Chase / Looping | ESTABLISHED | RANKED | B / 67 | RANKED | B / 69 | 79 | STABLE | Chase-reset branch |
| C09 | Anti-Tunnel Package | STRATEGIC MODULE | — | ESTABLISHED | RANKED | A / 85 | RANKED | A / 82 | 77 | STABLE | Anti-tunnel |
| C10 | Anti-Slug / Self-Recovery Package | STRATEGIC MODULE | — | ESTABLISHED | RANKED | B / 71 | RANKED | A / 78 | 75 | STABLE | Anti-slug |
| C11 | Hook-State Transfer | STRATEGIC MODULE | A00 — Rescue-and-Reset Support Family | ESTABLISHED | PROVISIONAL | B / 72 | PROVISIONAL | A / 87 | 76 | TOO EARLY TO TELL | Hook-state transfer |
| C12 | Deterministic Self-Unhook | STRATEGIC MODULE | — | ESTABLISHED | RANKED | B / 71 | RANKED | B / 77 | 76 | STABLE | Deterministic self-unhook |
| C13 | Luck-Based Self-Unhook | NICHE STRATEGY | — | LEGACY | NOT_CURRENT | — | NOT_CURRENT | — | — | — | Classic luck self-unhook invalidated |
| C14 | Self-Sustain / Self-Heal | ROLE SPECIALIZATION | — | ESTABLISHED | RANKED | B / 69 | UNRANKED | — | 74 | STABLE | Self-sustain |
| C15 | Haste / Movement Stack | MECHANIC-CENTERED BUILD | C01 — General Chase / Looping | EMERGING | PROVISIONAL | C / 55 | PROVISIONAL | C / 64 | 53 | TOO EARLY TO TELL | Haste stacking |
| G01 | General Generator Pressure | META | — | ESTABLISHED | RANKED | A / 84 | RANKED | S / 92 | 92 | STABLE | Confirmed major archetype |
| G02 | Toolbox Generator Specialist | META SUBTYPE | G01 — General Generator Pressure | ESTABLISHED | RANKED | A / 84 | RANKED | S / 91 | 75 | STABLE | Toolbox specialization |
| G03 | Critical-Generator / Three-Gen Breaker | META SUBTYPE | G01 — General Generator Pressure | ESTABLISHED | RANKED | A / 85 | RANKED | S / 91 | 80 | STABLE | Critical-generator control |
| G04 | Cooperative Repair / Gen Duo | ROLE SPECIALIZATION | G01 — General Generator Pressure | ESTABLISHED | RANKED | B / 66 | RANKED | A / 80 | 73 | STABLE | Cooperative repair |
| G05 | Manual Skill-Check Generator | MECHANIC-CENTERED BUILD | G01 — General Generator Pressure | ESTABLISHED | PROVISIONAL | B / 70 | PROVISIONAL | B / 73 | 59 | RE-FORMING | Manual Hyperfocus |
| G06 | Classic Stake Out–Hyperfocus Engine | MECHANIC-CENTERED BUILD | G05 — Manual Skill-Check Generator | LEGACY | NOT_CURRENT | — | NOT_CURRENT | — | — | — | Classic Stake Out–Hyperfocus engine |
| G07 | Boon: Steadfast Repair Zone | MECHANIC-CENTERED BUILD | G01 — General Generator Pressure | EMERGING | PROVISIONAL | C / 62 | PROVISIONAL | B / 70 | 53 | TOO EARLY TO TELL | Steadfast generator zone |
| G08 | Road Life Repair-to-Self-Heal | MECHANIC-CENTERED BUILD | G01 — General Generator Pressure | EXPERIMENTAL | PROVISIONAL | B / 68 | PROVISIONAL | C / 62 | 54 | TOO EARLY TO TELL | Road Life hybrid |
| G09 | Fast Track Rescue-to-Repair Tempo | META SUBTYPE | G01 — General Generator Pressure | ESTABLISHED | RANKED | C / 64 | RANKED | B / 71 | 79 | RISING | Rescue→repair conversion |
| G10 | Fruits of Your Labor Objective-to-Reset Hybrid | MECHANIC-CENTERED BUILD | G01 — General Generator Pressure | EXPERIMENTAL | PROVISIONAL | C / 64 | PROVISIONAL | B / 67 | 54 | TOO EARLY TO TELL | Objective→reset hybrid |
| I01 | Solo-Q Information Shell | STRATEGIC MODULE | — | ESTABLISHED | RANKED | A / 85 | RANKED | C / 57 | 77 | RISING | Solo-Q information package |
| I02 | Killer Tracking / Aura Seer | MECHANIC-CENTERED BUILD | — | ESTABLISHED | PROVISIONAL | B / 69 | PROVISIONAL | C / 56 | 61 | RISING | Killer tracking |
| I03 | Teammate Tracking / Support Information | STRATEGIC MODULE | — | ESTABLISHED | RANKED | B / 68 | RANKED | C / 50 | 77 | STABLE | Teammate information |
| I04 | Objective / Resource Routing | STRATEGIC MODULE | — | ESTABLISHED | RANKED | A / 82 | RANKED | B / 73 | 75 | RE-FORMING | Objective routing |
| I05 | Chase Broadcast / Salvation's Cry | STRATEGIC MODULE | — | EMERGING | PROVISIONAL | C / 65 | PROVISIONAL | D / 49 | 70 | TOO EARLY TO TELL | Chase broadcasting |
| P00 | Pickup Interception / Save Family | PARENT STRATEGY FAMILY | — | ESTABLISHED | NOT_APPLICABLE | — | NOT_APPLICABLE | — | 85 | STABLE | Parent family introduced in Stage 3A to implement Stage 2 classification. |
| P01 | Flashlight Save | ROLE SPECIALIZATION | P00 — Pickup Interception / Save Family | ESTABLISHED | RANKED | C / 61 | RANKED | B / 77 | 67 | STABLE | Flashlight saving |
| P02 | Flashbang Save | ROLE SPECIALIZATION | P00 — Pickup Interception / Save Family | ESTABLISHED | RANKED | C / 64 | RANKED | A / 79 | 73 | STABLE | Flashbang saving |
| P03 | Sabotage / Hook Denial | ROLE SPECIALIZATION | P00 — Pickup Interception / Save Family | ESTABLISHED | RANKED | C / 58 | RANKED | B / 73 | 71 | STABLE | Sabotage |
| P04 | Breakout / Carry Interference | ROLE SPECIALIZATION | P00 — Pickup Interception / Save Family | ESTABLISHED | RANKED | D / 48 | RANKED | B / 68 | 72 | STABLE | Carry interference |
| P05 | Teammate Pallet Save | NICHE STRATEGY | P00 — Pickup Interception / Save Family | ESTABLISHED | RANKED | D / 43 | RANKED | C / 58 | 51 | STABLE | Pallet saves |
| P06 | Carry-Escape / Wiggle Denial | NICHE STRATEGY | — | ESTABLISHED | RANKED | C / 52 | RANKED | C / 56 | 50 | STABLE | Self carry/wiggle escape |
| R01 | Chest / Loot Scavenger | MECHANIC-CENTERED BUILD | — | EMERGING | PROVISIONAL | C / 56 | PROVISIONAL | C / 58 | 50 | RISING | Chest economy |
| R02 | Pharmacy / Med-Kit Farming | ROLE SPECIALIZATION | R01 — Chest / Loot Scavenger | EXPERIMENTAL | PROVISIONAL | C / 60 | PROVISIONAL | C / 62 | 63 | TOO EARLY TO TELL | Pharmacy Med-Kit economy |
| R03 | Item Recharge / Recursion | MECHANIC-CENTERED BUILD | — | ESTABLISHED | RANKED | B / 67 | RANKED | B / 74 | 57 | STABLE | Item recursion |
| R04 | Boon Support Network | MECHANIC-CENTERED BUILD | — | ESTABLISHED | RANKED | C / 58 | RANKED | B / 68 | 58 | RE-FORMING | Boon network |
| R05 | Totem Hunter / Cleanser | NICHE STRATEGY | — | ESTABLISHED | RANKED | D / 48 | RANKED | D / 45 | 55 | RISING | Totem hunter |
| R06 | Invocation Ritual | NICHE STRATEGY | — | ESTABLISHED | RANKED | D / 42 | RANKED | D / 49 | 54 | STABLE | Invocation |
| R07 | Locker Utility / Head On | NICHE STRATEGY | — | ESTABLISHED | RANKED | D / 47 | RANKED | C / 52 | 55 | STABLE | Locker utility |
| R08 | Distraction / Misdirection | NICHE STRATEGY | — | ESTABLISHED | RANKED | D / 43 | RANKED | D / 48 | 54 | STABLE | Misdirection |
| R09 | Obsession / High-Risk Aggro-Info | MECHANIC-CENTERED BUILD | — | EMERGING | PROVISIONAL | C / 59 | PROVISIONAL | B / 67 | 51 | RE-FORMING | Obsession/aggro-info |
| R10 | Endgame Gate / Escape Shell | STRATEGIC MODULE | — | ESTABLISHED | RANKED | C / 59 | RANKED | C / 64 | 71 | RE-FORMING | Endgame insurance |
| X01 | Solo-Q Generalist | GENERALIST SHELL | — | ESTABLISHED | RANKED | S / 90 | RANKED | B / 77 | 92 | RISING | Solo construction philosophy |
| X02 | Coordinated SWF Flex Generalist | GENERALIST SHELL | — | ESTABLISHED | NOT_APPLICABLE | — | RANKED | S / 93 | 89 | RE-FORMING | SWF team-allocation philosophy |

## 9. Stability Analysis

Highest modeled strategic durability:

| ID | Strategy | Stability | Label | Solo Power | SWF Power |
| --- | --- | --- | --- | --- | --- |
| G01 | General Generator Pressure | 92 | VERY STABLE | 84 | 92 |
| X01 | Solo-Q Generalist | 92 | VERY STABLE | 90 | 77 |
| C01 | General Chase / Looping | 90 | VERY STABLE | 79 | 86 |
| X02 | Coordinated SWF Flex Generalist | 89 | VERY STABLE | — | 93 |
| A00 | Rescue-and-Reset Support Family | 86 | VERY STABLE | — | — |
| P00 | Pickup Interception / Save Family | 85 | VERY STABLE | — | — |
| G03 | Critical-Generator / Three-Gen Breaker | 80 | STABLE | 85 | 91 |
| C08 | Chase Reset / Disappearance | 79 | STABLE | 67 | 69 |
| G09 | Fast Track Rescue-to-Repair Tempo | 79 | STABLE | 64 | 71 |
| C02 | Exhaustion Mobility Chase | 77 | STABLE | 84 | 86 |
| C06 | Chase Information / Routing | 77 | STABLE | 72 | 61 |
| C09 | Anti-Tunnel Package | 77 | STABLE | 85 | 82 |
| I01 | Solo-Q Information Shell | 77 | STABLE | 85 | 57 |
| I03 | Teammate Tracking / Support Information | 77 | STABLE | 68 | 50 |
| C11 | Hook-State Transfer | 76 | STABLE | 72 | 87 |

Lowest current modeled durability:

| ID | Strategy | Stability | Label | Status | Trend |
| --- | --- | --- | --- | --- | --- |
| P06 | Carry-Escape / Wiggle Denial | 50 | WATCH | ESTABLISHED | STABLE |
| R01 | Chest / Loot Scavenger | 50 | WATCH | EMERGING | RISING |
| P05 | Teammate Pallet Save | 51 | WATCH | ESTABLISHED | STABLE |
| R09 | Obsession / High-Risk Aggro-Info | 51 | WATCH | EMERGING | RE-FORMING |
| A04 | Hook-State-Scaled Fast Healing | 53 | WATCH | EXPERIMENTAL | TOO EARLY TO TELL |
| C15 | Haste / Movement Stack | 53 | WATCH | EMERGING | TOO EARLY TO TELL |
| G07 | Boon: Steadfast Repair Zone | 53 | WATCH | EMERGING | TOO EARLY TO TELL |
| C05 | Fragile-Pallet Restoration | 54 | WATCH | EXPERIMENTAL | TOO EARLY TO TELL |
| G08 | Road Life Repair-to-Self-Heal | 54 | WATCH | EXPERIMENTAL | TOO EARLY TO TELL |
| G10 | Fruits of Your Labor Objective-to-Reset Hybrid | 54 | WATCH | EXPERIMENTAL | TOO EARLY TO TELL |
| R06 | Invocation Ritual | 54 | WATCH | ESTABLISHED | STABLE |
| R08 | Distraction / Misdirection | 54 | WATCH | ESTABLISHED | STABLE |
| C07 | Stealth / Chase Avoidance | 55 | WATCH | ESTABLISHED | STABLE |
| R05 | Totem Hunter / Cleanser | 55 | WATCH | ESTABLISHED | RISING |
| R07 | Locker Utility / Head On | 55 | WATCH | ESTABLISHED | STABLE |

High Stability does **not** mean high current Power. A durable low-tier niche can remain structurally recognizable across patches; conversely, a powerful fresh mechanic can be volatile.

## 10. Largest Solo Q vs SWF Differences

Positive delta means the strategy scores higher in coordinated SWF; negative delta means it scores higher in Solo Q. Only strategies with independently numeric scores in both environments are included.

| ID | Strategy | Solo | SWF | SWF − Solo |
| --- | --- | --- | --- | --- |
| I01 | Solo-Q Information Shell | 85 | 57 | -28 |
| A06 | Hook-Trade / Carry Bodyblock Protector | 48 | 68 | +20 |
| P04 | Breakout / Carry Interference | 48 | 68 | +20 |
| I03 | Teammate Tracking / Support Information | 68 | 50 | -18 |
| I05 | Chase Broadcast / Salvation's Cry | 65 | 49 | -16 |
| P01 | Flashlight Save | 61 | 77 | +16 |
| C11 | Hook-State Transfer | 72 | 87 | +15 |
| P02 | Flashbang Save | 64 | 79 | +15 |
| P03 | Sabotage / Hook Denial | 58 | 73 | +15 |
| P05 | Teammate Pallet Save | 43 | 58 | +15 |
| G04 | Cooperative Repair / Gen Duo | 66 | 80 | +14 |
| A05 | Protection-Hit / Tank | 56 | 69 | +13 |
| I02 | Killer Tracking / Aura Seer | 69 | 56 | -13 |
| X01 | Solo-Q Generalist | 90 | 77 | -13 |
| A02 | Anti-Camp / Hook-Timer Control | 65 | 77 | +12 |

The largest environment split is **I01 Solo-Q Information Shell**, which loses much of its value in coordinated SWF because voice communication replaces information that Solo players otherwise need perk slots to obtain. At the opposite pole, carry-interference and save roles such as A06/P04 gain sharply from coordination.

## 11. Strongest Long-Term Strategies

For long-horizon planning, the safest strategic identities are those combining high current Power with high Stability rather than merely topping one fresh-patch tier.

- **G01 General Generator Pressure:** S92 SWF, A84 Solo, Stability 92. The win-condition contribution is direct and the concept survives individual perk turnover.
- **C01 General Chase / Looping:** A86 SWF, A79 Solo, Stability 90. Chase-time conversion is foundational even when exact mobility or vault tools change.
- **X01 Solo-Q Generalist:** S90 Solo, Stability 92. Its identity is structural flexibility rather than dependency on one perk package.
- **G03 Critical-Generator / Three-Gen Breaker:** A85 Solo, S91 SWF, Stability 80. Critical-generator selection is a durable objective principle.
- **C09 Anti-Tunnel Package:** A85 Solo, A82 SWF, Stability 77. Exact anti-tunnel perks may rotate, but the defensive function persists as long as tunneling remains strategically relevant.

## 12. Most Volatile Strategies

The most fragile current records cluster around fresh 10.2 mechanics, emerging experiments, map/item dependencies, and narrow activation conditions. The primary examples are **R01 Chest / Loot Scavenger**, **P06 Carry-Escape / Wiggle Denial**, **R09 Obsession / High-Risk Aggro-Info**, **P05 Teammate Pallet Save**, and the experimental G07/G08/G10/A04 group.

Volatility here is a recheck priority, not a declaration that the strategy is bad.

## 13. Emerging / Experimental Watchlist

| ID | Strategy | Status | Trend | Solo | SWF | Stability |
| --- | --- | --- | --- | --- | --- | --- |
| A04 | Hook-State-Scaled Fast Healing | EXPERIMENTAL | TOO EARLY TO TELL | C / 60 | B / 67 | 53 |
| C02 | Exhaustion Mobility Chase | ESTABLISHED | RE-FORMING | A / 84 | A / 86 | 77 |
| C03 | Vault / Window Specialist | ESTABLISHED | RE-FORMING | B / 74 | B / 76 | 59 |
| C05 | Fragile-Pallet Restoration | EXPERIMENTAL | TOO EARLY TO TELL | D / 46 | C / 52 | 54 |
| C11 | Hook-State Transfer | ESTABLISHED | TOO EARLY TO TELL | B / 72 | A / 87 | 76 |
| C15 | Haste / Movement Stack | EMERGING | TOO EARLY TO TELL | C / 55 | C / 64 | 53 |
| G05 | Manual Skill-Check Generator | ESTABLISHED | RE-FORMING | B / 70 | B / 73 | 59 |
| G07 | Boon: Steadfast Repair Zone | EMERGING | TOO EARLY TO TELL | C / 62 | B / 70 | 53 |
| G08 | Road Life Repair-to-Self-Heal | EXPERIMENTAL | TOO EARLY TO TELL | B / 68 | C / 62 | 54 |
| G10 | Fruits of Your Labor Objective-to-Reset Hybrid | EXPERIMENTAL | TOO EARLY TO TELL | C / 64 | B / 67 | 54 |
| I04 | Objective / Resource Routing | ESTABLISHED | RE-FORMING | A / 82 | B / 73 | 75 |
| I05 | Chase Broadcast / Salvation's Cry | EMERGING | TOO EARLY TO TELL | C / 65 | D / 49 | 70 |
| R01 | Chest / Loot Scavenger | EMERGING | RISING | C / 56 | C / 58 | 50 |
| R02 | Pharmacy / Med-Kit Farming | EXPERIMENTAL | TOO EARLY TO TELL | C / 60 | C / 62 | 63 |
| R04 | Boon Support Network | ESTABLISHED | RE-FORMING | C / 58 | B / 68 | 58 |
| R09 | Obsession / High-Risk Aggro-Info | EMERGING | RE-FORMING | C / 59 | B / 67 | 51 |
| R10 | Endgame Gate / Escape Shell | ESTABLISHED | RE-FORMING | C / 59 | C / 64 | 71 |
| X02 | Coordinated SWF Flex Generalist | ESTABLISHED | RE-FORMING | — / — | S / 93 | 89 |

## 14. Research Flags and Recheck Conditions

Primary recheck triggers:

1. Any 10.2.1+ patch that materially changes defining Survivor perks, items, hook/rescue mechanics, generator systems, or chase-resource rules.
2. A sufficiently clean post-10.2 prevalence window replacing the current mixed-patch community data.
3. New credible outcome evidence that changes the expected-value judgment for specialist saving, chest economy, Road Life, Steadfast, Shoulder the Burden / hook-state transfer, or the re-formed skill-check generator ecosystem.
4. Evidence sufficient to assign **C14 Self-Sustain / Self-Heal** an independent coordinated-SWF Power score.
5. A future strategy rework that changes the strategic objective/gameplay loop enough to require a new Strategy identity rather than a new snapshot or BuildImplementation.

Every current snapshot also carries strategy-specific `researchFlags` and `recheckConditions`.

## 15. Data-Integrity Audit

| Check | Result |
| --- | --- |
| Canonical Strategy count | 57 |
| Stage 1.5 entries explicitly represented | 55 / 55 |
| Patch snapshots | 57 |
| Unique Strategy IDs | PASS |
| One snapshot per Strategy | PASS |
| Parent/subtype referential integrity | PASS |
| Ranking / null semantics | PASS |
| Meta Stability arithmetic / labels | PASS |
| Structured build perk IDs against canonical 10.2 dataset | PASS |
| All records side = SURVIVOR | PASS |
| Overall validation | PASS |

The perk-ID audit uses `dbd-survivor-perks-live-10.2.0-2026-10-06.json`. Where Stage 2 described a build slot as an alternative or generic flex, Stage 3A stores that separately instead of inventing a fake compound perk ID. The Halloween-license anti-tunnel perk is stored using the canonical dataset ID `will-to-live`, with a display note that licensed owners may see **Decisive Strike**.

## 16. Canonical JSON Outputs

### `strategies.json`

One persistent record per canonical Strategy. This owns stable identity, taxonomy, relationships, general definition, roles, conceptual mechanics, tags, and `firstCatalogedPatch`.

### `strategy-snapshots.json`

One 10.2.0-r1 snapshot per Strategy. This owns current status, trend, material-change metadata, Solo/SWF evaluations, Meta Stability, diagnostics, dependencies, prevalence/confidence, current perk/item/counter/synergy data, BuildImplementations, analysis, provenance, research flags, and recheck conditions.

### `validation.json`

Machine-readable integrity results plus the Stage 2 → Stage 3A normalization log.

---

## Source foundation

- *Dead by Daylight Survivor Meta — Discovery at Patch 10.2.0* — Stage 1.
- *Dead by Daylight Survivor Strategy Catalog: Stage 1.5* — complete discovery catalog.
- *Dead by Daylight Survivor Meta Research — Stage Two Adversarial Verification* — primary analytical authority for Power/classification.
- *Pre-Stage 3 Architecture Decision Audit* — identity/snapshot/build and history model.
- *Stage 3A — Canonical Database, Final Rankings, and Publication Data* — governing final schema.
- Behaviour Interactive, *10.2.0 | Mid-Chapter* — authoritative live mechanics baseline.
- `dbd-survivor-perks-live-10.2.0-2026-10-06.json` — canonical Survivor perk IDs/mechanics for structured build references.

**Evidence cutoff remains October 7, 2026.** This revision intentionally does not import later evidence into the historical 10.2.0-r1 snapshot.
