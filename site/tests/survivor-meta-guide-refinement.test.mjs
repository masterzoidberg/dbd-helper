import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderGuideBody } from '../../scripts/survivor-meta-guide-render.mjs';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const context = loadGuideContext({ rootDir });
const guides = loadGuideRecords({ rootDir });
const css = fs.readFileSync(path.join(rootDir, 'site/assets/app.css'), 'utf8');

function modelFor(strategyId) {
  return assembleGuidePage({ context, strategyId, guide: guides.get(strategyId), mode: 'preview' });
}

function primary(html) {
  return html.slice(html.indexOf('<div data-guide-primary>'), html.indexOf('<details data-guide-research'));
}

function visibleText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

test('hero exposes a compact primary queue verdict without research labels or duplicate queue advice', () => {
  const html = renderGuideBody(modelFor('X01'));
  const hero = html.slice(html.indexOf('<header class="guide-hero">'), html.indexOf('</header>') + '</header>'.length);

  assert.match(hero, /guide-primary-queue[^>]*>Solo Q/);
  assert.match(hero, /guide-primary-tier[^>]*>S tier/);
  assert.match(hero, /guide-primary-verdict-label[^>]*>Recommended/);
  assert.match(hero, /guide-summary-copy/);
  assert.match(hero, /Main weakness:/);
  assert.doesNotMatch(hero, /Well-supported|Rising|Established|Stage 3|GENERALIST SHELL/);
  assert.doesNotMatch(hero, /Choose independent coverage|Still usable, but agree who covers each job/);
  assert.match(html, /Solo Q and SWF differences/);
  assert.match(html, /Use visible teammate activity and hook information/);
});

test('recommended build presents compact slots before canonical details and keeps reviewed choices explicit', () => {
  const html = renderGuideBody(modelFor('X01'));
  const buildStart = html.indexOf('<section class="guide-loadout">');
  const perkDetails = html.indexOf('<details data-guide-perk-details');
  const build = html.slice(buildStart, perkDetails);

  assert.match(build, /<h2>Recommended Build<\/h2>/);
  assert.match(build, /Research-backed build/);
  assert.equal((build.match(/data-equipped-slot\b/g) || []).length, 4);
  assert.match(build, /guide-slot-job[^>]*>Chase exit/);
  assert.match(build, /guide-slot-perk[^>]*>.*Lithe/s);
  assert.match(build, /What it does:/);
  assert.match(build, /A Rushed Vault grants a brief speed boost/);
  assert.match(build, /Why it.s here:/);
  assert.match(build, /Turn a usable vault into a route away/);
  assert.match(build, /Choose one:/);
  assert.match(build, /Kindred/);
  assert.match(build, /We.ll Make It/);
  assert.doesNotMatch(build, /Open flex|another context-appropriate/);
  assert.doesNotMatch(build, /Reviewed replacements/);
  assert.ok(buildStart < perkDetails);
});

test('canonical perk summaries remain separate from strategy-specific why-it-is-here copy', () => {
  const model = modelFor('X01');
  const willToLive = model.page.loadout.plans[0].slots[2].choices[0];
  const canonical = context.perks.get('will-to-live').mechanics;

  assert.equal(willToLive.plainEnglishSummary, canonical.plainEnglishSummary);
  assert.equal(willToLive.whyItsHere, 'Keep a personal answer to being picked up again after an unhook; it is insurance for that situation, not permission to take unnecessary hits.');
  assert.notEqual(willToLive.plainEnglishSummary, willToLive.whyItsHere);
});

test('decision gameplay uses one semantic situation cell and labels perk relationships as Enabled by', () => {
  const html = renderGuideBody(modelFor('X01'));
  const decisionStart = html.indexOf('<article class="guide-decision">');
  const decision = html.slice(decisionStart, html.indexOf('</article>', decisionStart) + '</article>'.length);
  const situation = 'Nobody needs an immediate rescue and you are free to repair.';

  assert.equal((decision.match(new RegExp(situation, 'g')) || []).length, 1);
  assert.match(decision, /guide-decision-cell[^>]*data-decision-field="situation"/);
  assert.match(decision, /data-decision-field="do-this"/);
  assert.match(decision, /data-decision-field="enabled-by"/);
  assert.match(decision, /Enabled by/);
  assert.doesNotMatch(decision, /Relevant when/);
});

