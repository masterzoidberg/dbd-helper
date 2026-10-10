import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {
  buildRuntimeStrategies,
  buildSurvivorMetaSite,
  loadSurvivorMetaSource,
  writeDetailPages
} from '../../scripts/build-survivor-meta.mjs';
import { makeFixture } from './fixtures/survivor-meta-guide-fixture.mjs';

const rootDir = path.resolve(import.meta.dirname, '../..');
const release = '10.2.0-r1';

function copyRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-meta-build-'));
  fs.cpSync(path.join(rootDir, 'content'), path.join(tempRoot, 'content'), { recursive: true });
  fs.cpSync(path.join(rootDir, 'site'), path.join(tempRoot, 'site'), { recursive: true });
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return tempRoot;
}

function treeBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return treeBytes(file);
    if (entry.isSymbolicLink()) return [[file, `symlink:${fs.readlinkSync(file)}`]];
    return [[file, fs.readFileSync(file).toString('base64')]];
  });
}

function writeGuide(root, id, guide) {
  fs.writeFileSync(path.join(root, 'content/survivor/meta-guides', `${id}.json`), JSON.stringify(guide, null, 2));
}

function readRuntime(file) {
  const window = { DBD_DATA: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window });
  return JSON.parse(JSON.stringify(window.DBD_DATA.survivorStrategies));
}

function normalizedRoutes(root) {
  return loadSurvivorMetaSource({ rootDir: root, release }).manifest.map(item => {
    const route = item.slug.replace(/^\/+|\/+$/g, '');
    return `${route}/`;
  });
}

