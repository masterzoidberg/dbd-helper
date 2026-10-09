import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validateGuide, validateGuideCatalog } from '../../scripts/survivor-meta-guide-validation.mjs';
import { loadGuideContext, derivePageKind, collectPerkReferences } from '../../scripts/survivor-meta-guide-source.mjs';
import { fingerprintPerkMechanics } from '../../scripts/survivor-meta-perk-review.mjs';
import { makeFixture as structuralFixture, makePlan, makeSlot, makeSubstitute } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'content/survivor/meta-guides/schema.json')));
const prepared = loadGuideContext({ rootDir });
const cli = path.join(rootDir, 'scripts/survivor-meta-guide-validation.mjs');
const buildId = 'X01@10.2.0-r1:solo-representative';

function fixture(id = 'X01', status = 'DRAFT', gameplay = 'DECISIONS') {
  const kind = derivePageKind(prepared.strategies.get(id), prepared.snapshotByStrategy.get(id));
  const { guide } = structuralFixture({ kind, reviewStatus: status, gameplay });
  guide.strategyId = id;
  guide.snapshotId = prepared.snapshotByStrategy.get(id).snapshotId;
  if (guide.sources) guide.sources = [{ kind: 'STRATEGY', ref: `${id}#/id` }];
  if (kind === 'FAMILY') guide.page.comparisons = prepared.strategies.get(id).subtypeIds.map(strategyId => ({ strategyId, chooseWhen: 'Choose this approach.', tradeoff: 'Commit the resource.' }));
  if (kind === 'LEGACY') guide.page.successors = prepared.snapshotByStrategy.get(id).analysis.replacementStrategyIds.map(strategyId => ({ strategyId, why: 'Use the current approach.' }));
  return { guide, context: { ...prepared, reviewIndex: { schemaVersion: 1, perks: {} } } };
}

function capture(input) {
  input.guide.perkReviews = [...collectPerkReferences(input)].map(perkId => {
    input.context.reviewIndex.perks[perkId] = { mechanicsRevision: 1, acknowledgedFingerprint: fingerprintPerkMechanics(input.context.perks.get(perkId)) };
    return { perkId, mechanicsRevision: 1 };
  });
  return input;
}
const check = input => validateGuide({ ...input, schema });
function rejects(input, at, code) {
  const errors = check(input);
  assert.ok(errors.some(error => (!at || error.path.startsWith(at)) && (!code || error.code === code)), JSON.stringify(errors));
  assert.ok(errors.every(error => error.strategyId === input.guide.strategyId && error.message));
}
function planned(id = 'X01', completeness = 'MODULE') {
  const input = fixture(id);
  input.guide.page.loadout = { plans: [makePlan(completeness)] };
  return capture(input);
}
function canonical() {
  const input = fixture();
  input.guide.page.loadout = { plans: [{ provenance: 'CANONICAL', buildId }] };
  return capture(input);
}

test('semantic contract rejects binding and slot conflicts', () => {
  assert.deepEqual(check(fixture()), []);
  const stale = fixture();
  stale.guide.snapshotId = 'X01@10.2.0-r2';
  rejects(stale, '/snapshotId', 'SNAPSHOT_REVIEW_REQUIRED');
  const unknown = fixture();
  unknown.guide.strategyId = 'Z99';
  rejects(unknown, '/strategyId');
  for (const change of [
    plan => plan.slots.push(makeSlot(1)),
    plan => plan.slots[1].slot = 1,
    plan => plan.slots[1].choices[0].perkId = 'lithe',
    plan => plan.slots[1].substitutes = [{ ...makeSubstitute(), perkId: 'lithe' }],
    plan => plan.slots[0].choices.push({ ...plan.slots[0].choices[0] }),
    plan => plan.slots[0].choiceCount = 2,
    plan => { plan.slots[0].usage = 'REQUIRED'; plan.slots[0].substitutes = [makeSubstitute()]; }
  ]) {
    const input = planned('X01', 'COMPLETE');
    change(input.guide.page.loadout.plans[0]);
    rejects(input, '/page/loadout/plans/0');
  }
});

