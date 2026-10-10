import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import {
  buildRuntimeStrategies,
  loadSurvivorMetaSource
} from '../../scripts/build-survivor-meta.mjs';
import {
  collectPerkReferences,
  derivePageKind,
  loadGuideContext,
  loadGuideRecords,
  resolveCanonicalPlan,
  resolveSourceReceipt
} from '../../scripts/survivor-meta-guide-source.mjs';
import { validateGuideCatalog } from '../../scripts/survivor-meta-guide-validation.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const release = '10.2.0-r1';
const expectedIds = [
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12', 'C13', 'C14', 'C15',
  'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10',
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07',
  'P01', 'P02', 'P03', 'P04', 'P05', 'P06',
  'I01', 'I02', 'I03', 'I04', 'I05',
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'X01', 'X02', 'P00', 'A00'
];
const expectedRoutes = new Map([
  ['C01', 'general-chase-looping'], ['C02', 'exhaustion-mobility-chase'], ['C03', 'vault-window-specialist'],
  ['C04', 'pallet-resource-specialist'], ['C05', 'fragile-pallet-restoration'], ['C06', 'chase-information-routing'],
  ['C07', 'stealth-chase-avoidance'], ['C08', 'chase-reset-disappearance'], ['C09', 'anti-tunnel-package'],
  ['C10', 'anti-slug-self-recovery-package'], ['C11', 'hook-state-transfer'], ['C12', 'deterministic-self-unhook'],
  ['C13', 'luck-based-self-unhook'], ['C14', 'self-sustain-self-heal'], ['C15', 'haste-movement-stack'],
  ['G01', 'general-generator-pressure'], ['G02', 'toolbox-generator-specialist'], ['G03', 'critical-generator-three-gen-breaker'],
  ['G04', 'cooperative-repair-gen-duo'], ['G05', 'manual-skill-check-generator'], ['G06', 'classic-stake-outhyperfocus-engine'],
  ['G07', 'boon-steadfast-repair-zone'], ['G08', 'road-life-repair-to-self-heal'], ['G09', 'fast-track-rescue-to-repair-tempo'],
  ['G10', 'fruits-of-your-labor-objective-to-reset-hybrid'], ['A01', 'hook-rescue-post-unhook-reset'],
  ['A02', 'anti-camp-hook-timer-control'], ['A03', 'dedicated-healer-triage'], ['A04', 'hook-state-scaled-fast-healing'],
  ['A05', 'protection-hit-tank'], ['A06', 'hook-trade-carry-bodyblock-protector'], ['A07', 'endgame-rescue'],
  ['P01', 'flashlight-save'], ['P02', 'flashbang-save'], ['P03', 'sabotage-hook-denial'], ['P04', 'breakout-carry-interference'],
  ['P05', 'teammate-pallet-save'], ['P06', 'carry-escape-wiggle-denial'], ['I01', 'solo-q-information-shell'],
  ['I02', 'killer-tracking-aura-seer'], ['I03', 'teammate-tracking-support-information'], ['I04', 'objective-resource-routing'],
  ['I05', 'chase-broadcast-salvations-cry'], ['R01', 'chest-loot-scavenger'], ['R02', 'pharmacy-med-kit-farming'],
  ['R03', 'item-recharge-recursion'], ['R04', 'boon-support-network'], ['R05', 'totem-hunter-cleanser'],
  ['R06', 'invocation-ritual'], ['R07', 'locker-utility-head-on'], ['R08', 'distraction-misdirection'],
  ['R09', 'obsession-high-risk-aggro-info'], ['R10', 'endgame-gate-escape-shell'], ['X01', 'solo-q-generalist'],
  ['X02', 'coordinated-swf-flex-generalist'], ['P00', 'pickup-interception-save-family'], ['A00', 'rescue-and-reset-support-family']
]);

const context = loadGuideContext({ rootDir, release });
const guides = loadGuideRecords({ rootDir });

