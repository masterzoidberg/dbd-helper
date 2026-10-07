import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const cssPath = path.join(root, 'site/assets/mobile-filter.css');
const jsPath = path.join(root, 'site/assets/mobile-filter.js');
const htmlPath = path.join(root, 'site/survivor/perks/index.html');
const swPath = path.join(root, 'site/sw.js');

test('mobile filter is an off-canvas drawer with a persistent right-edge tab', () => {
  assert.equal(fs.existsSync(cssPath), true, 'mobile-filter.css should exist');
  assert.equal(fs.existsSync(jsPath), true, 'mobile-filter.js should exist');

  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(css, /@media \(max-width:\s*920px\)/);
  assert.match(css, /\.mobile-filter-shell[\s\S]*position:\s*fixed/);
  assert.match(css, /transform:\s*translateX\(100%\)/);
  assert.match(css, /\.mobile-filter-shell\.is-open[\s\S]*translateX\(0\)/);
  assert.match(css, /\.mobile-filter-tab/);
  assert.match(js, /mobile-filter-shell/);
  assert.match(js, /aria-expanded/);
  assert.match(js, /classList\.toggle\('is-open'\)/);
});

test('survivor page loads the mobile drawer assets and service worker refreshes them', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sw = fs.readFileSync(swPath, 'utf8');

  assert.match(html, /assets\/mobile-filter\.css/);
  assert.match(html, /assets\/mobile-filter\.js/);
  assert.match(sw, /dbd-field-guide-v4/);
  assert.match(sw, /assets\/mobile-filter\.css/);
  assert.match(sw, /assets\/mobile-filter\.js/);
});
