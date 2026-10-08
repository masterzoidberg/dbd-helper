import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(root, 'site/assets/survivor-meta.js');

function loadBrowser() {
  const window = {
    DBD_DATA: { survivorStrategies: [] },
    DBD_CORE: {
      normalize(value) { return String(value || '').toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim(); },
      escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },
      siteHref(value) { return value; }
    }
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), { window, document: undefined, URLSearchParams }, { filename: scriptPath });
  return window.DBD_SURVIVOR_META;
}

const solo = (rankingStatus, tier = null, power = null, rankingIndex = null) => ({
  environmentId: 'SURVIVOR_SOLO_Q', rankingStatus, tier, power, rankingIndex, confidence: 'MEDIUM'
});
const swf = (rankingStatus, tier = null, power = null, rankingIndex = null) => ({
  environmentId: 'SURVIVOR_COORDINATED_SWF', rankingStatus, tier, power, rankingIndex, confidence: 'MEDIUM'
});

function strategy(overrides = {}) {
  return {
    id: 'T01', name: 'Test Strategy', alternateNames: [], slug: 'test-strategy',
    structuralClassification: 'META', parentId: null, subtypeIds: [], relatedStrategyIds: [],
    generalStrategicDefinition: 'A generator and chase strategy', primaryRoles: ['Generator'], secondaryRoles: ['Chase'],
    conceptualMechanics: ['Skill Check'], generalTags: ['tempo'], currentStatus: 'ESTABLISHED', trend: 'STABLE',
    patchVolatility: 'LOW', prevalence: 'Common', metaStability: 80, stabilityLabel: 'STABLE', dependencyTypes: [],
    strategicDiagnostics: {}, environmentEvaluations: [solo('RANKED', 'A', 82, 82), swf('RANKED', 'A', 84, 84)],
    articlePath: 'survivor-meta/test-strategy/', ...overrides
  };
}

test('evaluationFor resolves the selected environment', () => {
  const api = loadBrowser();
  assert.equal(api.evaluationFor(strategy(), 'SURVIVOR_COORDINATED_SWF').power, 84);
});

test('search covers names definition classification roles mechanics and tags', () => {
  const api = loadBrowser();
  const s = strategy({ alternateNames: ['Runner Shell'], structuralClassification: 'META SUBTYPE' });
  for (const query of ['runner', 'generator', 'meta subtype', 'chase', 'skill check', 'tempo']) {
    assert.deepEqual(api.filterStrategies([s], { query, tiers: [], classifications: [], roles: [], environmentId: 'SURVIVOR_SOLO_Q' }).map(x => x.id), ['T01']);
  }
});

test('filters are AND across groups and OR within a group', () => {
  const api = loadBrowser();
  const items = [
    strategy({ id: 'A', structuralClassification: 'META', primaryRoles: ['Generator'], environmentEvaluations: [solo('RANKED','A',82,82), swf('RANKED','A',84,84)] }),
    strategy({ id: 'B', structuralClassification: 'META SUBTYPE', primaryRoles: ['Generator'], environmentEvaluations: [solo('RANKED','S',92,92), swf('RANKED','S',94,94)] }),
    strategy({ id: 'C', structuralClassification: 'META', primaryRoles: ['Chase'], environmentEvaluations: [solo('RANKED','A',81,81), swf('RANKED','A',83,83)] })
  ];
  const out = api.filterStrategies(items, { query: '', tiers: ['A','S'], classifications: ['META','META SUBTYPE'], roles: ['Generator'], environmentId: 'SURVIVOR_SOLO_Q' });
  assert.deepEqual(out.map(x => x.id).sort(), ['A','B']);
});

test('grouping preserves families legacy unranked and not-applicable semantics', () => {
  const api = loadBrowser();
  const items = [
    strategy({ id:'P00', name:'Family', structuralClassification:'PARENT STRATEGY FAMILY', environmentEvaluations:[solo('NOT_APPLICABLE'), swf('NOT_APPLICABLE')] }),
    strategy({ id:'G06', name:'Legacy', currentStatus:'LEGACY', environmentEvaluations:[solo('NOT_CURRENT'), swf('NOT_CURRENT')] }),
    strategy({ id:'C14', name:'Self Sustain', environmentEvaluations:[solo('RANKED','B',69,69), swf('UNRANKED')] }),
    strategy({ id:'X02', name:'SWF Flex', environmentEvaluations:[solo('NOT_APPLICABLE'), swf('RANKED','S',93,93)] }),
    strategy({ id:'T02', name:'Provisional', environmentEvaluations:[solo('PROVISIONAL','A',80,80), swf('PROVISIONAL','A',82,82)] })
  ];
  const swfGroups = api.groupStrategies(items, 'SURVIVOR_COORDINATED_SWF');
  assert.deepEqual(Array.from(swfGroups.families, x=>x.id), ['P00']);
  assert.deepEqual(Array.from(swfGroups.legacy, x=>x.id), ['G06']);
  assert.deepEqual(Array.from(swfGroups.unranked, x=>x.id), ['C14']);
  assert.equal(swfGroups.tiers.A[0].id, 'T02');
  assert.equal(api.evaluationFor(swfGroups.tiers.A[0], 'SURVIVOR_COORDINATED_SWF').rankingStatus, 'PROVISIONAL');

  const soloGroups = api.groupStrategies(items, 'SURVIVOR_SOLO_Q');
  assert.equal(Object.values(soloGroups.tiers).flat().some(x => x.id === 'X02'), false);
  assert.deepEqual(Array.from(soloGroups.notApplicable, x => x.id), ['X02']);
});

test('tier sorting uses power then stability then name', () => {
  const api = loadBrowser();
  const items = [
    strategy({ id:'B', name:'Beta', metaStability:90, environmentEvaluations:[solo('RANKED','A',80,80), swf('RANKED','A',80,80)] }),
    strategy({ id:'A', name:'Alpha', metaStability:90, environmentEvaluations:[solo('RANKED','A',80,80), swf('RANKED','A',80,80)] }),
    strategy({ id:'C', name:'Gamma', metaStability:70, environmentEvaluations:[solo('RANKED','A',82,82), swf('RANKED','A',82,82)] })
  ];
  assert.deepEqual(Array.from(api.sortCurrentTier(items, 'SURVIVOR_SOLO_Q'), x=>x.id), ['C','A','B']);
});

test('Survivor Meta is wired into navigation home search and presentation assets', () => {
  const core = fs.readFileSync(path.join(root, 'site/assets/app-core.js'), 'utf8');
  const pages = fs.readFileSync(path.join(root, 'site/assets/app-pages.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'site/assets/app.css'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
  assert.match(core, /survivor-meta/);
  assert.match(core, /Survivor Meta/);
  assert.match(pages, /data\.survivorStrategies/);
  assert.match(pages, /articlePath/);
  assert.match(home, /assets\/data-survivor-meta\.js/);
  assert.match(home, /Survivor Meta/);
  assert.match(css, /\.strategy-card/);
  assert.match(css, /\.environment-switch/);
  assert.match(css, /\.meta-summary-grid/);
});
