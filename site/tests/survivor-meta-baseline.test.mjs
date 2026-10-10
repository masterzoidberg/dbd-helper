import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSurvivorMetaSource } from '../../scripts/build-survivor-meta.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const release = '10.2.0-r1';

function readPerks(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return readPerks(file);
    return entry.name.endsWith('.json') ? [JSON.parse(fs.readFileSync(file, 'utf8'))] : [];
  });
}

test('prepared canonical baseline has 176 perks and 57 complete research identities', () => {
  const perks = readPerks(path.join(rootDir, 'content/survivor/perks'));
  assert.equal(perks.length, 176);
  assert.equal(new Set(perks.map(perk => perk.id)).size, 176);

  const source = loadSurvivorMetaSource({ rootDir, release });
  assert.deepEqual([source.strategies.length, source.snapshots.length, source.manifest.length], [57, 57, 57]);
  const strategyIds = new Set(source.strategies.map(strategy => strategy.id));
  const snapshotIds = new Set(source.snapshots.map(snapshot => snapshot.snapshotId));
  assert.equal(strategyIds.size, 57);
  assert.equal(snapshotIds.size, 57);
  assert.equal(new Set(source.snapshots.map(snapshot => snapshot.strategyId)).size, 57);
  assert.equal(new Set(source.manifest.map(route => route.strategyId)).size, 57);
  assert.equal(new Set(source.manifest.map(route => route.slug)).size, 57);
  for (const snapshot of source.snapshots) {
    assert.ok(strategyIds.has(snapshot.strategyId), `${snapshot.snapshotId}: unresolved owner`);
  }
  for (const route of source.manifest) {
    assert.ok(strategyIds.has(route.strategyId), `${route.slug}: unresolved owner`);
    assert.ok(snapshotIds.has(route.snapshotIdUsed), `${route.slug}: unresolved snapshot`);
    assert.ok(fs.statSync(path.join(source.base, 'stage3b', route.articleFilename)).isFile());
    assert.ok(fs.statSync(path.join(rootDir, 'site', route.slug.replace(/^\/+|\/+$/g, ''), 'index.html')).isFile());
  }
});
