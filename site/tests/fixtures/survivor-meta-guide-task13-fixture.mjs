import { collectPerkReferences } from '../../../scripts/survivor-meta-guide-source.mjs';
import { fingerprintPerkMechanics } from '../../../scripts/survivor-meta-perk-review.mjs';

const baseline = {
  patch: '10.2.0',
  verifiedDate: '2026-10-06',
  archiveSha256: 'b4e6b982b4d69906c21eb3d0eeb0af0b88e1fa5640cca0a79468bc3af5fd98d0'
};

const decision = (id, situation, action, why, enabledBy) => ({
  id, situation, action, why,
  ...(enabledBy ? { enabledBy } : {})
});

const slot = (number, role, usage, choices) => ({
  slot: number, role, usage, choiceCount: 1,
  choices: choices.map(([perkId, whyItsHere]) => ({ perkId, whyItsHere }))
});

const plan = (id, label, why, slots) => ({
  provenance: 'EDITORIAL', id, label, environment: 'BOTH', completeness: 'MODULE', why, slots
});

const sources = {
  C02: [
    ['STRATEGY', 'C02#/generalStrategicDefinition'],
    ['SNAPSHOT', 'C02@10.2.0-r1#/perkEcosystem/typicalDefiningPerks'],
    ['SNAPSHOT', 'C02@10.2.0-r1#/dependencyTypes'],
    ['PUBLICATION', 'C02#How It Works'],
    ['PUBLICATION', 'C02#Common Mistakes'],
    ['PUBLICATION', 'C02#Killer Counterplay'],
    ...['lithe', 'sprint-burst', 'balanced-landing', 'dead-hard', 'overcome', 'vigil'].map(id => ['PERK', `${id}#/mechanics`])
  ],
  C09: [
    ['STRATEGY', 'C09#/generalStrategicDefinition'],
    ['SNAPSHOT', 'C09@10.2.0-r1#/perkEcosystem/typicalDefiningPerks'],
    ['SNAPSHOT', 'C09@10.2.0-r1#/dependencyTypes'],
    ['PUBLICATION', 'C09#How It Works'],
    ['PUBLICATION', 'C09#Common Mistakes'],
    ['PUBLICATION', 'C09#Killer Counterplay'],
    ...['will-to-live', 'off-the-record', 'resurgence'].map(id => ['PERK', `${id}#/mechanics`])
  ],
  A03: [
    ['STRATEGY', 'A03#/generalStrategicDefinition'],
    ['SNAPSHOT', 'A03@10.2.0-r1#/perkEcosystem/typicalDefiningPerks'],
    ['SNAPSHOT', 'A03@10.2.0-r1#/itemEcosystem'],
    ['SNAPSHOT', 'A03@10.2.0-r1#/dependencyTypes'],
    ['PUBLICATION', 'A03#How It Works'],
    ['PUBLICATION', 'A03#Items and Add-ons'],
    ['PUBLICATION', 'A03#Common Mistakes'],
    ['PUBLICATION', 'A03#Killer Counterplay'],
    ...['empathy', 'empathic-connection', 'well-make-it', 'botany-knowledge'].map(id => ['PERK', `${id}#/mechanics`])
  ],
  G07: [
    ['STRATEGY', 'G07#/generalStrategicDefinition'],
    ['SNAPSHOT', 'G07@10.2.0-r1#/perkEcosystem/typicalDefiningPerks'],
    ['SNAPSHOT', 'G07@10.2.0-r1#/dependencyTypes'],
    ['SNAPSHOT', 'G07@10.2.0-r1#/counters'],
    ['PUBLICATION', 'G07#How It Works'],
    ['PUBLICATION', 'G07#Common Mistakes'],
    ['PUBLICATION', 'G07#Killer Counterplay'],
    ...['boon-steadfast', 'boon-illumination'].map(id => ['PERK', `${id}#/mechanics`])
  ]
};

function commonPage(strategyId, loadout, gameplay, extra = {}) {
  return {
    kind: 'STANDARD',
    summary: `${strategyId} keeps the specialized job bounded to the source-supported interaction.`,
    verdict: {
      recommendation: 'Use the specialized interaction only while it returns useful Trial tempo.',
      soloQ: 'Check the actual team need before committing to the specialized job.',
      coordinatedSwf: 'Call the commitment and hand it off when the team need changes.',
      mainWeakness: 'The specialized interaction loses value when its activation window or position is denied.'
    },
    loadout,
    gameplay,
    ...extra
  };
}