test('MODULE one to four slots passes without fabricated support and COMPLETE uses exact positions', () => {
  for (let size = 1; size <= 4; size++) {
    const input = planned();
    input.guide.page.loadout.plans[0].slots = [1, 2, 3, 4].slice(0, size).map(slot => makeSlot(slot));
    assert.deepEqual(check(capture(input)), []);
  }
  const input = planned('X01', 'COMPLETE');
  assert.deepEqual(check(input), []);
  input.guide.page.loadout.plans[0].slots[3].slot = 3;
  rejects(input, '/page/loadout/plans/0/slots');
});

test('oneOf retains malformed slot paths in the matching discriminated branch', () => {
  const input = planned('X01', 'COMPLETE');
  const slot = input.guide.page.loadout.plans[0].slots[2];
  slot.choiceCount = 2;
  slot.role = '';
  slot.choices[0].perkId = 'Bad ID';
  slot.choices[0].whyItsHere = '';
  rejects(input, '/page/loadout/plans/0/slots/2/choiceCount', 'STRUCTURE_INVALID');
});

test('canonical ownership kind and annotation membership cannot override source', () => {
  assert.deepEqual(check(canonical()), []);
  for (const wrong of ['C01@10.2.0-r1:swf-representative', 'X01@10.2.0-r2:solo-representative']) {
    const input = canonical(); input.guide.page.loadout.plans[0].buildId = wrong;
    rejects(input, '/page/loadout/plans/0');
  }
  for (const note of [
    { slot: 4, role: 'Flex', usage: 'REQUIRED', whyItsHere: 'Required.' },
    { slot: 1, role: 'Chase', usage: 'CORE', whyItsHere: 'Route.', optionReasons: [{ perkId: 'flashbang', whyItsHere: 'Not a member.' }] },
    { slot: 1, role: 'Chase', usage: 'CORE', whyItsHere: 'Route.', substitutes: [{ ...makeSubstitute(), perkId: 'kindred' }] }
  ]) {
    const input = canonical(); input.guide.page.loadout.plans[0].notes = [note];
    rejects(input, '/page/loadout/plans/0');
  }
  const override = canonical(); override.guide.page.loadout.plans[0].slots = [makeSlot()];
  rejects(override, '/page/loadout/plans/0/slots', 'STRUCTURE_INVALID');
});

test('environment applicability rejects Not Applicable and Not Current without rejecting Unranked or Provisional', () => {
  for (const status of ['NOT_APPLICABLE', 'NOT_CURRENT']) {
    const input = planned();
    const snapshot = structuredClone(input.context.snapshotByStrategy.get('X01'));
    snapshot.solo.rankingStatus = status;
    input.context.snapshotByStrategy = new Map(input.context.snapshotByStrategy).set('X01', snapshot);
    rejects(input, '/page/loadout/plans/0/environment');
    input.guide.page.loadout.plans[0].environment = 'SOLO_Q';
    rejects(input, '/page/loadout/plans/0/environment');
    input.guide.page.loadout.plans[0].environment = 'COORDINATED_SWF';
    assert.deepEqual(check(input), []);
  }
  for (const status of ['UNRANKED', 'PROVISIONAL']) {
    const input = planned();
    const snapshot = structuredClone(input.context.snapshotByStrategy.get('X01'));
    snapshot.solo.rankingStatus = status;
    input.context.snapshotByStrategy = new Map(input.context.snapshotByStrategy).set('X01', snapshot);
    assert.deepEqual(check(input), []);
  }
});

test('exceptional scopes and optional guidance remain honest', () => {
  for (const id of ['P00', 'G06', 'C13', 'X02', 'C01']) assert.deepEqual(check(fixture(id)), [], id);
  for (const change of [page => page.comparisons.pop(), page => page.comparisons.push(page.comparisons[0]), page => page.comparisons[0].strategyId = 'X01']) {
    const input = fixture('P00'); change(input.guide.page); rejects(input, '/page/comparisons');
  }
  for (const id of ['G06', 'C13', 'X01', 'Z99']) {
    const input = fixture('G06'); input.guide.page.successors[0].strategyId = id; rejects(input, '/page/successors');
  }
  const notCurrent = fixture('G06');
  const snapshot = structuredClone(prepared.snapshotByStrategy.get('G05')); snapshot.solo.rankingStatus = 'NOT_CURRENT';
  notCurrent.context.snapshotByStrategy = new Map(prepared.snapshotByStrategy).set('G05', snapshot);
  rejects(notCurrent, '/page/successors');
  const wrongKind = fixture('P00'); wrongKind.guide.page = fixture().guide.page;
  rejects(wrongKind, '/page/kind');
});

