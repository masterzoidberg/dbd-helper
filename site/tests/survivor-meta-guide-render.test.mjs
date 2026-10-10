import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { renderArticleMarkdown } from '../../scripts/build-survivor-meta.mjs';
import { renderGuideBody } from '../../scripts/survivor-meta-guide-render.mjs';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { makeFixture } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const context = loadGuideContext({ rootDir });
const guides = loadGuideRecords({ rootDir });

function modelFor(strategyId) {
  return assembleGuidePage({ context, strategyId, guide: guides.get(strategyId), mode: 'preview' });
}

function fixtureModel(gameplay) {
  const { guide } = makeFixture({ gameplay });
  return assembleGuidePage({ context, strategyId: 'X01', guide, mode: 'preview' });
}

test('article headings offset without changing paragraphs or order', () => {
  const article = '# Article title\n\nKeep < and & and "quotes".\n\n## A section\n\n- First\n- Second';
  const defaultHtml = renderArticleMarkdown(`---\nstrategyId: X01\n---\n${article}`);
  const offsetHtml = renderArticleMarkdown(`---\nstrategyId: X01\n---\n${article}`, { headingOffset: 1 });

  assert.match(defaultHtml, /^<h1>Article title<\/h1>/);
  assert.match(offsetHtml, /^<h2>Article title<\/h2>/);
  assert.match(offsetHtml, /<h3>A section<\/h3>/);
  assert.match(offsetHtml, /Keep &lt; and &amp; and &quot;quotes&quot;\./);
  assert.ok(offsetHtml.indexOf('First') < offsetHtml.indexOf('Second'));
});

test('X01 renders shared player landmarks, mechanics, choice semantics, and closed research', () => {
  const html = renderGuideBody(modelFor('X01'));
  assert.match(html, /Choose one/);
  assert.match(html, /What it does/);
  assert.match(html, /Why it is here/);
  assert.match(html, /<details\b[^>]*data-guide-research[^>]*>/);
  assert.match(html, /Original Research Article/);
  assert.doesNotMatch(html.match(/<details\b[^>]*data-guide-research[^>]*>/)[0], /\bopen(?:\s|=|>)/);
  assert.match(html, /data-guide-primary/);
  assert.match(html, /data-guide-summary/);
  assert.equal((html.match(/data-equipped-slot\b/g) || []).length, 4);
  assert.ok(html.indexOf('data-guide-summary') < html.indexOf('data-guide-perk-details'));
  assert.match(html, /href="\/survivor\/perks\/\?q=lithe"/);
  const primaryStart = html.indexOf('<div data-guide-primary>');
  const primaryEnd = html.indexOf('<details data-guide-research');
  const primary = primaryStart >= 0 && primaryEnd > primaryStart ? html.slice(primaryStart, primaryEnd) : html;
  assert.doesNotMatch(primary, /Stage 3A|Stage 3B|BuildImplementation|GENERALIST SHELL|X01@/);
  assert.match(html, /&lt;|&amp;|&quot;/);
});

test('renderer covers every approved page kind and gameplay type without strategy branches', () => {
  const cases = [
    ['X01', 'STANDARD', 'DECISIONS'],
    ['P02', 'STANDARD', 'SEQUENCE'],
    ['G02', 'STANDARD', 'DECISIONS'],
    ['P00', 'FAMILY', undefined],
    ['G06', 'LEGACY', undefined],
    ['X02', 'TEAM', 'DECISIONS']
  ];
  for (const [strategyId, kind, gameplay] of [...cases, ['ROLE_GUIDE_FIXTURE', 'STANDARD', 'ROLE_GUIDE']]) {
    const model = strategyId === 'ROLE_GUIDE_FIXTURE' ? fixtureModel('ROLE_GUIDE') : modelFor(strategyId);
    const html = renderGuideBody(model);
    assert.match(html, /<h1>/, strategyId);
    assert.match(html, new RegExp(kind === 'FAMILY' ? 'Compare' : kind === 'LEGACY' ? 'What it was' : kind === 'TEAM' ? 'Roles' : 'How to Play'), strategyId);
    if (gameplay) assert.match(html, new RegExp(gameplay === 'DECISIONS' ? 'Situation' : gameplay === 'SEQUENCE' ? 'Step' : 'Priority'), strategyId);
    assert.match(html, /How We Rated This/, strategyId);
    assert.match(html, /Original Research Article/, strategyId);
  }
});

test('unsupported optional content is omitted and modules do not invent slots', () => {
  const html = renderGuideBody(modelFor('G02'));
  assert.match(html, /Built to Last/);
  assert.match(html, /Toolbox/);
  assert.equal((html.match(/data-equipped-slot\b/g) || []).length, 1);

  const standard = renderGuideBody(modelFor('X01'));
  assert.doesNotMatch(standard, /<h2>Item<\/h2>|<h2>Killer counterplay<\/h2>|<h2>Strengths<\/h2>|<h2>Difficulty<\/h2>/);

  const family = renderGuideBody(modelFor('P00'));
  assert.doesNotMatch(family, /data-equipped-slot\b/);
  const familyPrimary = family.slice(0, family.indexOf('<details data-guide-research'));
  assert.doesNotMatch(familyPrimary, /Recommended build|Power|Difficulty/);
  assert.match(family, /No required perks/);
});

test('research appendix retains structured fields, receipts, and full frozen article', () => {
  const model = modelFor('X01');
  const html = renderGuideBody(model);
  const articleHtml = renderArticleMarkdown(model.research.article, { headingOffset: 1 });
  assert.match(html, /Patch baseline/);
  assert.match(html, /Ranking status/);
  assert.match(html, /Power/);
  assert.match(html, /Stability components/);
  assert.match(html, /Diagnostics/);
  assert.match(html, /Dependencies/);
  assert.match(html, /Volatility/);
  assert.match(html, /Recheck conditions/);
  assert.match(html, /Ecosystems/);
  assert.match(html, /Builds/);
  assert.match(html, /Relationships/);
  assert.match(html, /Source receipts/);
  assert.match(html, /Original Research Article/);
  assert.ok(html.includes(articleHtml));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});
