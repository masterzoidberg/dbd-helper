import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fingerprintPerkMechanics, validatePerkReviews, classifyPerkChange } from '../../scripts/survivor-meta-perk-review.mjs';
import { collectPerkReferences, loadGuideContext, resolveCanonicalPlan } from '../../scripts/survivor-meta-guide-source.mjs';
import { validateGuideStructure } from '../../scripts/survivor-meta-guide-validation.mjs';
import { makeFixture, makePlan, makeSubstitute } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const prepared = loadGuideContext({ rootDir });
const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'content/survivor/meta-guides/schema.json')));
const indexPath = 'content/survivor/meta-guides/perk-review-index.json';
const cliPath = path.join(rootDir, 'scripts/survivor-meta-perk-review.mjs');
const emptyIndex = () => ({ schemaVersion: 1, perks: {} });
const reason = 'Activation changed in the reviewed canonical diff';

function reviewedGuide(strategyId = 'X01', plans = [{ provenance: 'CANONICAL', buildId: 'X01@10.2.0-r1:solo-representative' }]) {
  const { guide } = makeFixture({ reviewStatus: 'REVIEWED' });
  guide.strategyId = strategyId;
  guide.snapshotId = `${strategyId}@10.2.0-r1`;
  guide.sources = [{ kind: 'STRATEGY', ref: `${strategyId}#/id` }];
  guide.page.loadout = { plans };
  let index = emptyIndex();
  for (const perkId of collectPerkReferences({ guide, context: prepared })) {
    index = classifyPerkChange({ perkId, perk: prepared.perks.get(perkId), index, classification: 'PRESENTATION_ONLY', reason: 'First reviewed use fixture.' });
    guide.perkReviews.push({ perkId, mechanicsRevision: 1 });
  }
  assert.deepEqual(validateGuideStructure(guide, schema), []);
  return { guide, context: { ...prepared, reviewIndex: index } };
}

