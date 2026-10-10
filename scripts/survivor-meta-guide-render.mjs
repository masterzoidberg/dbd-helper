import { renderArticleMarkdown } from './build-survivor-meta.mjs';

const PROVENANCE_LABELS = {
  CANONICAL: 'Research loadout',
  EDITORIAL: 'Field Guide recommendation',
  EXAMPLE: 'Example'
};

const STATUS_LABELS = {
  ESTABLISHED: 'Well-supported',
  PROVISIONAL: 'Early guidance',
  UNRANKED: 'Evidence pending',
  NOT_APPLICABLE: 'Not a queue recommendation',
  NOT_CURRENT: 'Historical guidance',
  LEGACY: 'Historical guidance'
};

const RANKING_LABELS = {
  RANKED: 'Strong evidence',
  PROVISIONAL: 'Early evidence',
  UNRANKED: 'Evidence pending',
  NOT_APPLICABLE: 'Not a queue recommendation',
  NOT_CURRENT: 'Historical guidance'
};

const ENVIRONMENT_LABELS = {
  SOLO_Q: 'Solo Q',
  COORDINATED_SWF: 'Coordinated SWF',
  BOTH: 'Solo Q and Coordinated SWF'
};

const USAGE_LABELS = {
  CORE: 'Core',
  SUPPORT: 'Support',
  FLEX: 'Flex',
  REQUIRED: 'Required',
  RECOMMENDED: 'Recommended',
  OPTIONAL: 'Optional',
  NONE: 'None',
  ALTERNATIVE: 'Alternative',
  OUTDATED_TRAP: 'Outdated trap'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[character]);
}

function humanize(value) {
  return String(value ?? '').toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}

function titleizeId(value) {
  return humanize(String(value ?? '').replaceAll('-', ' '));
}

function internalId(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function href(value) {
  return escapeHtml(value);
}

function list(items, className = '') {
  const values = (items || []).filter(item => item !== null && item !== undefined && String(item).trim() !== '');
  if (!values.length) return '';
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
  return `<ul${classAttribute}>${values.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function paragraphs(items) {
  return (items || []).filter(item => item !== null && item !== undefined && String(item).trim() !== '')
    .map(item => `<p>${escapeHtml(item)}</p>`).join('');
}

function heading(level, label) {
  return `<h${level}>${escapeHtml(label)}</h${level}>`;
}

function provenanceLabel(provenance) {
  return PROVENANCE_LABELS[provenance] || 'Field Guide recommendation';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || (status ? 'Status described in research' : '');
}

function rankingLabel(status) {
  return RANKING_LABELS[status] || (status ? 'Evidence details in research' : '');
}

function environmentLabel(environment) {
  return ENVIRONMENT_LABELS[environment] || humanize(environment);
}

function usageLabel(usage) {
  return USAGE_LABELS[usage] || humanize(usage);
}

function routeHref(route) {
  if (!route) return '#';
  return href(`/${String(route).replace(/^\/+/, '')}`);
}

function modelParts(model) {
  const canonical = model.canonical || {};
  const research = model.research || {};
  const strategy = model.strategy || canonical.strategy || canonical;
  const snapshot = model.snapshot || research.snapshot || {};
  const page = model.page || model.editorial || model.guide?.page || null;
  return { canonical, research, strategy, snapshot, page };
}

function perkFacts(member, model) {
  if (!member) return null;
  const facts = member.perk || member;
  if (facts.name || facts.currentEffect || facts.query) return facts;
  const id = member.perkId;
  const record = model.perksById instanceof Map ? model.perksById.get(id) : null;
  const mechanics = record?.mechanics || record || {};
  return { ...member, ...mechanics, perkId: id, id, name: mechanics.name || id };
}

function perkHref(perk) {
  const id = perk?.perkId || perk?.id;
  return `survivor/perks/?q=${encodeURIComponent(id || '')}`;
}

function perkLink(member, model) {
  const perk = perkFacts(member, model);
  if (!perk) return '';
  return `<a href="${href(perkHref(perk))}">${escapeHtml(perk.name || perk.perkId)}</a>`;
}

function findSlot(page, value) {
  const separator = String(value || '').lastIndexOf('#');
  if (separator < 0) return null;
  const planId = String(value).slice(0, separator);
  const slotNumber = Number(String(value).slice(separator + 1));
  const loadouts = [page?.loadout, ...(page?.roles || []).map(role => role.loadout)];
  for (const loadout of loadouts) {
    for (const plan of loadout?.plans || []) {
      if ((plan.buildId || plan.id) !== planId) continue;
      const slot = (plan.slots || []).find(candidate => candidate.slot === slotNumber);
      if (slot) return { plan, slot };
    }
  }
  return null;
}

function resolvedEnablerLabel(enabler, page) {
  if (!enabler) return '';
  if (enabler.type === 'perk') return null;
  if (enabler.type === 'role') return `the ${enabler.label || titleizeId(enabler.id)} role`;
  if (enabler.type === 'item') return `the ${enabler.label || titleizeId(enabler.id)} item`;
  if (enabler.type === 'mechanic') {
    const mechanic = (page?.mechanics || []).find(item => item.id === enabler.id);
    return `the ${mechanic?.label || titleizeId(enabler.id)} mechanic`;
  }
  if (enabler.type === 'slot') {
    const match = findSlot(page, enabler.id);
    const slot = match?.slot;
    const choices = slot?.choices || enabler.choices || [];
    const names = choices.map(choice => choice.name || perkFacts(choice, {}).name).filter(Boolean);
    if (names.length) return `the ${names.join(' or ')} loadout option`;
    return `the selected loadout option${slot?.role ? ` for ${slot.role}` : ''}`;
  }
  return humanize(enabler.label || enabler.type);
}

function renderEnablers(enablers, model, page) {
  if (!enablers?.length) return '';
  const links = enablers.map(enabler => {
    if (enabler.type === 'perk') return perkLink(enabler.perk || enabler, model);
    const label = resolvedEnablerLabel(enabler, page);
    if (enabler.type === 'role') return `<a href="#guide-role-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    if (enabler.type === 'item') return `<a href="#guide-item-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    if (enabler.type === 'mechanic') return `<a href="#guide-mechanic-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    return escapeHtml(label);
  }).filter(Boolean);
  return links.length ? `<p class="guide-enabled-by"><strong>Relevant when:</strong> ${links.join(', ')}</p>` : '';
}

