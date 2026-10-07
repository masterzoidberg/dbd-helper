(function () {
'use strict';
const { data, siteHref, escapeHtml, injectShell, renderPerkCard, initAccordions, normalize, filterPerks } = window.DBD_CORE;
function initPerkBrowser() {
const host = document.querySelector('[data-perk-browser]');
if (!host) return;
const allPerks = data.perks || [];
const tiers = ['S+','S','A','B','C','D'];
const roles = [...new Set(allPerks.flatMap((p) => p.roles))].sort();
const state = { query:'', tiers:[], roles:[], collapsed:new Set() };
host.innerHTML = `<div class="search-panel">
<div class="search-row"><input id="perk-search" class="search-input" type="search" autocomplete="off" placeholder="Search perk, character, role…" aria-label="Search Survivor perks"><button id="perk-clear" class="clear-btn" type="button" hidden>Clear</button></div>
<div class="filter-block"><div class="filter-label">Tier</div>${tiers.map((tier) => `<button type="button" class="chip" data-tier-filter="${tier}" aria-pressed="false">${tier}</button>`).join('')}</div>
<div class="filter-block"><div class="filter-label">Role</div>${roles.map((role) => `<button type="button" class="chip" data-role-filter="${escapeHtml(role)}" aria-pressed="false">${escapeHtml(role)}</button>`).join('')}</div>
<div class="result-row"><span id="result-count"></span><span>Live mechanics: ${escapeHtml(data.livePatch)}</span></div>
</div><div id="tier-results"></div>`;
const input = host.querySelector('#perk-search');
const clear = host.querySelector('#perk-clear');
const results = host.querySelector('#tier-results');
const count = host.querySelector('#result-count');
input.addEventListener('input', () => { state.query=input.value; render(); });
clear.addEventListener('click', () => { state.query=''; state.tiers=[]; state.roles=[]; input.value=''; host.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed','false')); render(); input.focus(); });
host.addEventListener('click', (e) => {
const tier = e.target.closest('[data-tier-filter]');
if (tier) toggle('tiers', tier.dataset.tierFilter, tier);
const role = e.target.closest('[data-role-filter]');
if (role) toggle('roles', role.dataset.roleFilter, role);
const tt = e.target.closest('[data-tier-toggle]');
if (tt) { const t=tt.dataset.tierToggle; state.collapsed.has(t)?state.collapsed.delete(t):state.collapsed.add(t); render(); }
});
initAccordions(results);
render();
function toggle(kind, value, button) {
const arr = state[kind];
const i = arr.indexOf(value);
if (i >= 0) arr.splice(i,1); else arr.push(value);
button.setAttribute('aria-pressed', String(i < 0));
render();
}
function render() {
const filtered = filterPerks(allPerks, state.query, state.tiers, state.roles);
const filtering = !!normalize(state.query) || state.tiers.length || state.roles.length;
clear.hidden = !filtering;
count.textContent = `${filtered.length} of ${allPerks.length} published perks`;
results.innerHTML = tiers.map((tier) => {
const group = filtered.filter((p) => p.tier===tier);
if (!group.length) return '';
const collapsed = state.collapsed.has(tier);
return `<section class="tier-section"><div class="tier-heading"><div class="tier-badge" data-tier="${tier}">${tier}</div><h2>${tier} Tier</h2><span class="tier-count">${group.length} perk${group.length===1?'':'s'}</span><button type="button" class="tier-toggle" data-tier-toggle="${tier}" aria-expanded="${String(!collapsed)}">${collapsed?'Expand':'Collapse'}</button></div>${collapsed?'':`<div class="perk-list">${group.map(renderPerkCard).join('')}</div>`}</section>`;
}).join('') || `<div class="empty-state"><strong>No perk matches.</strong><br>Try clearing a tier/role filter or using a broader search.</div>`;
}
}
function initHomeSearch() {
const input = document.querySelector('[data-home-search]');
const results = document.querySelector('[data-home-results]');
if (!input || !results) return;
const staticItems = [
...data.perks.map((p)=>({title:p.name, subtitle:`#${p.rank} ${p.tier} Survivor perk · ${p.source}`, href:siteHref('survivor/perks/?q='+encodeURIComponent(p.name))})),
...data.glossary.map((g)=>({title:g.term, subtitle:g.short, href:siteHref('glossary/?q='+encodeURIComponent(g.term))})),
...(data.killerGuides || []).map((g)=>({title:g.name, subtitle:'Killer how-to guide shell · deep guide in Phase 4', href:siteHref('killer/guides/?q='+encodeURIComponent(g.name))})),
{title:'How to Play Survivor',subtitle:'General Survivor fundamentals and quick-match advice',href:siteHref('survivor/guide/')},
{title:'Killer Guides',subtitle:'Killer-specific how-to pages are staged for Phase 4',href:siteHref('killer/guides/')},
{title:'Killer Perks',subtitle:`${data.killerPerkCount} live mechanics verified and ready for ranking`,href:siteHref('killer/perks/')}
];
function render() {
const q=normalize(input.value);
if (!q) { results.innerHTML=''; return; }
const matches=staticItems.filter(x=>normalize(x.title+' '+x.subtitle).includes(q)).slice(0,8);
results.innerHTML=matches.length?matches.map(x=>`<a class="search-result" href="${x.href}"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.subtitle)}</small></a>`).join(''):`<div class="empty-state">No quick result for “${escapeHtml(input.value)}”.</div>`;
}
input.addEventListener('input',render);
}
function initKillerGuides() {
const host = document.querySelector('[data-killer-guide-list]');
const input = document.querySelector('[data-killer-guide-search]');
if (!host || !input) return;
function render() {
const q = normalize(input.value);
const guides = (data.killerGuides || []).filter((guide) => !q || normalize(guide.name).includes(q));
host.innerHTML = guides.map((guide) => `<article class="guide-card killer-guide-stub" data-killer-guide-card><h2>${escapeHtml(guide.name)}</h2><p>Phase 4 guide shell</p></article>`).join('') || `<div class="empty-state"><strong>No Killer matches.</strong><br>Try a broader name.</div>`;
const count = document.querySelector('[data-killer-guide-count]');
if (count) count.textContent = `${guides.length} of ${(data.killerGuides || []).length} Killers`;
}
const params = new URLSearchParams(location.search);
const query = params.get('q');
if (query) input.value = query;
input.addEventListener('input', render);
render();
}
function initGlossaryPage() {
const host=document.querySelector('[data-glossary-list]');
const input=document.querySelector('[data-glossary-search]');
if(!host) return;
function render(){
const q=normalize(input?input.value:'');
const entries=(data.glossary||[]).filter(g=>!q||normalize([g.term,g.aliases.join(' '),g.short,g.definition].join(' ')).includes(q)).sort((a,b)=>a.term.localeCompare(b.term));
host.innerHTML=entries.map(g=>`<article class="glossary-card" id="${escapeHtml(g.key)}"><h2>${escapeHtml(g.term)}</h2>${g.aliases.length?`<div class="source">Also: ${escapeHtml(g.aliases.join(', '))}</div>`:''}<p>${escapeHtml(g.definition)}</p></article>`).join('') || `<div class="empty-state">No glossary matches.</div>`;
}
if(input) input.addEventListener('input',render);
render();
}
function applyQueryFromUrl() {
const params=new URLSearchParams(location.search);
const q=params.get('q');
if(!q) return;
const perk=document.querySelector('#perk-search');
if(perk){ perk.value=q; perk.dispatchEvent(new Event('input',{bubbles:true})); }
const glossary=document.querySelector('[data-glossary-search]');
if(glossary){ glossary.value=q; glossary.dispatchEvent(new Event('input',{bubbles:true})); }
}
window.DBD_APP = { injectShell, initPerkBrowser, initHomeSearch, initKillerGuides, initGlossaryPage, applyQueryFromUrl, normalize, filterPerks };
})();