function team() {
  const input = fixture('X02');
  input.guide.page.canonicalTeamBuildIds = ['X02@10.2.0-r1:swf-team-architecture'];
  input.guide.page.roles.forEach(role => {
    const plan = makePlan(); plan.id = `${role.id}-plan`; plan.environment = 'COORDINATED_SWF';
    role.loadout = { plans: [plan] };
  });
  return capture(input);
}
test('TEAM uses exactly four roles and individual role loadouts; cross-teammate perks pass', () => {
  assert.deepEqual(check(team()), []);
  const fewer = team(); fewer.guide.page.roles.pop(); rejects(fewer, '/page/roles');
  const wrong = team(); wrong.guide.page.canonicalTeamBuildIds = [buildId]; rejects(wrong, '/page/canonicalTeamBuildIds');
  const individual = team(); individual.guide.page.roles[0].loadout.plans = [{ provenance: 'CANONICAL', buildId: 'X02@10.2.0-r1:swf-team-architecture' }];
  rejects(individual, '/page/roles/0/loadout/plans/0');
});

test('plan item mechanic and role IDs are guide-wide unique, including cross-kind collisions', () => {
  for (const change of [
    page => page.roles[1].loadout.plans[0].id = page.roles[0].loadout.plans[0].id,
    page => page.roles[1].id = page.roles[0].id,
    page => { page.roles[0].loadout.item = { id: 'kit', status: 'NONE' }; page.roles[1].loadout.item = { id: 'kit', status: 'NONE' }; },
    page => page.mechanics = [{ id: 'runner', explanation: 'Collision.' }],
    page => page.mechanics = [{ id: 'tool', explanation: 'One.' }, { id: 'tool', explanation: 'Two.' }]
  ]) { const input = team(); change(input.guide.page); rejects(input, '/page', 'ID_CONFLICT'); }
});

test('resolve every enabledBy kind in this guide across all gameplay shapes', () => {
  for (const gameplay of ['DECISIONS', 'SEQUENCE', 'ROLE_GUIDE']) {
    const input = fixture('X01', 'DRAFT', gameplay);
    input.guide.page.loadout = { plans: [makePlan()], item: { id: 'kit', status: 'OPTIONAL', name: 'Med-Kit', why: 'Recover.' } };
    input.guide.page.mechanics = [{ id: 'routing', explanation: 'Rotate.' }];
    const row = (input.guide.page.gameplay.rows || input.guide.page.gameplay.steps || input.guide.page.gameplay.priorities)[0];
    row.enabledBy = ['perk:lithe', 'slot:route-tools#1', 'item:kit', 'mechanic:routing'];
    assert.deepEqual(check(capture(input)), []);
    for (const ref of ['perk:kindred', 'slot:route-tools#2', 'slot:unknown#1', 'item:missing', 'mechanic:unknown', 'role:runner']) {
      row.enabledBy = [ref]; rejects(input, '/page/gameplay', 'ENABLER_INVALID');
    }
    row.enabledBy = ['item:kit']; input.guide.page.loadout.item = { id: 'kit', status: 'NONE' };
    rejects(input, '/page/gameplay', 'ENABLER_INVALID');
  }
  const input = team(); input.guide.page.gameplay.rows[0].enabledBy = ['role:flex', 'slot:flex-plan#1', 'perk:lithe'];
  assert.deepEqual(check(input), []);
  input.guide.page.gameplay.rows.push({ ...input.guide.page.gameplay.rows[0] }); rejects(input, '/page/gameplay', 'ID_CONFLICT');
});

