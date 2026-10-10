import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { renderArticleMarkdown } from '../../scripts/build-survivor-meta.mjs';
import { renderGuideBody } from '../../scripts/survivor-meta-guide-render.mjs';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { makeFixture } from './fixtures/survivor-meta-guide-fixture.mjs';
import { bindTask13Fixture } from './fixtures/survivor-meta-guide-task13-fixture.mjs';

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

test('Task 13 source-faithful player cues render through generic components', () => {
  for (const id of ['C02', 'C09', 'A03', 'G07']) {
    const input = bindTask13Fixture(context, id);
    const html = renderGuideBody(assembleGuidePage({ context: input.context, strategyId: id, guide: input.guide, mode: 'preview' }));
    assert.match(html, /data-guide-summary/);
    assert.match(html, /When to stop/);
    assert.match(html, /What it does/);
    assert.match(html, /Why it is here/);
    assert.match(html, /How to Play/);
  }
  const healer = bindTask13Fixture(context, 'A03');
  const healerHtml = renderGuideBody(assembleGuidePage({ context: healer.context, strategyId: 'A03', guide: healer.guide, mode: 'preview' }));
  assert.match(healerHtml, /Priority/);
  assert.match(healerHtml, /Handoff when/);
  assert.match(healerHtml, /Empathy/);
  const boon = bindTask13Fixture(context, 'G07');
  const boonHtml = renderGuideBody(assembleGuidePage({ context: boon.context, strategyId: 'G07', guide: boon.guide, mode: 'preview' }));
  assert.match(boonHtml, /Boon: Steadfast/);
  assert.match(boonHtml, /setup|zone|snuff/i);
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

test('hero renders all supported verdict copy with player-safe status language', () => {
  const base = modelFor('X01');
  const model = {
    ...base,
    page: {
      ...base.page,
      verdict: {
        ...base.page.verdict,
        bestFor: ['Players who can change jobs as the trial develops.'],
        notIdealFor: ['Players looking for one narrow specialist job.']
      }
    }
  };
  const html = renderGuideBody(model);
  const primary = html.slice(html.indexOf('<div data-guide-primary>'), html.indexOf('<details data-guide-research'));

  assert.match(primary, /Choose independent coverage/);
  assert.match(primary, /Still usable, but agree who covers each job/);
  assert.match(primary, /Best for/);
  assert.match(primary, /Players who can change jobs/);
  assert.match(primary, /Not ideal for/);
  assert.match(primary, /one narrow specialist job/);
  assert.doesNotMatch(primary, /\bEstablished\b|\bESTABLISHED\b|\bRANKED\b|\bPROVISIONAL\b/);
  assert.match(html.slice(html.indexOf('<details data-guide-research')), /ESTABLISHED/);
});

test('gameplay renders schema cue fields and ignores nonexistent handoff content', () => {
  const sequenceBase = fixtureModel('SEQUENCE');
  const sequence = {
    ...sequenceBase,
    page: {
      ...sequenceBase.page,
      gameplay: {
        ...sequenceBase.page.gameplay,
        activationWhen: ['The prepared tool is available for a worthwhile save.'],
        abortWhen: ['The save window is no longer reachable.'],
        afterSuccess: ['Return to the open objective.']
      }
    }
  };
  const roleBase = fixtureModel('ROLE_GUIDE');
  const role = {
    ...roleBase,
    page: {
      ...roleBase.page,
      gameplay: {
        ...roleBase.page.gameplay,
        handoffWhen: ['The assigned job is no longer available.'],
        handoff: ['This unsupported field must not be rendered.'],
        abortWhen: ['The assignment creates more risk than value.']
      }
    }
  };

  const sequenceHtml = renderGuideBody(sequence);
  assert.match(sequenceHtml, /Activate when/);
  assert.match(sequenceHtml, /prepared tool is available/);
  assert.match(sequenceHtml, /When to stop/);
  assert.match(sequenceHtml, /After success/);

  const roleHtml = renderGuideBody(role);
  assert.match(roleHtml, /Handoff when/);
  assert.match(roleHtml, /assigned job is no longer available/);
  assert.match(roleHtml, /When to stop/);
  assert.doesNotMatch(roleHtml, /unsupported field must not be rendered/);
});

test('family and legacy related links plus TEAM optional sections use shared renderers', () => {
  const related = [{
    destination: { route: '/survivor-meta/related-approach', name: 'Related approach' },
    relationship: 'SIMILAR',
    why: 'Shares the same objective.'
  }];
  for (const strategyId of ['P00', 'G06']) {
    const base = modelFor(strategyId);
    const html = renderGuideBody({ ...base, page: { ...base.page, related } });
    assert.match(html, /Related strategies/, strategyId);
    assert.match(html, /Related approach/, strategyId);
    assert.match(html, /Shares the same objective/, strategyId);
  }

  const base = modelFor('X02');
  const html = renderGuideBody({
    ...base,
    page: {
      ...base.page,
      related,
      mechanics: [{ id: 'team-callouts', explanation: 'Call the next assignment clearly.' }],
      strengths: ['Shares pressure across the team.'],
      difficulty: { learning: { label: 'HIGH', why: 'Several jobs must stay covered.' } }
    }
  });
  assert.match(html, /Key mechanics/);
  assert.match(html, /Call the next assignment clearly/);
  assert.match(html, /Strengths/);
  assert.match(html, /Shares pressure across the team/);
  assert.match(html, /Difficulty/);
  assert.match(html, /Several jobs must stay covered/);
  assert.match(html, /Related strategies/);
});

test('TEAM role option-only loadouts emit compact summaries', () => {
  const html = renderGuideBody(modelFor('X02'));
  const roleStart = html.indexOf('<article id="guide-role-objectives"');
  const roleEnd = html.indexOf('<article id="guide-role-reset"');
  assert.ok(roleStart >= 0 && roleEnd > roleStart);
  assert.match(html.slice(roleStart, roleEnd), /data-guide-summary/);
});

test('data-guide-primary contains hero and all player-facing content', () => {
  const html = renderGuideBody(modelFor('X01'));
  const primaryStart = html.indexOf('<div data-guide-primary>');
  const heroStart = html.indexOf('<header class="guide-hero">');
  const researchStart = html.indexOf('<details data-guide-research');
  assert.ok(primaryStart >= 0 && heroStart > primaryStart);
  assert.ok(researchStart > heroStart);
  assert.ok(html.slice(primaryStart, researchStart).includes('<h1>'));
  assert.ok(html.slice(researchStart).includes('ESTABLISHED'));
});
