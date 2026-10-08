---
strategyId: "I03"
snapshotId: "I03@10.2.0-r1"
side: SURVIVOR
title: "Teammate Tracking / Support Information"
slug: "/survivor-meta/teammate-tracking-support-information"
structuralClassification: "STRATEGIC MODULE"
currentStatus: "ESTABLISHED"
parentId: null
patchBaseline: 10.2.0
researchRevision: 1
---
# I03 — Teammate Tracking / Support Information


### Identity

- **Strategy ID:** I03
- **Name:** Teammate Tracking / Support Information
- **Alternative Names:** Bond build, Empathy info
- **Structural Classification:** STRATEGIC MODULE
- **Current Status:** ESTABLISHED
- **Parent Strategy:** None
- **Patch Baseline:** 10.2.0
- **Solo Q:** **B** | Power **68** | Ranked | Confidence: MEDIUM
- **Coordinated SWF:** **C** | Power **50** | Ranked | Confidence: MEDIUM
- **Meta Stability:** 77 / 100 (STABLE)
- **Trend:** STABLE
- **Prevalence:** Moderate


### Short Description

Find teammates for heals, co-op objectives or avoidance. Team-location layer specifically.

### Overview

Teammate Tracking / Support Information is a portable package that can attach to several broader builds. Its primary role is Team tracking, with secondary emphasis on Healing, rescue. The canonical reason players run it is **Enables support without voice**.

### How It Works

- **Activation:** Create or recognize the state in which find teammates for heals, co-op objectives or avoidance. Team-location layer specifically.
- **Use case:** Commit when the likely payoff, enables support without voice, is worth the time and slot cost.
- **Payoff:** Successful execution changes the match through Aura locations of teammates/injured players.
- **Failure state:** The plan fails when its activation is denied, arrives too late, or consumes more team tempo than the resulting benefit returns.

### Why It Works

The strategy works by turning **Team tracking** into a favorable exchange of match resources. Its defining mechanisms are Aura locations of teammates/injured players. The payoff the research is trying to capture is **Enables support without voice**. The useful question is not whether the effect looks strong in isolation, but whether the time, positioning, item charges, health states, or perk slots spent to obtain it are repaid by the resulting generator, chase, rescue, or survival tempo.

### Winning and Losing States

**Winning state:** The strategy is generating more team value than it costs in setup, travel, health states, item charges, or perk slots. Its intended payoff is being realized: **Enables support without voice**.

**Losing state:** The player keeps paying the setup cost after the Killer, map, teammates, or game state have made the activation low-value. That is where specialization turns into opportunity cost.

### Solo Q

The canonical Solo Q evaluation is **B / 68** with **MEDIUM** confidence. That places it as viable and above average in this environment; teammate uncertainty reduces some of its ceiling; its value comes partly from reducing uncertainty without relying on voice comms. Power is a comparative research score, not an observed escape percentage.

### Coordinated SWF

The canonical Coordinated SWF evaluation is **C / 50** with **MEDIUM** confidence. That places it as situational but competitively usable in this environment; planned teammate behavior reduces wasted commitment. Power is a comparative research score, not an observed escape percentage.

### Solo Q vs SWF

SWF Power is **50** versus **68** in Solo Q. Much of the strategy's value comes from solving uncertainty that voice communication already removes, so coordinated teams need less of it.

### Power vs Stability

Current competitive power is situational. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

### Strategic Diagnostics

- **Win Condition Contribution 3/5:** Can create meaningful value without carrying the match plan alone.
- **Activation Reliability 5/5:** Is available very consistently when the player chooses to use it.
- **Activation Payoff 3/5:** Produces a meaningful but not overwhelming swing.
- **Denial Risk 2/5:** Has relatively little direct counterplay once the conditions are present.
- **Role Commitment 2/5:** Asks for modest specialization.

### Perks and Build Structure

#### Core / Defining Tools
Bond; Empathy; Aftercare; Empathic Connection

#### Supporting Tools
Supporting slots should protect the strategy's activation, reduce its opportunity cost, or cover a failure state rather than simply duplicate the same effect.

#### Flex Options
A flex slot can change without changing strategy identity as long as the core gameplay loop remains intact.

#### Trap / Outdated Choices
The main trap is overinvestment: adding more same-purpose perks can turn a useful module into dead slots when the Killer or match state refuses the interaction.

### Representative Builds

The canonical database establishes a **strategy framework**, not one verified four-perk implementation for this record. Its recorded perk ecosystem is: Bond; Empathy; Aftercare; Empathic Connection. These are descriptive research phrases unless a canonical perk ID appears in a BuildImplementation; they should not be treated as a locked loadout.

### Skill and Execution

Stage 3A does not contain canonical numeric **Skill Floor**, **Skill Ceiling**, or **Execution Reliability** fields, so this page does not invent them. Practically, the strategy asks the player to develop: macro decision-making appropriate to the strategy's role, recognizing when not to force the strategy.

### Dependencies and Reliability

- **TEAMMATES:** The strategy depends materially on teammate state, location, behavior, or willingness to cooperate.
- **GAME_STATE:** The strategy becomes valuable only in particular hook, injury, generator, endgame, or pressure states.

### Strengths

- Enables support without voice
- The strategic concept has durable underlying logic rather than depending on one fragile interaction.

### Weaknesses and Failure Modes

- Information can be redundant in coordinated SWF
- Teammate behavior can create wasted commitment or missed activation windows.

### Killer Counterplay

Direct denial is relatively limited once the strategy is in position, but the Killer can still reduce value by changing targets, routing, or forcing resource expenditure elsewhere. The canonical counter note is: Information can be redundant in coordinated SWF.

### Common Mistakes

- Forcing the strategy after its value window has passed instead of returning to generator or rescue tempo.
- Assuming teammates will understand the plan without enough information or coordination.

### Current Meta Position

Canonical status: **ESTABLISHED**. Current standing: **Viable**. Prevalence: **Moderate**. Trend: **STABLE**. Solo Q is **B / 68** (ranked). Coordinated SWF is **C / 50** (ranked).

### Stability and Future Outlook

Current competitive power is situational. Meta Stability is **77 / 100 (STABLE)**. Its underlying logic is fairly durable even if particular perks or implementations move. Stability measures structural durability, not confidence and not a forecast of an exact future tier.

Patch volatility: **LOW_MEDIUM**. Trend: **STABLE**.

Research flags: `RECHECK_ON_MATERIAL_PATCH_CHANGE`.

Recheck when: Recheck immediately on any 10.2.1+ balance patch that materially affects defining perks, items, or mechanics.

### Evidence and Confidence

Mechanics: **HIGH** | Prevalence: **MEDIUM** | Power: **MEDIUM** | Solo: **MEDIUM** | SWF: **MEDIUM**.

Power values are Stage 2 researcher-model scores, not observed escape probabilities.

10.2.0 had been live for only about one day at the evidence cutoff; mixed-window prevalence is not clean post-10.2 telemetry.

**Evidence references**

- Dead by Daylight Survivor Meta Research — Stage Two Adversarial Verification (I03), 2026-10-07. Primary analytical authority for classification, Power, environment comparisons, and disputed findings.

- Dead by Daylight Survivor Strategy Catalog: Stage 1.5 (I03), 2026-10-07. Strategy identity, aliases, roles, mechanics, prevalence signals, limitations, and catalog completeness.