function renderHeroVerdict(model, parts) {
  const { canonical, strategy, snapshot, page } = parts;
  const title = strategy.name || canonical.name || 'Survivor guide';
  const summary = page?.summary || strategy.generalStrategicDefinition || '';
  const evaluations = canonical.evaluations || {
    soloQ: snapshot.solo && { ...snapshot.solo, environmentId: 'SURVIVOR_SOLO_Q' },
    coordinatedSwf: snapshot.swf && { ...snapshot.swf, environmentId: 'SURVIVOR_COORDINATED_SWF' }
  };
  const cards = [
    ['Solo Q', evaluations.soloQ],
    ['Coordinated SWF', evaluations.coordinatedSwf]
  ].filter(([, evaluation]) => evaluation);
  const status = canonical.currentStatus || snapshot.currentStatus;
  const trend = canonical.trend || snapshot.trend;
  const verdict = page?.verdict || {};
  const environmentAdvice = [
    verdict.soloQ ? `<p><strong>Solo Q:</strong> ${escapeHtml(verdict.soloQ)}</p>` : '',
    verdict.coordinatedSwf ? `<p><strong>Coordinated SWF:</strong> ${escapeHtml(verdict.coordinatedSwf)}</p>` : ''
  ].join('');
  const bestFor = verdict.bestFor?.length ? `<section>${heading(3, 'Best for')}${list(verdict.bestFor)}</section>` : '';
  const notIdealFor = verdict.notIdealFor?.length ? `<section>${heading(3, 'Not ideal for')}${list(verdict.notIdealFor)}</section>` : '';
  return `<header class="guide-hero">${heading(1, title)}${summary ? `<p class="guide-summary-copy">${escapeHtml(summary)}</p>` : ''}<p class="guide-status">${escapeHtml(statusLabel(status))}${trend ? ` · ${escapeHtml(humanize(trend))}` : ''}</p>${verdict.recommendation ? `<section class="guide-verdict">${heading(2, 'Verdict')}<p>${escapeHtml(verdict.recommendation)}</p>${environmentAdvice}${bestFor}${notIdealFor}${verdict.mainWeakness ? `<p><strong>Main weakness:</strong> ${escapeHtml(verdict.mainWeakness)}</p>` : ''}</section>` : ''}${cards.length ? `<section class="guide-environments">${cards.map(([label, evaluation]) => renderEvaluation(label, evaluation)).join('')}</section>` : ''}</header>`;
}