function readRuntime(file) {
  const window = { DBD_DATA: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window });
  return JSON.parse(JSON.stringify(window.DBD_DATA.survivorStrategies));
}

function allPlans(page) {
  return [page.loadout, ...(page.roles || []).map(role => role.loadout)]
    .filter(Boolean)
    .flatMap(loadout => loadout.plans || []);
}

function assertChoiceSlots(model, strategyId) {
  for (const plan of allPlans(model.page)) {
    const slots = plan.slots || [];
    assert.ok(slots.length >= 1 && slots.length <= 4, `${strategyId}/${plan.id || plan.buildId}: invalid slot count`);
    assert.deepEqual([...new Set(slots.map(slot => slot.slot))].sort((a, b) => a - b), slots.map(slot => slot.slot).sort((a, b) => a - b));
    for (const slot of slots) {
      assert.ok(Number.isInteger(slot.slot) && slot.slot >= 1 && slot.slot <= 4, `${strategyId}: invalid slot number`);
      assert.equal(slot.choiceCount, 1, `${strategyId}: every slot has one selectable position`);
      assert.ok(Array.isArray(slot.choices) && slot.choices.length >= 1, `${strategyId}: every slot has a perk choice`);
      for (const choice of slot.choices) assert.ok(context.perks.has(choice.perkId), `${strategyId}: unresolved ${choice.perkId}`);
    }
    if (plan.completeness === 'COMPLETE') assert.deepEqual(slots.map(slot => slot.slot), [1, 2, 3, 4]);
  }
}

test('whole catalog has exact reviewed identities, source joins, relationships and useful page kinds', () => {
  const result = validateGuideCatalog({ rootDir, release });
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.guides.size, 57);
  assert.deepEqual([...result.guides.keys()].sort(), [...expectedIds].sort());
  assert.deepEqual(result.counts, { missing: 0, DRAFT: 0, REVIEWED: 57, PUBLISHED: 0 });

  const pageKinds = Object.fromEntries(expectedIds.map(id => [id, derivePageKind(context.strategies.get(id), context.snapshotByStrategy.get(id))]));
  assert.deepEqual(
    Object.fromEntries([...new Set(Object.values(pageKinds))].sort().map(kind => [kind, Object.values(pageKinds).filter(value => value === kind).length])),
    { FAMILY: 2, LEGACY: 2, STANDARD: 52, TEAM: 1 }
  );

  for (const id of expectedIds) {
    const guide = result.guides.get(id);
    const strategy = context.strategies.get(id);
    const snapshot = context.snapshotByStrategy.get(id);
    assert.ok(['REVIEWED', 'PUBLISHED'].includes(guide.reviewStatus), `${id} is not release-reviewed`);
    assert.match(guide.reviewedDate, /^2026-\d{2}-\d{2}$/);
    for (const source of guide.sources || []) assert.doesNotThrow(() => resolveSourceReceipt(source, context), `${id}: source ${source.ref}`);
    assert.doesNotThrow(() => collectPerkReferences({ guide, context }), `${id}: perk dependency`);
    for (const plan of allPlans(guide.page)) {
      if (plan.provenance === 'CANONICAL') {
        assert.doesNotThrow(() => resolveCanonicalPlan({ context, strategyId: id, buildId: plan.buildId, notes: plan.notes }), `${id}: build ${plan.buildId}`);
      }
    }
    for (const buildId of guide.page.canonicalTeamBuildIds || []) {
      assert.ok((snapshot.buildImplementations || []).some(build => build.buildId === buildId), `${id}: team build ${buildId}`);
    }

    if (pageKinds[id] === 'FAMILY') {
      assert.deepEqual(guide.page.comparisons.map(item => item.strategyId).sort(), [...strategy.subtypeIds].sort());
    }
    if (pageKinds[id] === 'LEGACY') {
      assert.deepEqual(guide.page.successors.map(item => item.strategyId), snapshot.analysis.replacementStrategyIds);
      assert.ok(guide.page.successors.length >= 1, `${id}: legacy successor coverage`);
    }
    if (pageKinds[id] === 'TEAM') {
      assert.equal(guide.page.roles.length, 4);
      assert.equal(new Set(guide.page.roles.map(role => role.id)).size, 4);
    }
  }
});

