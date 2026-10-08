---
strategyId: "I01"
snapshotId: "I01@10.2.0-r1"
side: SURVIVOR
title: "Solo-Q Information Shell"
slug: "/survivor-meta/solo-q-information-shell"
structuralClassification: "STRATEGIC MODULE"
currentStatus: "ESTABLISHED"
parentId: null
patchBaseline: 10.2.0
researchRevision: 1
---
# I01 — Solo-Q Information Shell


### Identity

- **Strategy ID:** I01
- **Name:** Solo-Q Information Shell
- **Alternative Names:** Solo info, aura generalist
- **Structural Classification:** STRATEGIC MODULE
- **Current Status:** ESTABLISHED
- **Parent Strategy:** None
- **Patch Baseline:** 10.2.0
- **Solo Q:** **A** | Power **85** | Ranked | Confidence: MEDIUM
- **Coordinated SWF:** **C** | Power **57** | Ranked | Confidence: MEDIUM
- **Meta Stability:** 77 / 100 (STABLE)
- **Trend:** RISING
- **Prevalence:** Common


### Short Description

Replace missing voice information with passive game-state visibility. Explicitly compensates for uncertainty in Solo Q; community builds label this directly.

### Overview

Solo-Q Information Shell is a portable package that can attach to several broader builds. Its primary role is Decision support, with secondary emphasis on Rescue, objectives. The canonical reason players run it is **Avoid duplicated rescues, find work and read danger**.

### How It Works

- **Activation:** Create or recognize the state in which replace missing voice information with passive game-state visibility. Explicitly compensates for uncertainty in Solo Q; community builds label this directly..
- **Use case:** Commit when the likely payoff, avoid duplicated rescues, find work and read danger, is worth the time and slot cost.
- **Payoff:** Successful execution changes the match through Teammate/Killer/hook/gen auras.
- **Failure state:** The plan fails when its activation is denied, arrives too late, or consumes more team tempo than the resulting benefit returns.

### Why It Works

The strategy works by turning **Decision support** into a favorable exchange of match resources. Its defining mechanisms are Teammate/Killer/hook/gen auras. The payoff the research is trying to capture is **Avoid duplicated rescues, find work and read danger**. The useful question is not whether the effect looks strong in isolation, but whether the time, positioning, item charges, health states, or perk slots spent to obtain it are repaid by the resulting generator, chase, rescue, or survival tempo.

### Winning and Losing States

**Winning state:** The strategy is generating more team value than it costs in setup, travel, health states, item charges, or perk slots. Its intended payoff is being realized: **Avoid duplicated rescues, find work and read danger**.

**Losing state:** The player keeps paying the setup cost after the Killer, map, teammates, or game state have made the activation low-value. That is where specialization turns into opportunity cost.

### Solo Q

The canonical Solo Q evaluation is **A / 85** with **MEDIUM** confidence. That places it as strong in this environment; teammate uncertainty reduces some of its ceiling; its value comes partly from reducing uncertainty without relying on voice comms. Power is a comparative research score, not an observed escape percentage.

### Coordinated SWF

The canonical Coordinated SWF evaluation is **C / 57** with **MEDIUM** confidence. That places it as situational but competitively usable in this environment; planned teammate behavior reduces wasted commitment. Power is a comparative research score, not an observed escape percentage.

### Solo Q vs SWF

SWF Power is **57** versus **85** in Solo Q. Much of the strategy's value comes from solving uncertainty that voice communication already removes, so coordinated teams need less of it.

### Power vs Stability

Current competitive power is moderate to strong. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

### Strategic Diagnostics

- **Win Condition Contribution 4/5:** Regularly converts good execution into major team tempo.
- **Activation Reliability 5/5:** Is available very consistently when the player chooses to use it.
- **Activation Payoff 4/5:** Can create a large tempo or survival swing.
- **Denial Risk 2/5:** Has relatively little direct counterplay once the conditions are present.
- **Role Commitment 2/5:** Asks for modest specialization.

