import {
  derivePageKind,
  resolveCanonicalPlan,
  resolveSourceReceipt
} from './survivor-meta-guide-source.mjs';

const PAGE_MODES = new Set(['production', 'preview']);
const PLAYER = 'PLAYER';
const RESEARCH_ONLY = 'RESEARCH_ONLY';

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function exactStrategy(context, strategyId) {
  const strategy = context.strategies.get(strategyId);
  const snapshot = context.snapshotByStrategy.get(strategyId);
  const manifest = context.manifest.get(strategyId);
  if (!strategy || strategy.id !== strategyId || !snapshot || snapshot.strategyId !== strategyId || !manifest) {
    throw new Error(`Unresolved exact canonical strategy: ${strategyId}`);
  }
  if (snapshot.snapshotId !== manifest.snapshotIdUsed) {
    throw new Error(`${strategyId}: manifest snapshot mismatch`);
  }
  return { strategy, snapshot, manifest };
}

function evaluation(snapshot, key, environmentId) {
  return {
    environmentId,
    ...clone(snapshot[key]),
    provenance: 'CANONICAL'
  };
}

function strategyDestination(context, strategyId) {
  const { strategy, snapshot, manifest } = exactStrategy(context, strategyId);
  return {
    strategyId,
    name: strategy.name,
    alternateNames: clone(strategy.alternateNames || []),
    route: manifest.slug,
    articleFilename: manifest.articleFilename,
    pageKind: derivePageKind(strategy, snapshot),
    currentStatus: snapshot.currentStatus,
    trend: snapshot.trend,
    evaluations: {
      soloQ: evaluation(snapshot, 'solo', 'SURVIVOR_SOLO_Q'),
      coordinatedSwf: evaluation(snapshot, 'swf', 'SURVIVOR_COORDINATED_SWF')
    },
    provenance: 'CANONICAL'
  };
}

function canonicalStrategyFacts(context, strategyId) {
  const { strategy, snapshot, manifest } = exactStrategy(context, strategyId);
  return {
    strategyId,
    id: strategy.id,
    name: strategy.name,
    alternateNames: clone(strategy.alternateNames || []),
    route: manifest.slug,
    articleFilename: manifest.articleFilename,
    pageKind: derivePageKind(strategy, snapshot),
    currentStatus: snapshot.currentStatus,
    trend: snapshot.trend,
    patchVolatility: snapshot.patchVolatility,
    prevalence: snapshot.prevalence,
    metaStability: snapshot.metaStability ?? null,
    stabilityLabel: snapshot.stabilityLabel ?? null,
    evaluations: {
      soloQ: evaluation(snapshot, 'solo', 'SURVIVOR_SOLO_Q'),
      coordinatedSwf: evaluation(snapshot, 'swf', 'SURVIVOR_COORDINATED_SWF')
    },
    provenance: 'CANONICAL'
  };
}

function canonicalRelationships(context, strategyId) {
  const { strategy, snapshot } = exactStrategy(context, strategyId);
  const destination = id => strategyDestination(context, id);
  const successorIds = snapshot.analysis?.replacementStrategyIds || [];
  return {
    parent: strategy.parentId ? destination(strategy.parentId) : null,
    children: (strategy.subtypeIds || []).map(destination),
    related: (strategy.relatedStrategyIds || []).map(destination),
    successors: successorIds.map(destination)
  };
}

function canonicalIdentityWarning(context, strategyId) {
  const { strategy, snapshot } = exactStrategy(context, strategyId);
  if (snapshot.currentStatus !== 'LEGACY') return null;
  const legacyHistory = clone(snapshot.analysis?.legacyHistory ?? null);
  return {
    historical: true,
    strategyId,
    name: strategy.name,
    currentStatus: snapshot.currentStatus,
    successorIds: clone(snapshot.analysis?.replacementStrategyIds || []),
    context: { legacyHistory },
    provenance: 'CANONICAL'
  };
}

function joinPerk(context, perkId, cache) {
  if (cache.has(perkId)) return clone(cache.get(perkId));
  const record = context.perks.get(perkId);
  if (!record || record.id !== perkId || !record.mechanics) {
    throw new Error(`Unresolved exact canonical perk ID: ${perkId}`);
  }
  const mechanics = record.mechanics;
  const facts = {
    perkId,
    id: perkId,
    name: mechanics.name,
    canonicalName: mechanics.name,
    alternateName: mechanics.alternateName ?? null,
    currentEffect: clone(mechanics.currentEffect),
    activation: clone(mechanics.activation),
    owner: mechanics.sourceCharacter ?? mechanics.source ?? null,
    source: clone(mechanics.source),
    status: clone(mechanics.status),
    query: `/survivor/perks/?q=${encodeURIComponent(perkId)}`,
    provenance: 'CANONICAL'
  };
  cache.set(perkId, facts);
  return clone(facts);
}

function joinedMember(context, member, provenance, cache) {
  const facts = joinPerk(context, member.perkId, cache);
  return {
    ...clone(member),
    ...facts,
    perk: facts,
    provenance
  };
}

