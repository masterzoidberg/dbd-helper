import { isDeepStrictEqual } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuideContext, derivePageKind, resolveCanonicalPlan, resolveSourceReceipt } from './survivor-meta-guide-source.mjs';
import { validatePerkReviews } from './survivor-meta-perk-review.mjs';

// Deliberately limited to the vocabulary in the checked-in guide schema.
const keywords = new Set([
  '$ref', '$defs', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties',
  'oneOf', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'pattern', 'minimum', 'maximum'
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pointerPart = key => String(key).replace(/~/g, '~0').replace(/\//g, '~1');

function resolveRef(root, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/$defs/')) {
    throw new Error(`Only local $defs refs are supported: ${ref}`);
  }
  let target = root;
  for (const part of ref.slice(2).split('/')) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!object(target) || !Object.hasOwn(target, key)) throw new Error(`Unresolved schema ref: ${ref}`);
    target = target[key];
  }
  return target;
}

function checkSchema(node, root) {
  if (!object(node)) throw new Error('Schema nodes must be objects');
  for (const key of Object.keys(node)) {
    if (!keywords.has(key)) throw new Error(`Unsupported schema keyword: ${key}`);
  }
  if (node.$ref !== undefined) resolveRef(root, node.$ref);
  if (node.pattern !== undefined) new RegExp(node.pattern);
  for (const child of Object.values(node.$defs || {})) checkSchema(child, root);
  for (const child of Object.values(node.properties || {})) checkSchema(child, root);
  for (const child of node.oneOf || []) checkSchema(child, root);
  if (node.items !== undefined) checkSchema(node.items, root);
  if (object(node.additionalProperties)) checkSchema(node.additionalProperties, root);
}

function matchesType(value, type) {
  switch (type) {
    case 'object': return object(value);
    case 'array': return Array.isArray(value);
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'null': return value === null;
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    default: throw new Error(`Unsupported schema type: ${type}`);
  }
}

// Prefer the declared variant/member before counting errors inside its payload.
// Otherwise a badly malformed COMPLETE plan can look closer to a canonical ref.
function branchAffinity(value, branch, root) {
  if (branch.$ref) return branchAffinity(value, resolveRef(root, branch.$ref), root);
  if (!object(value)) return 0;
  let score = 0;
  for (const [key, rule] of Object.entries(branch.properties || {})) {
    if (!Object.hasOwn(value, key)) continue;
    if (Object.hasOwn(rule, 'const')) score += isDeepStrictEqual(value[key], rule.const) ? 10 : -10;
    if (rule.enum) score += rule.enum.some(item => isDeepStrictEqual(value[key], item)) ? 10 : -10;
  }
  for (const key of branch.required || []) score += Object.hasOwn(value, key) ? 1 : -1;
  return score;
}

