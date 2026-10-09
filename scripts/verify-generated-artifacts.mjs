import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Match canonical imports and builder outputs, not editorial/preview/user files.
const ARTIFACT_PATHS = [
  ':(top)content/survivor/perks/',
  ':(top,glob)site/assets/data-perks-*.js',
  ':(top)site/assets/data-meta.js',
  ':(top)content/survivor/meta/10.2.0-r1/',
  ':(top)site/assets/data-survivor-meta.js',
  ':(top)site/survivor-meta/'
];

export function verifyGeneratedArtifacts({ rootDir = process.cwd() } = {}) {
  // Diff uses Git's normalization even when stat-only status reports CRLF drift.
  // Check both comparisons so staged changes cannot be hidden by working files.
  // Disable optional index writes and renames; each NUL record is one path.
  const changedPaths = new Set();
  for (const command of [
    ['diff', '--name-only', '-z', '--no-renames'],
    ['diff', '--cached', '--name-only', '-z', '--no-renames'],
    ['ls-files', '--others', '--exclude-standard', '-z']
  ]) {
    const output = execFileSync('git', [
      '--no-optional-locks', '-C', rootDir, ...command, '--', ...ARTIFACT_PATHS
    ], { encoding: 'utf8' });
    for (const file of output.split('\0').filter(Boolean)) changedPaths.add(file);
  }
  const paths = [...changedPaths].sort();
  return { ok: paths.length === 0, paths };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyGeneratedArtifacts();
    console.log(result.ok ? 'Generated artifacts match Git' : result.paths.join('\n'));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