export function makeTask13Guide(strategyId) {
  const pages = {
    C02: commonPage('C02', {
      plans: [plan('mobility-trigger', 'Mobility trigger choices', 'Choose one mobility trigger; these are alternatives, not a simultaneous four-perk build.', [
        slot(1, 'Choose a mobility trigger', 'CORE', [
          ['lithe', 'Use a rushed vault to launch toward the next resource.'],
          ['sprint-burst', 'Start the escape toward a useful route when the trigger is available.'],
          ['balanced-landing', 'Use a safe fall to convert height into distance when the map offers it.'],
          ['dead-hard', 'Reserve the post-unhook injured chase timing for the moment it actually applies.'],
          ['overcome', 'Use the hit-created sprint to leave the first danger area when healthy-state conditions apply.']
        ]),
        slot(2, 'Exhaustion recovery support', 'SUPPORT', [
          ['vigil', 'Recover Exhausted more efficiently when staying near the support effect is worth the time.']
        ])
      ])]
    }, {
      type: 'DECISIONS',
      opening: ['Choose the trigger that fits the route before pressure starts; do not treat every listed choice as equipped.'],
      rows: [
        decision('trigger-route', 'A trigger is available and the next route has a real resource.', 'Commit the trigger toward that resource, then reassess instead of looping for the perk alone.', 'Mobility only buys team value when it creates a better next position.', ['perk:lithe', 'perk:sprint-burst']),
        decision('denied-route', 'The route or activation condition is denied.', 'Stop forcing the trigger and return to the available objective, rescue or safest remaining route.', 'A denied activation is an opportunity cost, not a reason to chase the original plan.')
      ],
      abortWhen: ['Stop preserving Exhaustion when walking or repositioning costs more than the next useful activation can repay.', 'Leave a depleted route when the next resource cannot support another loop.']
    }),
    C09: commonPage('C09', {
      plans: [plan('anti-tunnel-core', 'Anti-tunnel core', 'This is a portable two-slot module; the remaining loadout stays open for the player\'s main build.', [
        slot(1, 'Post-unhook protection', 'CORE', [
          ['will-to-live', 'Use the exact current Decisive Strike record when the post-unhook pickup window is available.'],
          ['off-the-record', 'Use the post-unhook protection and concealment window when the Killer keeps pressure on you.']
        ]),
        slot(2, 'Recovery after the unhook', 'SUPPORT', [
          ['resurgence', 'Turn the unhook into immediate healing progress when a safe reset is possible.']
        ])
      ])]
    }, {
      type: 'DECISIONS',
      opening: ['Treat the package as protection attached to another build; leave its unspecified slots for the actual objective or chase plan.'],
      rows: [
        decision('post-unhook', 'You have just left a hook and the Killer is returning.', 'Take the safe exit using the selected protection. Do not perform a conspicuous action or hold position for a protection effect that no longer applies.', 'The module buys a response to repeat targeting; it does not make a down or heal obligation-free.', ['perk:will-to-live', 'perk:off-the-record']),
        decision('recover-or-leave', 'The immediate pressure has moved and recovery is safe.', 'Use the available recovery progress, then return to the main build\'s objective or rescue job.', 'The package should repay its slot cost through a clean reset rather than idle protection.', ['perk:resurgence'])
      ],
      abortWhen: ['Leave the protection position when the Killer waits it out, switches targets or makes the pickup window unreachable.', 'Stop the recovery attempt when pressure makes returning to the objective the higher-value action.']
    }),
    A03: commonPage('A03', {
      plans: [plan('healer-tools', 'Healer tools', 'This module supports the healer role without pretending to be a fixed four-perk build.', [
        slot(1, 'Find injured teammates', 'CORE', [['empathy', 'Locate injured or dying teammates before crossing the map for a heal.']]),
        slot(2, 'Healing speed', 'CORE', [
          ['empathic-connection', 'Make a reachable teammate heal efficient and give injured teammates a way to find you.'],
          ['botany-knowledge', 'Improve healing speed without requiring a particular teammate to carry the interaction.']
        ]),
        slot(3, 'Post-unhook heal window', 'SUPPORT', [['well-make-it', 'Convert a rescue into a timely teammate heal when the reset is safe.']])
      ])],
      item: { id: 'med-kit', status: 'OPTIONAL', name: 'Med-Kit', why: 'Use a med-kit when it makes a safe reset or charge-efficient heal possible; the role does not depend on a particular add-on.' }
    }, {
      type: 'ROLE_GUIDE',
      assignment: 'Take the next reachable injured health state as a deliberate team job, while abandoning the heal when pressure or objective tempo makes it wrong.',
      priorities: [
        decision('find-injury', 'A teammate is injured or dying and the path is reachable.', 'Use the information tool to choose the nearest safe reset, then approach with an exit rather than crossing the map automatically.', 'Triage value comes from selecting a heal that returns a teammate to a useful job.', ['perk:empathy']),
        decision('start-reset', 'You and the teammate can heal without pulling pressure onto the reset.', 'Start the heal with the selected speed tool or optional med-kit, and stop if the Killer turns the reset into a chase.', 'Healing speed cannot repay a down or an abandoned critical objective.', ['perk:empathic-connection', 'item:med-kit']),
        decision('after-unhook', 'You have just unhooked a teammate and the reset window is safe.', 'Use the post-unhook heal window if the teammate can finish the reset; otherwise hand the heal to a safer partner and return to the next job.', 'The rescue-triggered tool is valuable only when the unhook actually creates a safe heal.', ['perk:well-make-it'])
      ],
      handoffWhen: ['Hand off a heal when the teammate is safer with another rescuer, the Killer has changed pressure or a critical generator/rescue is uncovered.', 'Call who owns the reset so two teammates do not abandon the same objective.'],
      abortWhen: ['Abort the heal when the Killer can reach both Survivors before the reset completes.', 'Stop travelling for an injured teammate when the distance or current hook state makes the reset less valuable than the uncovered team job.']
    }),
    G07: commonPage('G07', {
      plans: [plan('steadfast-zone', 'Boon repair-zone tools', 'Anchor the module to one Boon zone; remaining slots stay open because the source does not establish a fixed build.', [
        slot(1, 'Establish the repair zone', 'REQUIRED', [['boon-steadfast', 'Create the source-defined local repair zone around a generator worth defending.']]),
        slot(2, 'Boon information support', 'SUPPORT', [['boon-illumination', 'Choose this only when faster blessing and nearby objective information repay the extra slot.']])
      ])]
    }, {
      type: 'DECISIONS',
      opening: ['Before blessing, identify a generator the team can defend and a totem position whose zone will remain useful after the first repair rotation.'],
      rows: [
        decision('choose-zone', 'A target generator and a reachable totem can form a useful local zone.', 'Bless there, call the target and begin work only while the zone helps the team\'s next repair rotation.', 'The strategy is spatially anchored; a boon in an irrelevant corner is not objective value.', ['perk:boon-steadfast', 'mechanic:boon-zone']),
        decision('maintain-zone', 'The zone is active and teammates are using the target generator.', 'Keep the team on the defended work while checking whether the Killer is about to contest or snuff the totem.', 'Maintenance is a location and assignment decision, not a map-wide repair bonus.', ['perk:boon-steadfast']),
        decision('zone-denied', 'The totem is snuffed, the target is abandoned or the Killer makes the location unsafe.', 'Stop defending the old zone and rotate to the next useful generator or ordinary objective job.', 'The provisional plan must release the locality when its setup no longer returns team tempo.')
      ],
      abortWhen: ['Abort the setup when the chosen totem position cannot support a useful generator route.', 'Leave the zone when it is snuffed or the Killer has made its location a losing commitment.']
    }, {
      mechanics: [{ id: 'boon-zone', explanation: 'The repair benefit is local to the active Boon zone; choose a generator and totem position that the team can continue to use.' }]
    })
  };
  return {
    schemaVersion: 1,
    perkBaseline: structuredClone(baseline),
    reviewStatus: 'DRAFT',
    reviewedDate: null,
    strategyId,
    snapshotId: `${strategyId}@10.2.0-r1`,
    perkReviews: [],
    page: pages[strategyId],
    sources: sources[strategyId].map(([kind, ref]) => ({ kind, ref }))
  };
}

export function bindTask13Fixture(context, strategyId) {
  const guide = makeTask13Guide(strategyId);
  const references = collectPerkReferences({ guide, context });
  const reviewIndex = structuredClone(context.reviewIndex);
  for (const perkId of references) {
    reviewIndex.perks[perkId] = {
      mechanicsRevision: 1,
      acknowledgedFingerprint: fingerprintPerkMechanics(context.perks.get(perkId))
    };
  }
  guide.perkReviews = [...references].sort().map(perkId => ({ perkId, mechanicsRevision: 1 }));
  return { guide, context: { ...context, reviewIndex } };
}
