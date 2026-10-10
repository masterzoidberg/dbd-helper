import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { validateGuide } from '../../scripts/survivor-meta-guide-validation.mjs';
import { makeFixture, makePlan } from './fixtures/survivor-meta-guide-fixture.mjs';
import { bindTask13Fixture } from './fixtures/survivor-meta-guide-task13-fixture.mjs';
import fs from 'node:fs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const context = loadGuideContext({ rootDir });
const guides = loadGuideRecords({ rootDir });
const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'content/survivor/meta-guides/schema.json')));

function cloneGuide(strategyId) {
  return structuredClone(guides.get(strategyId));
}

function freezeDeep(value, seen = new Set()) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || seen.has(value)) return value;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, entry] of value) { freezeDeep(key, seen); freezeDeep(entry, seen); }
  } else if (value instanceof Set) {
    for (const entry of value) freezeDeep(entry, seen);
  } else {
    for (const key of Reflect.ownKeys(value)) freezeDeep(value[key], seen);
  }
  return Object.freeze(value);
}

test('production hides non-published editorial content while preview shows valid existing states', () => {
  const { guide } = makeFixture({ reviewStatus: 'REVIEWED' });
  assert.equal(assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'production' }).mode, 'RESEARCH_ONLY');
  assert.equal(assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'production' }).page, null);
  assert.equal(assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' }).mode, 'PLAYER');
  assert.ok(assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' }).page);
  assert.equal(assembleGuidePage({ context, strategyId: 'X01', guide: undefined, mode: 'production' }).mode, 'RESEARCH_ONLY');
});

test('canonical perk facts are joined from prepared records and purpose remains editorial', () => {
  const guide = cloneGuide('X01');
  const changedPerk = structuredClone(context.perks.get('lithe'));
  changedPerk.mechanics.name = 'Prepared Lithe Name';
  changedPerk.mechanics.currentEffect = 'Prepared current effect.';
  const changedContext = { ...context, perks: new Map(context.perks).set('lithe', changedPerk) };
  const model = assembleGuidePage({ context: changedContext, strategyId: 'X01', guide, mode: 'preview' });
  const choice = model.page.loadout.plans[0].slots[0].choices[0];
  assert.equal(choice.perkId, 'lithe');
  assert.equal(choice.name, 'Prepared Lithe Name');
  assert.equal(choice.currentEffect, 'Prepared current effect.');
  assert.deepEqual(choice.activation, changedPerk.mechanics.activation);
  assert.equal(choice.owner, changedPerk.mechanics.sourceCharacter);
  assert.equal(choice.whyItsHere, guide.page.loadout.plans[0].notes[0].whyItsHere);
  assert.equal(choice.provenance, 'CANONICAL');
  assert.equal(choice.query, '/survivor/perks/?q=lithe');
  assert.equal(Object.hasOwn(choice, 'mechanics'), false);
  assert.equal(model.canonical.name, context.strategies.get('X01').name);
  assert.deepEqual(model.page.loadout.plans[0].slots.map(slot => slot.slot), [1, 2, 3, 4]);
  assert.deepEqual(model.page.loadout.plans[0].slots[3].choices.map(item => item.perkId), ['kindred', 'well-make-it']);
  assert.equal(model.page.loadout.plans[0].flexSlotNote, context.snapshotByStrategy.get('X01').buildImplementations[0].flexSlotNote);
  assert.equal(model.page.gameplay.rows[0].enabledByResolved[0].perk.name, 'Déjà Vu');
});

test('canonical builds stay source-only while PLAYER plans carry guide annotations', () => {
  const guide = cloneGuide('X01');
  guide.page.loadout.plans[0].notes[0].substitutes = [{
    perkId: 'sprint-burst',
    provenance: 'EDITORIAL',
    why: 'Use the reviewed alternative.',
    source: { kind: 'PERK', ref: 'sprint-burst#/mechanics' },
    reviewedDate: '2026-10-06'
  }];
  const model = assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' });
  const canonicalSlot = model.canonical.builds[0].slots[0];
  const playerSlot = model.page.loadout.plans[0].slots[0];
  for (const field of ['role', 'usage', 'whyItsHere', 'substitutes']) assert.equal(Object.hasOwn(canonicalSlot, field), false, field);
  assert.equal(playerSlot.role, guide.page.loadout.plans[0].notes[0].role);
  assert.equal(playerSlot.usage, guide.page.loadout.plans[0].notes[0].usage);
  assert.equal(playerSlot.choices[0].whyItsHere, guide.page.loadout.plans[0].notes[0].whyItsHere);
  assert.equal(playerSlot.substitutes.length, 1);
});

