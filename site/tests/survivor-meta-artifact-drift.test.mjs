import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyGeneratedArtifacts } from '../../scripts/verify-generated-artifacts.mjs';

const checkerPath = path.resolve(import.meta.dirname, '../../scripts/verify-generated-artifacts.mjs');
const baseline = [
  'content/survivor/perks/001-005/001-example.json',
  'site/assets/data-perks-01.js',
  'site/assets/data-meta.js',
  'content/survivor/meta/10.2.0-r1/stage3a/strategies.json',
  'site/assets/data-survivor-meta.js',
  'site/survivor-meta/example/index.html'
];

function git(rootDir, ...args) {
  return execFileSync('git', ['-C', rootDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function write(rootDir, file, contents = 'baseline\n') {
  const target = path.join(rootDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function repository(t, { autocrlf = 'false', attributes = '' } = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbd-artifact-drift-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  git(rootDir, 'init');
  git(rootDir, 'config', 'user.name', 'Artifact drift test');
  git(rootDir, 'config', 'user.email', 'artifact-drift@example.invalid');
  git(rootDir, 'config', 'commit.gpgsign', 'false');
  git(rootDir, 'config', 'core.autocrlf', autocrlf);
  git(rootDir, 'config', 'core.safecrlf', 'false');
  if (attributes) write(rootDir, '.gitattributes', attributes);
  for (const file of baseline) write(rootDir, file);
  git(rootDir, 'add', '--', '.');
  git(rootDir, 'commit', '-m', 'Generated baseline');
  return rootDir;
}

function verifyWithoutChangingIndex(rootDir, expected) {
  const indexPath = path.join(rootDir, '.git/index');
  const before = fs.readFileSync(indexPath);
  assert.deepEqual(verifyGeneratedArtifacts({ rootDir }), expected);
  assert.deepEqual(fs.readFileSync(indexPath), before, 'verification must not change the caller index');
}

function cli(rootDir) {
  return spawnSync(process.execPath, [checkerPath], { cwd: rootDir, encoding: 'utf8' });
}

test('drift catches tracked changes and untracked generated additions', async t => {
  const additions = [
    'content/survivor/perks/006-010/006-added.json',
    'site/assets/data-perks-99.js',
    'site/assets/data-meta.js',
    'content/survivor/meta/10.2.0-r1/stage3b/strategy-pages/added.md',
    'site/assets/data-survivor-meta.js',
    'site/survivor-meta/new strategy café/index.html'
  ];
  for (const [index, file] of baseline.entries()) {
    await t.test(file, t => {
      const rootDir = repository(t);
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });

      write(rootDir, file, 'modified canonical content\n');
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [file] });
      git(rootDir, 'add', '--', file);
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [file] });
      // A staged change remains drift even when the working file matches HEAD.
      write(rootDir, file);
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [file] });
      git(rootDir, 'add', '--', file);
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });

      fs.unlinkSync(path.join(rootDir, file));
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [file] });
      git(rootDir, 'add', '--', file);
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [file] });
      git(rootDir, 'commit', '-m', 'Remove fixture artifact');

      const addition = additions[index];
      write(rootDir, addition, 'added artifact\n');
      const result = verifyGeneratedArtifacts({ rootDir });
      assert.equal(result.ok, false);
      assert.ok(result.paths.includes(addition));
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [addition] });
      git(rootDir, 'add', '--', addition);
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [addition] });
    });
  }

  await t.test('CLI reports sorted paths and leaves untracked additions unstaged', t => {
    const rootDir = repository(t);
    const clean = cli(rootDir);
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(clean.stdout.trim(), 'Generated artifacts match Git');
    write(rootDir, 'site/assets/data-perks-99.js');
    write(rootDir, 'content/survivor/perks/006-010/006-added.json');
    const expected = ['content/survivor/perks/006-010/006-added.json', 'site/assets/data-perks-99.js'];
    verifyWithoutChangingIndex(rootDir, { ok: false, paths: expected });
    const before = fs.readFileSync(path.join(rootDir, '.git/index'));
    const dirty = cli(rootDir);
    assert.equal(dirty.status, 1, dirty.stderr);
    assert.deepEqual(dirty.stdout.trim().split(/\r?\n/), expected);
    assert.deepEqual(fs.readFileSync(path.join(rootDir, '.git/index')), before);
    assert.equal(git(rootDir, 'diff', '--cached', '--name-only', '-z'), '');
  });

  await t.test('renames retain both changed paths without Git quoting', t => {
    const rootDir = repository(t);
    const source = 'site/survivor-meta/example/index.html';
    const destination = 'site/survivor-meta/renamed café/index.html';
    fs.mkdirSync(path.dirname(path.join(rootDir, destination)), { recursive: true });
    git(rootDir, 'mv', '--', source, destination);
    verifyWithoutChangingIndex(rootDir, { ok: false, paths: [source, destination] });
    if (process.platform !== 'win32') {
      const newlinePath = 'site/survivor-meta/line\nbreak/index.html';
      write(rootDir, newlinePath);
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: [source, newlinePath, destination] });
    }
  });
});

test('drift respects Git line endings and ignores unrelated artifacts', async t => {
  for (const settings of [
    { autocrlf: 'true' },
    { autocrlf: 'false', attributes: '* text=auto\n' }
  ]) {
    await t.test(JSON.stringify(settings), t => {
      const rootDir = repository(t, settings);
      for (const file of baseline) {
        assert.equal(git(rootDir, 'show', `HEAD:${file}`), 'baseline\n');
        write(rootDir, file, 'baseline\r\n');
      }
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });
      for (const file of [
        'survivor-meta.zip',
        'site/preview/index.html',
        'content/survivor/editorial-metadata.json',
        '.superpowers/user-notes.md',
        'site/assets/app-pages.js',
        'site/assets/data-perks-99.js.preview',
        'content/survivor/meta/other-release/strategies.json'
      ]) write(rootDir, file);
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });
      git(rootDir, 'add', '--', '.');
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });
      git(rootDir, 'commit', '-m', 'Unrelated baseline');
      write(rootDir, 'site/preview/index.html', 'changed preview\n');
      write(rootDir, 'survivor-meta.zip', 'changed archive\n');
      verifyWithoutChangingIndex(rootDir, { ok: true, paths: [] });
      write(rootDir, baseline[1], 'real change\r\n');
      verifyWithoutChangingIndex(rootDir, { ok: false, paths: ['site/assets/data-perks-01.js'] });
    });
  }
});
