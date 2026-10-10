import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../..');
const release = path.join(root, 'content/survivor/meta/10.2.0-r1');
const strategies = JSON.parse(fs.readFileSync(path.join(release, 'stage3a/strategies.json'), 'utf8'));
const snapshots = JSON.parse(fs.readFileSync(path.join(release, 'stage3a/strategy-snapshots.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(release, 'stage3b/strategy-pages-manifest.json'), 'utf8'));
const strategyById = new Map(strategies.map(x => [x.id, x]));
const snapshotById = new Map(snapshots.map(x => [x.strategyId, x]));

function runtimeStrategies() {
  const window = { DBD_DATA: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site/assets/data-survivor-meta.js'), 'utf8'), { window });
  return JSON.parse(JSON.stringify(window.DBD_DATA.survivorStrategies));
}

function evaluation(strategy, environmentId) {
  return strategy.environmentEvaluations.find(x => x.environmentId === environmentId);
}

test('canonical Survivor Meta source is a complete 57 strategy snapshot publication set', () => {
  assert.equal(strategies.length, 57);
  assert.equal(snapshots.length, 57);
  assert.equal(manifest.length, 57);
  assert.equal(new Set(strategies.map(x => x.id)).size, 57);
  assert.equal(new Set(snapshots.map(x => x.snapshotId)).size, 57);
  assert.equal(new Set(manifest.map(x => x.slug)).size, 57);
  for (const strategy of strategies) {
    assert.equal(strategy.side, 'SURVIVOR');
    assert.ok(snapshotById.has(strategy.id), `${strategy.id}: missing snapshot`);
    if (strategy.parentId) assert.ok(strategyById.has(strategy.parentId), `${strategy.id}: missing parent`);
    for (const child of strategy.subtypeIds || []) assert.ok(strategyById.has(child), `${strategy.id}: missing subtype ${child}`);
  }
});

test('canonical exceptional ranking states remain null rather than fabricated', () => {
  const c14 = snapshotById.get('C14').swf;
  assert.deepEqual(c14, { rankingStatus:'UNRANKED', power:null, tier:null, rankingIndex:null, confidence:'LOW' });
  const x02 = snapshotById.get('X02').solo;
  assert.equal(x02.rankingStatus, 'NOT_APPLICABLE');
  assert.equal(x02.power, null);
  assert.equal(x02.tier, null);
  assert.equal(x02.rankingIndex, null);
  assert.equal(strategies.filter(x => x.structuralClassification === 'PARENT STRATEGY FAMILY').length, 2);
  assert.equal(snapshots.filter(x => x.currentStatus === 'LEGACY').length, 2);
});

test('runtime Survivor Meta data contains all strategies with fixed environment ordering', () => {
  const runtime = runtimeStrategies();
  assert.equal(runtime.length, 57);
  assert.equal(new Set(runtime.map(x => x.id)).size, 57);
  const c01 = runtime.find(x => x.id === 'C01');
  assert.deepEqual(c01.environmentEvaluations.map(x => x.environmentId), ['SURVIVOR_SOLO_Q','SURVIVOR_COORDINATED_SWF']);
  assert.equal(evaluation(c01, 'SURVIVOR_SOLO_Q').power, 79);
  assert.equal(evaluation(c01, 'SURVIVOR_COORDINATED_SWF').power, 86);
  const c14 = runtime.find(x => x.id === 'C14');
  assert.equal(evaluation(c14, 'SURVIVOR_COORDINATED_SWF').rankingStatus, 'UNRANKED');
  const x02 = runtime.find(x => x.id === 'X02');
  assert.equal(evaluation(x02, 'SURVIVOR_SOLO_Q').rankingStatus, 'NOT_APPLICABLE');
});

test('all 57 canonical manifest routes have generated non-empty article pages', () => {
  const routes = manifest.map(item => item.slug.replace(/^\/+|\/+$/g, ''));
  assert.equal(new Set(routes).size, 57);
  for (const route of routes) {
    const page = path.join(root, 'site', route, 'index.html');
    assert.ok(fs.existsSync(page), `${route}: generated page missing`);
    const html = fs.readFileSync(page, 'utf8');
    assert.match(html, /meta-article-body/);
    assert.doesNotMatch(html, /^---$/m, `${route}: front matter leaked into HTML`);
  }
});

test('Pages workflow verifies Survivor Meta before deployment and service worker caches only the Meta shell', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'site/sw.js'), 'utf8');
  assert.match(workflow, /python3 scripts\/import-survivor-meta\.py/);
  assert.match(workflow, /node scripts\/build-survivor-meta\.mjs/);
  assert.match(workflow, /python3 -m unittest discover -s scripts\/tests/);
  assert.match(workflow, /node scripts\/verify-generated-artifacts\.mjs/);
  assert.match(workflow, /survivor-meta\//);
  assert.match(sw, /dbd-field-guide-v7/);
  assert.match(sw, /assets\/data-survivor-meta\.js/);
  assert.match(sw, /assets\/survivor-meta\.js/);
  assert.match(sw, /survivor-meta\//);
  assert.doesNotMatch(sw, /general-chase-looping/);
});
