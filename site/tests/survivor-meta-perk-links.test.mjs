import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../..');

function loadCore() {
  const window = { DBD_DATA: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, 'site/assets/app-core.js'), 'utf8'),
    { window },
    { filename: path.join(root, 'site/assets/app-core.js') }
  );
  return window.DBD_CORE;
}

const perks = [
  {
    id: 'well-make-it', name: "We'll Make It", alternateName: 'WMI',
    source: 'All Survivors', tier: 'S', roles: ['Healing'], metaStatus: 'Core',
    summary: 'A strong rescue-healing option.', glossaryKeys: [], rank: 4
  },
  {
    id: 'kindred', name: 'Kindred', alternateName: 'Hook Information',
    source: 'All Survivors', tier: 'A', roles: ['Information'], metaStatus: 'Core',
    summary: 'Shares hook-state information.', glossaryKeys: [], rank: 10
  },
  {
    id: 'deja-vu', name: 'Déjà Vu', alternateName: 'Generator Radar',
    source: 'All Survivors', tier: 'A', roles: ['Objective'], metaStatus: 'Core',
    summary: 'Highlights generator clusters.', glossaryKeys: [], rank: 20
  },
  {
    id: 'will-to-live', name: 'Will to Live', alternateName: 'W2L',
    source: 'Bill Overbeck', tier: 'B', roles: ['Recovery'], metaStatus: 'Core',
    summary: 'Supports recovery in the dying state.', glossaryKeys: [], rank: 30
  },
  {
    id: 'well-make-it-plus', name: 'Well Make It Plus', alternateName: 'WMI+',
    source: 'Test Survivor', tier: 'D', roles: ['Healing'], metaStatus: 'Experimental',
    summary: 'A competing name match.', glossaryKeys: [], rank: 60
  },
  {
    id: 'deja-vu-plus', name: 'Déjà Vu Plus', alternateName: 'Generator Trends+',
    source: 'Test Survivor', tier: 'D', roles: ['Objective'], metaStatus: 'Experimental',
    summary: 'A competing name match.', glossaryKeys: [], rank: 80
  },
  {
    id: 'will-to-live-plus', name: 'Will to Live Plus', alternateName: 'Auxiliary Recovery',
    source: 'Test Survivor', tier: 'D', roles: ['Recovery'], metaStatus: 'Experimental',
    summary: 'A competing name match.', glossaryKeys: [], rank: 100
  },
  {
    id: 'archived-will-to-live', name: 'Will to Live Archive', alternateName: 'Historical Recovery',
    source: 'Historical Survivor', tier: 'C', roles: ['Recovery'], metaStatus: 'Historical',
    summary: 'A normal-search result for an unknown ID-shaped query.', glossaryKeys: [], rank: 110
  }
];

test('canonical perk IDs select the exact record despite competing name matches', () => {
  const { filterPerks } = loadCore();

  assert.deepEqual(filterPerks(perks, 'will-to-live', [], []).map((perk) => perk.id), ['will-to-live']);
  assert.deepEqual(filterPerks(perks, 'well-make-it', [], []).map((perk) => perk.id), ['well-make-it']);
  assert.deepEqual(filterPerks(perks, 'deja-vu', [], []).map((perk) => perk.id), ['deja-vu']);
});

test('ordinary perk search, filters, rank order, and unknown IDs retain existing semantics', () => {
  const { filterPerks } = loadCore();

  assert.deepEqual(filterPerks(perks, 'W2L', [], []).map((perk) => perk.id), ['will-to-live']);
  assert.deepEqual(filterPerks(perks, "We'll Make It", [], []).map((perk) => perk.id), ['well-make-it']);
  assert.deepEqual(filterPerks(perks, 'generator radar', [], []).map((perk) => perk.id), ['deja-vu']);
  assert.deepEqual(filterPerks(perks, '', [], []).map((perk) => perk.id), [
    'well-make-it', 'kindred', 'deja-vu', 'will-to-live',
    'well-make-it-plus', 'deja-vu-plus', 'will-to-live-plus', 'archived-will-to-live'
  ]);

  assert.deepEqual(filterPerks(perks, 'will-to-live', ['B'], []).map((perk) => perk.id), ['will-to-live']);
  assert.deepEqual(filterPerks(perks, 'will-to-live', ['S'], []).map((perk) => perk.id), []);
  assert.deepEqual(filterPerks(perks, 'well-make-it', [], ['Healing']).map((perk) => perk.id), ['well-make-it']);
  assert.deepEqual(filterPerks(perks, 'well-make-it', [], ['Information']).map((perk) => perk.id), []);

  assert.deepEqual(
    filterPerks(perks, 'will-to-live-archive', [], []).map((perk) => perk.id),
    ['archived-will-to-live']
  );
});
