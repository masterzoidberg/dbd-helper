import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPerkReferences, loadGuideContext, loadGuideRecords } from './survivor-meta-guide-source.mjs';

const excluded = new Set([
  'name', 'alternateName', 'source', 'sourceCharacter', 'isGeneralPerk', 'status',
  'currentLivePatchVerified', 'patchNote', 'plainEnglishSummary'
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const perkIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionValid = value => Number.isSafeInteger(value) && value > 0;
const indexPath = 'content/survivor/meta-guides/perk-review-index.json';

// Serialize keys directly: JS object enumeration otherwise reorders integer-like keys.
function sortedJson(value) {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${sortedJson(value[key])}`).join(',')}}`;
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error('Mechanics must contain JSON values');
  return json;
}

/** Exclude only the named mechanics metadata; nested/new mechanics remain included. */
export function fingerprintPerkMechanics(perk) {
  if (!object(perk?.mechanics)) throw new Error('Perk requires a mechanics object');
  const mechanics = Object.fromEntries(Object.entries(perk.mechanics).filter(([key]) => !excluded.has(key)));
  return createHash('sha256').update(sortedJson(mechanics)).digest('hex');
}

function indexErrors(index, previousIndex) {
  const errors = [];
  const fail = (message, at = '', perkId) => errors.push({ code: 'PERK_REVIEW_INDEX_INVALID', path: at, ...(perkId === undefined ? {} : { perkId }), message });
  if (!object(index) || index.schemaVersion !== 1 || !object(index.perks) || Object.keys(index).some(key => !['schemaVersion', 'perks'].includes(key))) {
    fail('Review index must be {schemaVersion:1, perks:{}}');
    return errors;
  }
  for (const [perkId, entry] of Object.entries(index.perks)) {
    const at = `/perks/${perkId}`;
    if (!perkIdPattern.test(perkId)) fail('Index key must be an exact canonical perk ID', at, perkId);
    if (!object(entry) || Object.keys(entry).some(key => !['mechanicsRevision', 'acknowledgedFingerprint'].includes(key))) {
      fail('Index entry must contain only mechanicsRevision and acknowledgedFingerprint', at, perkId);
      continue;
    }
    if (!revisionValid(entry.mechanicsRevision)) fail('Index mechanicsRevision must be a positive safe integer', `${at}/mechanicsRevision`, perkId);
    if (typeof entry.acknowledgedFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(entry.acknowledgedFingerprint)) {
      fail('Index acknowledgedFingerprint must be 64 lowercase hex characters', `${at}/acknowledgedFingerprint`, perkId);
    }
  }
  if (previousIndex !== undefined) {
    const previousErrors = indexErrors(previousIndex);
    if (previousErrors.length) return [...errors, ...previousErrors.map(error => ({ ...error, message: `Prior Git index: ${error.message}` }))];
    for (const [perkId, previous] of Object.entries(previousIndex.perks)) {
      if (!Object.hasOwn(index.perks, perkId)) fail('Retain previously used index entries; removal is forbidden', `/perks/${perkId}`, perkId);
      else if (index.perks[perkId]?.mechanicsRevision < previous.mechanicsRevision) fail('Index mechanicsRevision cannot decrease', `/perks/${perkId}/mechanicsRevision`, perkId);
    }
  }
  return errors;
}

/** Read-only review validation; structure/source validation remains with existing helpers. */
export function validatePerkReviews({ guide, context }) {
  const errors = indexErrors(context.reviewIndex, context.previousReviewIndex).map(error => ({ ...error, strategyId: guide.strategyId }));
  if (errors.length) return errors;
  const references = collectPerkReferences({ guide, context });
  const reviews = new Map();
  const fail = (code, message, perkId, at = '/perkReviews') => errors.push({ code, strategyId: guide.strategyId, ...(perkId === undefined ? {} : { perkId }), path: at, message });
  if (!Array.isArray(guide.perkReviews)) fail('PERK_REVIEWS_INVALID', 'perkReviews must be an array');
  else guide.perkReviews.forEach((review, position) => {
    const at = `/perkReviews/${position}`;
    if (!object(review) || typeof review.perkId !== 'string' || !perkIdPattern.test(review.perkId) || !revisionValid(review.mechanicsRevision) || Object.keys(review).some(key => !['perkId', 'mechanicsRevision'].includes(key))) {
      fail('PERK_REVIEWS_INVALID', 'Review requires an exact perkId and positive integer mechanicsRevision', review?.perkId, at);
      return;
    }
    if (reviews.has(review.perkId)) fail('PERK_REVIEWS_INVALID', 'Duplicate perkReview', review.perkId, at);
    if (!references.has(review.perkId)) fail('PERK_REVIEWS_INVALID', 'Extra perkReview is not an exact dependency', review.perkId, at);
    reviews.set(review.perkId, review);
  });
  for (const perkId of references) {
    if (!reviews.has(perkId)) fail('PERK_REVIEWS_INVALID', 'Missing perkReview for exact dependency', perkId);
    const entry = context.reviewIndex.perks[perkId];
    if (!entry || entry.acknowledgedFingerprint !== fingerprintPerkMechanics(context.perks.get(perkId))) {
      fail('PERK_CHANGE_CLASSIFICATION_REQUIRED', 'Classify the current canonical mechanics before guide review', perkId);
    } else if (reviews.has(perkId) && reviews.get(perkId).mechanicsRevision !== entry.mechanicsRevision) {
      fail('REVIEW_REQUIRED', `Review recorded revision ${reviews.get(perkId).mechanicsRevision}; classified revision is ${entry.mechanicsRevision}`, perkId);
    }
  }
  return errors;
}

/** Explicit human decision only. Keep evidence in the source-update PR/ledger, not mechanics copies. */
export function classifyPerkChange({ perkId, perk, index, classification, reason }) {
  const errors = indexErrors(index);
  if (errors.length) throw new Error(errors.map(error => error.message).join('; '));
  if (typeof perkId !== 'string' || !perkIdPattern.test(perkId) || perk?.id !== perkId) throw new Error('Perk must resolve by its exact canonical ID');
  if (!['PRESENTATION_ONLY', 'STRATEGY_SIGNIFICANT'].includes(classification)) throw new Error('Classification must be PRESENTATION_ONLY or STRATEGY_SIGNIFICANT');
  if (typeof reason !== 'string' || !reason.trim()) throw new Error('Classification requires a nonblank reason');
  const acknowledgedFingerprint = fingerprintPerkMechanics(perk);
  const previous = index.perks[perkId];
  if (previous?.acknowledgedFingerprint === acknowledgedFingerprint) throw new Error('No candidate change: mechanics fingerprint is unchanged');
  const mechanicsRevision = previous ? previous.mechanicsRevision + (classification === 'STRATEGY_SIGNIFICANT' ? 1 : 0) : 1;
  if (!revisionValid(mechanicsRevision)) throw new Error('Mechanics revision exceeds the safe integer range');
  const updated = structuredClone(index);
  updated.perks[perkId] = { mechanicsRevision, acknowledgedFingerprint };
  return updated;
}

function cliOptions(args) {
  const options = {};
  for (let position = 0; position < args.length; position += 2) {
    const flag = args[position];
    if (!['--perk', '--classification', '--reason'].includes(flag) || Object.hasOwn(options, flag) || typeof args[position + 1] !== 'string' || args[position + 1].startsWith('--')) {
      throw new Error('Usage: --perk <exact-id> --classification PRESENTATION_ONLY|STRATEGY_SIGNIFICANT --reason <review reason>');
    }
    options[flag] = args[position + 1];
  }
  if (Object.keys(options).length !== 3) throw new Error('Requires --perk, --classification and --reason');
  return { perkId: options['--perk'], classification: options['--classification'], reason: options['--reason'] };
}

function priorGitIndex(rootDir) {
  const git = args => execFileSync('git', ['--no-optional-locks', '-C', rootDir, ...args], { encoding: 'utf8' });
  // A missing index in a valid prior commit is initialization, not a Git/read failure.
  if (!git(['ls-tree', '--name-only', 'HEAD', '--', indexPath]).trim()) return { schemaVersion: 1, perks: {} };
  return JSON.parse(git(['show', `HEAD:${indexPath}`]));
}

function runCli(args) {
  const options = cliOptions(args);
  const rootDir = process.cwd();
  const context = loadGuideContext({ rootDir });
  const previousIndex = priorGitIndex(rootDir);
  const errors = indexErrors(context.reviewIndex, previousIndex);
  if (errors.length) throw new Error(errors.map(error => error.message).join('; '));
  const index = classifyPerkChange({ ...options, perk: context.perks.get(options.perkId), index: context.reviewIndex });
  const affectedStrategyIds = [...loadGuideRecords({ rootDir }).values()]
    .filter(guide => validatePerkReviews({ guide, context: { ...context, reviewIndex: index } }).some(error => error.code === 'REVIEW_REQUIRED' && error.perkId === options.perkId))
    .map(guide => guide.strategyId).sort();
  const oldEntry = context.reviewIndex.perks[options.perkId];
  const newEntry = index.perks[options.perkId];
  fs.writeFileSync(path.join(rootDir, indexPath), `${JSON.stringify(index, null, 2)}\n`);
  console.log(JSON.stringify({
    ...options, oldFingerprint: oldEntry?.acknowledgedFingerprint ?? null,
    newFingerprint: newEntry.acknowledgedFingerprint, oldRevision: oldEntry?.mechanicsRevision ?? null,
    newRevision: newEntry.mechanicsRevision, affectedStrategyIds
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