function renderEvaluation(label, evaluation) {
  const tier = evaluation.tier ? `<strong>${escapeHtml(evaluation.tier)} tier</strong>` : `<strong>${escapeHtml(rankingLabel(evaluation.rankingStatus))}</strong>`;
  const queueStatus = evaluation.rankingStatus && evaluation.rankingStatus !== 'RANKED'
    ? `<small>${escapeHtml(rankingLabel(evaluation.rankingStatus))}</small>` : '';
  return `<div class="guide-evaluation"><span>${escapeHtml(label)}</span>${tier}${queueStatus}</div>`;
}

function renderItem(item) {
  if (!item || item.status === 'NONE') return '';
  const itemId = item.id || item.name;
  return `<section class="guide-item" id="guide-item-${internalId(itemId)}">${heading(3, 'Item guidance')}<p><strong>${escapeHtml(item.name || titleizeId(item.id))}</strong> · ${escapeHtml(usageLabel(item.status))}</p>${item.why ? `<p>${escapeHtml(item.why)}</p>` : ''}</section>`;
}

function renderSlot(slot, model) {
  const choices = slot.choices || [];
  const choiceText = choices.length > 1
    ? `<span class="guide-choice-label">Choose one:</span> ${choices.map(choice => perkLink(choice, model)).join(' or ')}`
    : choices.length === 1 ? perkLink(choices[0], model) : 'Open flex';
  const detail = slot.role ? `<span class="guide-slot-role">${escapeHtml(slot.role)}</span>` : '';
  const usage = slot.usage ? `<span class="guide-slot-usage">${escapeHtml(usageLabel(slot.usage))}</span>` : '';
  return `<div data-equipped-slot class="guide-slot" role="group" aria-label="Slot ${escapeHtml(slot.slot)}"><strong>Slot ${escapeHtml(slot.slot)}</strong>${detail}${usage}<p>${choiceText}</p></div>`;
}

function renderReplacements(plan, model) {
  const replacements = (plan.slots || []).flatMap(slot => (slot.substitutes || []).map(substitute => ({ substitute, slot })));
  if (!replacements.length) return '';
  return `<section class="guide-replacements">${heading(4, 'Reviewed replacements')}<p class="guide-provenance">${escapeHtml(provenanceLabel('EDITORIAL'))}</p><ul>${replacements.map(({ substitute, slot }) => `<li>${perkLink(substitute, model)} for slot ${escapeHtml(slot.slot)}${substitute.why ? ` — ${escapeHtml(substitute.why)}` : ''}</li>`).join('')}</ul></section>`;
}

function renderPlan(plan, model, page) {
  const label = plan.label || `${provenanceLabel(plan.provenance)}${plan.environment ? ` · ${environmentLabel(plan.environment)}` : ''}`;
  const slots = plan.slots || [];
  const choices = slots.flatMap(slot => slot.choices || []);
  const headingText = label || provenanceLabel(plan.provenance);
  return `<article class="guide-plan">${heading(3, headingText)}<p class="guide-provenance">${escapeHtml(provenanceLabel(plan.provenance))}</p>${plan.why ? `<p>${escapeHtml(plan.why)}</p>` : ''}<div data-guide-summary class="guide-loadout-summary">${slots.length ? slots.map(slot => renderSlot(slot, model)).join('') : '<p>No required perks</p>'}${plan.flexSlotNote ? `<p class="guide-open-flex"><strong>Open flex:</strong> ${escapeHtml(plan.flexSlotNote)}</p>` : ''}${renderItem(plan.item)}${renderReplacements(plan, model)}</div></article>`;
}

function collectPerksFromLoadout(loadout, model) {
  const members = [];
  const loadouts = Array.isArray(loadout) ? loadout : [loadout];
  for (const current of loadouts) {
    for (const plan of current?.plans || []) {
      for (const slot of plan.slots || []) {
        for (const choice of slot.choices || []) members.push({ member: choice, purpose: choice.whyItsHere });
        for (const substitute of slot.substitutes || []) members.push({ member: substitute, purpose: substitute.why || substitute.whyItsHere });
      }
    }
    for (const option of current?.options || []) members.push({ member: option, purpose: option.whyItsHere });
  }
  return members;
}

