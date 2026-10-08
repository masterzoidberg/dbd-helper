(function () {
'use strict';
const data = window.DBD_DATA || {};
function siteHref(path = '') {
const clean = String(path).replace(/^\/+/, '');
if (typeof document === 'undefined' || typeof URL === 'undefined') return clean;
return new URL(clean, document.baseURI).href;
}
function escapeHtml(value) {
return String(value ?? '').replace(/[&<>\"]/g, function (char) {
return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[char];
});
}
function glossaryByKey(key) {
return (data.glossary || []).find((item) => item.key === key);
}
function glossify(text) {
const pattern = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/gi;
let output = '';
let last = 0;
let match;
while ((match = pattern.exec(text))) {
output += escapeHtml(text.slice(last, match.index));
const entry = glossaryByKey(match[1]);
if (entry) {
output += `<span class="glossary-term" tabindex="0" role="button" data-glossary="${escapeHtml(entry.key)}" aria-label="${escapeHtml(match[2])}: ${escapeHtml(entry.short)}">${escapeHtml(match[2])}</span>`;
} else {
output += escapeHtml(match[2]);
}
last = pattern.lastIndex;
}
output += escapeHtml(text.slice(last));
return output;
}
function stars(value) {
return `<span class="rating" aria-label="${value} out of 5">${'★'.repeat(value)}${'☆'.repeat(5-value)}</span>`;
}
function navHtml(current) {
const links = [
['home','','⌂','Home'],
['survivor-perks','survivor/perks/','◈','Survivor Perks'],
['survivor-meta','survivor-meta/','◎','Survivor Meta'],
['survivor-guide','survivor/guide/','◇','How to Play Survivor'],
['killer-perks','killer/perks/','◆','Killer Perks'],
['killer-guides','killer/guides/','◉','Killer Guides'],
['glossary','glossary/','?','Glossary']
];
const searchLink = ['search','#search','⌕','Search'];
const desktop = `<nav class="desktop-nav" aria-label="Desktop navigation">
<a class="brand" href="${siteHref('')}"><span class="brand-mark">DBD</span><span>Field Guide</span></a>
<div class="nav-group"><div class="nav-label">Quick Access</div>${[links[0], searchLink].map(link).join('')}</div>
<div class="nav-group"><div class="nav-label">Survivor</div>${links.slice(1,4).map(link).join('')}</div>
<div class="nav-group"><div class="nav-label">Killer</div>${links.slice(4,6).map(link).join('')}</div>
<div class="nav-group"><div class="nav-label">Reference</div>${links.slice(6).map(link).join('')}</div>
<div class="nav-spacer"></div>
<div class="patch-pill"><strong>Live ${escapeHtml(data.livePatch)}</strong><br>Verified ${escapeHtml(data.verifiedDate)}</div>
</nav>`;
const mobileTop = `<header class="mobile-top"><a class="brand" href="${siteHref('')}"><span class="brand-mark">DBD</span><span>Field Guide</span></a><span class="tag live">${escapeHtml(data.livePatch)}</span></header>`;
const mobileLinks = [links[0], links[1], links[4], searchLink];
const mobile = `<nav class="mobile-nav" aria-label="Mobile navigation">${mobileLinks.map(([id,href,icon,label]) => `<a href="${siteHref(href)}" ${current===id?'aria-current="page"':''}><span>${icon}</span><span>${label.replace(' Perks','')}</span></a>`).join('')}</nav>`;
return desktop + mobileTop + mobile;
function link([id, href, icon, label]) {
return `<a class="nav-link" href="${siteHref(href)}" ${current===id?'aria-current="page"':''}><span>${icon}</span><span>${label}</span></a>`;
}
}
function injectShell(current) {
const host = document.querySelector('[data-shell]');
if (host) host.innerHTML = navHtml(current);
const popover = document.createElement('div');
popover.id = 'glossary-popover';
popover.className = 'glossary-popover';
popover.setAttribute('role','tooltip');
document.body.appendChild(popover);
initGlossaryPopover(popover);
registerServiceWorker();
}
function initGlossaryPopover(popover) {
let pinned = false;
let currentTrigger = null;
function open(trigger, pin) {
const entry = glossaryByKey(trigger.dataset.glossary);
if (!entry) return;
pinned = !!pin;
currentTrigger = trigger;
popover.innerHTML = `<strong>${escapeHtml(entry.term)}</strong>${escapeHtml(entry.short)}`;
popover.classList.add('open');
const r = trigger.getBoundingClientRect();
const width = Math.min(310, window.innerWidth - 24);
let left = Math.min(window.innerWidth - width - 12, Math.max(12, r.left));
let top = r.bottom + 8;
if (top + 120 > window.innerHeight) top = Math.max(12, r.top - 112);
popover.style.left = left + 'px';
popover.style.top = top + 'px';
trigger.setAttribute('aria-describedby','glossary-popover');
}
function close() {
pinned = false;
popover.classList.remove('open');
if (currentTrigger) currentTrigger.removeAttribute('aria-describedby');
currentTrigger = null;
}
document.addEventListener('mouseover', (e) => {
const trigger = e.target.closest && e.target.closest('.glossary-term');
if (trigger && !pinned) open(trigger, false);
});
document.addEventListener('mouseout', (e) => {
if (!pinned && e.target.closest && e.target.closest('.glossary-term')) close();
});
document.addEventListener('focusin', (e) => {
const trigger = e.target.closest && e.target.closest('.glossary-term');
if (trigger) open(trigger, false);
});
document.addEventListener('focusout', (e) => {
if (!pinned && e.target.closest && e.target.closest('.glossary-term')) close();
});
document.addEventListener('click', (e) => {
const trigger = e.target.closest && e.target.closest('.glossary-term');
if (trigger) {
e.preventDefault();
if (pinned && currentTrigger === trigger) close(); else open(trigger, true);
} else if (pinned && !popover.contains(e.target)) close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
function renderPerkCard(perk) {
const roles = perk.roles.map((role) => `<span class="tag">${escapeHtml(role)}</span>`).join('');
const effect = glossify(perk.currentEffect
.replace(/Conspicuous Action/g,'[[conspicuous-action|Conspicuous Action]]')
.replace(/Dying State/g,'[[dying-state|Dying State]]')
.replace(/Health State/g,'[[health-state|Health State]]')
.replace(/Haste/g,'[[haste|Haste]]')
.replace(/Exhausted/g,'[[exhausted|Exhausted]]'));
return `<article class="perk-card" data-tier="${escapeHtml(perk.tier)}" data-perk-id="${escapeHtml(perk.id)}">
<div class="perk-top">
<div class="rank-box">#${perk.rank}</div>
<div>
<div class="perk-title-row"><h3 class="perk-title">${escapeHtml(perk.name)}</h3><span class="tag">${escapeHtml(perk.tier)} Tier</span><span class="tag live">${escapeHtml(perk.status)}</span>${roles}</div>
${perk.alternateName ? `<div class="alt-name">Also displayed as <strong>${escapeHtml(perk.alternateName)}</strong> for applicable licensed owners.</div>` : ''}
<p class="summary">${escapeHtml(perk.summary)}</p>
<div class="source">Unlock source: ${escapeHtml(perk.source)}</div>
</div>
</div>
<div class="quick-grid">
<div class="quick-cell"><span class="quick-label">Meta</span><span class="quick-value">${escapeHtml(perk.metaStatus)}</span></div>
<div class="quick-cell"><span class="quick-label">Skill</span><span class="quick-value">${escapeHtml(perk.skillLevel)}</span></div>
<div class="quick-cell"><span class="quick-label">Solo Q</span><span class="quick-value">${stars(perk.soloQ)}</span></div>
<div class="quick-cell"><span class="quick-label">SWF</span><span class="quick-value">${stars(perk.swf)}</span></div>
<div class="quick-cell"><span class="quick-label">Unlock</span><span class="quick-value">${escapeHtml(perk.unlockPriority)}</span></div>
</div>
<div class="accordions">
<button class="accordion-btn" type="button" data-panel="details-${perk.id}" aria-expanded="false"><span>Important Details</span><span>＋</span></button>
<button class="accordion-btn" type="button" data-panel="analysis-${perk.id}" aria-expanded="false"><span>Full Analysis</span><span>＋</span></button>
<section class="accordion-panel" id="details-${perk.id}" aria-label="Important details for ${escapeHtml(perk.name)}">
<div class="detail-grid">
<div class="detail-section"><h3>Current Effect</h3><p>${effect}</p></div>
<div class="detail-section"><h3>Activation / Conditions</h3>${list(perk.activation)}</div>
<div class="detail-section"><h3>Best Uses</h3>${list(perk.useCases)}</div>
<div class="detail-section"><h3>Counters / Failure Cases</h3>${list(perk.counters)}</div>
<div class="detail-section"><h3>Synergies</h3>${list(perk.synergies)}</div>
<div class="detail-section"><h3>Pros</h3>${list(perk.pros)}</div>
<div class="detail-section"><h3>Cons</h3>${list(perk.cons)}</div>
<div class="detail-section"><h3>Patch Context</h3><p>${escapeHtml(perk.patchNote)}</p></div>
</div>
</section>
<section class="accordion-panel" id="analysis-${perk.id}" aria-label="Full analysis for ${escapeHtml(perk.name)}">
<div class="analysis-copy">${perk.analysis.map((p) => `<p>${glossify(p.replace(/tunneling/gi,'[[tunneling|tunneling]]').replace(/slugging/gi,'[[slugging|slugging]]').replace(/Solo Q/g,'[[solo-q|Solo Q]]').replace(/SWF/g,'[[swf|SWF]]').replace(/Exhausted/g,'[[exhausted|Exhausted]]'))}</p>`).join('')}<div class="verdict"><strong>Bottom line:</strong> ${escapeHtml(perk.verdict)}</div></div>
</section>
</div>
</article>`;
function list(items) { return `<ul class="compact">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`; }
}
function initAccordions(root) {
root.addEventListener('click', (e) => {
const button = e.target.closest('.accordion-btn');
if (!button) return;
const panel = document.getElementById(button.dataset.panel);
if (!panel) return;
const open = button.getAttribute('aria-expanded') === 'true';
button.setAttribute('aria-expanded', String(!open));
button.lastElementChild.textContent = open ? '＋' : '−';
panel.classList.toggle('open', !open);
});
}
function normalize(value) {
return String(value || '').toLowerCase().replace(/[-_/]+/g,' ').replace(/\s+/g,' ').trim();
}
function perkNameHaystack(perk) {
return normalize([perk.name, perk.alternateName].filter(Boolean).join(' '));
}
function perkPrimaryHaystack(perk) {
return normalize([perk.name, perk.alternateName, perk.source, perk.tier, perk.roles.join(' '), perk.metaStatus].filter(Boolean).join(' '));
}
function perkHaystack(perk) {
return normalize([perkPrimaryHaystack(perk), perk.summary, perk.glossaryKeys.join(' ')].filter(Boolean).join(' '));
}
function filterPerks(perks, query, tiers, roles) {
const q = normalize(query);
const tokens = q ? q.split(' ') : [];
const hasNameMatch = !!q && perks.some((perk) => tokens.every((token) => perkNameHaystack(perk).includes(token)));
const hasPrimaryMatch = !hasNameMatch && !!q && perks.some((perk) => tokens.every((token) => perkPrimaryHaystack(perk).includes(token)));
return perks.filter((perk) => {
const searchable = hasNameMatch ? perkNameHaystack(perk) : (hasPrimaryMatch ? perkPrimaryHaystack(perk) : perkHaystack(perk));
const textOk = !q || tokens.every((token) => searchable.includes(token));
const tierOk = !tiers.length || tiers.includes(perk.tier);
const roleOk = !roles.length || roles.some((role) => perk.roles.includes(role));
return textOk && tierOk && roleOk;
}).sort((a,b) => a.rank - b.rank);
}
function registerServiceWorker() {
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(()=>{}));
}
window.DBD_CORE = { data, siteHref, escapeHtml, glossaryByKey, glossify, stars, injectShell, renderPerkCard, initAccordions, normalize, filterPerks };
})();
