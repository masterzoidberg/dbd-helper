import fs from 'node:fs';
import path from 'node:path';
import { loadSurvivorMetaSource } from './build-survivor-meta.mjs';

const defaultRoot = path.resolve(import.meta.dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function jsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(file);
    return entry.isFile() && entry.name.endsWith('.json') ? [file] : [];
  });
}

/** Current source records, not runtime projections; no inputs are frozen or changed. */
export function loadGuideContext({ rootDir = defaultRoot, release = '10.2.0-r1' } = {}) {
  const researchSource = loadSurvivorMetaSource({ rootDir, release });
  const perks = new Map();
  for (const file of jsonFiles(path.join(rootDir, 'content/survivor/perks'))) {
    const record = readJson(file);
    if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || !record.mechanics || !record.editorial) {
      throw new Error(`${file}: invalid canonical perk record`);
    }
    if (perks.has(record.id)) throw new Error(`Duplicate canonical perk ID: ${record.id}`);
    perks.set(record.id, record);
  }
  if (perks.size !== 176) throw new Error(`Expected all 176 canonical survivor perks; found ${perks.size}`);
  const indexFile = path.join(rootDir, 'content/survivor/meta-guides/perk-review-index.json');
  return {
    rootDir, release, researchSource, perks,
    strategies: new Map(researchSource.strategies.map(record => [record.id, record])),
    snapshots: new Map(researchSource.snapshots.map(record => [record.snapshotId, record])),
    snapshotByStrategy: new Map(researchSource.snapshots.map(record => [record.strategyId, record])),
    manifest: new Map(researchSource.manifest.map(record => [record.strategyId, record])),
    reviewIndex: fs.existsSync(indexFile) ? readJson(indexFile) : { schemaVersion: 1, perks: {} }
  };
}

/** Parse failures intentionally propagate for later orchestration diagnostics. */
export function loadGuideRecords({ rootDir = defaultRoot } = {}) {
  const directory = path.join(rootDir, 'content/survivor/meta-guides');
  const guides = new Map();
  if (!fs.existsSync(directory)) return guides;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || ['schema.json', 'perk-review-index.json'].includes(entry.name)) continue;
    const guide = readJson(path.join(directory, entry.name));
    const id = entry.name.slice(0, -5);
    if (guide?.strategyId !== id) throw new Error(`${entry.name}: filename stem must equal exact strategyId`);
    guides.set(id, guide);
  }
  return guides;
}

function isTeamBuild(build) {
  return Array.isArray(build.teamComposition) && build.teamComposition.length > 0;
}

export function derivePageKind(strategy, snapshot) {
  if (snapshot.currentStatus === 'LEGACY') return 'LEGACY';
  if (strategy.structuralClassification === 'PARENT STRATEGY FAMILY') return 'FAMILY';
  if ((snapshot.buildImplementations || []).some(isTeamBuild)) return 'TEAM';
  return 'STANDARD';
}

function ownedBuild(context, strategyId, buildId, team = false) {
  const snapshot = context.snapshotByStrategy.get(strategyId);
  const matches = (snapshot?.buildImplementations || []).filter(build => build.buildId === buildId);
  if (!context.strategies.has(strategyId) || snapshot?.strategyId !== strategyId || matches.length !== 1 || !buildId.startsWith(`${snapshot.snapshotId}:`)) {
    throw new Error(`${strategyId}: build ${buildId} must resolve to one owned canonical build`);
  }
  const build = matches[0];
  if (isTeamBuild(build) !== team) throw new Error(`${buildId}: expected ${team ? 'team composition' : 'individual, not team composition'} build`);
  return build;
}

function exactPerk(context, perkId) {
  const perk = context.perks.get(perkId);
  if (!perk) throw new Error(`Unresolved exact canonical perk ID: ${perkId}`);
  return perk;
}

/** Numbered choices occupy one position each; remaining fixed perks retain source order. */
export function resolveCanonicalPlan({ context, strategyId, buildId, notes = [] }) {
  const build = ownedBuild(context, strategyId, buildId);
  const slots = new Map();
  const seenPerks = new Set();
  function choices(ids) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error(`${buildId}: empty canonical choices`);
    return ids.map(perkId => {
      const perk = exactPerk(context, perkId);
      if (seenPerks.has(perkId)) throw new Error(`${buildId}: duplicate canonical perk ${perkId}`);
      seenPerks.add(perkId);
      return { perkId, perk };
    });
  }
  for (const alternative of build.perkAlternativeSlots || []) {
    const { slot } = alternative;
    if (!Number.isInteger(slot) || slot < 1 || slot > 4 || slots.has(slot)) throw new Error(`${buildId}: impossible or duplicate alternative slot ${slot}`);
    slots.set(slot, { slot, choiceCount: 1, choices: choices(alternative.perkIds), selectionNote: alternative.selectionNote });
  }
  for (const perkId of build.perkIds || []) {
    const slot = [1, 2, 3, 4].find(number => !slots.has(number));
    if (slot === undefined) throw new Error(`${buildId}: overfull canonical equipped slots`);
    slots.set(slot, { slot, choiceCount: 1, choices: choices([perkId]) });
  }
  const notedSlots = new Set();
  for (const note of notes) {
    const slot = slots.get(note.slot);
    if (!slot || notedSlots.has(note.slot)) throw new Error(`${buildId}: missing or duplicate canonical note slot ${note.slot}`);
    notedSlots.add(note.slot);
    if (note.usage === 'REQUIRED' && ((build.perkAlternativeSlots || []).some(alternative => alternative.slot === note.slot) || note.substitutes?.length)) {
      throw new Error(`${buildId}: source alternatives cannot become individually mandatory`);
    }
    const reasons = new Map();
    for (const reason of note.optionReasons || []) {
      if (!slot.choices.some(choice => choice.perkId === reason.perkId) || reasons.has(reason.perkId)) {
        throw new Error(`${buildId}: optionReasons must annotate unique existing slot members`);
      }
      reasons.set(reason.perkId, reason.whyItsHere);
    }
    slot.role = note.role;
    slot.usage = note.usage;
    slot.choices = slot.choices.map(choice => ({ ...choice, whyItsHere: reasons.get(choice.perkId) ?? note.whyItsHere }));
    if (note.substitutes) {
      for (const substitute of note.substitutes) {
        exactPerk(context, substitute.perkId);
        resolveSourceReceipt(substitute.source, context);
      }
      slot.substitutes = structuredClone(note.substitutes);
    }
  }
  // Keep source flex/item/rationale/confidence/validity context, without fabricated COMPLETE slots.
  return { ...structuredClone(build), provenance: 'CANONICAL', environment: build.targetEnvironment, slots: [...slots.values()].sort((a, b) => a.slot - b.slot) };
}