function renderPerkDetails(loadout, model) {
  const members = collectPerksFromLoadout(loadout, model);
  const unique = new Map();
  for (const entry of members) {
    const facts = perkFacts(entry.member, model);
    const id = facts?.perkId || facts?.id;
    if (!id) continue;
    if (!unique.has(id)) unique.set(id, { facts, purposes: [] });
    if (entry.purpose) unique.get(id).purposes.push(entry.purpose);
  }
  if (!unique.size) return '';
  return `<details data-guide-perk-details id="guide-perk-details" class="guide-perk-details"><summary aria-controls="guide-perk-details-content">Perk details</summary><div id="guide-perk-details-content">${[...unique.values()].map(({ facts, purposes }) => `<article class="guide-perk-detail">${heading(3, facts.name || facts.perkId)}<p><a href="${href(perkHref(facts))}">${escapeHtml(facts.name || facts.perkId)}</a></p>${facts.currentEffect ? `<p><strong>What it does:</strong> ${escapeHtml(facts.currentEffect)}</p>` : ''}${facts.activation?.length ? `<p><strong>Activation:</strong></p>${list(facts.activation)}` : ''}${facts.owner ? `<p><strong>Owner:</strong> ${escapeHtml(facts.owner)}</p>` : ''}${purposes.length ? `<p><strong>Why it is here:</strong> ${escapeHtml([...new Set(purposes)].join(' '))}</p>` : ''}</article>`).join('')}</div></details>`;
}

function renderLoadout(loadout, model, page) {
  if (!loadout) return '';
  const plans = loadout.plans || [];
  const options = loadout.options || [];
  const item = loadout.item;
  const summary = plans.length ? plans.map(plan => renderPlan(plan, model, page)).join('') : options.length ? `<section data-guide-summary class="guide-loadout-summary">${heading(3, 'Perk guidance')}<p class="guide-provenance">${escapeHtml(provenanceLabel('EDITORIAL'))}</p><ul>${options.map(option => `<li>${perkLink(option, model)}${option.usage ? ` · ${escapeHtml(usageLabel(option.usage))}` : ''}</li>`).join('')}</ul></section>` : '<div data-guide-summary class="guide-loadout-summary"><p>No required perks</p></div>';
  const optionDetails = options.length && plans.length ? `<section data-guide-summary class="guide-loadout-options">${heading(3, 'Additional perk guidance')}<p class="guide-provenance">${escapeHtml(provenanceLabel('EDITORIAL'))}</p><ul>${options.map(option => `<li>${perkLink(option, model)}${option.whyItsHere ? ` — ${escapeHtml(option.whyItsHere)}` : ''}</li>`).join('')}</ul></section>` : '';
  return `<section class="guide-loadout">${heading(2, 'Loadout')}${summary}${item && item.status !== 'NONE' ? renderItem(item) : ''}${optionDetails}</section>`;
}

function renderRoleLoadout(role, model, page) {
  if (!role.loadout) return '<p>No required perks</p>';
  const plans = role.loadout.plans || [];
  const options = role.loadout.options || [];
  const body = plans.length ? plans.map(plan => renderPlan(plan, model, page)).join('') : options.length ? `<div data-guide-summary class="guide-role-loadout"><p class="guide-provenance">${escapeHtml(provenanceLabel('EDITORIAL'))}</p><ul>${options.map(option => `<li>${perkLink(option, model)}${option.whyItsHere ? ` — ${escapeHtml(option.whyItsHere)}` : ''}</li>`).join('')}</ul></div>` : '<p>No required perks</p>';
  return `${body}${role.loadout.item && role.loadout.item.status !== 'NONE' ? renderItem(role.loadout.item) : ''}`;
}

function renderPagePerkDetails(page, model) {
  const loadouts = [page?.loadout, ...(page?.roles || []).map(role => role.loadout)].filter(Boolean);
  return renderPerkDetails(loadouts, model);
}