function changePerk(context, perkId, change) {
  const perk = structuredClone(context.perks.get(perkId));
  change(perk);
  return { ...context, perks: new Map(context.perks).set(perkId, perk) };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    if (value instanceof Map) for (const item of value.values()) freeze(item);
    else Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('initializes only actual reviewed references', () => {
  const { guide, context } = reviewedGuide();
  assert.deepEqual(new Set(guide.perkReviews.map(row => row.perkId)), collectPerkReferences({ guide, context }));
  assert.deepEqual(new Set(Object.keys(context.reviewIndex.perks)), collectPerkReferences({ guide, context }));
  assert.deepEqual(validatePerkReviews({ guide, context }), []);
});

test('referenced Lithe changes require classification then targeted re-review', () => {
  const { guide, context } = reviewedGuide();
  const before = structuredClone({ guide, context });
  const changed = changePerk(context, 'lithe', perk => perk.mechanics.activation[0] = 'Perform a Rushed Vault while in a Chase.');
  const errors = validatePerkReviews({ guide, context: changed });
  assert.deepEqual(errors.map(error => [error.code, error.strategyId, error.perkId]), [['PERK_CHANGE_CLASSIFICATION_REQUIRED', 'X01', 'lithe']]);
  const nextIndex = classifyPerkChange({ perkId: 'lithe', perk: changed.perks.get('lithe'), index: context.reviewIndex, classification: 'STRATEGY_SIGNIFICANT', reason });
  assert.equal(nextIndex.perks.lithe.mechanicsRevision, context.reviewIndex.perks.lithe.mechanicsRevision + 1);
  for (const perkId of Object.keys(nextIndex.perks).filter(id => id !== 'lithe')) assert.deepEqual(nextIndex.perks[perkId], context.reviewIndex.perks[perkId]);
  assert.deepEqual(validatePerkReviews({ guide, context: { ...changed, reviewIndex: nextIndex } }).map(error => [error.code, error.strategyId, error.perkId]), [['REVIEW_REQUIRED', 'X01', 'lithe']]);
  assert.deepEqual({ guide, context }, before);
});

test('all exact canonical Lithe references require review, not a hard-coded guide list', () => {
  const fixtures = [];
  for (const [strategyId, snapshot] of prepared.snapshotByStrategy) {
    const plans = snapshot.buildImplementations.filter(build => !build.teamComposition?.length).map(build => ({ provenance: 'CANONICAL', buildId: build.buildId }));
    if (!plans.length) continue;
    const { guide } = makeFixture();
    guide.strategyId = strategyId;
    guide.page.loadout = { plans };
    if (collectPerkReferences({ guide, context: prepared }).has('lithe')) fixtures.push(reviewedGuide(strategyId, plans));
  }
  assert.ok(fixtures.some(({ guide }) => guide.strategyId === 'X01'));
  assert.ok(fixtures.length > 2);
  for (const { guide, context } of fixtures) {
    const changed = changePerk(context, 'lithe', perk => perk.mechanics.activation.push('New activation restriction.'));
    assert.ok(validatePerkReviews({ guide, context: changed }).some(error => error.code === 'PERK_CHANGE_CLASSIFICATION_REQUIRED' && error.perkId === 'lithe' && error.strategyId === guide.strategyId));
    const index = classifyPerkChange({ perkId: 'lithe', perk: changed.perks.get('lithe'), index: context.reviewIndex, classification: 'STRATEGY_SIGNIFICANT', reason });
    assert.ok(validatePerkReviews({ guide, context: { ...changed, reviewIndex: index } }).some(error => error.code === 'REVIEW_REQUIRED' && error.perkId === 'lithe' && error.strategyId === guide.strategyId));
  }
});

test('unrelated Botany and archive metadata do not stale X01', () => {
  const { guide, context } = reviewedGuide();
  const before = structuredClone(guide);
  // Retained, previously used Botany can have an unclassified change without blocking X01.
  context.reviewIndex = classifyPerkChange({ perkId: 'botany-knowledge', perk: context.perks.get('botany-knowledge'), index: context.reviewIndex, classification: 'PRESENTATION_ONLY', reason: 'Previously reviewed elsewhere.' });
  const changed = changePerk(context, 'botany-knowledge', perk => perk.mechanics.currentEffect = 'Changed healing mechanics fixture.');
  changed.perkBaseline = { patch: '99.0.0', verifiedDate: '2026-10-08', archiveSha256: 'a'.repeat(64) };
  changed.release = '99.0.0-r1';
  assert.equal(collectPerkReferences({ guide, context }).has('botany-knowledge'), false);
  assert.deepEqual(validatePerkReviews({ guide, context: changed }), []);
  assert.deepEqual(validatePerkReviews({ guide, context: { ...changed, reviewIndex: context.reviewIndex } }), []);
  assert.deepEqual(guide, before);
});

test('wording-only change requires acknowledgment at same revision and text stays canonical', () => {
  const { guide, context } = reviewedGuide();
  const before = structuredClone(guide);
  const changed = changePerk(context, 'lithe', perk => perk.mechanics.currentEffect = perk.mechanics.currentEffect.replace('Whenever you perform', 'When you perform'));
  assert.ok(validatePerkReviews({ guide, context: changed }).some(error => error.code === 'PERK_CHANGE_CLASSIFICATION_REQUIRED'));
  const index = classifyPerkChange({ perkId: 'lithe', perk: changed.perks.get('lithe'), index: context.reviewIndex, classification: 'PRESENTATION_ONLY', reason: 'Reviewed wording diff; behavior unchanged.' });
  assert.equal(index.perks.lithe.mechanicsRevision, context.reviewIndex.perks.lithe.mechanicsRevision);
  assert.deepEqual(validatePerkReviews({ guide, context: { ...changed, reviewIndex: index } }), []);
  const plan = resolveCanonicalPlan({ context: changed, strategyId: guide.strategyId, buildId: guide.page.loadout.plans[0].buildId });
  assert.equal(plan.slots[0].choices[0].perk.mechanics.currentEffect, changed.perks.get('lithe').mechanics.currentEffect);
  assert.notEqual(plan.slots[0].choices[0].perk.mechanics.currentEffect, context.perks.get('lithe').mechanics.currentEffect);
  assert.deepEqual(guide, before);
  assert.deepEqual(Object.keys(index.perks.lithe).sort(), ['acknowledgedFingerprint', 'mechanicsRevision']);
});

test('fingerprints include new mechanics and have stable object ordering', () => {
  const first = { mechanics: { z: [{ b: 2, a: 1 }, 'second'], a: { y: true, x: null } } };
  const shuffled = { mechanics: { a: { x: null, y: true }, z: [{ a: 1, b: 2 }, 'second'] } };
  const expected = createHash('sha256').update('{"a":{"x":null,"y":true},"z":[{"a":1,"b":2},"second"]}').digest('hex');
  assert.equal(fingerprintPerkMechanics(first), expected);
  assert.equal(fingerprintPerkMechanics(first), fingerprintPerkMechanics(shuffled));
  assert.equal(fingerprintPerkMechanics({ mechanics: { '2': true, '10': false } }), createHash('sha256').update('{"10":false,"2":true}').digest('hex'));
  shuffled.mechanics.z.reverse();
  assert.notEqual(fingerprintPerkMechanics(first), fingerprintPerkMechanics(shuffled));
  const added = structuredClone(first);
  added.mechanics.newMechanic = { name: 'Meaningful nested mechanic name', activation: [false, 0] };
  assert.notEqual(fingerprintPerkMechanics(first), fingerprintPerkMechanics(added));
  const renamed = structuredClone(added);
  renamed.mechanics.newMechanic.name = 'Different mechanic';
  assert.notEqual(fingerprintPerkMechanics(added), fingerprintPerkMechanics(renamed));
  assert.throws(() => fingerprintPerkMechanics({}), /mechanics/i);
});

test('fingerprint projection excludes exactly display owner and patch context fields', () => {
  const perk = prepared.perks.get('lithe');
  const excluded = ['name', 'alternateName', 'source', 'sourceCharacter', 'isGeneralPerk', 'status', 'currentLivePatchVerified', 'patchNote', 'plainEnglishSummary'];
  for (const field of excluded) {
    const changed = structuredClone(perk);
    changed.mechanics[field] = 'Changed metadata';
    assert.equal(fingerprintPerkMechanics(changed), fingerprintPerkMechanics(perk), field);
  }
  for (const field of Object.keys(perk.mechanics).filter(field => !excluded.includes(field))) {
    const changed = structuredClone(perk);
    changed.mechanics[field] = 'Changed mechanics';
    assert.notEqual(fingerprintPerkMechanics(changed), fingerprintPerkMechanics(perk), field);
  }
  const changed = structuredClone(perk);
  changed.editorial.summary = 'Changed editorial';
  changed.verifiedDate = '2026-10-08';
  changed.verifiedLivePatch = '99.0.0';
  assert.equal(fingerprintPerkMechanics(changed), fingerprintPerkMechanics(perk));
});

test('missing duplicate extra and invalid perkReviews fail exact dependency equality', () => {
  const { guide, context } = reviewedGuide();
  for (const change of [
    value => value.perkReviews.pop(),
    value => value.perkReviews.push(structuredClone(value.perkReviews[0])),
    value => value.perkReviews.push({ perkId: 'botany-knowledge', mechanicsRevision: 1 }),
    value => value.perkReviews = null,
    value => delete value.perkReviews,
    value => value.perkReviews[0] = null,
    ...[0, -1, 1.5, '1'].map(revision => value => value.perkReviews[0].mechanicsRevision = revision)
  ]) {
    const bad = structuredClone(guide);
    change(bad);
    assert.ok(validatePerkReviews({ guide: bad, context }).some(error => error.code === 'PERK_REVIEWS_INVALID'));
  }
  const future = structuredClone(guide);
  future.perkReviews[0].mechanicsRevision = 2;
  assert.ok(validatePerkReviews({ guide: future, context }).some(error => error.code === 'REVIEW_REQUIRED'));
});

test('every explicit dependency kind has exactly one perkReview and prose creates none', () => {
  const { guide } = makeFixture();
  const plan = makePlan();
  plan.slots[0].substitutes = [{ ...makeSubstitute(), source: { kind: 'PERK', ref: 'unbreakable#/mechanics/currentEffect' } }];
  guide.page.loadout = { plans: [plan, { provenance: 'CANONICAL', buildId: 'X01@10.2.0-r1:solo-representative' }], options: [{ perkId: 'finesse', usage: 'CORE', whyItsHere: 'Vault.' }] };
  guide.sources = [{ kind: 'PERK', ref: 'flashbang#/mechanics/name' }];
  guide.page.gameplay.rows[0].enabledBy = ['perk:resilience'];
  guide.page.summary = 'Botany Knowledge, chase info and Sprint Burst are not prose-mapped dependencies.';
  const context = { ...prepared, reviewIndex: emptyIndex() };
  for (const perkId of collectPerkReferences({ guide, context })) {
    context.reviewIndex = classifyPerkChange({ perkId, perk: context.perks.get(perkId), index: context.reviewIndex, classification: 'PRESENTATION_ONLY', reason: 'Initial fixture review.' });
    guide.perkReviews.push({ perkId, mechanicsRevision: 1 });
  }
  assert.deepEqual(new Set(guide.perkReviews.map(row => row.perkId)), new Set(['lithe', 'deja-vu', 'will-to-live', 'kindred', 'well-make-it', 'sprint-burst', 'unbreakable', 'finesse', 'flashbang', 'resilience']));
  assert.deepEqual(validatePerkReviews({ guide, context }), []);
  guide.perkReviews.pop();
  assert.ok(validatePerkReviews({ guide, context }).some(error => error.code === 'PERK_REVIEWS_INVALID'));
});

test('referenced missing index entries require classification but unreferenced perks do not', () => {
  const { guide, context } = reviewedGuide();
  delete context.reviewIndex.perks.lithe;
  assert.deepEqual(validatePerkReviews({ guide, context }).map(error => [error.code, error.perkId]), [['PERK_CHANGE_CLASSIFICATION_REQUIRED', 'lithe']]);
  const { guide: family } = makeFixture({ kind: 'FAMILY' });
  family.page.summary = 'Lithe and Botany are prose, not dependencies.';
  assert.deepEqual(validatePerkReviews({ guide: family, context: { ...context, reviewIndex: emptyIndex() } }), []);
});

test('bad index shape fingerprints and revisions reject validation and classification', () => {
  const { guide, context } = reviewedGuide();
  const indices = [null, [], {}, { schemaVersion: 2, perks: {} }, { schemaVersion: 1, perks: [] }, { ...emptyIndex(), extra: true }];
  for (const entry of [null, {}, { mechanicsRevision: 1, acknowledgedFingerprint: 'A'.repeat(64) }, { mechanicsRevision: 1, acknowledgedFingerprint: 'a'.repeat(63) }, { mechanicsRevision: 1, acknowledgedFingerprint: 'g'.repeat(64) }, { mechanicsRevision: 1, acknowledgedFingerprint: 'a'.repeat(64), effect: 'No copied mechanics' }, ...[0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1].map(mechanicsRevision => ({ mechanicsRevision, acknowledgedFingerprint: 'a'.repeat(64) }))]) {
    indices.push({ schemaVersion: 1, perks: { lithe: entry } });
  }
  indices.push({ schemaVersion: 1, perks: { Lithe: { mechanicsRevision: 1, acknowledgedFingerprint: 'a'.repeat(64) } } });
  for (const index of indices) {
    assert.ok(validatePerkReviews({ guide, context: { ...context, reviewIndex: index } }).some(error => error.code === 'PERK_REVIEW_INDEX_INVALID'));
    assert.throws(() => classifyPerkChange({ perkId: 'lithe', perk: context.perks.get('lithe'), index, classification: 'PRESENTATION_ONLY', reason }), /index|revision|fingerprint/i);
  }
});

test('initialization retained entries and monotonic classification never mutate inputs', () => {
  const { guide, context } = reviewedGuide();
  const before = structuredClone({ guide, context });
  freeze(guide);
  freeze(context);
  const changed = changePerk(context, 'lithe', perk => perk.mechanics.cooldown = 'New cooldown.');
  freeze(changed.perks.get('lithe'));
  let index = classifyPerkChange({ perkId: 'lithe', perk: changed.perks.get('lithe'), index: context.reviewIndex, classification: 'STRATEGY_SIGNIFICANT', reason });
  assert.equal(index.perks.lithe.mechanicsRevision, 2);
  const second = changePerk(changed, 'lithe', perk => perk.mechanics.duration.push('New duration.'));
  index = classifyPerkChange({ perkId: 'lithe', perk: second.perks.get('lithe'), index, classification: 'STRATEGY_SIGNIFICANT', reason });
  assert.equal(index.perks.lithe.mechanicsRevision, 3);
  assert.deepEqual(Object.keys(index.perks).sort(), Object.keys(context.reviewIndex.perks).sort());
  index.perks.kindred.mechanicsRevision = 99;
  assert.equal(context.reviewIndex.perks.kindred.mechanicsRevision, 1);
  validatePerkReviews({ guide, context: changed });
  assert.deepEqual({ guide, context }, before);
  for (const classification of ['PRESENTATION_ONLY', 'STRATEGY_SIGNIFICANT']) {
    const seeded = classifyPerkChange({ perkId: 'lithe', perk: context.perks.get('lithe'), index: emptyIndex(), classification, reason });
    assert.equal(seeded.perks.lithe.mechanicsRevision, 1);
  }
});

test('classification rejects invalid reasons identities no candidate change and revision overflow', () => {
  const { context } = reviewedGuide();
  const changed = changePerk(context, 'lithe', perk => perk.mechanics.activation.push('Changed.'));
  const args = { perkId: 'lithe', perk: changed.perks.get('lithe'), index: context.reviewIndex, classification: 'STRATEGY_SIGNIFICANT', reason };
  for (const badReason of [undefined, null, '', ' \n ', 1, {}]) assert.throws(() => classifyPerkChange({ ...args, reason: badReason }), /reason/i);
  for (const classification of [undefined, 'significant', 'AUTO', null]) assert.throws(() => classifyPerkChange({ ...args, classification }), /classification/i);
  for (const perkId of ['Lithe', ' lithe', 'lithe ', 'botany-knowledge', '__proto__']) assert.throws(() => classifyPerkChange({ ...args, perkId }), /perk|canonical|exact/i);
  for (const classification of ['PRESENTATION_ONLY', 'STRATEGY_SIGNIFICANT']) assert.throws(() => classifyPerkChange({ ...args, perk: context.perks.get('lithe'), classification }), /candidate|unchanged/i);
  const index = structuredClone(context.reviewIndex);
  index.perks.lithe.mechanicsRevision = Number.MAX_SAFE_INTEGER;
  assert.throws(() => classifyPerkChange({ ...args, index }), /revision/i);
});

test('review validation applies to all states and explicit history team and gameplay dependencies', () => {
  const { guide, context } = reviewedGuide();
  const changed = changePerk(context, 'lithe', perk => perk.mechanics.activation.push('Changed.'));
  for (const reviewStatus of ['DRAFT', 'REVIEWED', 'PUBLISHED']) {
    const record = { ...guide, reviewStatus, reviewedDate: reviewStatus === 'DRAFT' ? null : guide.reviewedDate };
    assert.ok(validatePerkReviews({ guide: record, context: changed }).some(error => error.code === 'PERK_CHANGE_CLASSIFICATION_REQUIRED'));
  }
  const { guide: legacy } = makeFixture({ kind: 'LEGACY' });
  legacy.page.historicalPerks = [{ perkId: 'stake-out', historicalUse: 'Historical engine.' }];
  const { guide: team } = makeFixture({ kind: 'TEAM' });
  team.strategyId = 'X02';
  team.page.canonicalTeamBuildIds = ['X02@10.2.0-r1:swf-team-architecture'];
  team.page.roles[0].loadout = { plans: [makePlan()] };
  const fixtures = [legacy, team];
  for (const gameplay of ['SEQUENCE', 'ROLE_GUIDE']) {
    const { guide: record } = makeFixture({ gameplay });
    (record.page.gameplay.steps || record.page.gameplay.priorities)[0].enabledBy = ['perk:lithe'];
    fixtures.push(record);
  }
  for (const record of fixtures) {
    let index = emptyIndex();
    for (const perkId of collectPerkReferences({ guide: record, context: prepared })) {
      index = classifyPerkChange({ perkId, perk: prepared.perks.get(perkId), index, classification: 'PRESENTATION_ONLY', reason: 'Initial reference fixture.' });
      record.perkReviews.push({ perkId, mechanicsRevision: 1 });
    }
    assert.deepEqual(new Set(record.perkReviews.map(row => row.perkId)), collectPerkReferences({ guide: record, context: prepared }));
    assert.deepEqual(validatePerkReviews({ guide: record, context: { ...prepared, reviewIndex: index } }), []);
    record.perkReviews = [];
    assert.ok(validatePerkReviews({ guide: record, context: { ...prepared, reviewIndex: index } }).some(error => error.code === 'PERK_REVIEWS_INVALID'));
  }
});

test('optional prior review index comparison rejects removals and decreases without mutating data', () => {
  const { guide, context } = reviewedGuide();
  const previousReviewIndex = structuredClone(context.reviewIndex);
  for (const change of [index => delete index.perks.lithe, index => index.perks.lithe.mechanicsRevision = 1]) {
    const prior = structuredClone(previousReviewIndex);
    prior.perks.lithe.mechanicsRevision = 2;
    const current = structuredClone(prior);
    change(current);
    const input = { guide, context: { ...context, reviewIndex: current, previousReviewIndex: prior } };
    const before = structuredClone(input);
    assert.ok(validatePerkReviews(input).some(error => error.code === 'PERK_REVIEW_INDEX_INVALID'));
    assert.deepEqual(input, before);
  }
});

test('exact index IDs and fingerprints reject trailing newlines', () => {
  const { guide, context } = reviewedGuide();
  for (const change of [
    index => index.perks['lithe\n'] = structuredClone(index.perks.lithe),
    index => index.perks.lithe.acknowledgedFingerprint += '\n'
  ]) {
    const index = structuredClone(context.reviewIndex);
    change(index);
    assert.ok(validatePerkReviews({ guide, context: { ...context, reviewIndex: index } }).some(error => error.code === 'PERK_REVIEW_INDEX_INVALID'));
    assert.throws(() => classifyPerkChange({ perkId: 'lithe', perk: context.perks.get('lithe'), index, classification: 'PRESENTATION_ONLY', reason }), /index|fingerprint|canonical/i);
  }
  const invalidGuide = structuredClone(guide);
  invalidGuide.perkReviews[0].perkId += '\n';
  assert.ok(validatePerkReviews({ guide: invalidGuide, context }).some(error => error.code === 'PERK_REVIEWS_INVALID'));
});

// CLI fixture writes are isolated under OS temp and removed by test teardown.
function cliFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-perk-review-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.cpSync(path.join(rootDir, 'content/survivor'), path.join(directory, 'content/survivor'), { recursive: true });
  const { guide, context } = reviewedGuide();
  fs.writeFileSync(path.join(directory, indexPath), JSON.stringify(context.reviewIndex, null, 2));
  fs.writeFileSync(path.join(directory, 'content/survivor/meta-guides/X01.json'), JSON.stringify(guide));
  for (const strategyId of ['C01', 'G01']) {
    const { guide: dependent } = reviewedGuide(strategyId, [makePlan()]);
    fs.writeFileSync(path.join(directory, `content/survivor/meta-guides/${strategyId}.json`), JSON.stringify(dependent));
  }
  const { guide: unaffected } = makeFixture({ kind: 'FAMILY' });
  unaffected.strategyId = 'P00';
  unaffected.snapshotId = 'P00@10.2.0-r1';
  fs.writeFileSync(path.join(directory, 'content/survivor/meta-guides/P00.json'), JSON.stringify(unaffected));
  const git = args => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  git(['init', '-q']);
  git(['add', 'content']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Fixture baseline']);
  const run = (extra = []) => spawnSync(process.execPath, [cliPath, '--perk', 'lithe', '--classification', 'STRATEGY_SIGNIFICANT', '--reason', reason, ...extra], { cwd: directory, encoding: 'utf8' });
  return { directory, guide, context, git, run, file: path.join(directory, indexPath), perkFile: path.join(directory, 'content/survivor/perks/001-005/002-lithe.json') };
}

function treeBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? treeBytes(file) : [[file, fs.readFileSync(file).toString('base64')]];
  });
}