function sourceParts(source) {
  if (typeof source.ref !== 'string' || !source.ref.includes('#')) throw new Error('Source receipt requires an exact ID and fragment');
  const separator = source.ref.indexOf('#');
  return [source.ref.slice(0, separator), source.ref.slice(separator + 1)];
}

function nonempty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function resolvePointer(record, pointer) {
  if (pointer !== '' && !pointer.startsWith('/')) throw new Error('Source fragment must be an RFC6901 JSON Pointer');
  let value = record;
  for (const token of pointer === '' ? [] : pointer.slice(1).split('/')) {
    if (/~(?![01])/.test(token)) throw new Error('Invalid RFC6901 escape');
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key) || (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key))) {
      throw new Error(`Unresolved exact source pointer: ${pointer}`);
    }
    value = value[key];
  }
  if (!nonempty(value)) throw new Error(`Source pointer resolves to an empty value: ${pointer}`);
  return value;
}

function publicationSection(markdown, heading) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(lines[index]);
    if (match) headings.push({ index, level: match[1].length, text: match[2] });
  }
  const matches = headings.filter(item => item.text === heading);
  if (matches.length !== 1) throw new Error(`PUBLICATION heading must resolve exactly and unambiguously: ${heading}`);
  const match = matches[0];
  const end = headings.find(item => item.index > match.index && item.level <= match.level)?.index ?? lines.length;
  const section = lines.slice(match.index + 1, end).join('\n').trim();
  if (!nonempty(section)) throw new Error(`PUBLICATION heading has empty content: ${heading}`);
  return section;
}

export function resolveSourceReceipt(source, context) {
  const [id, fragment] = sourceParts(source);
  if (source.kind === 'PUBLICATION') {
    const entry = context.manifest.get(id);
    const markdown = entry && context.researchSource.articles[entry.articleFilename];
    if (!context.strategies.has(id) || typeof markdown !== 'string') throw new Error(`Unresolved exact publication ID: ${id}`);
    return publicationSection(markdown, fragment);
  }
  const records = { STRATEGY: context.strategies, SNAPSHOT: context.snapshots, PERK: context.perks }[source.kind];
  if (!records?.has(id)) throw new Error(`Unresolved exact ${source.kind} source ID: ${id}`);
  return resolvePointer(records.get(id), fragment);
}

/** Only explicit semantic fields declare dependencies; never follow prose or strategy edges. */
export function collectPerkReferences({ guide, context }) {
  const references = new Set();
  const add = perkId => { exactPerk(context, perkId); references.add(perkId); };
  function receipt(source) {
    resolveSourceReceipt(source, context);
    if (source.kind === 'PERK') add(sourceParts(source)[0]);
  }
  function substitutes(items = []) {
    for (const substitute of items) { add(substitute.perkId); receipt(substitute.source); }
  }
  function loadout(value) {
    if (!value) return;
    for (const plan of value.plans || []) {
      const resolved = plan.provenance === 'CANONICAL'
        ? resolveCanonicalPlan({ context, strategyId: guide.strategyId, buildId: plan.buildId, notes: plan.notes }) : plan;
      for (const slot of resolved.slots) {
        for (const choice of slot.choices) add(choice.perkId);
        substitutes(slot.substitutes);
      }
    }
    for (const option of value.options || []) add(option.perkId);
  }
  loadout(guide.page.loadout);
  for (const role of guide.page.roles || []) loadout(role.loadout);
  for (const buildId of guide.page.canonicalTeamBuildIds || []) {
    const build = ownedBuild(context, guide.strategyId, buildId, true);
    for (const perkId of build.perkIds || []) add(perkId);
    for (const slot of build.perkAlternativeSlots || []) for (const perkId of slot.perkIds) add(perkId);
  }
  for (const historical of guide.page.historicalPerks || []) add(historical.perkId);
  for (const source of guide.sources || []) receipt(source);
  const gameplay = guide.page.gameplay;
  for (const row of gameplay?.rows || gameplay?.steps || gameplay?.priorities || []) {
    for (const enabler of row.enabledBy || []) if (enabler.startsWith('perk:')) add(enabler.slice(5));
  }
  return references;
}