function validate(value, node, root, path) {
  const errors = [];
  const fail = (message, at = path) => errors.push({ code: 'STRUCTURE_INVALID', path: at, message });
  if (node.$ref !== undefined) errors.push(...validate(value, resolveRef(root, node.$ref), root, path));
  if (node.type !== undefined && !matchesType(value, node.type)) {
    fail(`Expected ${node.type}`);
    return errors;
  }
  if (Object.hasOwn(node, 'const') && !isDeepStrictEqual(value, node.const)) fail('Value does not match const');
  if (node.enum !== undefined && !node.enum.some(candidate => isDeepStrictEqual(value, candidate))) fail('Value is not in enum');
  if (object(value)) {
    for (const key of node.required || []) {
      if (!Object.hasOwn(value, key)) fail(`Missing required field: ${key}`, `${path}/${pointerPart(key)}`);
    }
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}/${pointerPart(key)}`;
      if (Object.hasOwn(node.properties || {}, key)) {
        errors.push(...validate(child, node.properties[key], root, childPath));
      } else if (node.additionalProperties === false) {
        fail(`Unknown field: ${key}`, childPath);
      } else if (object(node.additionalProperties)) {
        errors.push(...validate(child, node.additionalProperties, root, childPath));
      }
    }
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) fail(`Expected at least ${node.minItems} items`);
    if (node.maxItems !== undefined && value.length > node.maxItems) fail(`Expected at most ${node.maxItems} items`);
    if (node.uniqueItems && value.some((item, index) => value.slice(0, index).some(previous => isDeepStrictEqual(item, previous)))) {
      fail('Array items must be unique');
    }
    if (node.items !== undefined) {
      value.forEach((item, index) => errors.push(...validate(item, node.items, root, `${path}/${index}`)));
    }
  }
  if (typeof value === 'string') {
    if (node.minLength !== undefined && [...value].length < node.minLength) fail(`Expected at least ${node.minLength} characters`);
    if (node.pattern !== undefined && !new RegExp(node.pattern).test(value)) fail('Text does not match the required pattern');
  }
  if (typeof value === 'number') {
    if (node.minimum !== undefined && value < node.minimum) fail(`Expected a value >= ${node.minimum}`);
    if (node.maximum !== undefined && value > node.maximum) fail(`Expected a value <= ${node.maximum}`);
  }
  if (node.oneOf !== undefined) {
    const branches = node.oneOf.map(branch => validate(value, branch, root, path));
    const matches = branches.filter(branch => branch.length === 0).length;
    if (matches !== 1) {
      fail(`Expected exactly one schema alternative; matched ${matches}`);
      if (matches === 0) {
        const candidates = branches.map((errors, index) => ({ errors, score: branchAffinity(value, node.oneOf[index], root) }));
        candidates.sort((a, b) => b.score - a.score || a.errors.length - b.errors.length);
        errors.push(...candidates[0].errors);
      }
    }
  }
  return errors;
}

/** Validate a parsed guide; schema configuration errors throw, guide errors return diagnostics. */
export function validateGuideStructure(guide, schema) {
  checkSchema(schema, schema);
  return validate(guide, schema, schema, '');
}

const defaultRoot = path.resolve(import.meta.dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sortDiagnostics = errors => errors.sort((a, b) =>
  compareText(a.strategyId || '', b.strategyId || '') || compareText(a.file || '', b.file || '') ||
  compareText(a.path, b.path) || compareText(a.code, b.code) || compareText(a.perkId || '', b.perkId || '') || compareText(a.message, b.message));

function calendarDate(value) {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Structural checks precede source joins; diagnostics never repair or rebind inputs. */
export function validateGuide({ guide, context, schema }) {
  const errors = validateGuideStructure(guide, schema).map(error => ({ ...error, strategyId: guide?.strategyId }));
  if (errors.length) return sortDiagnostics(errors);
  const fail = (code, at, message) => errors.push({ code, strategyId: guide.strategyId, path: at, message });
  const strategy = context.strategies.get(guide.strategyId);
  const snapshot = context.snapshotByStrategy.get(guide.strategyId);
  if (!strategy || strategy.id !== guide.strategyId || !snapshot || snapshot.strategyId !== guide.strategyId) {
    fail('IDENTITY_INVALID', '/strategyId', 'Use an exact existing strategy with its owned current snapshot');
    return errors;
  }
  if (guide.snapshotId !== snapshot.snapshotId || context.snapshots.get(guide.snapshotId)?.strategyId !== guide.strategyId) {
    fail('SNAPSHOT_REVIEW_REQUIRED', '/snapshotId', `Re-review against current owned snapshot ${snapshot.snapshotId}; recorded ${guide.snapshotId}`);
  }
  const page = guide.page;
  const kind = derivePageKind(strategy, snapshot);
  if (page.kind !== kind) fail('PAGE_KIND_INVALID', '/page/kind', `Canonical strategy requires ${kind}, not ${page.kind}`);

  function receipt(source, at) {
    try { resolveSourceReceipt(source, context); }
    catch (error) { fail('SOURCE_INVALID', at, error.message); }
  }
  function date(value, at) {
    if (!calendarDate(value)) fail('DATE_INVALID', at, `Use a real ISO calendar date; recorded ${value}`);
  }
  date(guide.perkBaseline.verifiedDate, '/perkBaseline/verifiedDate');
  if (guide.reviewedDate !== null) date(guide.reviewedDate, '/reviewedDate');
  (guide.sources || []).forEach((source, index) => receipt(source, `/sources/${index}`));

  const unavailable = evaluation => ['NOT_APPLICABLE', 'NOT_CURRENT'].includes(evaluation?.rankingStatus);
  function environment(value, at) {
    if ((['SOLO_Q', 'BOTH'].includes(value) && unavailable(snapshot.solo)) ||
        (['COORDINATED_SWF', 'BOTH'].includes(value) && unavailable(snapshot.swf))) {
      fail('ENVIRONMENT_INVALID', at, `${value} includes a canonical Not Applicable/Not Current environment`);
    }
  }
  const ids = new Map();
  const plans = new Map();
  const items = new Map();
  const mechanics = new Set();
  const roles = new Set();
  const usedPerks = new Set();
  const selected = [];
  const traps = new Set();
  const reservedBuildIds = new Set([...context.snapshotByStrategy.values()].flatMap(record => (record.buildImplementations || []).map(build => build.buildId)));
  function declare(id, at) {
    if (ids.has(id)) fail('ID_CONFLICT', at, `ID ${id} already declared at ${ids.get(id)}; use a guide-wide unique ID`);
    else ids.set(id, at);
  }
  function perk(perkId, at) {
    if (!context.perks.has(perkId)) fail('PERK_ID_INVALID', at, `Unresolved exact canonical perk ID: ${perkId}`);
    usedPerks.add(perkId);
  }
  function build(buildId, team, at) {
    const matches = (snapshot.buildImplementations || []).filter(value => value.buildId === buildId);
    if (matches.length !== 1 || !buildId.startsWith(`${snapshot.snapshotId}:`)) {
      fail('BUILD_INVALID', at, `${buildId} must resolve to one build owned by ${snapshot.snapshotId}`);
      return;
    }
    if ((Array.isArray(matches[0].teamComposition) && matches[0].teamComposition.length > 0) !== team) {
      fail('BUILD_INVALID', at, `Expected ${team ? 'team composition' : 'individual'} build, not ${buildId}`);
      return;
    }
    return matches[0];
  }
  function loadout(value, at) {
    if (!value) return;
    const ownedPlans = new Map();
    (value.plans || []).forEach((authored, index) => {
      const planPath = `${at}/plans/${index}`;
      const id = authored.provenance === 'CANONICAL' ? authored.buildId : authored.id;
      declare(id, `${planPath}/${authored.provenance === 'CANONICAL' ? 'buildId' : 'id'}`);
      let resolved = authored;
      if (authored.provenance === 'CANONICAL') {
        if (!build(authored.buildId, false, `${planPath}/buildId`)) return;
        try { resolved = resolveCanonicalPlan({ context, strategyId: guide.strategyId, buildId: authored.buildId, notes: authored.notes }); }
        catch (error) { fail('BUILD_INVALID', planPath, error.message); return; }
      } else if (reservedBuildIds.has(id)) fail('ID_CONFLICT', `${planPath}/id`, 'Authored plan ID cannot collide with a canonical buildId');
      const canonical = authored.provenance === 'CANONICAL';
      environment(resolved.environment, `${planPath}/${canonical ? 'buildId' : 'environment'}`);
      const slots = new Map();
      const selectable = new Map();
      resolved.slots.forEach((slot, position) => {
        const noteIndex = canonical ? (authored.notes || []).findIndex(note => note.slot === slot.slot) : -1;
        const slotPath = canonical ? (noteIndex < 0 ? `${planPath}/buildId` : `${planPath}/notes/${noteIndex}`) : `${planPath}/slots/${position}`;
        if (slots.has(slot.slot)) fail('SLOT_CONFLICT', `${slotPath}/slot`, `Duplicate equipped slot ${slot.slot}`);
        slots.set(slot.slot, slot);
        if (slot.usage === 'REQUIRED' && (slot.choices.length !== 1 || slot.substitutes?.length)) {
          fail('SLOT_CONFLICT', slotPath, 'REQUIRED identity must be one perk without replacements');
        }
        for (const [members, field] of [[slot.choices, 'choices'], [slot.substitutes || [], 'substitutes']]) {
          members.forEach((member, memberIndex) => {
            const memberPath = canonical && field === 'choices' ? `${planPath}/buildId` : `${slotPath}/${field}/${memberIndex}`;
            const perkPath = canonical && field === 'choices' ? memberPath : `${memberPath}/perkId`;
            perk(member.perkId, perkPath);
            if (selectable.has(member.perkId)) fail('SLOT_CONFLICT', perkPath, `${member.perkId} is already selectable at ${selectable.get(member.perkId)}; choices/replacements must be unique within a plan`);
            else selectable.set(member.perkId, memberPath);
            selected.push({ perkId: member.perkId, path: perkPath });
            if (field === 'substitutes') { receipt(member.source, `${memberPath}/source`); date(member.reviewedDate, `${memberPath}/reviewedDate`); }
          });
        }
      });
      if (resolved.completeness === 'COMPLETE' && [1, 2, 3, 4].some(number => !slots.has(number))) {
        fail('SLOT_CONFLICT', `${planPath}/slots`, 'COMPLETE must define exactly equipped slots 1, 2, 3 and 4');
      }
      ownedPlans.set(id, slots);
      plans.set(id, slots);
    });
    (value.options || []).forEach((option, index) => {
      const optionPath = `${at}/options/${index}`;
      perk(option.perkId, `${optionPath}/perkId`);
      if (option.usage === 'OUTDATED_TRAP') traps.add(option.perkId);
      if (value.options.slice(0, index).some(previous => previous.perkId === option.perkId)) {
        fail('OPTION_CONFLICT', `${optionPath}/perkId`, `Duplicate advisory option ${option.perkId} in this loadout`);
      }
      if (option.usage === 'ALTERNATIVE') {
        const slot = ownedPlans.get(option.replaces.planId)?.get(option.replaces.slot);
        if (!slot) fail('OPTION_CONFLICT', `${optionPath}/replaces`, 'ALTERNATIVE must target an actual slot owned by this loadout');
        else if (slot.usage === 'REQUIRED') fail('OPTION_CONFLICT', `${optionPath}/replaces`, 'Cannot replace a REQUIRED perk identity');
        else if (slot.choices.some(choice => choice.perkId === option.perkId) || slot.substitutes?.some(sub => sub.perkId === option.perkId)) {
          fail('OPTION_CONFLICT', `${optionPath}/perkId`, 'ALTERNATIVE must be different from the target slot members');
        } else if ([...ownedPlans.get(option.replaces.planId)].some(([number, other]) => number !== option.replaces.slot &&
          [...other.choices, ...(other.substitutes || [])].some(member => member.perkId === option.perkId))) {
          fail('OPTION_CONFLICT', `${optionPath}/perkId`, 'Replacement perk is already selectable in another slot of the target plan');
        }
      }
    });
    if (value.item) {
      declare(value.item.id, `${at}/item/id`);
      items.set(value.item.id, value.item);
    }
  }
  loadout(page.loadout, '/page/loadout');
  (page.roles || []).forEach((role, index) => {
    declare(role.id, `/page/roles/${index}/id`); roles.add(role.id);
    loadout(role.loadout, `/page/roles/${index}/loadout`);
  });
  (page.mechanics || []).forEach((mechanic, index) => {
    declare(mechanic.id, `/page/mechanics/${index}/id`); mechanics.add(mechanic.id);
  });
  for (const member of selected) if (traps.has(member.perkId)) fail('OPTION_CONFLICT', member.path, `${member.perkId} is marked OUTDATED_TRAP and cannot be selectable`);
  (page.canonicalTeamBuildIds || []).forEach((id, index) => build(id, true, `/page/canonicalTeamBuildIds/${index}`));

  function strategyRefs(values, at, uniqueKey, extra) {
    const seen = new Set();
    (values || []).forEach((value, index) => {
      const target = value.strategyId;
      const key = uniqueKey(value);
      if (!context.strategies.has(target) || target === guide.strategyId || seen.has(key)) {
        fail('STRATEGY_REFERENCE_INVALID', `${at}/${index}/strategyId`, `Reference ${target} must be exact, nonself and unique`);
      }
      seen.add(key);
      if (extra) extra(value, `${at}/${index}/strategyId`);
    });
  }
  strategyRefs(page.related, '/page/related', value => `${value.strategyId}:${value.relationship}`);
  if (page.kind === 'FAMILY') {
    const expected = strategy.subtypeIds || [];
    strategyRefs(page.comparisons, '/page/comparisons', value => value.strategyId);
    const actual = page.comparisons.map(value => value.strategyId);
    if (actual.length !== expected.length || expected.some(id => actual.filter(value => value === id).length !== 1)) {
      fail('FAMILY_COVERAGE_INVALID', '/page/comparisons', `Cover every canonical subtype exactly once: ${expected.join(', ')}`);
    }
  }
  if (page.kind === 'LEGACY') {
    const supported = snapshot.analysis?.replacementStrategyIds || [];
    strategyRefs(page.successors, '/page/successors', value => value.strategyId, (value, at) => {
      const current = context.snapshotByStrategy.get(value.strategyId);
      if (!supported.includes(value.strategyId) || !current || current.currentStatus === 'LEGACY' ||
          current.solo?.rankingStatus === 'NOT_CURRENT' || current.swf?.rankingStatus === 'NOT_CURRENT') {
        fail('SUCCESSOR_INVALID', at, `Successor must be current and source-supported: ${supported.join(', ')}`);
      }
    });
  }
  const gameplay = page.gameplay;
  if (gameplay) {
    const field = { DECISIONS: 'rows', SEQUENCE: 'steps', ROLE_GUIDE: 'priorities' }[gameplay.type];
    const rowIds = new Set();
    gameplay[field].forEach((row, index) => {
      const at = `/page/gameplay/${field}/${index}`;
      if (rowIds.has(row.id)) fail('ID_CONFLICT', `${at}/id`, `Duplicate gameplay ID ${row.id}`);
      rowIds.add(row.id);
      (row.enabledBy || []).forEach((ref, position) => {
        const separator = ref.indexOf(':');
        const prefix = ref.slice(0, separator), id = ref.slice(separator + 1);
        let valid = false;
        if (prefix === 'perk') valid = usedPerks.has(id) && context.perks.has(id) && !traps.has(id);
        if (prefix === 'slot') {
          const hash = id.lastIndexOf('#');
          valid = plans.get(id.slice(0, hash))?.has(Number(id.slice(hash + 1))) || false;
        }
        if (prefix === 'item') valid = items.has(id) && items.get(id).status !== 'NONE';
        if (prefix === 'mechanic') valid = mechanics.has(id);
        if (prefix === 'role') valid = page.kind === 'TEAM' && roles.has(id);
        if (!valid) fail('ENABLER_INVALID', `${at}/enabledBy/${position}`, `${ref} must resolve to a relevant declared ${prefix} within this guide`);
      });
    });
  }
  // Source/build/enabler failures already explain unsafe dependency resolution.
  if (!errors.length) {
    try { errors.push(...validatePerkReviews({ guide, context })); }
    catch (error) { fail('DEPENDENCY_INVALID', '/perkReviews', error.message); }
  }
  return sortDiagnostics(errors);
}

/** Validate all existing files, including unpublished records; absence is not scaffolding. */
export function validateGuideCatalog({ rootDir = defaultRoot, release = '10.2.0-r1', requirePublished = false } = {}) {
  const diagnostics = [];
  const guides = new Map();
  const counts = { missing: 0, DRAFT: 0, REVIEWED: 0, PUBLISHED: 0 };
  const directory = path.join(rootDir, 'content/survivor/meta-guides');
  let context, schema;
  try {
    context = loadGuideContext({ rootDir, release });
    // The checked-in contract is validator configuration, not a guide fallback.
    schema = readJson(path.join(defaultRoot, 'content/survivor/meta-guides/schema.json'));
    checkSchema(schema, schema);
  } catch (error) {
    diagnostics.push({ code: 'CATALOG_CONTEXT_INVALID', file: directory, path: '', message: error.message });
  }
  if (context && schema) {
    const existing = new Set();
    const published = new Set();
    try {
      const entries = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }) : [];
      for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
        if (!entry.isFile() || !entry.name.endsWith('.json') || ['schema.json', 'perk-review-index.json'].includes(entry.name)) continue;
        const file = path.join(directory, entry.name);
        const strategyId = entry.name.slice(0, -5);
        if (context.strategies.has(strategyId)) existing.add(strategyId);
        let guide;
        try { guide = readJson(file); }
        catch (error) { diagnostics.push({ code: 'GUIDE_PARSE_INVALID', strategyId, file, path: '', message: error.message }); continue; }
        guides.set(strategyId, guide);
        if (guide?.strategyId !== strategyId || !context.strategies.has(strategyId)) {
          diagnostics.push({ code: 'IDENTITY_INVALID', strategyId, file, path: '/strategyId', message: 'Filename stem and strategyId must equal one exact canonical strategy ID' });
        }
        if (context.strategies.has(strategyId) && ['DRAFT', 'REVIEWED', 'PUBLISHED'].includes(guide?.reviewStatus)) counts[guide.reviewStatus]++;
        const errors = validateGuide({ guide, context, schema });
        diagnostics.push(...errors.map(error => ({ ...error, strategyId, file })));
        if (guide?.strategyId === strategyId && context.strategies.has(strategyId) && guide.reviewStatus === 'PUBLISHED' && !errors.length) published.add(strategyId);
      }
      counts.missing = context.strategies.size - existing.size;
      if (requirePublished) {
        for (const strategyId of [...context.strategies.keys()].sort()) {
          if (!published.has(strategyId)) diagnostics.push({ code: 'PUBLICATION_REQUIRED', strategyId, file: path.join(directory, `${strategyId}.json`), path: '/reviewStatus', message: 'Release requires a valid, genuinely reviewed PUBLISHED guide for every one of the 57 strategies' });
        }
      }
    } catch (error) { diagnostics.push({ code: 'CATALOG_READ_INVALID', file: directory, path: '', message: error.message }); }
  }
  sortDiagnostics(diagnostics);
  return { ok: diagnostics.length === 0, counts, guides, diagnostics, affectedStrategyIds: [...new Set(diagnostics.map(error => error.strategyId).filter(Boolean))].sort() };
}

function runCli(args) {
  if (args.some(arg => arg !== '--require-published') || args.length > 1) throw new Error('Usage: node scripts/survivor-meta-guide-validation.mjs [--require-published]');
  const { guides, ...result } = validateGuideCatalog({ rootDir: process.cwd(), requirePublished: args.includes('--require-published') });
  console.log(JSON.stringify(result, null, 2));
  for (const error of result.diagnostics) console.error(`${error.strategyId || 'catalog'} ${error.file}${error.path}: ${error.code}: ${error.message}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