test('CLI updates only shared index and reports fingerprint revision reason and affected IDs', t => {
  const fixture = cliFixture(t);
  const perk = JSON.parse(fs.readFileSync(fixture.perkFile));
  perk.mechanics.activation.push('Changed activation fixture.');
  fs.writeFileSync(fixture.perkFile, JSON.stringify(perk));
  const before = treeBytes(path.join(fixture.directory, 'content')).filter(([file]) => file !== fixture.file);
  const result = fixture.run();
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.perkId, 'lithe');
  assert.equal(output.classification, 'STRATEGY_SIGNIFICANT');
  assert.equal(output.reason, reason);
  assert.equal(output.oldRevision, 1);
  assert.equal(output.newRevision, 2);
  assert.equal(output.oldFingerprint, fixture.context.reviewIndex.perks.lithe.acknowledgedFingerprint);
  assert.equal(output.newFingerprint, fingerprintPerkMechanics(perk));
  assert.deepEqual(output.affectedStrategyIds, ['C01', 'G01', 'X01']);
  assert.deepEqual(treeBytes(path.join(fixture.directory, 'content')).filter(([file]) => file !== fixture.file), before);
  const next = JSON.parse(fs.readFileSync(fixture.file));
  assert.equal(next.perks.lithe.mechanicsRevision, 2);
  for (const perkId of Object.keys(next.perks).filter(id => id !== 'lithe')) assert.deepEqual(next.perks[perkId], fixture.context.reviewIndex.perks[perkId]);
});

