const PROVENANCE_LABELS = {
  CANONICAL: 'Research-backed build',
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

function playerCopy(value, model) {
  const strategyNames = new Map();
  const strategyIds = new Set();
  const addStrategyName = candidate => {
    if (candidate?.strategyId) strategyIds.add(candidate.strategyId);
    if (candidate?.strategyId && candidate.name) strategyNames.set(candidate.strategyId, candidate.name);
  };
  const addStrategyId = value => {
    if (typeof value === 'string' && value.trim()) strategyIds.add(value);
  };
  const collectStrategyIds = value => {
    if (Array.isArray(value)) {
      value.forEach(collectStrategyIds);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, candidate] of Object.entries(value)) {
      if (/strategyids?$/i.test(key)) {
        if (Array.isArray(candidate)) candidate.forEach(addStrategyId);
        else addStrategyId(candidate);
      }
      collectStrategyIds(candidate);
    }
  };
  addStrategyId(model?.strategyId);
  addStrategyId(model?.canonical?.id);
  addStrategyId(model?.canonical?.strategy?.id);
  addStrategyId(model?.research?.strategy?.id);
  for (const strategyId of model?.sourceStrategyIds || []) addStrategyId(strategyId);
  addStrategyName(model?.canonical);
  addStrategyName(model?.canonical?.strategy);
  for (const relationship of Object.values(model?.canonical?.relationships || {})) {
    for (const candidate of Array.isArray(relationship) ? relationship : [relationship]) addStrategyName(candidate);
  }
  collectStrategyIds(model?.canonical);
  collectStrategyIds(model?.research);

  const currentStrategyId = model?.strategyId;
  const strategyPattern = [...strategyIds]
    .sort((left, right) => right.length - left.length)
    .map(strategyId => strategyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const strategyReference = strategyPattern
    ? new RegExp(`(?<![A-Za-z0-9_-])(?:${strategyPattern})(?![A-Za-z0-9_-])`, 'g')
    : null;
  return String(value ?? '')
    .replace(/\bStage\s*3[AB]\b/gi, 'the research record')
    .replace(/\bStage\s*2\b/gi, 'reviewed')
    .replace(/\bBuildImplementations?\b/gi, 'fixed four-perk build')
    .replace(strategyReference || /(?!)/g, strategyId => (
      Object.is(strategyId, currentStrategyId) ? 'this strategy' : strategyNames.get(strategyId) || 'the related strategy'
    ));
}

function sanitizePlayerMarkup(markup, model) {
  return markup.replace(/>([^<]*)</g, (_, text) => `>${playerCopy(text, model)}<`);
}

function humanize(value) {
  return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
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
  return href(String(route).replace(/^\/+/, ''));
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
  const links = renderEnablerLinks(enablers, model, page);
  return links.length ? `<p class="guide-enabled-by"><strong>Enabled by:</strong> ${links.join(', ')}</p>` : '';
}

function renderEnablerLinks(enablers, model, page) {
  return (enablers || []).map(enabler => {
    if (enabler.type === 'perk') return perkLink(enabler.perk || enabler, model);
    if (enabler.type === 'slot') {
      const choices = enabler.choices || findSlot(page, enabler.id)?.slot?.choices || [];
      const choiceLinks = choices.map(choice => perkLink(choice, model)).filter(Boolean);
      if (choiceLinks.length) return choiceLinks.join(' <span class="guide-choice-separator">or</span> ');
    }
    const label = resolvedEnablerLabel(enabler, page);
    if (enabler.type === 'role') return `<a href="#guide-role-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    if (enabler.type === 'item') return `<a href="#guide-item-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    if (enabler.type === 'mechanic') return `<a href="#guide-mechanic-${internalId(enabler.id)}">${escapeHtml(label)}</a>`;
    return escapeHtml(label);
  }).filter(Boolean);
}

function renderHeroVerdict(model, parts) {
  const { canonical, strategy, snapshot, page } = parts;
  const title = strategy.name || canonical.name || 'Survivor guide';
  const verdict = page?.verdict || {};
  const summary = page?.summary || verdict.recommendation || strategy.generalStrategicDefinition || '';
  const evaluations = canonical.evaluations || {
    soloQ: snapshot.solo && { ...snapshot.solo, environmentId: 'SURVIVOR_SOLO_Q' },
    coordinatedSwf: snapshot.swf && { ...snapshot.swf, environmentId: 'SURVIVOR_COORDINATED_SWF' }
  };
  const primaryKey = page?.kind === 'TEAM' || !evaluations.soloQ ? 'coordinatedSwf' : 'soloQ';
  const secondaryKey = primaryKey === 'soloQ' ? 'coordinatedSwf' : 'soloQ';
  const hasEvaluation = evaluation => evaluation && (evaluation.tier || evaluation.rankingStatus || evaluation.power !== undefined || evaluation.confidence);
  const primaryEvaluation = hasEvaluation(evaluations[primaryKey]) ? evaluations[primaryKey] : null;
  const secondaryEvaluation = hasEvaluation(evaluations[secondaryKey]) ? evaluations[secondaryKey] : null;
  const primaryLabel = primaryKey === 'soloQ' ? 'Solo Q' : 'Coordinated SWF';
  const secondaryLabel = secondaryKey === 'soloQ' ? 'Solo Q' : 'Coordinated SWF';
  const primaryTier = primaryEvaluation?.tier ? `${primaryEvaluation.tier} tier` : rankingLabel(primaryEvaluation?.rankingStatus);
  const primaryVerdict = verdict.recommendation && primaryEvaluation?.tier ? 'Recommended' : rankingLabel(primaryEvaluation?.rankingStatus);
  const primary = primaryEvaluation ? `<div class="guide-primary-verdict"><span class="guide-primary-queue">${escapeHtml(primaryLabel)}</span><strong class="guide-primary-tier">${escapeHtml(primaryTier)}</strong><span class="guide-primary-verdict-label">${escapeHtml(primaryVerdict)}</span></div>` : '';
  const secondary = secondaryEvaluation ? `<div class="guide-secondary-verdict"><span>${escapeHtml(secondaryLabel)}</span><strong>${escapeHtml(secondaryEvaluation.tier ? `${secondaryEvaluation.tier} tier` : rankingLabel(secondaryEvaluation.rankingStatus))}</strong></div>` : '';
  const bestFor = verdict.bestFor?.length ? `<section>${heading(3, 'Best for')}${list(verdict.bestFor)}</section>` : '';
  const notIdealFor = verdict.notIdealFor?.length ? `<section>${heading(3, 'Not ideal for')}${list(verdict.notIdealFor)}</section>` : '';
  return `<header class="guide-hero">${heading(1, title)}${summary ? `<p class="guide-summary-copy">${escapeHtml(summary)}</p>` : ''}${primary || secondary ? `<section class="guide-verdict">${primary}${secondary ? `<div class="guide-secondary-queue">${secondary}</div>` : ''}</section>` : ''}${verdict.mainWeakness ? `<p class="guide-main-weakness"><strong>Main weakness:</strong> ${escapeHtml(verdict.mainWeakness)}</p>` : ''}${bestFor}${notIdealFor}</header>`;
}

function renderEvaluation(label, evaluation) {
  const tier = evaluation.tier ? `<strong>${escapeHtml(evaluation.tier)} tier</strong>` : `<strong>${escapeHtml(rankingLabel(evaluation.rankingStatus))}</strong>`;
  const queueStatus = evaluation.rankingStatus && evaluation.rankingStatus !== 'RANKED'
    ? `<small>${escapeHtml(rankingLabel(evaluation.rankingStatus))}</small>` : '';
  return `<div class="guide-evaluation"><span>${escapeHtml(label)}</span>${tier}${queueStatus}</div>`;
}

function renderItem(item, scope) {
  if (!item || item.status === 'NONE') return '';
  if (typeof item === 'string') item = { name: item };
  const itemId = item.id || item.name;
  const anchor = scope ? `${internalId(scope)}-${internalId(itemId)}` : internalId(itemId);
  const addOns = item.addOns?.length ? `<ul>${item.addOns.map(addOn => `<li><strong>${escapeHtml(addOn.name)}</strong>${addOn.why ? ` — ${escapeHtml(addOn.why)}` : ''}</li>`).join('')}</ul>` : '';
  return `<section class="guide-item" id="guide-item-${anchor}">${heading(3, 'Item guidance')}<p><strong>${escapeHtml(item.name || titleizeId(item.id))}</strong>${item.status ? ` · ${escapeHtml(usageLabel(item.status))}` : ''}</p>${item.why ? `<p>${escapeHtml(item.why)}</p>` : ''}${addOns}</section>`;
}

function renderSlot(slot, model) {
  const choices = slot.choices || [];
  const choiceText = choices.length > 1
    ? `<span class="guide-choice-label">Choose one:</span> <span class="guide-choice-options">${choices.map(choice => perkLink(choice, model)).join(' <span class="guide-choice-separator">or</span> ')}</span>`
    : choices.length === 1 ? perkLink(choices[0], model) : 'No reviewed choice';
  const detail = slot.role ? `<span class="guide-slot-job">${escapeHtml(slot.role)}</span>` : '';
  const usage = slot.usage ? `<span class="guide-slot-usage">${escapeHtml(usageLabel(slot.usage))}</span>` : '';
  return `<div data-equipped-slot class="guide-slot" role="group" aria-label="Slot ${escapeHtml(slot.slot)}"><span class="guide-slot-number">Slot ${escapeHtml(slot.slot)}</span>${detail}<div class="guide-slot-perk">${choiceText}</div>${usage}</div>`;
}

function canonicalEffectSummary(facts) {
  return facts?.plainEnglishSummary || facts?.currentEffect || '';
}

function renderSlotDetails(slot, model) {
  const choices = slot.choices || [];
  if (!choices.length) return '';
  return `<article class="guide-slot-detail"><h4>${escapeHtml(slot.role || `Slot ${slot.slot}`)}</h4>${choices.map(choice => {
    const facts = perkFacts(choice, model);
    const choiceHeading = choices.length > 1 ? `<p class="guide-choice-detail-name"><strong>Choice:</strong> ${perkLink(choice, model)}</p>` : '';
    const effect = canonicalEffectSummary(facts);
    return `<div class="guide-choice-detail">${choiceHeading}${choices.length === 1 ? `<p class="guide-choice-detail-name">${perkLink(choice, model)}</p>` : ''}${effect ? `<p><strong>What it does:</strong> ${escapeHtml(effect)}</p>` : ''}${choice.whyItsHere ? `<p><strong>Why it's here:</strong> ${escapeHtml(choice.whyItsHere)}</p>` : ''}</div>`;
  }).join('')}</article>`;
}

function renderReplacements(plan, model) {
  const replacements = (plan.slots || []).flatMap(slot => (slot.substitutes || []).map(substitute => ({ substitute, slot })));
  if (!replacements.length) return '';
  return `<section class="guide-replacements">${heading(4, 'Reviewed replacements')}<p class="guide-provenance">${escapeHtml(provenanceLabel('EDITORIAL'))}</p><ul>${replacements.map(({ substitute, slot }) => `<li>${perkLink(substitute, model)} for slot ${escapeHtml(slot.slot)}${substitute.why ? ` — ${escapeHtml(substitute.why)}` : ''}</li>`).join('')}</ul></section>`;
}

function renderPlan(plan, model, page, showPlanLabel = false) {
  const label = plan.label || (plan.environment ? `${environmentLabel(plan.environment)} build` : '');
  const slots = plan.slots || [];
  const headingText = showPlanLabel && label ? heading(3, label) : '';
  const item = renderItem(plan.item, plan.buildId || plan.id);
  const replacements = renderReplacements(plan, model);
  if (!slots.length && !item && !replacements) return '';
  return `<article class="guide-plan">${headingText}${plan.why ? `<p>${escapeHtml(plan.why)}</p>` : ''}${slots.length ? `<div data-guide-summary class="guide-loadout-summary">${slots.map(slot => renderSlot(slot, model)).join('')}</div><div class="guide-loadout-explanations">${slots.map(slot => renderSlotDetails(slot, model)).join('')}</div>` : ''}${item}${replacements}</article>`;
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
  if (!plans.length && !options.length && (!item || item.status === 'NONE')) return '';
  const provenance = plans[0]?.provenance || (options.length ? 'EDITORIAL' : null);
  const renderedPlans = plans.map(plan => renderPlan(plan, model, page, plans.length > 1)).filter(Boolean);
  const itemMarkup = item && item.status !== 'NONE' ? renderItem(item) : '';
  const summary = renderedPlans.length ? renderedPlans.join('') : options.length ? `<section data-guide-summary class="guide-loadout-summary"><ul>${options.map(option => `<li>${perkLink(option, model)}${option.usage ? ` · ${escapeHtml(usageLabel(option.usage))}` : ''}${option.whyItsHere ? ` — ${escapeHtml(option.whyItsHere)}` : ''}</li>`).join('')}</ul></section>` : '';
  const optionDetails = options.length && renderedPlans.length ? `<section data-guide-summary class="guide-loadout-options">${heading(3, 'Additional perk guidance')}<ul>${options.map(option => `<li>${perkLink(option, model)}${option.whyItsHere ? ` — ${escapeHtml(option.whyItsHere)}` : ''}</li>`).join('')}</ul></section>` : '';
  if (!summary && !itemMarkup) return '';
  return `<section class="guide-loadout">${heading(2, 'Recommended Build')}${provenance ? `<p class="guide-provenance">${escapeHtml(provenanceLabel(provenance))}</p>` : ''}${summary}${itemMarkup}${optionDetails}</section>`;
}

function renderRoleLoadout(role, model, page) {
  if (!role.loadout) return '';
  const plans = role.loadout.plans || [];
  const options = role.loadout.options || [];
  const renderedPlans = plans.map(plan => renderPlan(plan, model, page, plans.length > 1)).filter(Boolean);
  const item = role.loadout.item && role.loadout.item.status !== 'NONE' ? renderItem(role.loadout.item) : '';
  const body = renderedPlans.length ? renderedPlans.join('') : options.length ? `<div data-guide-summary class="guide-role-loadout"><ul>${options.map(option => `<li>${perkLink(option, model)}${option.whyItsHere ? ` — ${option.whyItsHere}` : ''}</li>`).join('')}</ul></div>` : '';
  return body || item ? `${body}${item}` : '';
}

function renderPagePerkDetails(page, model) {
  const loadouts = [page?.loadout, ...(page?.roles || []).map(role => role.loadout)].filter(Boolean);
  return renderPerkDetails(loadouts, model);
}

function renderMechanics(page) {
  if (!page?.mechanics?.length) return '';
  return `<section class="guide-mechanics">${heading(2, 'Key mechanics')}${page.mechanics.map(mechanic => `<article id="guide-mechanic-${internalId(mechanic.id)}">${heading(3, titleizeId(mechanic.id))}${mechanic.explanation ? `<p>${escapeHtml(mechanic.explanation)}</p>` : ''}</article>`).join('')}</section>`;
}

function decisionCell(field, label, value) {
  if (!value) return '';
  const content = Array.isArray(value) ? list(value) : `<p>${escapeHtml(value)}</p>`;
  return `<div class="guide-decision-cell" data-decision-field="${escapeHtml(field)}"><span class="guide-decision-label">${escapeHtml(label)}</span>${content}</div>`;
}

function renderDecision(row, model, page, label = 'Decision') {
  const situation = row.situation || row.label || label;
  const situationField = label === 'Decision' ? 'situation' : 'priority';
  const situationLabel = label === 'Decision' ? 'Situation' : label;
  const enabledBy = renderEnablerLinks(row.enabledByResolved, model, page);
  return `<article class="guide-decision">${decisionCell(situationField, situationLabel, situation)}${decisionCell('do-this', 'Do this', row.action || row.instructions)}${decisionCell('why', 'Why', row.why)}${enabledBy.length ? `<div class="guide-decision-cell" data-decision-field="enabled-by"><span class="guide-decision-label">Enabled by</span><p>${enabledBy.join(', ')}</p></div>` : ''}</article>`;
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
  const entries = [['soloQ', 'Solo Q'], ['coordinatedSwf', 'Coordinated SWF']].map(([key, label]) => {
    const authored = page?.environments?.[key];
    const fallback = page?.verdict?.[key];
    const values = authored?.length ? authored : fallback ? [fallback] : [];
    return [key, label, values];
  }).filter(([, , values]) => values.length);
  if (!entries.length) return '';
  return `<section class="guide-environment-advice">${heading(2, 'Solo Q and SWF differences')}${entries.map(([, label, values]) => `<article>${heading(3, label)}${paragraphs(values)}</article>`).join('')}</section>`;
}

function renderOptionalList(page, key, label, excluded = []) {
  const values = (page?.[key] || []).filter(value => !excluded.includes(value));
  if (!values.length) return '';
  return `<section class="guide-${key}">${heading(2, label)}${list(values)}</section>`;
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

function renderRankingEvaluation(label, evaluation) {
  if (!evaluation) return '';
  const tier = evaluation.tier ? `${evaluation.tier} tier` : rankingLabel(evaluation.rankingStatus);
  const power = evaluation.power === undefined || evaluation.power === null ? '' : ` · Power ${escapeHtml(evaluation.power)}`;
  const confidence = evaluation.confidence ? `<small>Confidence: ${escapeHtml(humanize(evaluation.confidence))}</small>` : '';
  return `<div class="guide-ranking-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(tier)}${power}</strong>${confidence}</div>`;
}

function renderResearchList(title, values) {
  const filtered = (values || []).filter(value => value !== undefined && value !== null && String(value).trim() !== '');
  return filtered.length ? `<section class="guide-research-section">${heading(3, title)}${list(filtered)}</section>` : '';
}

function renderResearchFacts(snapshot) {
  const facts = [
    ['Meta Stability', snapshot.metaStability === undefined || snapshot.metaStability === null ? '' : `${snapshot.metaStability} / 100`],
    ['Trend', snapshot.trend ? humanize(snapshot.trend) : ''],
    ['Ranking Status', snapshot.currentStatus ? humanize(snapshot.currentStatus) : ''],
    ['Prevalence', snapshot.prevalence],
    ['Patch volatility', snapshot.patchVolatility ? humanize(snapshot.patchVolatility) : ''],
    ['Research confidence', snapshot.confidence?.powerConfidence ? humanize(snapshot.confidence.powerConfidence) : '']
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  if (!facts.length) return '';
  return `<section class="guide-research-section"><dl class="guide-research-facts">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`;
}

function renderRankingFactors(snapshot) {
  const factors = Object.entries(snapshot.strategicDiagnostics || {});
  if (!factors.length) return '';
  return `<section class="guide-research-section">${heading(3, 'Ranking factors')}<dl class="guide-ranking-factors">${factors.map(([key, value]) => `<div><dt>${escapeHtml(humanize(key))}</dt><dd>${typeof value === 'number' ? `${value} / 5` : escapeHtml(humanize(value))}</dd></div>`).join('')}</dl></section>`;
}

function renderResearch(model, parts) {
  const { canonical, snapshot } = parts;
  const evaluations = canonical.evaluations || {};
  const why = [
    snapshot.analysis?.whyPlayersRunIt,
    snapshot.analysis?.distinguishingFeature,
    ...(snapshot.buildImplementations || []).flatMap(build => build.strengths || [])
  ];
  const holdsBack = [
    ...(snapshot.counters || []),
    ...(snapshot.buildImplementations || []).flatMap(build => build.weaknesses || [])
  ];
  const revision = snapshot.patchBaseline && snapshot.researchRevision !== undefined
    ? `${snapshot.patchBaseline}-r${snapshot.researchRevision}`
    : '';
  const evaluatedFor = snapshot.patchBaseline || revision || snapshot.researchDate
    ? `<p class="guide-evaluated-for"><strong>Evaluated for</strong>${snapshot.patchBaseline ? ` · Patch ${escapeHtml(snapshot.patchBaseline)}` : ''}${revision ? ` · Research revision ${escapeHtml(revision)}` : ''}${snapshot.researchDate ? ` · Reviewed ${escapeHtml(snapshot.researchDate)}` : ''}</p>`
    : '';
  return `<details data-guide-research id="guide-research" class="guide-research"><summary aria-controls="guide-research-content">How We Rated This</summary><div id="guide-research-content"><section class="guide-ranking-summary"><div class="guide-ranking-grid">${renderRankingEvaluation('Solo Q', evaluations.soloQ)}${renderRankingEvaluation('Coordinated SWF', evaluations.coordinatedSwf)}</div>${renderResearchFacts(snapshot)}</section>${renderResearchList('Why it scores well', why)}${renderResearchList('What holds it back', holdsBack)}${renderRankingFactors(snapshot)}${evaluatedFor}</div></details>`;
}

function renderStandard(page, model) {
  return `${renderLoadout(page.loadout, model, page)}${renderMechanics(page)}${renderGameplay(page, model)}${renderPagePerkDetails(page, model)}${renderEnvironments(page)}${renderOptionalList(page, 'strengths', 'Strengths')}${renderOptionalList(page, 'weaknesses', 'Weaknesses', [page.verdict?.mainWeakness])}${renderOptionalList(page, 'killerCounterplay', 'Killer counterplay')}${renderOptionalList(page, 'commonMistakes', 'Common mistakes')}${renderOptionalValue(page, 'difficulty', 'Difficulty')}${renderOptionalValue(page, 'fit', 'Best fit')}${renderRelated(page)}`;
}

export function renderGuideBody(model) {
  if (!model || typeof model !== 'object') throw new TypeError('renderGuideBody requires a PageModel');
  const parts = modelParts(model);
  const { page } = parts;
  const pageKind = model.kind || page?.kind;
  const primary = page
    ? pageKind === 'FAMILY' ? renderFamily(page)
      : pageKind === 'LEGACY' ? renderLegacy(page, model)
        : pageKind === 'TEAM' ? `${renderTeam(page, model)}${renderMechanics(page)}${renderGameplay(page, model)}${renderPagePerkDetails(page, model)}${renderEnvironments(page)}${renderOptionalList(page, 'strengths', 'Strengths')}${renderOptionalList(page, 'weaknesses', 'Weaknesses', [page.verdict?.mainWeakness])}${renderOptionalList(page, 'killerCounterplay', 'Killer counterplay')}${renderOptionalList(page, 'commonMistakes', 'Common mistakes')}${renderOptionalValue(page, 'difficulty', 'Difficulty')}${renderRelated(page)}`
          : renderStandard(page, model)
    : `<p>This page contains research but no reviewed player-facing guide.</p>`;
  return sanitizePlayerMarkup(`<div data-guide-primary>${renderHeroVerdict(model, parts)}${primary}</div>${renderResearch(model, parts)}`, model);
}