test('ALTERNATIVE replaces owned actual nonmandatory slot, traps are never selected', () => {
  const input = planned();
  input.guide.page.loadout.options = [{ perkId: 'kindred', usage: 'ALTERNATIVE', whyItsHere: 'Information.', replaces: { planId: 'route-tools', slot: 1 } }];
  assert.deepEqual(check(capture(input)), []);
  for (const change of [
    loadout => loadout.options[0].replaces.slot = 2,
    loadout => loadout.options[0].replaces.planId = 'unknown',
    loadout => loadout.plans[0].slots[0].usage = 'REQUIRED',
    loadout => loadout.options[0].usage = 'CORE',
    loadout => { loadout.options[0].perkId = 'lithe'; loadout.options[0].usage = 'OUTDATED_TRAP'; delete loadout.options[0].replaces; }
  ]) {
    const changed = structuredClone(input); change(changed.guide.page.loadout); rejects(changed, '/page/loadout');
  }
  const cross = team();
  cross.guide.page.roles[0].loadout.options = [{ perkId: 'kindred', usage: 'ALTERNATIVE', whyItsHere: 'Info.', replaces: { planId: 'flex-plan', slot: 1 } }];
  rejects(cross, '/page/roles/0/loadout/options');
  const substitute = planned(); substitute.guide.page.loadout.plans[0].slots[0].substitutes = [makeSubstitute()];
  substitute.guide.page.loadout.options = [{ perkId: 'sprint-burst', usage: 'OUTDATED_TRAP', whyItsHere: 'Avoid.' }];
  rejects(substitute, '/page/loadout');
});

test('TEAM rejects selectable ALTERNATIVE declared OUTDATED_TRAP in another role regardless of role order', () => {
  for (const [alternativeRole, trapRole] of [[0, 3], [3, 0]]) {
    const input = fixture('X02');
    input.guide.page.canonicalTeamBuildIds = ['X02@10.2.0-r1:swf-team-architecture'];
    const plan = makePlan();
    plan.environment = 'COORDINATED_SWF';
    input.guide.page.roles[alternativeRole].loadout = {
      plans: [plan],
      options: [{ perkId: 'sprint-burst', usage: 'ALTERNATIVE', whyItsHere: 'Use another chase tool.', replaces: { planId: plan.id, slot: 1 } }]
    };
    assert.deepEqual(check(capture(input)), []);
    input.guide.page.roles[trapRole].loadout = {
      options: [{ perkId: 'sprint-burst', usage: 'OUTDATED_TRAP', whyItsHere: 'Avoid this choice in the declared plan.' }]
    };
    const before = structuredClone(input);
    assert.deepEqual(check(input), [{
      code: 'OPTION_CONFLICT', strategyId: 'X02',
      path: `/page/roles/${alternativeRole}/loadout/options/0/perkId`,
      message: 'sprint-burst is marked OUTDATED_TRAP and cannot be selectable'
    }]);
    assert.deepEqual(input, before);
  }
});

test('review provenance validates without invented precision or global freshness', () => {
  for (const status of ['DRAFT', 'REVIEWED', 'PUBLISHED']) assert.deepEqual(check(fixture('X01', status)), []);
  const historical = fixture('X01', 'REVIEWED'); historical.guide.reviewedDate = '2020-02-29'; historical.guide.perkBaseline.verifiedDate = '2016-02-29';
  historical.guide.perkBaseline.patch = '1.0.0'; historical.guide.perkBaseline.archiveSha256 = 'a'.repeat(64);
  assert.deepEqual(check(historical), []);
  for (const date of ['2026-02-29', '2026-02-31', '2026-04-31', '1900-02-29']) {
    const input = fixture('X01', 'REVIEWED'); input.guide.reviewedDate = date; rejects(input, '/reviewedDate', 'DATE_INVALID');
    input.guide.reviewedDate = '2026-10-06'; input.guide.perkBaseline.verifiedDate = date; rejects(input, '/perkBaseline/verifiedDate', 'DATE_INVALID');
  }
  const draftDate = fixture(); draftDate.guide.reviewedDate = '2026-10-06'; rejects(draftDate, '/reviewedDate');
  const noSources = fixture('X01', 'REVIEWED'); delete noSources.guide.sources; rejects(noSources, '/sources');
});

