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
const workflowPath = path.join(root, '.github/workflows/pages.yml');

const publishedIds = [
  'will-to-live',
  'resurgence',
  'unbreakable',
  'sprint-burst',
  'adrenaline',
  'shoulder-the-burden',
  'deliverance',
  'kindred',
  'deja-vu',
  'windows-of-opportunity'
];

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

function parseRuntimeModule(filePath) {
  const window = { DBD_DATA: { perks: [] } };
  vm.runInNewContext(fs.readFileSync(filePath, 'utf8'), { window }, { filename: filePath });
  return JSON.parse(JSON.stringify(window.DBD_DATA.perks));
}

test('v15 survivor source contains exactly the approved published perk identities at their global ranks', () => {
  assert.equal(fs.existsSync(sourceDir), true, 'content/survivor/perks should exist');
  const records = sourceRecords().sort((a, b) => a.editorial.rank - b.editorial.rank);

  assert.equal(records.length, 10);
  assert.equal(new Set(records.map(perk => perk.id)).size, 10);
  assert.deepEqual(records.map(perk => perk.id), publishedIds);
  assert.deepEqual(records.map(perk => perk.editorial.rank), [1, 4, 5, 6, 8, 11, 13, 15, 17, 50]);

  for (const perk of records) {
    assert.equal(perk.schemaVersion, 2);
    assert.equal(perk.verifiedLivePatch, '10.2.0');
    assert.equal(perk.editorial.publicationStatus, 'published');
    assert.equal(typeof perk.mechanics.currentEffect, 'string');
    assert.equal(typeof perk.editorial.verdict, 'string');
    assert.ok(['complete', 'patch-watch'].includes(perk.editorial.editorialStatus));
    assert.equal('rank' in perk.mechanics, false, `${perk.id}: mechanics must not contain rank`);
    assert.equal('currentEffect' in perk.editorial, false, `${perk.id}: editorial must not duplicate mechanics`);
  }
});

test('generator emits only the ten approved published perks at their global ranks', async () => {
  const mod = await import(`${pathToFileURL(generatorPath).href}?v15=${Date.now()}`);
  const generated = mod.loadAndFlattenSurvivorPerks({ rootDir: root });

  assert.equal(generated.length, 10);
  assert.deepEqual(generated.map(perk => perk.id), publishedIds);
  assert.deepEqual(generated.map(perk => perk.rank), [1, 4, 5, 6, 8, 11, 13, 15, 17, 50]);

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

test('Pages workflow rebuilds, verifies, and smoke-tests the v15 publication before upload', () => {
  if (!fs.existsSync(workflowPath)) return;
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /node scripts\/build-survivor-data\.mjs/);
  assert.match(workflow, /node --test site\/tests\/\*\.test\.mjs/);
  assert.match(workflow, /grep -q "10 published"/);
  assert.match(workflow, /grep -q "10\.2\.0"/);
  const buildIndex = workflow.indexOf('node scripts/build-survivor-data.mjs');
  const uploadIndex = workflow.indexOf('actions/upload-pages-artifact');
  assert.ok(buildIndex >= 0 && buildIndex < uploadIndex, 'data build must happen before Pages artifact upload');
});

test('visible site copy identifies 10.2.0 and the ten published Survivor perks', () => {
  const home = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
  const survivor = fs.readFileSync(path.join(root, 'site/survivor/perks/index.html'), 'utf8');
  const pages = fs.readFileSync(path.join(root, 'site/assets/app-pages.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'site/sw.js'), 'utf8');

  assert.match(home, /Live 10\.2\.0/);
  assert.match(home, /<strong>10<\/strong> Survivor perks published/i);
  assert.doesNotMatch(home, /10\.1\.2a|top fifteen|15[^\n<]*Survivor perks ranked/i);

  assert.match(survivor, /10\.2\.0/);
  assert.match(survivor, /10 published/i);
  assert.match(survivor, /176 ranked/i);
  assert.doesNotMatch(survivor, /10\.1\.2a|top fifteen|15 ranked/i);

  assert.match(pages, /published perks/);
  assert.doesNotMatch(pages, /ranked perks/);
  assert.match(sw, /dbd-field-guide-v4/);
  assert.match(sw, /assets\/mobile-filter\.css/);
  assert.match(sw, /assets\/mobile-filter\.js/);
});