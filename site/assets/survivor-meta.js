(function () {
'use strict';
const core = window.DBD_CORE || {};
const data = window.DBD_DATA || {};
const normalize = core.normalize || (value => String(value || '').toLowerCase().replace(/[-_/]+/g,' ').replace(/\s+/g,' ').trim());
const escapeHtml = core.escapeHtml || (value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
const siteHref = core.siteHref || (value => value);
const TIERS = ['S','A','B','C','D'];
const SOLO = 'SURVIVOR_SOLO_Q';
const SWF = 'SURVIVOR_COORDINATED_SWF';

function evaluationFor(strategy, environmentId) {
  return (strategy.environmentEvaluations || []).find(item => item.environmentId === environmentId) || null;
}

function searchableText(strategy) {
  return normalize([
    strategy.id,
    strategy.name,
    ...(strategy.alternateNames || []),
    strategy.generalStrategicDefinition,
    strategy.structuralClassification,
    ...(strategy.primaryRoles || []),
    ...(strategy.secondaryRoles || []),
    ...(strategy.conceptualMechanics || []),
    ...(strategy.generalTags || [])
  ].filter(Boolean).join(' '));
}

function filterStrategies(strategies, state = {}) {
  const q = normalize(state.query || '');
  const tokens = q ? q.split(' ') : [];
  const tiers = state.tiers || [];
  const classifications = state.classifications || [];
  const roles = state.roles || [];
  const environmentId = state.environmentId || SOLO;
  return (strategies || []).filter(strategy => {
    const e = evaluationFor(strategy, environmentId);
    const textOk = !tokens.length || tokens.every(token => searchableText(strategy).includes(token));
    const tierOk = !tiers.length || (!!e && tiers.includes(e.tier));
    const classOk = !classifications.length || classifications.includes(strategy.structuralClassification);
    const roleOk = !roles.length || roles.some(role => (strategy.primaryRoles || []).includes(role));
    return textOk && tierOk && classOk && roleOk;
  });
}

function sortCurrentTier(strategies, environmentId) {
  return [...(strategies || [])].sort((a, b) => {
    const ae = evaluationFor(a, environmentId);
    const be = evaluationFor(b, environmentId);
    const powerDelta = (be?.power ?? -Infinity) - (ae?.power ?? -Infinity);
    if (powerDelta) return powerDelta;
    const stabilityDelta = (b.metaStability ?? -Infinity) - (a.metaStability ?? -Infinity);
    if (stabilityDelta) return stabilityDelta;
    return String(a.name).localeCompare(String(b.name));
  });
}

function groupStrategies(strategies, environmentId) {
  const groups = {
    tiers: Object.fromEntries(TIERS.map(tier => [tier, []])),
    unranked: [],
    notApplicable: [],
    families: [],
    legacy: []
  };
  for (const strategy of strategies || []) {
    const e = evaluationFor(strategy, environmentId);
    if (strategy.structuralClassification === 'PARENT STRATEGY FAMILY') {
      groups.families.push(strategy);
      continue;
    }
    if (strategy.currentStatus === 'LEGACY' || e?.rankingStatus === 'NOT_CURRENT') {
      groups.legacy.push(strategy);
      continue;
    }
    if (e && ['RANKED','PROVISIONAL'].includes(e.rankingStatus) && e.tier && groups.tiers[e.tier]) {
      groups.tiers[e.tier].push(strategy);
      continue;
    }
    if (e?.rankingStatus === 'UNRANKED') {
      groups.unranked.push(strategy);
      continue;
    }
    if (e?.rankingStatus === 'NOT_APPLICABLE') groups.notApplicable.push(strategy);
  }
  for (const tier of TIERS) groups.tiers[tier] = sortCurrentTier(groups.tiers[tier], environmentId);
  for (const key of ['unranked','notApplicable','families','legacy']) groups[key].sort((a,b) => String(a.name).localeCompare(String(b.name)));
  return groups;
}

function statusText(value) {
  return String(value || '').replaceAll('_', ' ');
}

function childStrategiesFor(strategy, strategies) {
  const byId = new Map((strategies || []).map(item => [item.id, item]));
  return (strategy.subtypeIds || []).map(id => byId.get(id)).filter(Boolean);
}

function renderStrategyCard(strategy, environmentId, allStrategies = data.survivorStrategies || []) {
  const e = evaluationFor(strategy, environmentId);
  const rankable = e && ['RANKED','PROVISIONAL'].includes(e.rankingStatus) && e.tier && e.power != null;
  const roles = (strategy.primaryRoles || []).map(role => `<span class="tag">${escapeHtml(role)}</span>`).join('');
  const provisional = e?.rankingStatus === 'PROVISIONAL' ? '<span class="tag meta-provisional">Provisional</span>' : '';
  const power = rankable ? `<strong>${escapeHtml(e.tier)} · ${escapeHtml(e.power)}</strong>` : `<strong>${escapeHtml(statusText(e?.rankingStatus || 'UNRANKED'))}</strong>`;
  const children = strategy.structuralClassification === 'PARENT STRATEGY FAMILY' ? childStrategiesFor(strategy, allStrategies) : [];
  const childLinks = children.length ? `<div class="perk-title-row strategy-child-links"><span class="source">Child strategies:</span>${children.map(child => `<a class="strategy-link" href="${siteHref(child.articlePath)}">${escapeHtml(child.id)} ${escapeHtml(child.name)} →</a>`).join('')}</div>` : '';
  return `<article class="strategy-card">
<div class="strategy-card-head"><div><p class="eyebrow">${escapeHtml(strategy.id)}</p><h3>${escapeHtml(strategy.name)}</h3></div><div class="strategy-power">${power}<small>${escapeHtml(statusText(e?.rankingStatus || ''))}</small></div></div>
<div class="perk-title-row"><span class="tag">${escapeHtml(strategy.structuralClassification)}</span><span class="tag live">${escapeHtml(strategy.currentStatus)}</span><span class="tag">${escapeHtml(strategy.stabilityLabel || 'No stability')}</span><span class="tag">${escapeHtml(statusText(strategy.trend))}</span>${provisional}${roles}</div>
<p class="summary">${escapeHtml(strategy.generalStrategicDefinition)}</p>
${childLinks}
<div class="strategy-card-footer"><span>Meta Stability ${strategy.metaStability == null ? '—' : escapeHtml(strategy.metaStability)}</span><a class="strategy-link" href="${siteHref(strategy.articlePath)}">Open strategy →</a></div>
</article>`;
}

function renderSpecialSection(title, items, environmentId, note, allStrategies = data.survivorStrategies || []) {
  if (!items.length) return '';
  return `<section class="meta-special-section"><div class="tier-heading"><h2>${escapeHtml(title)}</h2><span class="tier-count">${items.length}</span></div>${note ? `<p class="source">${escapeHtml(note)}</p>` : ''}<div class="strategy-list">${items.map(item => renderStrategyCard(item, environmentId, allStrategies)).join('')}</div></section>`;
}

function initSurvivorMetaBrowser() {
  if (typeof document === 'undefined') return;
  const host = document.querySelector('[data-survivor-meta-browser]');
  if (!host) return;
  const all = data.survivorStrategies || [];
  const classifications = [...new Set(all.map(s => s.structuralClassification).filter(Boolean))].sort();
  const roles = [...new Set(all.flatMap(s => s.primaryRoles || []))].sort();
  const state = { query:'', tiers:[], classifications:[], roles:[], environmentId:SOLO, collapsed:new Set() };

  host.innerHTML = `<div class="meta-browser-toolbar">
<div class="environment-switch" role="group" aria-label="Ranking environment"><button class="chip" type="button" data-environment="${SOLO}" aria-pressed="true">Solo Q</button><button class="chip" type="button" data-environment="${SWF}" aria-pressed="false">Coordinated SWF</button></div>
<div class="search-panel"><div class="search-row"><input class="search-input" type="search" data-meta-search autocomplete="off" placeholder="Search strategy, role, mechanic…" aria-label="Search Survivor Meta"><button class="clear-btn" type="button" data-meta-clear hidden>Clear</button></div>
<div class="filter-block"><div class="filter-label">Tier</div>${TIERS.map(t => `<button class="chip" type="button" data-tier-filter="${t}" aria-pressed="false">${t}</button>`).join('')}</div>
<div class="filter-block"><div class="filter-label">Classification</div>${classifications.map(value => `<button class="chip" type="button" data-classification-filter="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(value)}</button>`).join('')}</div>
<div class="filter-block"><div class="filter-label">Primary Role</div>${roles.map(value => `<button class="chip" type="button" data-role-filter="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(value)}</button>`).join('')}</div>
<div class="result-row"><span data-meta-count></span><span>Patch 10.2.0 · research r1</span></div></div></div><div data-meta-results></div>`;

  const input = host.querySelector('[data-meta-search]');
  const clear = host.querySelector('[data-meta-clear]');
  const count = host.querySelector('[data-meta-count]');
  const results = host.querySelector('[data-meta-results]');

  input.addEventListener('input', () => { state.query = input.value; render(); });
  clear.addEventListener('click', () => {
    state.query=''; state.tiers=[]; state.classifications=[]; state.roles=[]; input.value='';
    host.querySelectorAll('[data-tier-filter],[data-classification-filter],[data-role-filter]').forEach(button => button.setAttribute('aria-pressed','false'));
    render(); input.focus();
  });
  host.addEventListener('click', event => {
    const environment = event.target.closest?.('[data-environment]');
    if (environment) {
      state.environmentId = environment.dataset.environment;
      host.querySelectorAll('[data-environment]').forEach(button => button.setAttribute('aria-pressed', String(button === environment)));
      render();
      return;
    }
    const tier = event.target.closest?.('[data-tier-filter]');
    if (tier) { toggle(state.tiers, tier.dataset.tierFilter, tier); return; }
    const classification = event.target.closest?.('[data-classification-filter]');
    if (classification) { toggle(state.classifications, classification.dataset.classificationFilter, classification); return; }
    const role = event.target.closest?.('[data-role-filter]');
    if (role) { toggle(state.roles, role.dataset.roleFilter, role); return; }
    const collapse = event.target.closest?.('[data-meta-tier-toggle]');
    if (collapse) {
      const value = collapse.dataset.metaTierToggle;
      state.collapsed.has(value) ? state.collapsed.delete(value) : state.collapsed.add(value);
      render();
    }
  });

  function toggle(list, value, button) {
    const index = list.indexOf(value);
    if (index >= 0) list.splice(index,1); else list.push(value);
    button.setAttribute('aria-pressed', String(index < 0));
    render();
  }

  function render() {
    const filtered = filterStrategies(all, state);
    const groups = groupStrategies(filtered, state.environmentId);
    const active = !!normalize(state.query) || state.tiers.length || state.classifications.length || state.roles.length;
    clear.hidden = !active;
    count.textContent = `${filtered.length} of ${all.length} strategies`;
    const tiersHtml = TIERS.map(tier => {
      const items = groups.tiers[tier];
      if (!items.length) return '';
      const collapsed = state.collapsed.has(tier);
      return `<section class="tier-section"><div class="tier-heading"><div class="tier-badge" data-tier="${tier}">${tier}</div><h2>${tier} Tier</h2><span class="tier-count">${items.length} strateg${items.length===1?'y':'ies'}</span><button type="button" class="tier-toggle" data-meta-tier-toggle="${tier}" aria-expanded="${String(!collapsed)}">${collapsed?'Expand':'Collapse'}</button></div>${collapsed?'':`<div class="strategy-list">${items.map(item => renderStrategyCard(item, state.environmentId, all)).join('')}</div>`}</section>`;
    }).join('');
    const special = [
      renderSpecialSection('Unranked', groups.unranked, state.environmentId, 'Current strategies without a responsible Power/Tier estimate in this environment.', all),
      renderSpecialSection('Not Applicable', groups.notApplicable, state.environmentId, 'Current strategies whose competitive score is not applicable in this environment.', all),
      renderSpecialSection('Strategy Families', groups.families, state.environmentId, 'Parent families organize child strategies and do not receive fabricated aggregate scores.', all),
      renderSpecialSection('Legacy', groups.legacy, state.environmentId, 'Historical strategies preserved for context; not part of the current tier list.', all)
    ].join('');
    results.innerHTML = tiersHtml + special || '<div class="empty-state"><strong>No strategy matches.</strong><br>Try clearing a filter or broadening the search.</div>';
  }

  render();
}

window.DBD_SURVIVOR_META = { evaluationFor, filterStrategies, groupStrategies, sortCurrentTier, childStrategiesFor, renderStrategyCard, initSurvivorMetaBrowser };
})();