test('exact substitute provenance IDs receipts and calendar dates are mandatory when supplied', () => {
  const input = planned(); input.guide.page.loadout.plans[0].slots[0].substitutes = [makeSubstitute()];
  assert.deepEqual(check(capture(input)), []);
  for (const change of [sub => sub.perkId = 'decisive-strike', sub => sub.provenance = 'CANONICAL', sub => sub.reviewedDate = '2026-02-31', sub => sub.source.ref = 'lithe#/mechanics/missing', sub => delete sub.source, sub => sub.perkId = 'lithe']) {
    const changed = structuredClone(input); change(changed.guide.page.loadout.plans[0].slots[0].substitutes[0]); rejects(changed, '/page/loadout/plans/0');
  }
});

test('items related refs source gaps and qualitative difficulty obey optional omission rules', () => {
  for (const item of [{ id: 'kit', status: 'NONE' }, { id: 'kit', status: 'OPTIONAL', name: 'Med-Kit', why: 'Recover.' }]) {
    const input = fixture(); input.guide.page.loadout = { item }; assert.deepEqual(check(input), []);
  }
  for (const item of [{ id: 'kit', status: 'NONE', name: 'Med-Kit' }, { id: 'kit', status: 'NONE', addOns: [] }, { id: 'kit', status: 'OPTIONAL', name: 'Med-Kit' }]) {
    const input = fixture(); input.guide.page.loadout = { item }; rejects(input, '/page/loadout/item');
  }
  const input = fixture(); input.guide.page.related = [{ strategyId: 'C01', relationship: 'SIMILAR', why: 'Compare.' }];
  input.guide.page.difficulty = { execution: { label: 'HIGH', why: 'Practice.' } }; assert.deepEqual(check(input), []);
  for (const change of [page => page.related.push(page.related[0]), page => page.related[0].strategyId = 'X01', page => page.related[0].strategyId = 'Z99', page => page.difficulty.execution.label = 3]) {
    const changed = structuredClone(input); change(changed.guide.page); rejects(changed, '/page');
  }
  input.guide.sources = [{ kind: 'PUBLICATION', ref: 'X01#Missing Heading' }]; rejects(input, '/sources/0', 'SOURCE_INVALID');
});

test('dependency and revision errors stay targeted in every state and validation is read-only', () => {
  for (const status of ['DRAFT', 'REVIEWED', 'PUBLISHED']) {
    const input = canonical(); input.guide.reviewStatus = status; input.guide.reviewedDate = status === 'DRAFT' ? null : '2026-10-06';
    input.guide.sources = [{ kind: 'STRATEGY', ref: 'X01#/id' }];
    const before = structuredClone(input);
    assert.deepEqual(check(input), []); assert.deepEqual(input, before);
    input.context.reviewIndex.perks.lithe.mechanicsRevision = 2; rejects(input, '/perkReviews', 'REVIEW_REQUIRED');
    input.context.reviewIndex.perks.lithe.acknowledgedFingerprint = 'a'.repeat(64); rejects(input, '/perkReviews', 'PERK_CHANGE_CLASSIFICATION_REQUIRED');
    delete input.context.reviewIndex.perks.lithe; rejects(input, '/perkReviews', 'PERK_CHANGE_CLASSIFICATION_REQUIRED');
    input.guide.perkReviews.pop(); rejects(input, '/perkReviews', 'PERK_REVIEWS_INVALID');
  }
});

test('canonical reviewed swaps use exact authored diagnostic paths and cannot replace a REQUIRED identity', () => {
  const input = canonical();
  const note = { slot: 1, role: 'Chase', usage: 'CORE', whyItsHere: 'Route.', substitutes: [makeSubstitute()] };
  input.guide.page.loadout.plans[0].notes = [note];
  assert.deepEqual(check(capture(input)), []);
  note.substitutes[0].reviewedDate = '2026-02-31';
  rejects(input, '/page/loadout/plans/0/notes/0/substitutes/0/reviewedDate', 'DATE_INVALID');
  note.substitutes[0].reviewedDate = '2026-10-06';
  note.usage = 'REQUIRED'; rejects(input, '/page/loadout/plans/0', 'BUILD_INVALID');
  delete note.substitutes;
  input.guide.page.loadout.options = [{ perkId: 'sprint-burst', usage: 'ALTERNATIVE', whyItsHere: 'Escape.', replaces: { planId: buildId, slot: 1 } }];
  rejects(input, '/page/loadout/options/0/replaces', 'OPTION_CONFLICT');
});