test('research retains full canonical records and the frozen article without sharing input objects', () => {
  const guide = cloneGuide('X01');
  const before = structuredClone({ guide, context: { researchSource: context.researchSource, perks: context.perks } });
  freezeDeep(guide);
  freezeDeep(context.researchSource);
  for (const perk of context.perks.values()) freezeDeep(perk);
  const model = assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' });
  const strategy = context.strategies.get('X01');
  const snapshot = context.snapshotByStrategy.get('X01');
  const manifest = context.manifest.get('X01');
  assert.deepEqual(model.research.strategy, strategy);
  assert.deepEqual(model.research.snapshot, snapshot);
  assert.deepEqual(model.research.manifest, manifest);
  assert.equal(model.research.article, context.researchSource.articles[manifest.articleFilename]);
  model.research.snapshot.buildImplementations[0].perkIds.push('transient-only');
  model.page.loadout.plans[0].slots[0].choices[0].name = 'Transient name';
  assert.deepEqual({ guide, context: { researchSource: context.researchSource, perks: context.perks } }, before);
  assert.equal(Object.isFrozen(model.research.snapshot), false);
});

test('canonical, editorial and example provenance remain distinct', () => {
  const canonical = assembleGuidePage({ context, strategyId: 'X01', guide: cloneGuide('X01'), mode: 'preview' });
  const example = assembleGuidePage({ context, strategyId: 'P02', guide: cloneGuide('P02'), mode: 'preview' });
  const { guide: editorial } = makeFixture();
  const plan = makePlan();
  plan.provenance = 'EDITORIAL';
  plan.id = 'editorial-route';
  editorial.page.loadout = { plans: [plan], options: [{ perkId: 'lithe', usage: 'CORE', whyItsHere: 'Editorial option.' }] };
  const authored = assembleGuidePage({ context, strategyId: 'X01', guide: editorial, mode: 'preview' });
  assert.equal(canonical.page.loadout.plans[0].provenance, 'CANONICAL');
  assert.equal(example.page.loadout.plans[0].provenance, 'EXAMPLE');
  assert.equal(authored.page.loadout.plans[0].provenance, 'EDITORIAL');
  assert.equal(authored.page.loadout.options[0].provenance, 'EDITORIAL');
  assert.equal(authored.page.loadout.plans[0].slots[0].choices[0].provenance, 'EDITORIAL');
});

test('family, legacy and team pages resolve exceptional canonical relationships without invented builds', () => {
  const family = assembleGuidePage({ context, strategyId: 'P00', guide: cloneGuide('P00'), mode: 'preview' });
  assert.deepEqual(family.canonical.relationships.children.map(item => item.strategyId), ['P01', 'P02', 'P03', 'P04', 'P05']);
  assert.equal(family.page.comparisons.length, 5);
  assert.equal(family.page.comparisons[0].destination.name, context.strategies.get('P01').name);
  assert.equal(family.canonical.evaluations.soloQ.power, null);
  assert.equal(family.canonical.builds.length, 0);

  const legacy = assembleGuidePage({ context, strategyId: 'G06', guide: cloneGuide('G06'), mode: 'preview' });
  assert.deepEqual(legacy.canonical.relationships.successors.map(item => item.strategyId), ['G05']);
  assert.equal(legacy.page.successors[0].destination.name, context.strategies.get('G05').name);
  assert.equal(legacy.canonical.identityWarning.historical, true);
  assert.deepEqual(legacy.canonical.identityWarning.context.legacyHistory, context.snapshotByStrategy.get('G06').analysis.legacyHistory);
  assert.equal(legacy.page.historicalPerks[0].perk.name, context.perks.get('stake-out').mechanics.name);

  const team = assembleGuidePage({ context, strategyId: 'X02', guide: cloneGuide('X02'), mode: 'preview' });
  assert.equal(team.page.roles.length, 4);
  assert.equal(Object.hasOwn(team.page, 'loadout'), false);
  assert.equal(team.page.roles[1].loadout.options[0].perk.name, context.perks.get('deja-vu').mechanics.name);
  assert.equal(team.canonical.teamBuilds.length, 1);
  assert.equal(Object.hasOwn(team.canonical.teamBuilds[0], 'slots'), false);
});

