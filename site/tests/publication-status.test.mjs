import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const generatorPath = path.resolve(import.meta.dirname, '../../scripts/build-survivor-data.mjs');

function writeRecord(root, { id, rank, publicationStatus }) {
  const batch = '001-005';
  const dir = path.join(root, 'content/survivor/perks', batch);
  fs.mkdirSync(dir, { recursive: true });
  const record = {
    schemaVersion: 2,
    batch,
    id,
    mechanics: {
      name: id,
      currentEffect: `${id} effect`,
      activation: [],
      source: 'Test',
      status: 'Live 10.2.0',
      patchNote: ''
    },
    editorial: {
      rank,
      tier: 'B',
      roles: ['Utility'],
      summary: `${id} summary`,
      metaStatus: 'Good',
      skillLevel: 'Low',
      soloQ: 3,
      swf: 3,
      unlockPriority: 'Medium',
      glossaryKeys: [],
      useCases: [],
      counters: [],
      synergies: [],
      pros: [],
      cons: [],
      analysis: ['test'],
      verdict: 'test',
      editorialStatus: 'complete',
      publicationStatus
    }
  };
  fs.writeFileSync(path.join(dir, `${String(rank).padStart(3, '0')}-${id}.json`), JSON.stringify(record));
}

test('validates the complete ranking but publishes only approved perk identities without renumbering them', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-publication-'));
  try {
    writeRecord(root, { id: 'one', rank: 1, publicationStatus: 'published' });
    writeRecord(root, { id: 'three', rank: 3, publicationStatus: 'published' });

    const mod = await import(`${pathToFileURL(generatorPath).href}?test=${Date.now()}`);
    const perks = mod.loadAndFlattenSurvivorPerks({ rootDir: root });

    assert.deepEqual(perks.map(perk => perk.id), ['one', 'three']);
    assert.deepEqual(perks.map(perk => perk.rank), [1, 3]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('build synchronizes visible runtime patch metadata from survivor JSON', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-meta-'));
  try {
    writeRecord(root, { id: 'one', rank: 1, publicationStatus: 'published' });
    const sourceFile = path.join(root, 'content/survivor/perks/001-005/001-one.json');
    const record = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    record.verifiedLivePatch = '10.2.0';
    record.verifiedDate = '2026-10-06';
    fs.writeFileSync(sourceFile, JSON.stringify(record));

    const assetDir = path.join(root, 'site/assets');
    fs.mkdirSync(assetDir, { recursive: true });
    const metaPath = path.join(assetDir, 'data-meta.js');
    fs.writeFileSync(metaPath, '(function(){window.DBD_DATA={"livePatch":"10.1.2a","verifiedDate":"2026-10-05","perks":[]};})();\n');

    const mod = await import(`${pathToFileURL(generatorPath).href}?meta=${Date.now()}`);
    mod.syncRuntimeMeta({ rootDir: root });
    const updated = fs.readFileSync(metaPath, 'utf8');
    assert.match(updated, /"livePatch":"10\.2\.0"/);
    assert.match(updated, /"verifiedDate":"2026-10-06"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