### Perks and Build Structure

#### Core / Defining Tools
Kindred; Bond; Premonition; Deja Vu; Open-Handed combinations

#### Supporting Tools
Supporting slots should protect the strategy's activation, reduce its opportunity cost, or cover a failure state rather than simply duplicate the same effect.

#### Flex Options
A flex slot can change without changing strategy identity as long as the core gameplay loop remains intact.

#### Trap / Outdated Choices
The main trap is overinvestment: adding more same-purpose perks can turn a useful module into dead slots when the Killer or match state refuses the interaction.

### Representative Builds

The canonical database establishes a **strategy framework**, not one verified four-perk implementation for this record. Its recorded perk ecosystem is: Kindred; Bond; Premonition; Deja Vu; Open-Handed combinations. These are descriptive research phrases unless a canonical perk ID appears in a BuildImplementation; they should not be treated as a locked loadout.

### Items and Add-ons

Canonical item context: Map optional. An item is only treated as required when the strategy's dependency data actually says so; otherwise it is an efficiency or access tool rather than the identity of the strategy.

### Skill and Execution

Stage 3A does not contain canonical numeric **Skill Floor**, **Skill Ceiling**, or **Execution Reliability** fields, so this page does not invent them. Practically, the strategy asks the player to develop: hook-state awareness.

### Dependencies and Reliability

- **TEAMMATES:** The strategy depends materially on teammate state, location, behavior, or willingness to cooperate.
- **RESOURCE_AVAILABILITY:** The plan depends on finite pallets, hooks, charges, chests, totems, or other resources remaining available.

### Strengths

- Avoid duplicated rescues, find work and read danger
- The strategic concept has durable underlying logic rather than depending on one fragile interaction.

### Weaknesses and Failure Modes

- Multiple info perks can overinvest in knowledge over direct tempo
- Teammate behavior can create wasted commitment or missed activation windows.

### Killer Counterplay

Direct denial is relatively limited once the strategy is in position, but the Killer can still reduce value by changing targets, routing, or forcing resource expenditure elsewhere. The canonical counter note is: Multiple info perks can overinvest in knowledge over direct tempo.

### Common Mistakes

- Forcing the strategy after its value window has passed instead of returning to generator or rescue tempo.
- Assuming teammates will understand the plan without enough information or coordination.
- Burning the relevant resource early and then expecting the strategy to function unchanged later.

### Current Meta Position

Canonical status: **ESTABLISHED**. Current standing: **Strong**. Prevalence: **Common**. Trend: **RISING**. Solo Q is **A / 85** (ranked). Coordinated SWF is **C / 57** (ranked).

### Stability and Future Outlook

Current competitive power is moderate to strong. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

Patch volatility: **MEDIUM**. Trend: **RISING**.

Research flags: `RECHECK_ON_MATERIAL_PATCH_CHANGE`.

Recheck when: Recheck immediately on any 10.2.1+ balance patch that materially affects defining perks, items, or mechanics.

### Evidence and Confidence

Mechanics: **HIGH** | Prevalence: **MEDIUM** | Power: **MEDIUM** | Solo: **MEDIUM** | SWF: **MEDIUM**.

Power values are Stage 2 researcher-model scores, not observed escape probabilities.

10.2.0 had been live for only about one day at the evidence cutoff; mixed-window prevalence is not clean post-10.2 telemetry.

**Evidence references**

- Dead by Daylight Survivor Meta Research — Stage Two Adversarial Verification (I01), 2026-10-07. Primary analytical authority for classification, Power, environment comparisons, and disputed findings.

- Dead by Daylight Survivor Strategy Catalog: Stage 1.5 (I01), 2026-10-07. Strategy identity, aliases, roles, mechanics, prevalence signals, limitations, and catalog completeness.

- 10.2.0 | Mid-Chapter, 2026-10-06. Authoritative live 10.2.0 mechanics and PTB-to-live changes. - https://forums.bhvr.com/dead-by-daylight/kb/articles/560-10-2-0-mid-chapter
