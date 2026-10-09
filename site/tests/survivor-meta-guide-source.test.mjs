import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  loadGuideContext, loadGuideRecords, derivePageKind, resolveCanonicalPlan,
  collectPerkReferences, resolveSourceReceipt
} from '../../scripts/survivor-meta-guide-source.mjs';
import { makeFixture, makePlan, makeSlot, makeSubstitute } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const x01Build = 'X01@10.2.0-r1:solo-representative';
const context = loadGuideContext({ rootDir });

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function withBuild(change) {
  const snapshot = structuredClone(context.snapshotByStrategy.get('X01'));
  change(snapshot.buildImplementations[0]);
  return { ...context, snapshotByStrategy: new Map(context.snapshotByStrategy).set('X01', snapshot) };
}

function temporaryRoot(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-guide-source-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('context prepares all 176 exact canonical perk records and current research maps', () => {
  assert.equal(context.perks.size, 176);
  assert.equal(context.strategies.size, 57);
  assert.equal(context.snapshots.size, 57);
  assert.equal(context.manifest.size, 57);
  assert.deepEqual(context.reviewIndex, { schemaVersion: 1, perks: {} });
  const perk = context.perks.get('will-to-live');
  assert.equal(perk.id, 'will-to-live');
  assert.equal(perk.mechanics.name, 'Will to Live');
  assert.equal(perk.mechanics.alternateName, 'Decisive Strike');
  assert.equal(Object.isFrozen(perk), false);
  assert.equal(Object.isFrozen(context.researchSource.strategies[0]), false);
});

test('context recursively loads perks and rejects incomplete or duplicate prepared data', t => {
  const directory = temporaryRoot(t);
  fs.cpSync(path.join(rootDir, 'content/survivor'), path.join(directory, 'content/survivor'), { recursive: true });
  const perksDirectory = path.join(directory, 'content/survivor/perks');
  const file = path.join(perksDirectory, '001-005/001-will-to-live.json');
  const nested = path.join(perksDirectory, '001-005/nested');
  fs.mkdirSync(nested);
  fs.renameSync(file, path.join(nested, 'will-to-live.json'));
  assert.equal(loadGuideContext({ rootDir: directory }).perks.size, 176);
  fs.copyFileSync(path.join(nested, 'will-to-live.json'), file);
  assert.throws(() => loadGuideContext({ rootDir: directory }), /duplicate.*perk/i);
  fs.unlinkSync(file);
  fs.unlinkSync(path.join(nested, 'will-to-live.json'));
  assert.throws(() => loadGuideContext({ rootDir: directory }), /176/);
});

test('guide loader excludes metadata, requires exact filename identity and uses native JSON.parse', t => {
  const directory = temporaryRoot(t);
  assert.deepEqual(loadGuideRecords({ rootDir: directory }), new Map());
  const guideDirectory = path.join(directory, 'content/survivor/meta-guides');
  fs.mkdirSync(guideDirectory, { recursive: true });
  fs.writeFileSync(path.join(guideDirectory, 'schema.json'), 'not a guide or valid JSON');
  fs.writeFileSync(path.join(guideDirectory, 'perk-review-index.json'), 'not a guide');
  assert.equal(loadGuideRecords({ rootDir: directory }).size, 0);
  const file = path.join(guideDirectory, 'X01.json');
  const { guide } = makeFixture();
  fs.writeFileSync(file, JSON.stringify(guide));
  assert.deepEqual(loadGuideRecords({ rootDir: directory }).get('X01'), guide);
  fs.writeFileSync(file, '{"strategyId":"C01","strategyId":"X01"}');
  assert.equal(loadGuideRecords({ rootDir: directory }).get('X01').strategyId, 'X01');
  fs.writeFileSync(file, JSON.stringify({ ...guide, strategyId: ' X01' }));
  assert.throws(() => loadGuideRecords({ rootDir: directory }), /filename|stem/i);
  fs.writeFileSync(file, '{');
  assert.throws(() => loadGuideRecords({ rootDir: directory }), SyntaxError);
});

test('context reads an existing review index without classifying its revisions', t => {
  const directory = temporaryRoot(t);
  fs.cpSync(path.join(rootDir, 'content/survivor'), path.join(directory, 'content/survivor'), { recursive: true });
  const index = { schemaVersion: 1, perks: { lithe: { mechanicsRevision: 7, acknowledgedFingerprint: 'a'.repeat(64) } } };
  fs.writeFileSync(path.join(directory, 'content/survivor/meta-guides/perk-review-index.json'), JSON.stringify(index));
  assert.deepEqual(loadGuideContext({ rootDir: directory }).reviewIndex, index);
});

test('canonical choices reserve equipped slots before fixed members', () => {
  const plan = resolveCanonicalPlan({ context, strategyId: 'X01', buildId: x01Build });
  assert.deepEqual(plan.slots.slice(0, 3).map(slot => slot.choices[0].perkId), ['lithe', 'deja-vu', 'will-to-live']);
  assert.deepEqual(plan.slots[3].choices.map(choice => choice.perkId), ['kindred', 'well-make-it']);
  assert.equal(plan.slots[3].choiceCount, 1);
  assert.equal(plan.slots.length, 4);
  assert.equal(plan.slots[2].choices[0].perk, context.perks.get('will-to-live'));
  assert.equal(plan.flexSlotNote, context.snapshotByStrategy.get('X01').buildImplementations[0].flexSlotNote);
  const swf = resolveCanonicalPlan({ context, strategyId: 'C01', buildId: 'C01@10.2.0-r1:swf-representative' });
  assert.deepEqual(swf.slots[0].choices.map(choice => choice.perkId), ['sprint-burst', 'dead-hard']);
  assert.deepEqual(swf.slots.slice(1).map(slot => slot.choices[0].perkId), ['finesse', 'resilience', 'five-moves-ahead']);
  assert.ok(swf.slots.every(slot => slot.choiceCount === 1));
  assert.equal(swf.environment, 'COORDINATED_SWF');
});

test('source references are exact and scoped', () => {
  assert.throws(() => resolveCanonicalPlan({ context, strategyId: 'C01', buildId: x01Build }), /owned|owner/i);
  assert.throws(() => resolveCanonicalPlan({ context, strategyId: 'X02', buildId: 'X02@10.2.0-r1:swf-team-architecture' }), /team/i);
  assert.throws(() => resolveCanonicalPlan({ context, strategyId: ' X01', buildId: x01Build }));
  assert.throws(() => resolveCanonicalPlan({ context, strategyId: 'X01', buildId: `${x01Build} ` }));
  for (const raw of ['Lithe', 'chase info', 'decisive-strike']) {
    assert.throws(() => resolveSourceReceipt({ kind: 'PERK', ref: `${raw}#/mechanics/name` }, context));
  }
  for (const [id, kind] of [['C01', 'STANDARD'], ['P00', 'FAMILY'], ['G06', 'LEGACY'], ['X02', 'TEAM']]) {
    assert.equal(derivePageKind(context.strategies.get(id), context.snapshotByStrategy.get(id)), kind);
  }
  const family = context.strategies.get('P00');
  const team = context.snapshotByStrategy.get('X02');
  assert.equal(derivePageKind(family, team), 'FAMILY');
  assert.equal(derivePageKind(family, { ...team, currentStatus: 'LEGACY' }), 'LEGACY');
  assert.equal(derivePageKind(context.strategies.get('X02'), { ...team, buildImplementations: [{ teamComposition: [] }] }), 'STANDARD');
});

test('canonical assembly rejects impossible and source-inconsistent layouts', () => {
  const invalid = [
    build => build.perkIds.push('resilience'),
    build => build.perkAlternativeSlots.push({ slot: 4, perkIds: ['dead-hard'] }),
    build => build.perkAlternativeSlots[0].slot = 5,
    build => build.perkAlternativeSlots[0].slot = '4',
    build => build.perkAlternativeSlots[0].perkIds = [],
    build => build.perkAlternativeSlots[0].perkIds.push('kindred'),
    build => build.perkIds.push('lithe'),
    build => build.perkAlternativeSlots[0].perkIds.push('lithe'),
    build => build.perkIds[0] = 'Lithe'
  ];
  for (const change of invalid) {
    assert.throws(() => resolveCanonicalPlan({ context: withBuild(change), strategyId: 'X01', buildId: x01Build }));
  }
});

test('canonical plans preserve open flex and per-build source context without invented slots', () => {
  const partial = withBuild(build => { build.perkAlternativeSlots = []; build.item = 'Toolbox'; build.addOns = ['Source add-on']; });
  const plan = resolveCanonicalPlan({ context: partial, strategyId: 'X01', buildId: x01Build });
  assert.deepEqual(plan.slots.map(slot => slot.slot), [1, 2, 3]);
  assert.equal(plan.item, 'Toolbox');
  assert.deepEqual(plan.addOns, ['Source add-on']);
  assert.equal(Object.hasOwn(plan, 'completeness'), false);
  assert.equal(plan.rationale, partial.snapshotByStrategy.get('X01').buildImplementations[0].rationale);
  assert.equal(plan.buildConfidence, 'MEDIUM');
  assert.equal(plan.contentValidity, 'CURRENT');
  const g01 = resolveCanonicalPlan({ context, strategyId: 'G01', buildId: 'G01@10.2.0-r1:swf-representative' });
  assert.equal(g01.slots[3].choices.length, 1);
  assert.match(g01.slots[3].selectionNote, /safety flex/);
  assert.match(g01.flexSlotNote, /not fixed/);
});

test('canonical optionReasons annotate existing membership and cannot make choices mandatory', () => {
  const note = { slot: 4, role: 'Rescue', usage: 'FLEX', whyItsHere: 'Fill the missing role.', optionReasons: [{ perkId: 'kindred', whyItsHere: 'Locate the rescue.' }] };
  const plan = resolveCanonicalPlan({ context, strategyId: 'X01', buildId: x01Build, notes: [note] });
  assert.equal(plan.slots[3].choices[0].whyItsHere, 'Locate the rescue.');
  assert.equal(plan.slots[3].choices[1].whyItsHere, note.whyItsHere);
  assert.deepEqual(plan.slots[3].choices.map(choice => choice.perkId), ['kindred', 'well-make-it']);
  for (const notes of [
    [{ ...note, slot: 5 }], [note, note], [{ ...note, usage: 'REQUIRED' }],
    [{ ...note, optionReasons: [{ perkId: 'flashbang', whyItsHere: 'Not a member.' }] }],
    [{ ...note, optionReasons: [...note.optionReasons, ...note.optionReasons] }]
  ]) assert.throws(() => resolveCanonicalPlan({ context, strategyId: 'X01', buildId: x01Build, notes }));
  assert.throws(() => resolveCanonicalPlan({
    context, strategyId: 'G01', buildId: 'G01@10.2.0-r1:swf-representative',
    notes: [{ ...note, usage: 'REQUIRED', optionReasons: [{ perkId: 'resilience', whyItsHere: 'One named open flex example.' }] }]
  }), /mandatory/);
});

test('receipts resolve exact RFC6901 pointers and unambiguous publication headings', () => {
  assert.equal(resolveSourceReceipt({ kind: 'STRATEGY', ref: 'X01#/id' }, context), 'X01');
  assert.equal(resolveSourceReceipt({ kind: 'SNAPSHOT', ref: 'X01@10.2.0-r1#/currentStatus' }, context), 'ESTABLISHED');
  assert.equal(resolveSourceReceipt({ kind: 'PERK', ref: 'will-to-live#/mechanics/alternateName' }, context), 'Decisive Strike');
  assert.equal(resolveSourceReceipt({ kind: 'PERK', ref: 'lithe#' }, context), context.perks.get('lithe'));
  assert.match(resolveSourceReceipt({ kind: 'PUBLICATION', ref: 'X01#Overview' }, context), /deliberately diversified/);
  assert.match(resolveSourceReceipt({ kind: 'PUBLICATION', ref: 'X01#How It Works' }, context), /Early Game/);
  const record = { 'a/b': { '~key': { '': 'Resolved' } }, 'field with spaces': '<value>', list: ['first'], zero: 0, no: false, empty: '', blank: '  ', array: [], object: {}, nil: null };
  const custom = { ...context, strategies: new Map(context.strategies).set('X01', record) };
  assert.equal(resolveSourceReceipt({ kind: 'STRATEGY', ref: 'X01#/a~1b/~0key/' }, custom), 'Resolved');
  assert.equal(resolveSourceReceipt({ kind: 'STRATEGY', ref: 'X01#/field with spaces' }, custom), '<value>');
  for (const [pointer, value] of [['/list/0', 'first'], ['/zero', 0], ['/no', false]]) {
    assert.equal(resolveSourceReceipt({ kind: 'STRATEGY', ref: `X01#${pointer}` }, custom), value);
  }
  for (const pointer of ['/missing', '/empty', '/blank', '/array', '/object', '/nil', '/list/01', '/list/-', '/toString', '/a~2b', 'id']) {
    assert.throws(() => resolveSourceReceipt({ kind: 'STRATEGY', ref: `X01#${pointer}` }, custom));
  }
  for (const source of [
    { kind: 'STRATEGY', ref: 'X01' }, { kind: 'SNAPSHOT', ref: 'X01#/currentStatus' },
    { kind: 'PUBLICATION', ref: 'X01#overview' }, { kind: 'PUBLICATION', ref: 'X01# Overview' },
    { kind: 'UNKNOWN', ref: 'X01#/id' }
  ]) assert.throws(() => resolveSourceReceipt(source, context));
  const publication = markdown => ({ ...context, researchSource: { ...context.researchSource, articles: { ...context.researchSource.articles, [context.manifest.get('X01').articleFilename]: markdown } } });
  for (const markdown of ['### Overview\nFirst\n### Overview\nSecond', '### Overview\n\n### Next\nBody']) {
    assert.throws(() => resolveSourceReceipt({ kind: 'PUBLICATION', ref: 'X01#Overview' }, publication(markdown)));
  }
});

test('dependency collection includes every explicit perk and no transitive prose', () => {
  const { guide } = makeFixture();
  const plan = makePlan();
  plan.slots = [{ ...makeSlot(), choices: [{ perkId: 'flashbang', whyItsHere: 'Save.' }, { perkId: 'background-player', whyItsHere: 'Reach.' }], substitutes: [{ ...makeSubstitute(), perkId: 'resurgence', source: { kind: 'PERK', ref: 'unbreakable#/mechanics/currentEffect' } }] }];
  guide.page.loadout = {
    plans: [plan, { provenance: 'CANONICAL', buildId: x01Build, notes: [{ slot: 4, role: 'Flex', usage: 'FLEX', whyItsHere: 'Support.', optionReasons: [{ perkId: 'kindred', whyItsHere: 'Info.' }], substitutes: [{ ...makeSubstitute(), perkId: 'off-the-record' }] }] }],
    options: [{ perkId: 'finesse', usage: 'SUPPORT', whyItsHere: 'Vault.' }]
  };
  guide.page.gameplay.rows[0].enabledBy = ['perk:dead-hard', 'slot:route-tools#1', 'mechanic:rescue', 'item:toolbox'];
  guide.sources = [{ kind: 'PERK', ref: 'built-to-last#/mechanics/name' }, { kind: 'STRATEGY', ref: 'C01#/subtypeIds' }];
  guide.page.related = [{ strategyId: 'C01', relationship: 'SIMILAR', why: 'Sprint Burst, chase info, hyperfocus.' }];
  guide.page.summary = 'Stake Out, Sprint Burst and chase info are prose, not references.';
  guide.perkReviews = [{ perkId: 'stake-out', mechanicsRevision: 1 }];
  assert.deepEqual([...collectPerkReferences({ guide, context })].sort(), [
    'background-player', 'built-to-last', 'dead-hard', 'deja-vu', 'finesse', 'flashbang',
    'kindred', 'lithe', 'off-the-record', 'resurgence', 'unbreakable', 'well-make-it', 'will-to-live'
  ].sort());
  guide.page.loadout.plans[1].notes[0].optionReasons[0].perkId = 'stake-out';
  assert.throws(() => collectPerkReferences({ guide, context }), /option|member/i);
});

test('dependency collection handles history, all gameplay shapes and team role loadouts without following children', () => {
  const { guide: legacy } = makeFixture({ kind: 'LEGACY' });
  legacy.page.historicalPerks = [{ perkId: 'stake-out', historicalUse: 'Old engine.' }, { perkId: 'hyperfocus', historicalUse: 'Old engine.' }];
  assert.deepEqual(collectPerkReferences({ guide: legacy, context }), new Set(['stake-out', 'hyperfocus']));
  const { guide: family } = makeFixture({ kind: 'FAMILY' });
  assert.deepEqual(collectPerkReferences({ guide: family, context }), new Set());
  for (const gameplay of ['SEQUENCE', 'ROLE_GUIDE']) {
    const { guide } = makeFixture({ gameplay });
    (guide.page.gameplay.steps || guide.page.gameplay.priorities)[0].enabledBy = ['perk:flashbang'];
    assert.deepEqual(collectPerkReferences({ guide, context }), new Set(['flashbang']));
  }
  const { guide: team } = makeFixture({ kind: 'TEAM' });
  team.strategyId = 'X02';
  team.snapshotId = 'X02@10.2.0-r1';
  team.page.canonicalTeamBuildIds = ['X02@10.2.0-r1:swf-team-architecture'];
  assert.deepEqual(collectPerkReferences({ guide: team, context }), new Set());
  team.page.roles[0].loadout = { plans: [makePlan()], options: [{ perkId: 'finesse', usage: 'CORE', whyItsHere: 'Vault.' }] };
  assert.deepEqual(collectPerkReferences({ guide: team, context }), new Set(['lithe', 'finesse']));
  team.page.canonicalTeamBuildIds = [x01Build];
  assert.throws(() => collectPerkReferences({ guide: team, context }));
});

test('resolvers neither mutate nor freeze ResearchSource, canonical records or authored input', () => {
  const sourceBefore = structuredClone(context.researchSource);
  const perksBefore = structuredClone(context.perks);
  freeze(context.researchSource);
  for (const perk of context.perks.values()) freeze(perk);
  const { guide } = makeFixture();
  guide.page.loadout = { plans: [{ provenance: 'CANONICAL', buildId: x01Build, notes: [{ slot: 1, role: 'Chase', usage: 'CORE', whyItsHere: 'Escape.' }] }] };
  const guideBefore = structuredClone(guide);
  freeze(guide);
  const plan = resolveCanonicalPlan({ context, strategyId: 'X01', buildId: x01Build, notes: guide.page.loadout.plans[0].notes });
  collectPerkReferences({ guide, context });
  resolveSourceReceipt({ kind: 'STRATEGY', ref: 'X01#/id' }, context);
  plan.addOns.push('Transient only');
  assert.deepEqual(context.researchSource, sourceBefore);
  assert.deepEqual(context.perks, perksBefore);
  assert.deepEqual(guide, guideBefore);
});