test('How We Rated This is the final human-readable section and the frozen article is not rendered', () => {
  const html = renderGuideBody(modelFor('X01'));
  const researchStart = html.indexOf('<details data-guide-research');
  const researchEnd = html.indexOf('</details>', researchStart) + '</details>'.length;
  const research = html.slice(researchStart, researchEnd);

  assert.match(research, /How We Rated This/);
  assert.match(research, /Solo Q/);
  assert.match(research, /Power 90/);
  assert.match(research, /Meta Stability/);
  assert.match(research, /Why it scores well/);
  assert.match(research, /What holds it back/);
  assert.match(research, /Evaluated for/);
  assert.doesNotMatch(research, /<pre\b|strategicDiagnostics|buildImplementations|sourceReceipts|snapshotId/);
  assert.doesNotMatch(html, /Original Research Article|guide-original-article|guide-article-body/);
  assert.ok(html.trimEnd().endsWith('</details>'));
});

test('guide CSS keeps the mobile build compact and expands decisions into a desktop grid', () => {
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.guide-loadout-summary[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*?\.guide-decision[^}]*grid-template-columns:\s*repeat\(4/);
  assert.match(css, /\.guide-loadout-summary[^}]*min-width:\s*0/);
  assert.match(css, /\.guide-decision-cell[^}]*min-width:\s*0/);
});

test('guide CSS widens structured content while constraining readable prose', () => {
  assert.match(css, /\.meta-article-page:has\(\[data-guide-primary\]\)[^{]*\{[^}]*max-width:\s*none/);
  assert.match(css, /\[data-guide-primary\][^{]*\{[^}]*max-width:\s*1400px/);
  assert.match(css, /\.guide-summary-copy[^}]*max-width:\s*70ch/);
  assert.match(css, /\.guide-choice-detail p[^}]*max-width:\s*70ch/);
  assert.doesNotMatch(css, /guide-original-article|guide-article-body/);
});

test('build slot hierarchy makes the role and perk name primary and enables scan-friendly enablers', () => {
  const html = renderGuideBody(modelFor('X01'));
  const firstSlot = html.indexOf('<div data-equipped-slot');
  const nextSlot = html.indexOf('<div data-equipped-slot', firstSlot + 1);
  const slot = html.slice(firstSlot, nextSlot);
  assert.ok(slot.indexOf('guide-slot-job') < slot.indexOf('guide-slot-perk'));
  assert.ok(slot.indexOf('guide-slot-perk') < slot.indexOf('guide-slot-usage'));
  assert.match(html, /data-decision-field="enabled-by"[^>]*>[\s\S]*<span class="guide-decision-label">Enabled by<\/span>/);
  assert.match(css, /\.guide-decision-cell\[data-decision-field="enabled-by"\][^{]*\{/);
  assert.match(css, /\.guide-enabled-by[^{]*\{[^}]*border-left/);
});

test('player prose hides internal research vocabulary and strategy identifiers', () => {
  for (const strategyId of guides.keys()) {
    const text = visibleText(renderGuideBody(modelFor(strategyId)));
    assert.doesNotMatch(text, /Stage\s*[23](?:A|B)?|BuildImplementations?|snapshotId|manifest|\b(?:A|C|G|I|P|R|X)\d{2}\b/i, strategyId);
  }
});

test('slot Enabled by references resolve to canonical perk links', () => {
  const html = renderGuideBody(modelFor('C10'));
  const enabled = html.slice(html.indexOf('data-decision-field="enabled-by"'), html.indexOf('</article>', html.indexOf('data-decision-field="enabled-by"')));

  assert.match(enabled, /href="survivor\/perks\/\?q=unbreakable"[^>]*>Unbreakable<\/a>/);
  assert.match(enabled, /href="survivor\/perks\/\?q=plot-twist"[^>]*>Plot Twist<\/a>/);
  assert.doesNotMatch(enabled, /selected loadout option/);
});

test('standard pages without a loadout omit the optional Recommended Build section', () => {
  for (const strategyId of ['A06', 'P05']) {
    const html = renderGuideBody(modelFor(strategyId));
    assert.doesNotMatch(html, /Recommended Build|No required perks/, strategyId);
  }
});

test('widened guide layout constrains all long-form structured prose', () => {
  assert.match(css, /\.guide-plan > p[^\{]*\{[^}]*max-width:\s*70ch/);
  assert.match(css, /\.guide-opening p[^\{]*\{[^}]*max-width:\s*70ch/);
  assert.match(css, /\.guide-mechanics p[^\{]*\{[^}]*max-width:\s*70ch/);
  assert.match(css, /\.guide-abort li[^\{]*\{[^}]*max-width:\s*70ch/);
});