function renderMechanics(page) {
  if (!page?.mechanics?.length) return '';
  return `<section class="guide-mechanics">${heading(2, 'Key mechanics')}${page.mechanics.map(mechanic => `<article id="guide-mechanic-${internalId(mechanic.id)}">${heading(3, titleizeId(mechanic.id))}${mechanic.explanation ? `<p>${escapeHtml(mechanic.explanation)}</p>` : ''}</article>`).join('')}</section>`;
}

function renderDecision(row, model, page, label = 'Decision') {
  const situation = row.situation || row.label || label;
  const priority = label !== 'Decision' && row.situation ? `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(row.situation)}</p>` : '';
  return `<article class="guide-decision">${heading(3, situation)}${priority}${row.situation && label === 'Decision' ? `<p><strong>Situation:</strong> ${escapeHtml(row.situation)}</p>` : ''}${row.action ? `<p><strong>Action:</strong> ${escapeHtml(row.action)}</p>` : ''}${row.instructions ? list(row.instructions) : ''}${row.why ? `<p><strong>Why:</strong> ${escapeHtml(row.why)}</p>` : ''}${renderEnablers(row.enabledByResolved, model, page)}</article>`;
}

function renderGameplay(page, model) {
  const gameplay = page?.gameplay;
  if (!gameplay) return '';
  const renderCue = (items, label, className, render = list) => {
    const values = Array.isArray(items) ? items : items ? [items] : [];
    return values.length ? `<section class="guide-${className}">${heading(3, label)}${render(values)}</section>` : '';
  };
  const opening = renderCue(gameplay.opening, 'Opening', 'opening', paragraphs);
  const activation = renderCue(gameplay.type === 'SEQUENCE' ? gameplay.activationWhen : null, 'Activate when', 'activation');
  const handoff = renderCue(gameplay.type === 'ROLE_GUIDE' ? gameplay.handoffWhen : null, 'Handoff when', 'handoff');
  const abort = renderCue(gameplay.abortWhen, 'When to stop', 'abort');
  const afterSuccess = renderCue(gameplay.type === 'SEQUENCE' ? gameplay.afterSuccess : null, 'After success', 'after-success');
  let body = '';
  if (gameplay.type === 'DECISIONS') body = (gameplay.rows || []).map(row => renderDecision(row, model, page)).join('');
  if (gameplay.type === 'SEQUENCE') {
    body = (gameplay.steps || []).map((step, index) => `<article class="guide-sequence-step">${heading(3, `Step ${index + 1}: ${step.label || 'Untitled step'}`)}${list(step.instructions)}${renderEnablers(step.enabledByResolved, model, page)}</article>`).join('');
  }
  if (gameplay.type === 'ROLE_GUIDE') {
    body = (gameplay.priorities || []).map(row => renderDecision(row, model, page, 'Priority')).join('');
    if (gameplay.assignment) body = `<p><strong>Assignment:</strong> ${escapeHtml(gameplay.assignment)}</p>${body}`;
  }
  return `<section class="guide-gameplay">${heading(2, 'How to Play')}${opening}${activation}${handoff}${body}${abort}${afterSuccess}</section>`;
}

function renderEnvironments(page) {
  if (!page?.environments) return '';
  const entries = [['soloQ', 'Solo Q'], ['coordinatedSwf', 'Coordinated SWF']].filter(([key]) => page.environments[key]?.length);
  if (!entries.length) return '';
  return `<section class="guide-environment-advice">${heading(2, 'Solo Q and SWF differences')}${entries.map(([key, label]) => `<article>${heading(3, label)}${paragraphs(page.environments[key])}</article>`).join('')}</section>`;
}

function renderOptionalList(page, key, label) {
  if (!page?.[key]?.length) return '';
  return `<section class="guide-${key}">${heading(2, label)}${list(page[key])}</section>`;
}

function renderOptionalValue(page, key, label) {
  if (page?.[key] === undefined || page?.[key] === null || page?.[key] === '') return '';
  const value = Array.isArray(page[key]) ? paragraphs(page[key]) : typeof page[key] === 'object'
    ? `<dl>${Object.entries(page[key]).map(([name, entry]) => `<dt>${escapeHtml(humanize(name))}</dt><dd>${entry && typeof entry === 'object' ? `${entry.label ? `<strong>${escapeHtml(humanize(entry.label))}</strong>` : ''}${entry.why ? ` — ${escapeHtml(entry.why)}` : ''}` : escapeHtml(entry)}</dd>`).join('')}</dl>`
    : `<p>${escapeHtml(page[key])}</p>`;
  return `<section class="guide-${key}">${heading(2, label)}${value}</section>`;
}

