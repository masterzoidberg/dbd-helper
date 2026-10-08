---
strategyId: "C06"
snapshotId: "C06@10.2.0-r1"
side: SURVIVOR
title: "Chase Information / Routing"
slug: "/survivor-meta/chase-information-routing"
structuralClassification: "STRATEGIC MODULE"
currentStatus: "ESTABLISHED"
parentId: "C01"
patchBaseline: 10.2.0
researchRevision: 1
---
# C06 — Chase Information / Routing


### Identity

- **Strategy ID:** C06
- **Name:** Chase Information / Routing
- **Alternative Names:** Chase aura, tile-reading
- **Structural Classification:** STRATEGIC MODULE
- **Current Status:** ESTABLISHED
- **Parent Strategy:** [C01 — General Chase / Looping]
- **Patch Baseline:** 10.2.0
- **Solo Q:** **B** | Power **72** | Provisional | Confidence: LOW_MEDIUM
- **Coordinated SWF:** **C** | Power **61** | Provisional | Confidence: LOW_MEDIUM
- **Meta Stability:** 77 / 100 (STABLE)
- **Trend:** RISING
- **Prevalence:** Moderate


### Short Description

Pre-plan routes rather than react blind. Information changes route selection rather than raw speed.

### Overview

Chase Information / Routing is a portable package that can attach to several broader builds. Its primary role is Chase, with secondary emphasis on Info. The canonical reason players run it is **Reduce pathing mistakes and teach map/resource state**.

### How It Works

- **Activation:** Create or recognize the state in which pre-plan routes rather than react blind. Information changes route selection rather than raw speed.
- **Use case:** Commit when the likely payoff, reduce pathing mistakes and teach map/resource state, is worth the time and slot cost.
- **Payoff:** Successful execution changes the match through Killer/resource/window/pallet information.
- **Failure state:** The plan fails when its activation is denied, arrives too late, or consumes more team tempo than the resulting benefit returns.

### Why It Works

The strategy works by turning **Chase** into a favorable exchange of match resources. Its defining mechanisms are Killer/resource/window/pallet information. The payoff the research is trying to capture is **Reduce pathing mistakes and teach map/resource state**. The useful question is not whether the effect looks strong in isolation, but whether the time, positioning, item charges, health states, or perk slots spent to obtain it are repaid by the resulting generator, chase, rescue, or survival tempo.

### Winning and Losing States

**Winning state:** The strategy is generating more team value than it costs in setup, travel, health states, item charges, or perk slots. Its intended payoff is being realized: **Reduce pathing mistakes and teach map/resource state**.

**Losing state:** The player keeps paying the setup cost after the Killer, map, teammates, or game state have made the activation low-value. That is where specialization turns into opportunity cost.

### Solo Q

The canonical Solo Q evaluation is **B / 72** with **LOW_MEDIUM** confidence. That places it as viable and above average in this environment. Power is a comparative research score, not an observed escape percentage.

### Coordinated SWF

The canonical Coordinated SWF evaluation is **C / 61** with **LOW_MEDIUM** confidence. That places it as situational but competitively usable in this environment. Power is a comparative research score, not an observed escape percentage.

### Solo Q vs SWF

SWF Power is **61** versus **72** in Solo Q. Much of the strategy's value comes from solving uncertainty that voice communication already removes, so coordinated teams need less of it.

### Power vs Stability

Current competitive power is moderate to strong. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

### Strategic Diagnostics

- **Win Condition Contribution 3/5:** Can create meaningful value without carrying the match plan alone.
- **Activation Reliability 5/5:** Is available very consistently when the player chooses to use it.
- **Activation Payoff 3/5:** Produces a meaningful but not overwhelming swing.
- **Denial Risk 2/5:** Has relatively little direct counterplay once the conditions are present.
- **Role Commitment 2/5:** Asks for modest specialization.

### Perks and Build Structure

#### Core / Defining Tools
Dark Sense; Alert; Premonition; Five Moves Ahead; situational Windows

#### Supporting Tools
Supporting slots should protect the strategy's activation, reduce its opportunity cost, or cover a failure state rather than simply duplicate the same effect.

#### Flex Options
A flex slot can change without changing strategy identity as long as the core gameplay loop remains intact.

