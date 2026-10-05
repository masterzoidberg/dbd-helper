import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const sourceDir = path.join(root, 'content/survivor/perks');
const generatorPath = path.join(root, 'scripts/build-survivor-data.mjs');
const legacyDataPath = path.join(root, 'site/assets/data.js');
const canonicalPath = path.join(root, 'site/data/survivor-perks-live-10.1.2a.json');

function sourceRecords() {
  return fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .flatMap(folder => fs.readdirSync(path.join(sourceDir, folder))
      .filter(name => name.endsWith('.json'))
      .sort()
      .map(name => JSON.parse(fs.readFileSync(path.join(sourceDir, folder, name), 'utf8'))));
}

function loadLegacyPerks() {
  const code = fs.readFileSync(legacyDataPath, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(code, context, { filename: legacyDataPath });
  return JSON.parse(JSON.stringify(context.window.DBD_DATA.perks));
}

function parseRuntimeModule(filePath) {
  const window = { DBD_DATA: { perks: [] } };
  vm.runInNewContext(fs.readFileSync(filePath, 'utf8'), { window }, { filename: filePath });
  return JSON.parse(JSON.stringify(window.DBD_DATA.perks));
}

test('survivor ranking source is stored as one JSON file per perk in five-perk folders', () => {
  assert.equal(fs.existsSync(sourceDir), true, 'content/survivor/perks should exist');
  const folders = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(folders, ['001-005', '006-010']);

  const records = sourceRecords();
  assert.equal(records.length, 10);
  assert.deepEqual(records.map(perk => perk.editorial.rank), [1,2,3,4,5,6,7,8,9,10]);
  for (const perk of records) {
    assert.equal(typeof perk.id, 'string');
    assert.equal(typeof perk.mechanics.currentEffect, 'string');
    assert.equal(typeof perk.editorial.verdict, 'string');
    assert.ok(['complete', 'patch-watch', 'needs-rerank'].includes(perk.editorial.editorialStatus));
    assert.equal('rank' in perk.mechanics, false, `${perk.id}: mechanics must not contain rank`);
    assert.equal('currentEffect' in perk.editorial, false, `${perk.id}: editorial must not duplicate mechanics`);
  }
});

test('generator keeps ranks contiguous and writes five browser modules', async () => {
  assert.equal(fs.existsSync(generatorPath), true, 'scripts/build-survivor-data.mjs should exist');
  const mod = await import(pathToFileURL(generatorPath));
  const generated = mod.loadAndFlattenSurvivorPerks({ rootDir: root });
  assert.equal(generated.length, 10);
  assert.deepEqual(generated.map(perk => perk.rank), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(generated.map(perk => perk.name), [
    'Will to Live','Resurgence','Unbreakable','Sprint Burst','Adrenaline',
    'Shoulder the Burden','Deliverance','Windows of Opportunity','Kindred','Déjà Vu'
  ]);

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-survivor-data-'));
  try {
    mod.writeRuntimeModules({ rootDir: root, outputDir });
    const moduleFiles = fs.readdirSync(outputDir).filter(name => /^data-perks-\d{2}\.js$/.test(name)).sort();
    assert.deepEqual(moduleFiles, ['data-perks-01.js','data-perks-02.js','data-perks-03.js','data-perks-04.js','data-perks-05.js']);
    const runtime = moduleFiles.flatMap(name => parseRuntimeModule(path.join(outputDir, name)));
    assert.deepEqual(runtime, generated);
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test('local migration recreates the pre-refactor top-ten records exactly', async t => {
  if (!fs.existsSync(legacyDataPath)) return t.skip('legacy monolith is not stored in the lean GitHub repository');
  const mod = await import(pathToFileURL(generatorPath));
  assert.deepEqual(mod.loadAndFlattenSurvivorPerks({ rootDir: root }), loadLegacyPerks());
});

test('local mechanics remain identical to the audited canonical dataset', t => {
  if (!fs.existsSync(canonicalPath)) return t.skip('full canonical mechanics archive is not stored in the lean GitHub repository');
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  const byName = new Map(canonical.perks.map(perk => [perk.name, perk]));

  for (const record of sourceRecords()) {
    const live = byName.get(record.mechanics.name) || canonical.perks.find(perk => perk.slug === record.id);
    assert.ok(live, `${record.id}: canonical mechanics record should exist`);
    assert.equal(record.mechanics.currentEffect, live.current_effect, `${record.id}: currentEffect drifted from canonical mechanics`);
  }
});

test('Pages workflow rebuilds and verifies survivor data before upload', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  assert.match(workflow, /node scripts\/build-survivor-data\.mjs/);
  assert.match(workflow, /node --test site\/tests\/\*\.test\.mjs/);
  const buildIndex = workflow.indexOf('node scripts/build-survivor-data.mjs');
  const uploadIndex = workflow.indexOf('actions/upload-pages-artifact');
  assert.ok(buildIndex >= 0 && buildIndex < uploadIndex, 'data build must happen before Pages artifact upload');
});
