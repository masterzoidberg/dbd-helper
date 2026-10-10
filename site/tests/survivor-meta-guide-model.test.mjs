import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { makeFixture, makePlan } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const context = loadGuideContext({ rootDir });
const guides = loadGuideRecords({ rootDir });

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
  assert.equal(Object.hasOwn(choice, 'mechanics'), false);
  assert.equal(model.canonical.name, context.strategies.get('X01').name);
  assert.deepEqual(model.page.loadout.plans[0].slots.map(slot => slot.slot), [1, 2, 3, 4]);
  assert.deepEqual(model.page.loadout.plans[0].slots[3].choices.map(item => item.perkId), ['kindred', 'well-make-it']);
  assert.equal(model.page.loadout.plans[0].flexSlotNote, context.snapshotByStrategy.get('X01').buildImplementations[0].flexSlotNote);
  assert.equal(model.page.gameplay.rows[0].enabledByResolved[0].perk.name, 'Déjà Vu');
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