#### Trap / Outdated Choices
The main trap is overinvestment: adding more same-purpose perks can turn a useful module into dead slots when the Killer or match state refuses the interaction.

### Representative Builds

The canonical database establishes a **strategy framework**, not one verified four-perk implementation for this record. Its recorded perk ecosystem is: Dark Sense; Alert; Premonition; Five Moves Ahead; situational Windows. These are descriptive research phrases unless a canonical perk ID appears in a BuildImplementation; they should not be treated as a locked loadout.

### Items and Add-ons

Canonical item context: Map occasionally. An item is only treated as required when the strategy's dependency data actually says so; otherwise it is an efficiency or access tool rather than the identity of the strategy.

### Skill and Execution

Stage 3A does not contain canonical numeric **Skill Floor**, **Skill Ceiling**, or **Execution Reliability** fields, so this page does not invent them. Practically, the strategy asks the player to develop: pathing, tile and resource knowledge, Killer matchup judgment, resource and tile timing, pre-positioning.

### Dependencies and Reliability

- **MAP:** Map geometry or resource distribution materially changes how often the plan can be executed well.
- **POSITIONING:** The player must already be in the right place, or move there efficiently, before the value window closes.
- **RESOURCE_AVAILABILITY:** The plan depends on finite pallets, hooks, charges, chests, totems, or other resources remaining available.

### Strengths

- Reduce pathing mistakes and teach map/resource state
- The strategic concept has durable underlying logic rather than depending on one fragile interaction.

### Weaknesses and Failure Modes

- Info may duplicate player knowledge at high skill

### Killer Counterplay

Direct denial is relatively limited once the strategy is in position, but the Killer can still reduce value by changing targets, routing, or forcing resource expenditure elsewhere. The canonical counter note is: Info may duplicate player knowledge at high skill.

### Maps and Matchups

Map layout is a canonical dependency, so geometry or resource distribution can materially change activation quality and payoff. The canonical record does not support an exhaustive Killer-by-Killer matchup table, so this page stays at the supported archetype level.

### Synergies, Hybrids, and Related Strategies

- **Parent:** [C01 — General Chase / Looping]

### Common Mistakes

- Forcing the strategy after its value window has passed instead of returning to generator or rescue tempo.
- Reacting only after the key event starts instead of pre-positioning for it.
- Burning the relevant resource early and then expecting the strategy to function unchanged later.

### Current Meta Position

Canonical status: **ESTABLISHED**. Current standing: **Viable**. Prevalence: **Moderate**. Trend: **RISING**. Solo Q is **B / 72** (provisional). Coordinated SWF is **C / 61** (provisional).

### Stability and Future Outlook

Current competitive power is moderate to strong. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

Patch volatility: **LOW_MEDIUM**. Trend: **RISING**.

Research flags: `NEEDS_CLEAN_POST_10_2_SAMPLE`.

Recheck when: Recheck after a clean 14-day 10.2.0-only sample, no earlier than 2026-10-20 if no intervening balance hotfix. Recheck immediately on any 10.2.1+ balance patch that materially affects defining perks, items, or mechanics.

### Evidence and Confidence

Mechanics: **HIGH** | Prevalence: **MEDIUM** | Power: **LOW** | Solo: **LOW_MEDIUM** | SWF: **LOW_MEDIUM**.

Power values are Stage 2 researcher-model scores, not observed escape probabilities.

10.2.0 had been live for only about one day at the evidence cutoff; mixed-window prevalence is not clean post-10.2 telemetry.

**Evidence references**

- Dead by Daylight Survivor Meta Research — Stage Two Adversarial Verification (C06), 2026-10-07. Primary analytical authority for classification, Power, environment comparisons, and disputed findings.

- Dead by Daylight Survivor Strategy Catalog: Stage 1.5 (C06), 2026-10-07. Strategy identity, aliases, roles, mechanics, prevalence signals, limitations, and catalog completeness.

- 10.2.0 | Mid-Chapter, 2026-10-06. Authoritative live 10.2.0 mechanics and PTB-to-live changes. - https://forums.bhvr.com/dead-by-daylight/kb/articles/560-10-2-0-mid-chapter