test('related destinations deduplicate editorial links while canonical edges remain separate', () => {
  const guide = cloneGuide('X01');
  guide.page.related = [
    { strategyId: 'C01', relationship: 'SIMILAR', why: 'First editorial relationship.' },
    { strategyId: 'C01', relationship: 'ALTERNATIVE', why: 'Second editorial relationship.' }
  ];
  const model = assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' });
  assert.equal(model.page.related.length, 1);
  assert.deepEqual(model.page.related[0].relationships.map(item => item.relationship), ['SIMILAR', 'ALTERNATIVE']);
  assert.equal(model.page.related[0].destination.name, context.strategies.get('C01').name);
  assert.deepEqual(model.canonical.relationships.related, []);
});

test('Task 13 source-faithful stress shapes preserve exact alternatives, modules, roles and provisional facts', () => {
  const c02 = bindTask13Fixture(context, 'C02');
  const c02Model = assembleGuidePage({ context: c02.context, strategyId: 'C02', guide: c02.guide, mode: 'preview' });
  const mobilityPlan = c02Model.page.loadout.plans[0];
  assert.equal(mobilityPlan.completeness, 'MODULE');
  assert.equal(mobilityPlan.slots.length, 2);
  assert.deepEqual(mobilityPlan.slots[0].choices.map(choice => choice.perkId), ['lithe', 'sprint-burst', 'balanced-landing', 'dead-hard', 'overcome']);
  assert.equal(mobilityPlan.slots[0].choiceCount, 1);
  assert.notEqual(mobilityPlan.slots[0].choices.length, mobilityPlan.slots.length);

  const c09 = bindTask13Fixture(context, 'C09');
  const antiTunnelPlan = assembleGuidePage({ context: c09.context, strategyId: 'C09', guide: c09.guide, mode: 'preview' }).page.loadout.plans[0];
  assert.equal(antiTunnelPlan.completeness, 'MODULE');
  assert.ok(antiTunnelPlan.slots.length >= 1 && antiTunnelPlan.slots.length <= 4);
  assert.equal(antiTunnelPlan.slots.length, 2);
  assert.deepEqual(antiTunnelPlan.slots.map(slot => slot.choices.map(choice => choice.perkId)), [['will-to-live', 'off-the-record'], ['resurgence']]);

  const healer = bindTask13Fixture(context, 'A03');
  const healerModel = assembleGuidePage({ context: healer.context, strategyId: 'A03', guide: healer.guide, mode: 'preview' });
  assert.equal(healerModel.page.gameplay.type, 'ROLE_GUIDE');
  assert.ok(healerModel.page.gameplay.assignment);
  assert.ok(healerModel.page.gameplay.priorities.length >= 1);
  assert.ok(healerModel.page.gameplay.handoffWhen.length >= 1);
  assert.ok(healerModel.page.gameplay.abortWhen.length >= 1);
  assert.deepEqual(healerModel.page.gameplay.priorities[0].enabledByResolved.map(item => item.id), ['empathy']);
  assert.deepEqual(healerModel.page.gameplay.priorities[1].enabledByResolved.map(item => item.id), ['empathic-connection', 'med-kit']);

  const boon = bindTask13Fixture(context, 'G07');
  const boonModel = assembleGuidePage({ context: boon.context, strategyId: 'G07', guide: boon.guide, mode: 'preview' });
  assert.deepEqual(validateGuide({ guide: boon.guide, context: boon.context, schema }), []);
  assert.deepEqual(boonModel.research.snapshot, boon.context.snapshotByStrategy.get('G07'));
  assert.equal(boonModel.research.snapshot.solo.rankingStatus, 'PROVISIONAL');
  assert.match(boon.guide.page.gameplay.rows[0].action, /bless|zone/i);
  assert.match(boon.guide.page.gameplay.rows[1].action, /snuff|contest/i);
  assert.match(boon.guide.page.gameplay.abortWhen.join(' '), /snuffed|unsafe/i);
});