test('production gates editorial content, preview is isolated, and runtime stays canonical', t => {
  const tempRoot = copyRoot(t);
  const guideFile = path.join(tempRoot, 'content/survivor/meta-guides/P02.json');
  const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
  const editorialText = guide.page.summary;
  guide.reviewStatus = 'DRAFT';
  guide.reviewedDate = null;
  writeGuide(tempRoot, 'P02', guide);
  const productionBefore = treeBytes(path.join(tempRoot, 'site'));

  const production = buildSurvivorMetaSite({ rootDir: tempRoot, release });
  assert.deepEqual(production.routes, normalizedRoutes(tempRoot));
  assert.equal(production.routes.length, 57);
  const draftPage = fs.readFileSync(path.join(tempRoot, 'site/survivor-meta/flashbang-save/index.html'), 'utf8');
  assert.match(draftPage, /Research View Only/);
  assert.doesNotMatch(draftPage, new RegExp(editorialText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal((draftPage.match(/<h1\b/g) || []).length, 1);
  assert.match(draftPage, /<details data-guide-research/);
  assert.doesNotMatch(draftPage.match(/<details data-guide-research[^>]*>/)[0], /\bopen(?:\s|=|>)/);
  assert.match(draftPage, /Original Research Article/);
  assert.match(draftPage, /parts\.indexOf\('dbd-helper'\)/);

  const firstBytes = treeBytes(path.join(tempRoot, 'site'));
  buildSurvivorMetaSite({ rootDir: tempRoot, release });
  assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), firstBytes);

  const expectedRuntime = buildRuntimeStrategies({ rootDir: tempRoot, release });
  assert.deepEqual(readRuntime(path.join(tempRoot, 'site/assets/data-survivor-meta.js')), expectedRuntime);

  const previewRoot = path.join(os.tmpdir(), `survivor-meta-preview-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(previewRoot, { recursive: true, force: true }));
  const siteBeforePreview = treeBytes(path.join(tempRoot, 'site'));
  const preview = buildSurvivorMetaSite({ rootDir: tempRoot, release, preview: true, outputDir: previewRoot });
  assert.equal(preview.routes.length, 57);
  const previewPage = fs.readFileSync(path.join(previewRoot, 'survivor-meta/flashbang-save/index.html'), 'utf8');
  assert.match(previewPage, /Player Guide/);
  assert.match(previewPage, new RegExp(editorialText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), siteBeforePreview);
  assert.ok(fs.existsSync(path.join(previewRoot, 'survivor/guide/index.html')));
  assert.deepEqual(readRuntime(path.join(previewRoot, 'assets/data-survivor-meta.js')), expectedRuntime);
});

test('Stage 3B CRLF and LF inputs render identical production pages without rewriting source', t => {
  const tempRoot = copyRoot(t);
  const article = path.join(tempRoot, 'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages/C01-general-chase-looping.md');
  const original = fs.readFileSync(article, 'utf8').replace(/\r\n?/g, '\n');
  fs.writeFileSync(article, original);
  buildSurvivorMetaSite({ rootDir: tempRoot, release });
  const page = path.join(tempRoot, 'site/survivor-meta/general-chase-looping/index.html');
  const lfPage = fs.readFileSync(page);
  fs.writeFileSync(article, original.replace(/\n/g, '\r\n'));
  buildSurvivorMetaSite({ rootDir: tempRoot, release });
  assert.deepEqual(fs.readFileSync(page), lfPage);
  assert.equal(fs.readFileSync(article, 'utf8'), original.replace(/\n/g, '\r\n'));
});

test('missing, DRAFT, REVIEWED, and PUBLISHED records select the intended page mode', t => {
  const tempRoot = copyRoot(t);
  const reviewed = makeFixture({ reviewStatus: 'REVIEWED' }).guide;
  const published = makeFixture({ reviewStatus: 'PUBLISHED' }).guide;
  const reviewedText = reviewed.page.summary;
  const publishedText = published.page.summary;
  fs.rmSync(path.join(tempRoot, 'content/survivor/meta-guides/X02.json'));
  const draft = JSON.parse(fs.readFileSync(path.join(tempRoot, 'content/survivor/meta-guides/P02.json'), 'utf8'));
  draft.reviewStatus = 'DRAFT';
  draft.reviewedDate = null;
  writeGuide(tempRoot, 'P02', draft);

  writeGuide(tempRoot, 'X01', reviewed);
  buildSurvivorMetaSite({ rootDir: tempRoot, release });
  const reviewedPage = fs.readFileSync(path.join(tempRoot, 'site/survivor-meta/solo-q-generalist/index.html'), 'utf8');
  assert.match(reviewedPage, /Research View Only/);
  assert.doesNotMatch(reviewedPage, new RegExp(reviewedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  writeGuide(tempRoot, 'X01', published);
  buildSurvivorMetaSite({ rootDir: tempRoot, release });
  const publishedPage = fs.readFileSync(path.join(tempRoot, 'site/survivor-meta/solo-q-generalist/index.html'), 'utf8');
  assert.match(publishedPage, /Player Guide/);
  assert.match(publishedPage, new RegExp(publishedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const missingPage = fs.readFileSync(path.join(tempRoot, 'site/survivor-meta/coordinated-swf-flex-generalist/index.html'), 'utf8');
  assert.match(missingPage, /Research View Only/);
  const draftPage = fs.readFileSync(path.join(tempRoot, 'site/survivor-meta/flashbang-save/index.html'), 'utf8');
  assert.match(draftPage, /Research View Only/);
});

test('late invalid guides and renderer failures never mutate generated output', t => {
  for (const mutate of [
    root => fs.writeFileSync(path.join(root, 'content/survivor/meta-guides/Z99.json'), '{'),
    root => {
      const file = path.join(root, 'content/survivor/meta-guides/P02.json');
      const guide = JSON.parse(fs.readFileSync(file, 'utf8'));
      guide.snapshotId = 'P02@10.2.0-r2';
      writeGuide(root, 'P02', guide);
    },
    root => {
      const file = path.join(root, 'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages/R10-endgame-gate-escape-shell.md');
      fs.appendFileSync(file, '\n```unsafe\n');
    }
  ]) {
    const tempRoot = copyRoot(t);
    mutate(tempRoot);
    fs.writeFileSync(path.join(tempRoot, 'site/assets/data-survivor-meta.js'), 'sentinel-runtime');
    fs.mkdirSync(path.join(tempRoot, 'site/survivor-meta/support'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'site/survivor-meta/support/sentinel.txt'), 'support');
    const before = treeBytes(path.join(tempRoot, 'site'));
    assert.throws(() => buildSurvivorMetaSite({ rootDir: tempRoot, release }), error => error.name === 'GuideValidationError');
    assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), before);
  }
});

