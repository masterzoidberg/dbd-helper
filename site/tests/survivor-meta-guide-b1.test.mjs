import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readGuide(strategyId) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'content/survivor/meta-guides', `${strategyId}.json`), 'utf8'));
}

test('B1 alternative rows bind to their selected module slot and related claims have exact receipts', () => {
  const c03 = readGuide('C03');
  const c05 = readGuide('C05');
  const c06 = readGuide('C06');
  const c07 = readGuide('C07');

  assert.deepEqual(c06.page.gameplay.rows.find(row => row.id === 'choose-resource-view').enabledBy, ['slot:chase-information-module#2']);
  assert.deepEqual(c07.page.gameplay.rows.find(row => row.id === 'choose-noise-layer').enabledBy, ['slot:stealth-avoidance-module#2']);
  for (const [guide, receipt] of [
    [c03, 'C03#Synergies, Hybrids, and Related Strategies'],
    [c05, 'C05#Synergies, Hybrids, and Related Strategies'],
    [c06, 'C06#Synergies, Hybrids, and Related Strategies']
  ]) {
    assert.ok(guide.sources.some(source => source.kind === 'PUBLICATION' && source.ref === receipt), receipt);
  }
});
