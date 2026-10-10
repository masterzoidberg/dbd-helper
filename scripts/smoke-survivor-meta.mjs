import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuideRecords } from './survivor-meta-guide-source.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages-manifest.json'), 'utf8'));
const routesById = new Map(manifest.map(route => [route.strategyId, route.slug]));
const guides = loadGuideRecords({ rootDir: root });
const TIMEOUT_MS = 8000;
const ATTEMPTS = 3;

const baseline = [
  ['', /176<\/strong> Survivor perks published/],
  ['survivor/perks/', /176 published/],
  ['survivor-meta/', /57 strategies/],
  ['assets/data-survivor-meta.js', /"id":"X02"/],
  ['assets/survivor-meta.js', /\S/],
  ['assets/app-core.js', /\S/],
  ['assets/mobile-filter.css', /\S/],
  ['assets/mobile-filter.js', /\S/],
  ['assets/data-perks-01.js', /"id":"will-to-live"/],
  ['assets/data-perks-05.js', /"id":"invocation-treacherous-crows"/],
  ['manifest.webmanifest', /"name"/],
  ['sw.js', /dbd-field-guide-v7/]
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function attribute(markup, name) {
  return markup.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
}

function hasDestination(markup, expectedRoute, base, label) {
  const expected = routesById.get(expectedRoute);
  if (!expected) return false;
  const expectedUrl = new URL(expected.replace(/^\/+/, ''), base);
  return [...markup.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].some(([, attributes, text]) => {
    const href = attribute(attributes, 'href');
    if (!href || (label && text !== label)) return false;
    try {
      const actual = new URL(href, base);
      return actual.href.replace(/\/$/, '') === expectedUrl.href.replace(/\/$/, '');
    } catch {
      return false;
    }
  });
}

function guideFailure(route, html, base) {
  if (!/<p class="guide-publication-status">Player Guide<\/p>/.test(html) || /Research View Only/.test(html)) return 'not a published Player Guide';
  if (!html.includes(`<h1>${escapeHtml(route.canonicalName)}</h1>`)) return 'canonical guide title missing';
  if (!/<article class="meta-article-body">/.test(html) || !/data-guide-primary/.test(html)) return 'player guide body missing';
  if (!/<details\b[^>]*data-guide-research[^>]*id="guide-research"/.test(html) || !/<section class="guide-original-article">[\s\S]*Original Research Article[\s\S]*<div class="guide-article-body">/.test(html)) return 'original research article missing';
  const primary = html.split('<details data-guide-research')[0];
  if (/PARENT STRATEGY FAMILY|BuildImplementation|Stage 3[AB]/.test(primary.split('</header>')[0])) return 'raw research label in player hero';
  const checks = {
    X01: [/Choose one:/, /href="survivor\/perks\/\?q=/],
    P02: [/Step/],
    A03: [/Priority/],
    P00: [/Compare the approaches/, /Open this approach/],
    A00: [/Compare the approaches/, /Open this approach/],
    G06: [/What it was/, /Current successors/],
    C13: [/What it was/, /Current successors/],
    X02: [/class="guide-team"/, /No single four-perk loadout is implied/, /Solo Q<\/span><strong>Not a queue recommendation/]
  };
  for (const pattern of checks[route.strategyId] || []) if (!pattern.test(primary)) return `player landmark missing: ${pattern}`;
  if (route.strategyId === 'P00' || route.strategyId === 'A00') {
    const family = primary.match(/<section class="guide-family">([\s\S]*?)<\/section>/)?.[1] || '';
    const approaches = [...family.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)];
    const expected = guides.get(route.strategyId)?.page.comparisons || [];
    if (!expected.length || approaches.length !== expected.length || approaches.some(([article], index) => !hasDestination(article, expected[index].strategyId, base, 'Open this approach'))) return 'family approach destination missing';
  }
  if (route.strategyId === 'G06' || route.strategyId === 'C13') {
    const successors = primary.match(/<h2>Current successors<\/h2><ul>([\s\S]*?)<\/ul>/)?.[1] || '';
    const entries = [...successors.matchAll(/<li>[\s\S]*?<\/li>/g)];
    const expected = guides.get(route.strategyId)?.page.successors || [];
    if (!expected.length || entries.length !== expected.length || entries.some(([entry], index) => !hasDestination(entry, expected[index].strategyId, base))) return 'Legacy successor destination missing';
  }
  if (route.strategyId === 'X02') {
    const team = primary.match(/<section class="guide-team">([\s\S]*?)<\/section>/)?.[1] || '';
    const expected = (guides.get(route.strategyId)?.page.roles || []).map(role => `guide-role-${role.id}`);
    const roles = [...team.matchAll(/<article\b([^>]*)>\s*<h3\b[^>]*>/g)].map(([, attributes]) => attribute(attributes, 'id'));
    const roleLinks = [...primary.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => attribute(attributes, 'href')).filter(href => href?.startsWith('#guide-role-')).map(href => href.slice(1));
    if (expected.length !== 4 || new Set(roles).size !== 4 || expected.some(id => !roles.includes(id) || !roleLinks.includes(id)) || roleLinks.some(id => !expected.includes(id))) return 'team roles or role links missing';
  }
  return null;
}

async function fetchText(url, fetchImpl) {
  let lastError;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const controller = new AbortController();
    let timer;
    try {
      const response = await Promise.race([
        Promise.resolve().then(() => fetchImpl(url, { signal: controller.signal })).then(async result => ({ result, body: await result.text() })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS); })
      ]);
      if (!response.result.ok) return { error: `HTTP ${response.result.status}` };
      if (!response.body.trim()) return { error: 'empty response' };
      return { body: response.body };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  return { error: lastError?.message || 'network failure' };
}

export async function smokeSurvivorMeta({ baseUrl, fetchImpl = fetch }) {
  const base = new URL(baseUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const checks = [
    ...baseline.map(([path, pattern]) => ({ path, check: body => pattern.test(body) ? null : 'baseline content missing' })),
    ...manifest.map(route => ({ path: `${route.slug.replace(/^\/+|\/+$/g, '')}/`, check: body => guideFailure(route, body, base) }))
  ];
  const failures = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, checks.length) }, async () => {
    while (next < checks.length) {
      const { path: route, check } = checks[next++];
      const url = new URL(route, base).href;
      const result = await fetchText(url, fetchImpl);
      const message = result.error || check(result.body);
      if (message) failures.push({ url, message });
    }
  }));
  return { checked: checks.length, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--base-url') {
    console.error('Usage: node scripts/smoke-survivor-meta.mjs --base-url <deployed-or-local-base-url>');
    process.exitCode = 1;
  } else {
    try {
      const result = await smokeSurvivorMeta({ baseUrl: args[1] });
      for (const failure of result.failures) console.error(`${failure.url}: ${failure.message}`);
      console.log(`Checked ${result.checked} release URLs; ${result.failures.length} failures`);
      process.exitCode = result.failures.length ? 1 : 0;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