function resolvedSubstitutes(context, substitutes, cache) {
  return (substitutes || []).map(substitute => joinedMember(context, substitute, 'EDITORIAL', cache));
}

function resolvedSlot(context, slot, provenance, cache) {
  const output = clone(slot);
  output.provenance = provenance;
  output.choices = (slot.choices || []).map(choice => joinedMember(context, choice, provenance, cache));
  if (slot.substitutes) output.substitutes = resolvedSubstitutes(context, slot.substitutes, cache);
  return output;
}

function resolvedCanonicalPlan(context, strategyId, plan, cache) {
  const assembled = resolveCanonicalPlan({
    context,
    strategyId,
    buildId: plan.buildId,
    notes: plan.notes || []
  });
  const output = {
    ...clone(assembled),
    provenance: 'CANONICAL',
    notes: clone(plan.notes || []),
    slots: assembled.slots.map(slot => resolvedSlot(context, slot, 'CANONICAL', cache))
  };
  for (const slot of output.slots) {
    for (const choice of slot.choices) delete choice.perk;
  }
  return output;
}

function resolvedAuthoredPlan(context, plan, cache) {
  const output = clone(plan);
  output.provenance = plan.provenance;
  output.slots = (plan.slots || []).map(slot => resolvedSlot(context, slot, plan.provenance, cache));
  for (const slot of output.slots) {
    for (const choice of slot.choices) delete choice.perk;
  }
  return output;
}

function resolvedLoadout(context, strategyId, loadout, cache) {
  if (!loadout) return loadout;
  const output = clone(loadout);
  output.plans = (loadout.plans || []).map(plan => plan.provenance === 'CANONICAL'
    ? resolvedCanonicalPlan(context, strategyId, plan, cache)
    : resolvedAuthoredPlan(context, plan, cache));
  output.options = (loadout.options || []).map(option => joinedMember(context, option, 'EDITORIAL', cache));
  return output;
}

function canonicalBuild(context, strategyId, build, cache) {
  if (Array.isArray(build.teamComposition) && build.teamComposition.length > 0) {
    return { ...clone(build), provenance: 'CANONICAL', environment: build.targetEnvironment };
  }
  const assembled = resolveCanonicalPlan({ context, strategyId, buildId: build.buildId, notes: [] });
  return {
    ...clone(assembled),
    provenance: 'CANONICAL',
    slots: assembled.slots.map(slot => resolvedSlot(context, slot, 'CANONICAL', cache))
  };
}

function canonicalBuilds(context, strategyId, cache) {
  const { snapshot } = exactStrategy(context, strategyId);
  return (snapshot.buildImplementations || []).map(build => canonicalBuild(context, strategyId, build, cache));
}

function resolvedEnabler(context, page, token, cache) {
  const separator = token.indexOf(':');
  if (separator < 1) throw new Error(`Invalid enabledBy reference: ${token}`);
  const type = token.slice(0, separator);
  const value = token.slice(separator + 1);
  if (type === 'perk') {
    const perk = joinPerk(context, value, cache);
    return { type, id: value, label: perk.name, perk };
  }
  if (type === 'role') {
    const role = (page.roles || []).find(candidate => candidate.id === value);
    if (!role) throw new Error(`Unresolved exact role reference: ${token}`);
    return { type, id: value, label: role.title, provenance: 'EDITORIAL' };
  }
  if (type === 'mechanic') {
    const mechanic = (page.mechanics || []).find(candidate => candidate.id === value);
    if (!mechanic) throw new Error(`Unresolved exact mechanic reference: ${token}`);
    return { type, id: value, label: mechanic.id, provenance: 'EDITORIAL' };
  }
  if (type === 'item') {
    const items = [page.loadout, ...(page.roles || []).map(role => role.loadout)]
      .map(loadout => loadout?.item)
      .filter(Boolean);
    const item = items.find(candidate => candidate.id === value);
    if (!item) throw new Error(`Unresolved exact item reference: ${token}`);
    return { type, id: value, label: item.name || item.id, item: clone(item), provenance: 'EDITORIAL' };
  }
  if (type === 'slot') {
    const hash = value.lastIndexOf('#');
    const planId = hash < 0 ? value : value.slice(0, hash);
    const slotNumber = hash < 0 ? NaN : Number(value.slice(hash + 1));
    const plans = [page.loadout, ...(page.roles || []).map(role => role.loadout)].flatMap(loadout => loadout?.plans || []);
    const plan = plans.find(candidate => (candidate.buildId || candidate.id) === planId);
    const slot = plan?.slots?.find(candidate => candidate.slot === slotNumber);
    if (!plan || !slot) throw new Error(`Unresolved exact slot reference: ${token}`);
    return {
      type,
      id: value,
      label: `${plan.label || plan.buildId || plan.id}, slot ${slotNumber}`,
      choices: clone(slot.choices),
      provenance: plan.provenance
    };
  }
  throw new Error(`Unknown enabledBy reference: ${token}`);
}

