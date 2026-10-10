import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { loadGuideContext, loadGuideRecords } from '../../scripts/survivor-meta-guide-source.mjs';
import { assembleGuidePage } from '../../scripts/survivor-meta-guide-model.mjs';
import { renderGuideBody } from '../../scripts/survivor-meta-guide-render.mjs';
import { buildSurvivorMetaSite } from '../../scripts/build-survivor-meta.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages-manifest.json')));
const context = loadGuideContext({ rootDir: root });
const guides = loadGuideRecords({ rootDir: root });
const smokePath = path.join(root, 'scripts/smoke-survivor-meta.mjs');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'site/sw.js'), 'utf8');

async function smoke(options) {
  const { smokeSurvivorMeta } = await import('../../scripts/smoke-survivor-meta.mjs');
  return smokeSurvivorMeta(options);
}

function fixture() {
  const pages = new Map();
  for (const route of manifest) {
    const model = assembleGuidePage({ context, strategyId: route.strategyId, guide: guides.get(route.strategyId), mode: 'preview' });
    pages.set(`${route.slug.slice(1)}/`, `<p class="guide-publication-status">Player Guide</p><article class="meta-article-body">${renderGuideBody(model)}</article>`);
  }
  for (const file of ['', 'survivor/perks/', 'survivor-meta/', 'assets/data-survivor-meta.js', 'assets/survivor-meta.js', 'assets/app-core.js', 'assets/mobile-filter.css', 'assets/mobile-filter.js', 'assets/data-perks-01.js', 'assets/data-perks-05.js', 'manifest.webmanifest', 'sw.js']) {
    pages.set(file, fs.readFileSync(path.join(root, 'site', file, file.endsWith('/') || !file ? 'index.html' : ''), 'utf8'));
  }
  const seen = [];
  const fetchImpl = async url => {
    const parsed = new URL(url);
    seen.push(parsed.href);
    const key = parsed.pathname.replace(/^\/dbd-helper\//, '');
    return new Response(pages.get(key) || 'missing', { status: pages.has(key) ? 200 : 404 });
  };
  return { pages, seen, fetchImpl };
}

test('release checks all canonical routes and baseline pages under the supplied base path', async () => {
  const f = fixture();
  const result = await smoke({ baseUrl: 'https://example.test/dbd-helper/', fetchImpl: f.fetchImpl });
  assert.ok(result.checked >= 57);
  assert.deepEqual(result.failures, []);
  assert.ok(f.seen.includes('https://example.test/dbd-helper/survivor-meta/general-chase-looping/'));
  assert.ok(f.seen.includes('https://example.test/dbd-helper/assets/data-survivor-meta.js'));
  const withoutSlash = await smoke({ baseUrl: 'https://example.test/dbd-helper', fetchImpl: f.fetchImpl });
  assert.deepEqual(withoutSlash.failures, []);
});

test('missing, unpublished, choice-less, and article-less guides fail with exact URLs', async () => {
  const cases = [
    ['survivor-meta/general-chase-looping/', null],
    ['survivor-meta/solo-q-generalist/', html => html.replace('Player Guide', 'Research View Only')],
    ['survivor-meta/solo-q-generalist/', html => html.replace('Choose one:', 'No choice:')],
    ['survivor-meta/solo-q-generalist/', html => html.replace('Original Research Article', 'Missing article')],
    ['survivor-meta/solo-q-generalist/', html => html.replace('class="guide-article-body"', 'class="missing-article-body"')],
    ['survivor-meta/rescue-and-reset-support-family/', html => html.replace('Compare the approaches', 'No comparison')],
    ['survivor-meta/luck-based-self-unhook/', html => html.replace('What it was', 'No history')],
    ['survivor-meta/coordinated-swf-flex-generalist/', html => html.replace('No single four-perk loadout is implied', 'One fixed build')]
  ];
  for (const [route, mutate] of cases) {
    const f = fixture();
    f.pages.set(route, mutate ? mutate(f.pages.get(route)) : undefined);
    const result = await smoke({ baseUrl: 'https://example.test/dbd-helper/', fetchImpl: f.fetchImpl });
    assert.ok(result.failures.some(failure => failure.url === `https://example.test/dbd-helper/${route}`), route);
  }
});

test('network errors retry a bounded number of times and report the failed URL', async () => {
  const f = fixture();
  let attempts = 0;
  const fetchImpl = async url => {
    if (String(url).endsWith('/survivor-meta/solo-q-generalist/')) {
      attempts++;
      throw new Error('connection lost');
    }
    return f.fetchImpl(url);
  };
  const result = await smoke({ baseUrl: 'https://example.test/dbd-helper/', fetchImpl });
  assert.equal(attempts, 3);
  assert.ok(result.failures.some(failure => failure.url === 'https://example.test/dbd-helper/survivor-meta/solo-q-generalist/'));
});

test('CLI joins a nested base path and exits nonzero with the failing URL', async t => {
  const f = fixture();
  const paths = [];
  const server = http.createServer((req, res) => {
    paths.push(req.url);
    const key = req.url.replace(/^\/dbd-helper\//, '');
    res.statusCode = f.pages.has(key) && key !== 'survivor-meta/general-chase-looping/' ? 200 : 404;
    res.end(f.pages.get(key) || 'missing');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/dbd-helper/`;
  const child = spawn(process.execPath, [smokePath, '--base-url', base], { cwd: root });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exitCode = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(exitCode, 1);
  assert.ok(paths.includes('/dbd-helper/survivor-meta/general-chase-looping/'));
  assert.match(stderr, new RegExp(`${base}survivor-meta/general-chase-looping/`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('CLI accepts a bounded local release fixture built from 57 published guide copies', async t => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-survivor-release-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  fs.cpSync(path.join(root, 'content'), path.join(tempRoot, 'content'), { recursive: true });
  fs.cpSync(path.join(root, 'site'), path.join(tempRoot, 'site'), { recursive: true });
  for (const route of manifest) {
    const file = path.join(tempRoot, 'content/survivor/meta-guides', `${route.strategyId}.json`);
    const guide = JSON.parse(fs.readFileSync(file, 'utf8'));
    guide.reviewStatus = 'PUBLISHED';
    fs.writeFileSync(file, JSON.stringify(guide));
  }
  const built = buildSurvivorMetaSite({ rootDir: tempRoot });
  assert.equal(built.routes.length, 57);
  const server = http.createServer((req, res) => {
    const route = decodeURIComponent(req.url.split('?')[0]).replace(/^\/dbd-helper\//, '');
    const target = path.join(tempRoot, 'site', route, route.endsWith('/') || !route ? 'index.html' : '');
    try { res.end(fs.readFileSync(target)); }
    catch { res.statusCode = 404; res.end('missing'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/dbd-helper/`;
  const child = spawn(process.execPath, [smokePath, '--base-url', base], { cwd: root });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const exitCode = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(exitCode, 0, output);
  assert.match(output, /Checked 69 release URLs; 0 failures/);
});

test('CI preserves sequential preparation, validates, checks drift, and deploys only main', () => {
  const steps = [
    'python3 scripts/import-survivor-v15.py',
    'node scripts/build-survivor-data.mjs',
    'python3 scripts/import-survivor-meta.py',
    'node scripts/build-survivor-meta.mjs',
    'node scripts/survivor-meta-guide-validation.mjs',
    'python3 -m unittest discover',
    'node --test site/tests/*.test.mjs',
    'node scripts/verify-generated-artifacts.mjs',
    'actions/upload-pages-artifact'
  ];
  const positions = steps.map(step => workflow.indexOf(step));
  assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])), positions.join(','));
  assert.doesNotMatch(workflow, /--preview|--require-published/);
  assert.match(workflow, /Upload site\s*\n\s*if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(workflow, /deploy:\s*\n\s*if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(workflow, /node scripts\/smoke-survivor-meta\.mjs --base-url/);
  const deploy = workflow.slice(workflow.indexOf('\n  deploy:'));
  assert.ok(deploy.indexOf('actions/checkout@v4') >= 0 && deploy.indexOf('actions/checkout@v4') < deploy.indexOf('node scripts/smoke-survivor-meta.mjs --base-url'), 'deploy job needs the smoke script and canonical manifest');
});

test('cache upgrade removes v6, keeps shell only, and retains navigation/network behavior', async () => {
  const listeners = new Map();
  const deleted = [];
  const cached = [];
  const fetched = [];
  const responses = new Map();
  let offline = false;
  let shell = [];
  const cache = { addAll: async urls => { shell = urls; }, put: async (req, response) => { cached.push(req.url); responses.set(req.url, response); } };
  const caches = { open: async () => cache, keys: async () => ['dbd-field-guide-v6', 'dbd-field-guide-v7'], delete: async key => { deleted.push(key); }, match: async req => responses.get(typeof req === 'string' ? req : req.url) };
  const scope = 'https://example.test/dbd-helper/';
  const context = { self: { registration: { scope }, addEventListener: (name, fn) => listeners.set(name, fn), skipWaiting: async () => {}, clients: { claim: async () => {} } }, caches, URL, Promise, fetch: async req => { fetched.push(req.url); if (offline) throw new Error('offline'); return new Response('fresh'); } };
  vm.runInNewContext(sw, context);
  const run = name => new Promise((resolve, reject) => listeners.get(name)({ waitUntil: promise => promise.then(resolve, reject) }));
  await run('install');
  await run('activate');
  assert.match(sw, /dbd-field-guide-v7/);
  assert.deepEqual(deleted, ['dbd-field-guide-v6']);
  assert.ok(shell.includes(`${scope}survivor-meta/`));
  assert.equal(shell.filter(url => url.includes('/survivor-meta/')).length, 1);
  const detail = `${scope}survivor-meta/general-chase-looping/`;
  const request = (url, mode) => new Promise((resolve, reject) => listeners.get('fetch')({ request: { url, method: 'GET', mode }, respondWith: promise => promise.then(resolve, reject) }));
  const response = await request(detail, 'navigate');
  assert.equal(await response.text(), 'fresh');
  assert.deepEqual(fetched, [detail]);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(cached, [detail]);
  const asset = `${scope}assets/mobile-filter.js`;
  assert.equal(await (await request(asset, 'same-origin')).text(), 'fresh');
  assert.equal(await (await request(asset, 'same-origin')).text(), 'fresh');
  assert.deepEqual(fetched, [detail, asset], 'a cached asset must not refetch');
  offline = true;
  assert.equal(await (await request(detail, 'navigate')).text(), 'fresh');
  assert.match(sw, /if \(req\.mode === 'navigate'\)/);
  assert.match(sw, /fetch\(req\)/);
  assert.match(sw, /caches\.match\(req\)/);
});