function renderRelated(page) {
  if (!page?.related?.length) return '';
  return `<section class="guide-related">${heading(2, 'Related strategies')}<ul>${page.related.map(item => {
    const destination = item.destination || {};
    const relationships = item.relationships || (item.relationship ? [{ relationship: item.relationship, why: item.why }] : []);
    const relationshipText = relationships.map(value => humanize(value.relationship)).filter(Boolean).join(', ');
    return `<li><a href="${routeHref(destination.route)}">${escapeHtml(destination.name || 'Related strategy')}</a>${relationshipText ? ` · ${escapeHtml(relationshipText)}` : ''}${item.why ? ` — ${escapeHtml(item.why)}` : ''}${relationships.slice(1).map(value => value.why ? ` — ${escapeHtml(value.why)}` : '').join('')}</li>`;
  }).join('')}</ul></section>`;
}

function renderFamily(page) {
  const comparisons = page.comparisons || [];
  return `<section class="guide-family">${heading(2, 'Compare the approaches')}<p>No required perks.</p>${comparisons.map(item => {
    const destination = item.destination || {};
    return `<article>${heading(3, destination.name || 'Approach')}<p><a href="${routeHref(destination.route)}">Open this approach</a></p>${item.chooseWhen ? `<p><strong>Choose when:</strong> ${escapeHtml(item.chooseWhen)}</p>` : ''}${item.tradeoff ? `<p><strong>Trade-off:</strong> ${escapeHtml(item.tradeoff)}</p>` : ''}</article>`;
  }).join('')}</section>${renderRelated(page)}`;
}

function renderLegacy(page, model) {
  const historical = page.historicalPerks || [];
  return `<section class="guide-legacy">${heading(2, 'What it was')}${list(page.whatItWas)}${page.whyNotCurrent?.length ? `${heading(2, 'Why it is not current')}${list(page.whyNotCurrent)}` : ''}${page.successors?.length ? `<section>${heading(2, 'Current successors')}<ul>${page.successors.map(item => `<li><a href="${routeHref(item.destination?.route)}">${escapeHtml(item.destination?.name || 'Current successor')}</a>${item.why ? ` — ${escapeHtml(item.why)}` : ''}</li>`).join('')}</ul></section>` : ''}${historical.length ? `<section>${heading(2, 'Historical perk context')}<p>Current links show current mechanics; they do not recreate historical mechanics.</p>${historical.map(item => `<article>${heading(3, item.perk?.name || titleizeId(item.perkId))}<p>${perkLink(item.perk || item, model)}</p>${item.historicalUse ? `<p>${escapeHtml(item.historicalUse)}</p>` : ''}${item.perk?.currentEffect ? `<p><strong>Current effect:</strong> ${escapeHtml(item.perk.currentEffect)}</p>` : ''}</article>`).join('')}</section>` : ''}</section>${renderRelated(page)}`;
}

function renderTeam(page, model) {
  const roles = page.roles || [];
  const teamBuilds = page.canonicalTeamBuilds || [];
  return `<section class="guide-team">${heading(2, 'Roles')}<p>No single four-perk loadout is implied; assign the role that covers the team's current gap.</p>${roles.map(role => `<article id="guide-role-${internalId(role.id)}">${heading(3, role.title || titleizeId(role.id))}${role.assignment ? `<p>${escapeHtml(role.assignment)}</p>` : ''}${renderRoleLoadout(role, model, page)}</article>`).join('')}${teamBuilds.length ? `<section>${heading(2, 'Team framework')}${teamBuilds.map(build => `<article>${build.teamComposition ? list(build.teamComposition) : ''}</article>`).join('')}</section>` : ''}</section>`;
}