test('ranking, optional omissions, runtime baseline, slots and routes survive catalog projection', () => {
  const source = loadSurvivorMetaSource({ rootDir, release });
  const runtime = readRuntime(path.join(rootDir, 'site/assets/data-survivor-meta.js'));
  assert.deepEqual(runtime, buildRuntimeStrategies({ rootDir, release }));
  assert.deepEqual(new Map(runtime.map(item => [item.id, item.slug])), expectedRoutes);
  assert.deepEqual(new Map(source.manifest.map(item => [item.strategyId, item.slug.replace(/^\/+|\/+$/g, '').replace(/^survivor-meta\//, '')])), expectedRoutes);

  const c14 = context.snapshotByStrategy.get('C14');
  assert.equal(c14.swf.rankingStatus, 'UNRANKED');
  assert.equal(c14.swf.power, null);
  assert.equal(c14.swf.tier, null);
  assert.equal(c14.swf.rankingIndex, null);
  const x02 = context.snapshotByStrategy.get('X02');
  assert.equal(x02.solo.rankingStatus, 'NOT_APPLICABLE');
  assert.equal(x02.solo.power, null);
  assert.equal(x02.solo.tier, null);
  assert.equal(x02.solo.rankingIndex, null);
  for (const id of ['G07']) {
    const snapshot = context.snapshotByStrategy.get(id);
    assert.equal(snapshot.solo.rankingStatus, 'PROVISIONAL');
    assert.equal(snapshot.swf.rankingStatus, 'PROVISIONAL');
  }

  const c14Model = assembleGuidePage({ context, strategyId: 'C14', guide: guides.get('C14'), mode: 'preview' });
  assert.equal(c14Model.canonical.evaluations.coordinatedSwf.rankingStatus, 'UNRANKED');
  assert.equal(c14Model.canonical.evaluations.coordinatedSwf.power, null);
  assert.equal(c14Model.canonical.evaluations.coordinatedSwf.tier, null);
  assert.equal(c14Model.canonical.evaluations.coordinatedSwf.rankingIndex, null);

  const x02Model = assembleGuidePage({ context, strategyId: 'X02', guide: guides.get('X02'), mode: 'preview' });
  assert.equal(x02Model.canonical.evaluations.soloQ.rankingStatus, 'NOT_APPLICABLE');
  assert.equal(x02Model.canonical.evaluations.soloQ.power, null);
  assert.equal(x02Model.canonical.evaluations.soloQ.tier, null);
  assert.equal(x02Model.canonical.evaluations.soloQ.rankingIndex, null);

  const g07Model = assembleGuidePage({ context, strategyId: 'G07', guide: guides.get('G07'), mode: 'preview' });
  assert.equal(g07Model.canonical.evaluations.soloQ.rankingStatus, 'PROVISIONAL');
  assert.equal(g07Model.canonical.evaluations.coordinatedSwf.rankingStatus, 'PROVISIONAL');

  for (const id of ['P00', 'A00', 'C13', 'G06']) {
    const model = assembleGuidePage({ context, strategyId: id, guide: guides.get(id), mode: 'preview' });
    for (const evaluation of [model.canonical.evaluations.soloQ, model.canonical.evaluations.coordinatedSwf]) {
      assert.equal(evaluation.power, null, `${id}: no aggregate power`);
      assert.equal(evaluation.tier, null, `${id}: no aggregate tier`);
      assert.equal(evaluation.rankingIndex, null, `${id}: no aggregate ranking index`);
    }
  }

  for (const id of expectedIds) {
    const model = assembleGuidePage({ context, strategyId: id, guide: guides.get(id), mode: 'preview' });
    assertChoiceSlots(model, id);
  }
});