test('exact dependency set includes receipts history and replacements, never linked strategies or prose', () => {
  const input = planned();
  input.guide.sources = [{ kind: 'PERK', ref: 'kindred#/mechanics/name' }];
  input.guide.page.related = [{ strategyId: 'C01', relationship: 'SIMILAR', why: 'Compare.' }, { strategyId: 'C01', relationship: 'ALTERNATIVE', why: 'Another context.' }];
  input.guide.page.summary = 'Botany Knowledge is prose, not a fabricated reference.';
  assert.deepEqual(check(capture(input)), []);
  assert.deepEqual(input.guide.perkReviews.map(row => row.perkId).sort(), ['kindred', 'lithe']);
  input.guide.page.gameplay.rows[0].enabledBy = ['perk:kindred'];
  rejects(input, '/page/gameplay', 'ENABLER_INVALID');
  delete input.guide.page.gameplay.rows[0].enabledBy;
  for (const reviews of [[], [...input.guide.perkReviews, input.guide.perkReviews[0]], [...input.guide.perkReviews, { perkId: 'resilience', mechanicsRevision: 1 }]]) {
    rejects({ ...input, guide: { ...input.guide, perkReviews: reviews } }, '/perkReviews', 'PERK_REVIEWS_INVALID');
  }
  const legacy = fixture('G06'); legacy.guide.page.historicalPerks = [{ perkId: 'stake-out', historicalUse: 'Historical engine.' }];
  assert.deepEqual(check(capture(legacy)), []);
  legacy.guide.perkReviews = []; rejects(legacy, '/perkReviews', 'PERK_REVIEWS_INVALID');
});

test('replacement conflicts and duplicate advisory IDs fail while slot and canonical links resolve', () => {
  const input = planned('X01', 'COMPLETE');
  input.guide.page.loadout.options = [{ perkId: 'deja-vu', usage: 'ALTERNATIVE', whyItsHere: 'Objectives.', replaces: { planId: 'route-tools', slot: 1 } }];
  rejects(input, '/page/loadout/options/0/perkId', 'OPTION_CONFLICT');
  input.guide.page.loadout.options = [{ perkId: 'kindred', usage: 'CORE', whyItsHere: 'Info.' }, { perkId: 'kindred', usage: 'SUPPORT', whyItsHere: 'Info.' }];
  rejects(input, '/page/loadout/options/1/perkId', 'OPTION_CONFLICT');
  const bound = canonical(); bound.guide.page.gameplay.rows[0].enabledBy = [`slot:${buildId}#4`, 'perk:well-make-it'];
  assert.deepEqual(check(bound), []);
  const before = structuredClone(bound); check(bound); assert.deepEqual(bound, before);
});

function catalogFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-guide-validation-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.cpSync(path.join(rootDir, 'content/survivor'), path.join(directory, 'content/survivor'), { recursive: true });
  const guideDir = path.join(directory, 'content/survivor/meta-guides');
  const write = (name, value) => fs.writeFileSync(path.join(guideDir, `${name}.json`), typeof value === 'string' ? value : JSON.stringify(value));
  const run = args => spawnSync(process.execPath, [cli, ...(args || [])], { cwd: directory, encoding: 'utf8' });
  return { directory, guideDir, write, run, check: requirePublished => validateGuideCatalog({ rootDir: directory, requirePublished }) };
}
function tree(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? tree(file) : [[file, fs.readFileSync(file).toString('base64')]];
  });
}

test('catalog and CLI missing directory/guides succeed default, metadata excluded, release requires 57', t => {
  const f = catalogFixture(t);
  assert.deepEqual(f.check().counts, { missing: 57, DRAFT: 0, REVIEWED: 0, PUBLISHED: 0 });
  assert.equal(f.check().ok, true);
  assert.equal(f.run().status, 0);
  assert.equal(f.run(['--require-published']).status, 1);
  fs.rmSync(f.guideDir, { recursive: true });
  const before = tree(f.directory);
  assert.equal(f.check().ok, true);
  assert.equal(f.run().status, 0);
  assert.deepEqual(tree(f.directory), before);
});