test('CLI presentation acknowledgment and initial seed keep revision one without guide writes', t => {
  const fixture = cliFixture(t);
  const perk = JSON.parse(fs.readFileSync(fixture.perkFile));
  perk.mechanics.currentEffect = perk.mechanics.currentEffect.replace('Whenever', 'When');
  fs.writeFileSync(fixture.perkFile, JSON.stringify(perk));
  const guideBefore = fs.readFileSync(path.join(fixture.directory, 'content/survivor/meta-guides/X01.json'), 'utf8');
  const result = spawnSync(process.execPath, [cliPath, '--perk', 'lithe', '--classification', 'PRESENTATION_ONLY', '--reason', 'Reviewed wording; behavior unchanged.'], { cwd: fixture.directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).newRevision, 1);
  assert.deepEqual(JSON.parse(result.stdout).affectedStrategyIds, []);
  assert.equal(fs.readFileSync(path.join(fixture.directory, 'content/survivor/meta-guides/X01.json'), 'utf8'), guideBefore);
  const seed = spawnSync(process.execPath, [cliPath, '--perk', 'botany-knowledge', '--classification', 'PRESENTATION_ONLY', '--reason', 'First reviewed use.'], { cwd: fixture.directory, encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
  assert.equal(JSON.parse(seed.stdout).oldRevision, null);
  assert.equal(JSON.parse(seed.stdout).newRevision, 1);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(fixture.file)).perks).length, Object.keys(fixture.context.reviewIndex.perks).length + 1);
});