function resolvedGameplay(context, page, cache) {
  if (!page.gameplay) return;
  const output = clone(page.gameplay);
  const field = { DECISIONS: 'rows', SEQUENCE: 'steps', ROLE_GUIDE: 'priorities' }[page.gameplay.type];
  output[field] = (page.gameplay[field] || []).map(row => {
    const resolved = clone(row);
    if (row.enabledBy) resolved.enabledByResolved = row.enabledBy.map(token => resolvedEnabler(context, page, token, cache));
    return resolved;
  });
  return output;
}

function resolvedRelated(context, related) {
  const destinations = new Map();
  for (const item of related || []) {
    let destination = destinations.get(item.strategyId);
    if (!destination) {
      destination = {
        strategyId: item.strategyId,
        destination: strategyDestination(context, item.strategyId),
        relationships: [],
        provenance: 'EDITORIAL'
      };
      destinations.set(item.strategyId, destination);
    }
    destination.relationships.push({
      relationship: item.relationship,
      why: item.why,
      provenance: 'EDITORIAL'
    });
  }
  return [...destinations.values()].map(item => ({
    ...item,
    relationship: item.relationships[0]?.relationship,
    why: item.relationships[0]?.why
  }));
}

function resolvePage(context, strategyId, guide, canonical, cache) {
  const sourcePage = guide.page;
  const page = clone(sourcePage);
  if (sourcePage.loadout) page.loadout = resolvedLoadout(context, strategyId, sourcePage.loadout, cache);
  if (sourcePage.roles) {
    page.roles = sourcePage.roles.map(role => {
      const output = clone(role);
      if (role.loadout) output.loadout = resolvedLoadout(context, strategyId, role.loadout, cache);
      return output;
    });
  }
  if (sourcePage.related) page.related = resolvedRelated(context, sourcePage.related);
  if (sourcePage.comparisons) {
    page.comparisons = sourcePage.comparisons.map(item => ({
      ...clone(item),
      destination: strategyDestination(context, item.strategyId),
      provenance: 'EDITORIAL'
    }));
  }
  if (sourcePage.successors) {
    page.successors = sourcePage.successors.map(item => ({
      ...clone(item),
      destination: strategyDestination(context, item.strategyId),
      provenance: 'EDITORIAL'
    }));
  }
  if (sourcePage.historicalPerks) {
    page.historicalPerks = sourcePage.historicalPerks.map(item => ({
      ...clone(item),
      ...joinPerk(context, item.perkId, cache),
      perk: joinPerk(context, item.perkId, cache),
      provenance: 'EDITORIAL'
    }));
  }
  if (sourcePage.canonicalTeamBuildIds) {
    const builds = new Map(canonical.builds.map(build => [build.buildId, build]));
    page.canonicalTeamBuilds = sourcePage.canonicalTeamBuildIds.map(id => clone(builds.get(id)));
  }
  if (sourcePage.gameplay) page.gameplay = resolvedGameplay(context, page, cache);
  return page;
}

function sourceFacts(context, sources) {
  return (sources || []).map(source => ({
    ...clone(source),
    resolved: clone(resolveSourceReceipt(source, context)),
    provenance: 'CANONICAL'
  }));
}

function researchFacts(context, strategyId, sources) {
  const { strategy, snapshot, manifest } = exactStrategy(context, strategyId);
  const article = context.researchSource.articles[manifest.articleFilename];
  if (typeof article !== 'string') throw new Error(`Missing frozen Stage 3B article: ${manifest.articleFilename}`);
  return {
    strategy: clone(strategy),
    snapshot: clone(snapshot),
    manifest: clone(manifest),
    article,
    sources: clone(sources),
    sourceReceipts: clone(sources),
    stage3a: { strategy: clone(strategy), snapshot: clone(snapshot) },
    stage3b: { manifest: clone(manifest), article }
  };
}

export function assembleGuidePage({ context, strategyId, guide, mode }) {
  if (!PAGE_MODES.has(mode)) throw new Error(`mode must be production or preview; received ${mode}`);
  const { strategy, snapshot } = exactStrategy(context, strategyId);
  if (guide !== undefined && guide.strategyId !== strategyId) {
    throw new Error(`Guide strategyId ${guide.strategyId} does not match ${strategyId}`);
  }
  const selectedMode = guide && (mode === 'preview' || guide.reviewStatus === 'PUBLISHED') ? PLAYER : RESEARCH_ONLY;
  const cache = new Map();
  const sources = sourceFacts(context, guide?.sources);
  const builds = canonicalBuilds(context, strategyId, cache);
  const canonical = {
    ...canonicalStrategyFacts(context, strategyId),
    strategy: canonicalStrategyFacts(context, strategyId),
    snapshotId: snapshot.snapshotId,
    relationships: canonicalRelationships(context, strategyId),
    identityWarning: canonicalIdentityWarning(context, strategyId),
    builds,
    teamBuilds: builds.filter(build => Array.isArray(build.teamComposition) && build.teamComposition.length > 0),
    sources,
    sourceReceipts: clone(sources)
  };
  const research = researchFacts(context, strategyId, sources);
  const page = selectedMode === PLAYER ? resolvePage(context, strategyId, guide, canonical, cache) : null;
  return {
    strategyId,
    mode: selectedMode,
    kind: derivePageKind(strategy, snapshot),
    page,
    editorial: page,
    canonical,
    research
  };
}
