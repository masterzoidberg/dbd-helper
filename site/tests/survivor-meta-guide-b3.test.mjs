import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readGuide(strategyId) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'content/survivor/meta-guides', `${strategyId}.json`), 'utf8'));
}

test('B3 preserves item enablers and names Blood Pact healing target and proximity', () => {
  const c15 = readGuide('C15');
  const g03 = readGuide('G03');

  assert.deepEqual(g03.page.gameplay.rows.find(row => row.id === 'spend-optional-item').enabledBy, ['item:toolbox']);
  const bloodPactChoice = c15.page.loadout.plans[0].slots[0].choices.find(choice => choice.perkId === 'blood-pact');
  assert.match(bloodPactChoice.whyItsHere, /heal(?:ing)? the Obsession/i);
  assert.match(bloodPactChoice.whyItsHere, /within 16 metres/i);
});