function renderResearchValue(value) {
  if (value === undefined || value === null) return '';
  return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderResearch(model, parts) {
  const { canonical, research, snapshot } = parts;
  const article = research.article || model.articleMarkdown || '';
  const sections = [
    ['Identity', { strategy: research.strategy || canonical.strategy, manifest: research.manifest }],
    ['Patch baseline and binding', { patchBaseline: snapshot.patchBaseline, researchDate: snapshot.researchDate, researchRevision: snapshot.researchRevision, snapshotId: snapshot.snapshotId, strategyId: snapshot.strategyId }],
    ['Ranking status, Power, and Index', { currentStatus: snapshot.currentStatus, solo: snapshot.solo, swf: snapshot.swf }],
    ['Trends and prevalence', { trend: snapshot.trend, prevalence: snapshot.prevalence, materialChange: snapshot.materialChange, changeSummary: snapshot.changeSummary }],
    ['Confidence and evidence', { confidence: snapshot.confidence, evidenceNotes: snapshot.evidenceNotes, evidenceRefs: snapshot.evidenceRefs }],
    ['Stability components', { metaStability: snapshot.metaStability, stabilityLabel: snapshot.stabilityLabel, stabilityComponents: snapshot.stabilityComponents }],
    ['Diagnostics and dependencies', { strategicDiagnostics: snapshot.strategicDiagnostics, dependencyTypes: snapshot.dependencyTypes }],
    ['Volatility, flags, and Recheck conditions', { patchVolatility: snapshot.patchVolatility, researchFlags: snapshot.researchFlags, recheckConditions: snapshot.recheckConditions }],
    ['Ecosystems', { perkEcosystem: snapshot.perkEcosystem, itemEcosystem: snapshot.itemEcosystem }],
    ['Builds', { buildImplementations: snapshot.buildImplementations, canonicalBuilds: canonical.builds, teamBuilds: canonical.teamBuilds }],
    ['Relationships', canonical.relationships],
    ['Source receipts', research.sourceReceipts || research.sources]
  ];
  const structured = sections.filter(([, value]) => value && Object.values(value).some(item => item !== undefined));
  return `<details data-guide-research id="guide-research" class="guide-research"><summary aria-controls="guide-research-content">How We Rated This</summary><div id="guide-research-content">${structured.map(([label, value]) => `<section class="guide-research-section">${heading(3, label)}${renderResearchValue(value)}</section>`).join('')}<section class="guide-research-section">${heading(3, 'Complete canonical research record')}${renderResearchValue(research)}</section>${article ? `<section class="guide-original-article">${heading(3, 'Original Research Article')}<div class="guide-article-body">${renderArticleMarkdown(article, { headingOffset: 1 })}</div></section>` : ''}</div></details>`;
}

function renderStandard(page, model) {
  return `${renderLoadout(page.loadout || { plans: [], options: [] }, model, page)}${renderMechanics(page)}${renderGameplay(page, model)}${renderPagePerkDetails(page, model)}${renderEnvironments(page)}${renderOptionalList(page, 'strengths', 'Strengths')}${renderOptionalList(page, 'weaknesses', 'Weaknesses')}${renderOptionalList(page, 'killerCounterplay', 'Killer counterplay')}${renderOptionalList(page, 'commonMistakes', 'Common mistakes')}${renderOptionalValue(page, 'difficulty', 'Difficulty')}${renderOptionalValue(page, 'fit', 'Best fit')}${renderRelated(page)}`;
}

export function renderGuideBody(model) {
  if (!model || typeof model !== 'object') throw new TypeError('renderGuideBody requires a PageModel');
  const parts = modelParts(model);
  const { page } = parts;
  const pageKind = model.kind || page?.kind;
  const primary = page
    ? pageKind === 'FAMILY' ? renderFamily(page)
      : pageKind === 'LEGACY' ? renderLegacy(page, model)
        : pageKind === 'TEAM' ? `${renderTeam(page, model)}${renderMechanics(page)}${renderGameplay(page, model)}${renderPagePerkDetails(page, model)}${renderEnvironments(page)}${renderOptionalList(page, 'strengths', 'Strengths')}${renderOptionalList(page, 'weaknesses', 'Weaknesses')}${renderOptionalList(page, 'killerCounterplay', 'Killer counterplay')}${renderOptionalList(page, 'commonMistakes', 'Common mistakes')}${renderOptionalValue(page, 'difficulty', 'Difficulty')}${renderRelated(page)}`
          : renderStandard(page, model)
    : `<p>This page contains research but no reviewed player-facing guide.</p>`;
  return `<div data-guide-primary>${renderHeroVerdict(model, parts)}${primary}</div>${renderResearch(model, parts)}`;
}

