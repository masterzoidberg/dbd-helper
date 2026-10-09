// Synthetic structural fixtures only: no source joins or publishable guide copy.
export function makeSlot(slot = 1, usage = 'CORE') {
  return {
    slot, role: 'Chase', usage, choiceCount: 1,
    choices: [{ perkId: ['lithe', 'deja-vu', 'kindred', 'well-make-it'][slot - 1], whyItsHere: 'Keep the route open.' }]
  };
}

export function makePlan(completeness = 'MODULE') {
  return {
    provenance: 'EXAMPLE', id: 'route-tools', label: 'Routing tools', environment: 'BOTH',
    completeness, why: 'Support the next objective.',
    slots: completeness === 'COMPLETE' ? [1, 2, 3, 4].map(slot => makeSlot(slot)) : [makeSlot()]
  };
}

export function makeSource(kind = 'STRATEGY') {
  return {
    kind,
    ref: {
      STRATEGY: 'X01#/id', SNAPSHOT: 'X01@10.2.0-r1#/currentStatus',
      PERK: 'lithe#/mechanics/name', PUBLICATION: 'X01#Overview'
    }[kind],
    note: 'Structural receipt fixture.'
  };
}

export function makeSubstitute() {
  return {
    perkId: 'sprint-burst', provenance: 'EDITORIAL', why: 'Use a different escape tool.',
    source: makeSource('PERK'), reviewedDate: '2026-10-06'
  };
}

export function makeFixture({ kind = 'STANDARD', gameplay = 'DECISIONS', reviewStatus = 'DRAFT' } = {}) {
  const decision = {
    id: 'route', situation: 'The nearby route is unsafe.', action: 'Rotate to another objective.',
    why: 'Avoid losing more time.'
  };
  const gameplayShapes = {
    DECISIONS: { type: 'DECISIONS', rows: [decision] },
    SEQUENCE: { type: 'SEQUENCE', steps: [{ id: 'prepare', label: 'Prepare the route', instructions: ['Check the next objective.'] }] },
    // ROLE_GUIDE is a schema fixture, not an A03 guide or an eighth real prototype.
    ROLE_GUIDE: { type: 'ROLE_GUIDE', assignment: 'Cover the open objective.', priorities: [decision] }
  };
  const standard = {
    kind: 'STANDARD', summary: 'Keep useful routes open.',
    verdict: { recommendation: 'Use when the team needs safe routing.' }, gameplay: gameplayShapes[gameplay]
  };
  const pages = {
    STANDARD: standard,
    FAMILY: { kind: 'FAMILY', summary: 'Compare the available approaches.', comparisons: [{ strategyId: 'P01', chooseWhen: 'A rescue is needed.', tradeoff: 'Less objective time.' }] },
    LEGACY: {
      kind: 'LEGACY', summary: 'A historical approach.', whatItWas: ['An old interaction.'],
      whyNotCurrent: ['That interaction is no longer current.'], successors: [{ strategyId: 'G05', why: 'A current approach.' }]
    },
    TEAM: {
      ...standard, kind: 'TEAM',
      roles: ['runner', 'objectives', 'reset', 'flex'].map(id => ({ id, title: id, assignment: 'Cover the assigned task.' }))
    }
  };
  const guide = {
    schemaVersion: 1, strategyId: 'X01', snapshotId: 'X01@10.2.0-r1',
    perkBaseline: { patch: '10.2.0', verifiedDate: '2026-10-06', archiveSha256: 'b4e6b982b4d69906c21eb3d0eeb0af0b88e1fa5640cca0a79468bc3af5fd98d0' },
    perkReviews: [], reviewStatus, reviewedDate: reviewStatus === 'DRAFT' ? null : '2026-10-06', page: pages[kind]
  };
  if (reviewStatus !== 'DRAFT') guide.sources = [makeSource()];
  return { guide };
}