test('seven valid REVIEWED report seven/fifty; all 57 PUBLISHED satisfy release without writes', t => {
  const f = catalogFixture(t);
  const ids = ['X01', 'P02', 'P00', 'G06', 'X02', 'C01', 'G01'];
  for (const id of ids) f.write(id, fixture(id, 'REVIEWED').guide);
  assert.deepEqual(f.check().counts, { missing: 50, DRAFT: 0, REVIEWED: 7, PUBLISHED: 0 });
  const before = tree(f.directory); const output = f.run();
  assert.equal(output.status, 0, output.stderr); assert.deepEqual(JSON.parse(output.stdout).counts, f.check().counts);
  assert.deepEqual(tree(f.directory), before);
  assert.equal(f.check(true).ok, false);
  for (const id of prepared.strategies.keys()) f.write(id, fixture(id, 'PUBLISHED').guide);
  assert.equal(f.check(true).ok, true);
  assert.deepEqual(f.check(true).counts, { missing: 0, DRAFT: 0, REVIEWED: 0, PUBLISHED: 57 });
  assert.equal(f.run(['--require-published']).status, 0);
});

test('invalid existing DRAFT, parse, filename and stale records all fail sorted, never fallback or mutate', t => {
  const f = catalogFixture(t);
  f.write('X01', '{');
  f.write('C01', { ...fixture('C01').guide, page: {} });
  f.write('G01', { ...fixture('G01').guide, snapshotId: 'G01@10.2.0-r2' });
  f.write('Z99', fixture().guide);
  const before = tree(f.directory); const result = f.check();
  assert.equal(result.ok, false);
  assert.deepEqual(result.affectedStrategyIds, ['C01', 'G01', 'X01', 'Z99']);
  assert.ok(result.diagnostics.every(error => error.file && error.message));
  assert.ok(result.diagnostics.some(error => error.code === 'GUIDE_PARSE_INVALID'));
  assert.ok(result.diagnostics.some(error => error.code === 'IDENTITY_INVALID' && error.file.endsWith('Z99.json')));
  const keys = result.diagnostics.map(error => `${error.strategyId}\0${error.file}\0${error.path}\0${error.code}\0${error.perkId || ''}\0${error.message}`);
  assert.deepEqual(keys, [...keys].sort());
  const output = f.run(); assert.equal(output.status, 1); assert.match(output.stderr, /C01|G01|X01|Z99/);
  assert.deepEqual(JSON.parse(output.stdout).affectedStrategyIds, result.affectedStrategyIds);
  assert.deepEqual(tree(f.directory), before);
});

test('CLI rejects unknown args and catches malformed context rather than repairing inputs', t => {
  const f = catalogFixture(t);
  assert.equal(f.run(['--unknown']).status, 1);
  f.write('perk-review-index', '{');
  const before = tree(f.directory);
  assert.equal(f.run().status, 1); assert.equal(f.check().ok, false);
  assert.deepEqual(tree(f.directory), before);
});

test('catalog and CLI report exactly the stale perk-dependent guide in all review states', t => {
  const f = catalogFixture(t);
  const input = canonical();
  f.write('C01', fixture('C01').guide);
  f.write('perk-review-index', input.context.reviewIndex);
  f.write('X01', input.guide);
  assert.equal(f.check().ok, true);
  input.context.reviewIndex.perks.lithe.mechanicsRevision = 2;
  f.write('perk-review-index', input.context.reviewIndex);
  for (const status of ['DRAFT', 'REVIEWED', 'PUBLISHED']) {
    input.guide.reviewStatus = status;
    input.guide.reviewedDate = status === 'DRAFT' ? null : '2026-10-06';
    input.guide.sources = [{ kind: 'STRATEGY', ref: 'X01#/id' }];
    f.write('X01', input.guide);
    const before = tree(f.directory);
    const result = f.check();
    assert.deepEqual(result.affectedStrategyIds, ['X01']);
    assert.deepEqual(result.diagnostics.map(error => [error.code, error.perkId]), [['REVIEW_REQUIRED', 'lithe']]);
    const output = f.run(); assert.equal(output.status, 1);
    assert.deepEqual(JSON.parse(output.stdout).affectedStrategyIds, ['X01']);
    assert.deepEqual(tree(f.directory), before);
  }
});