test('unsafe routes and preview destinations reject before mutation', t => {
  for (const slug of ['/survivor-meta/../escape', '/absolute/escape', '/outside/escape']) {
    const tempRoot = copyRoot(t);
    const manifestFile = path.join(tempRoot, 'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest[manifest.length - 1].slug = slug;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    const before = treeBytes(path.join(tempRoot, 'site'));
    assert.throws(() => buildSurvivorMetaSite({ rootDir: tempRoot, release }), error => error.name === 'GuideValidationError');
    assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), before);
  }

  const tempRoot = copyRoot(t);
  const before = treeBytes(path.join(tempRoot, 'site'));
  assert.throws(() => buildSurvivorMetaSite({ rootDir: tempRoot, release, preview: true, outputDir: path.join(tempRoot, 'site', 'preview') }), /OUTPUT_PATH_INVALID/);
  assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), before);

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-meta-preview-alias-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const alias = path.join(outside, 'alias');
  try {
    fs.symlinkSync(path.join(tempRoot, 'site'), alias, 'junction');
  } catch (error) {
    t.skip(`directory junction unavailable: ${error.code}`);
    return;
  }
  assert.throws(() => buildSurvivorMetaSite({ rootDir: tempRoot, release, preview: true, outputDir: alias }), /OUTPUT_PATH_INVALID/);
  assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), before);

  const productionEscapeRoot = copyRoot(t);
  const outsideDetail = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-meta-route-escape-'));
  t.after(() => fs.rmSync(outsideDetail, { recursive: true, force: true }));
  const escapedRoute = path.join(productionEscapeRoot, 'site/survivor-meta/general-chase-looping');
  fs.rmSync(escapedRoute, { recursive: true, force: true });
  try {
    fs.symlinkSync(outsideDetail, escapedRoute, 'junction');
  } catch (error) {
    t.skip(`directory junction unavailable for route test: ${error.code}`);
    return;
  }
  const productionBeforeEscape = treeBytes(path.join(productionEscapeRoot, 'site'));
  assert.throws(() => buildSurvivorMetaSite({ rootDir: productionEscapeRoot, release }), /OUTPUT_PATH_INVALID/);
  assert.deepEqual(treeBytes(path.join(productionEscapeRoot, 'site')), productionBeforeEscape);
});

test('detail writer validates before deletion and preserves support routes', t => {
  const tempRoot = copyRoot(t);
  const guideFile = path.join(tempRoot, 'content/survivor/meta-guides/P02.json');
  const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
  guide.snapshotId = 'P02@10.2.0-r2';
  writeGuide(tempRoot, 'P02', guide);
  fs.mkdirSync(path.join(tempRoot, 'site/survivor-meta/support'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'site/survivor-meta/index.html'), 'index-sentinel');
  fs.writeFileSync(path.join(tempRoot, 'site/survivor-meta/support/index.html'), 'support-sentinel');
  const before = treeBytes(path.join(tempRoot, 'site'));
  assert.throws(() => writeDetailPages({ rootDir: tempRoot, release }), error => error.name === 'GuideValidationError');
  assert.deepEqual(treeBytes(path.join(tempRoot, 'site')), before);
});

test('dangling runtime, detail, and preview path components reject before mutation', t => {
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';

  const runtimeRoot = copyRoot(t);
  const runtimeAlias = path.join(runtimeRoot, 'site/assets/dangling-runtime');
  fs.symlinkSync(path.join(runtimeRoot, 'missing-runtime-target'), runtimeAlias, symlinkType);
  const runtimeBefore = treeBytes(path.join(runtimeRoot, 'site'));
  assert.throws(
    () => buildSurvivorMetaSite({
      rootDir: runtimeRoot,
      release,
      outputPath: path.join(runtimeAlias, 'data-survivor-meta.js')
    }),
    error => error.name === 'GuideValidationError' && /OUTPUT_PATH_INVALID/.test(error.message)
  );
  assert.deepEqual(treeBytes(path.join(runtimeRoot, 'site')), runtimeBefore);

  const detailRoot = copyRoot(t);
  const detailAlias = path.join(detailRoot, 'site/survivor-meta/general-chase-looping');
  fs.rmSync(detailAlias, { recursive: true, force: true });
  fs.symlinkSync(path.join(detailRoot, 'missing-detail-target'), detailAlias, symlinkType);
  const detailBefore = treeBytes(path.join(detailRoot, 'site'));
  assert.throws(
    () => buildSurvivorMetaSite({ rootDir: detailRoot, release }),
    error => error.name === 'GuideValidationError' && /OUTPUT_PATH_INVALID/.test(error.message)
  );
  assert.deepEqual(treeBytes(path.join(detailRoot, 'site')), detailBefore);

  const previewRoot = copyRoot(t);
  const previewParent = fs.mkdtempSync(path.join(os.tmpdir(), 'survivor-meta-dangling-preview-'));
  t.after(() => fs.rmSync(previewParent, { recursive: true, force: true }));
  const previewAlias = path.join(previewParent, 'preview');
  fs.symlinkSync(path.join(previewParent, 'missing-preview-target'), previewAlias, symlinkType);
  const previewBefore = treeBytes(path.join(previewRoot, 'site'));
  assert.throws(
    () => buildSurvivorMetaSite({ rootDir: previewRoot, release, preview: true, outputDir: previewAlias }),
    error => error.name === 'GuideValidationError' && /OUTPUT_PATH_INVALID/.test(error.message)
  );
  assert.deepEqual(treeBytes(path.join(previewRoot, 'site')), previewBefore);
});