test('CLI rejects missing invalid arguments unchanged candidates and malformed index without writes', t => {
  const fixture = cliFixture(t);
  const original = fs.readFileSync(fixture.file, 'utf8');
  const invalidArgs = [[], ['--perk', 'lithe'], ['--perk', 'lithe', '--classification', 'AUTO', '--reason', reason], ['--perk', 'Lithe', '--classification', 'PRESENTATION_ONLY', '--reason', reason], ['--perk', 'lithe', '--classification', 'PRESENTATION_ONLY', '--reason', '  '], ['--perk', 'lithe', '--classification', 'PRESENTATION_ONLY', '--reason', reason, '--unknown', 'value']];
  for (const args of invalidArgs) {
    const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: fixture.directory, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(fs.readFileSync(fixture.file, 'utf8'), original);
  }
  assert.equal(fixture.run().status, 1);
  assert.equal(fs.readFileSync(fixture.file, 'utf8'), original);
  fs.writeFileSync(fixture.file, '{');
  assert.equal(fixture.run().status, 1);
  assert.equal(fs.readFileSync(fixture.file, 'utf8'), '{');
});

test('CLI rejects removed or decreased entries against prior Git version before any write', t => {
  const fixture = cliFixture(t);
  const baseline = structuredClone(fixture.context.reviewIndex);
  baseline.perks.kindred.mechanicsRevision = 5;
  fs.writeFileSync(fixture.file, JSON.stringify(baseline));
  fixture.git(['add', indexPath]);
  fixture.git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Retained revision fixture']);
  const perk = JSON.parse(fs.readFileSync(fixture.perkFile));
  perk.mechanics.activation.push('Candidate fixture.');
  fs.writeFileSync(fixture.perkFile, JSON.stringify(perk));
  for (const change of [index => delete index.perks.kindred, index => index.perks.kindred.mechanicsRevision = 4, index => delete index.perks.lithe]) {
    const bad = structuredClone(baseline);
    change(bad);
    const bytes = JSON.stringify(bad);
    fs.writeFileSync(fixture.file, bytes);
    const result = fixture.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /retain|remov|decreas|monotonic/i);
    assert.equal(fs.readFileSync(fixture.file, 'utf8'), bytes);
  }
});

test('CLI first index creation works when prior Git version has no index', t => {
  const fixture = cliFixture(t);
  fixture.git(['rm', indexPath]);
  fixture.git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Pre-index fixture']);
  const result = fixture.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).newRevision, 1);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(fixture.file)).perks), ['lithe']);
});
