import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderGuideBody } from '../../scripts/survivor-meta-guide-render.mjs';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { makeFixture, makePlan } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const context = loadGuideContext({ rootDir });
const guides = loadGuideRecords({ rootDir });
const css = fs.readFileSync(path.join(rootDir, 'site/assets/app.css'), 'utf8');
const rendererSource = fs.readFileSync(path.join(rootDir, 'scripts/survivor-meta-guide-render.mjs'), 'utf8');

function modelFor(strategyId) {
  return assembleGuidePage({ context, strategyId, guide: guides.get(strategyId), mode: 'preview' });
}

function longNameChoiceModel() {
  const { guide } = makeFixture({ gameplay: 'DECISIONS' });
  guide.page.loadout = { plans: [makePlan('COMPLETE')] };
  guide.page.loadout.plans[0].slots[3].choices.push({
    perkId: 'well-make-it',
    whyItsHere: 'Use the alternative recovery route.'
  });
  const model = assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' });
  const plan = model.page.loadout.plans[0];
  plan.slots[0].choices[0].name = 'Extremely Long Route-Saving Mobility Option That Must Wrap';
  plan.slots[3].choices[0].name = 'Long Primary Choice With A Readable Label';
  plan.slots[3].choices[1].name = 'Long Alternative Choice With A Readable Label';
  return model;
}

function details(html) {
  return [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].map(match => ({
    attributes: match[1],
    body: match[2]
  }));
}

test('complete loadouts expose a compact four-slot summary before disclosed mechanics', () => {
  const html = renderGuideBody(modelFor('X01'));
  assert.equal((html.match(/data-equipped-slot\b/g) || []).length, 4);
  assert.ok(html.indexOf('data-guide-summary') < html.indexOf('data-guide-perk-details'));
  assert.match(html, /Choose one/);
  assert.ok(html.indexOf('guide-gameplay') < html.indexOf('data-guide-perk-details'));
  assert.match(html, /<details\b[^>]*data-guide-perk-details[^>]*>/);
});

test('module and exceptional page shapes keep their authored compact equivalents', () => {
  for (const [strategyId, expectedSlots] of [['G02', 1], ['X02', 0], ['P00', 0], ['G06', 0]]) {
    const html = renderGuideBody(modelFor(strategyId));
    assert.equal((html.match(/data-equipped-slot\b/g) || []).length, expectedSlots, strategyId);
  }

  assert.match(renderGuideBody(modelFor('G02')), /Toolbox/);
  assert.match(renderGuideBody(modelFor('X02')), /Roles/);
  assert.match(renderGuideBody(modelFor('P00')), /Compare the approaches/);
  assert.match(renderGuideBody(modelFor('G06')), /Current successors/);
});

test('long names and competing choices remain present in the compact summary', () => {
  const html = renderGuideBody(longNameChoiceModel());
  const summaryEnd = html.indexOf('data-guide-perk-details');
  const summary = html.slice(0, summaryEnd);

  assert.match(summary, /Extremely Long Route-Saving Mobility Option That Must Wrap/);
  assert.match(summary, /Long Primary Choice With A Readable Label/);
  assert.match(summary, /Long Alternative Choice With A Readable Label/);
  assert.match(summary, /Choose one/);
  assert.equal((summary.match(/data-equipped-slot\b/g) || []).length, 4);
});

test('native disclosures are closed, meaningful, and target content', () => {
  const html = renderGuideBody(modelFor('X01'));
  const renderedDetails = details(html);
  assert.equal(renderedDetails.length, 3);

  for (const disclosure of renderedDetails) {
    assert.doesNotMatch(disclosure.attributes, /\bopen(?:\s|=|>)/);
    assert.match(disclosure.attributes, /\bid="[^"]+"/);
    const target = disclosure.body.match(/<summary\b[^>]*aria-controls="([^"]+)"[^>]*>/);
    assert.ok(target, 'disclosure summary has an explicit content target');
    assert.match(disclosure.body, new RegExp(`<[^>]+\\bid="${target[1]}"`));
    assert.match(disclosure.body, /<summary\b[^>]*>[^<]+<\/summary>/);
  }

  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.ok(links.length > 0);
  assert.ok(links.every(([, href, label]) => href && href !== '#' && label.replace(/<[^>]+>/g, '').trim()));
});

test('guide output keeps one heading path and no strategy-specific layout branches', () => {
  const html = renderGuideBody(modelFor('X01'));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /<aside\b[^>]*class="[^"]*guide-(?:rail|quick)/);
  assert.doesNotMatch(rendererSource, /['"](?:C01|G02|G06|P00|P02|X01|X02)['"]\s*===|strategyId\s*===/);
});

test('responsive guide rules provide wrapping, focus, safe-area space, and mobile-first breakpoints', () => {
  assert.match(css, /\.guide-slot[^{]*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.guide-slot[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /summary:focus-visible/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\s*\(min-width:\s*768px\)/);
  assert.match(css, /@media\s*\(min-width:\s*1024px\)/);
  assert.match(css, /@media\s*\(min-width:\s*1440px\)/);
  assert.doesNotMatch(css, /guide-(?:rail|quick-build)/);
});
