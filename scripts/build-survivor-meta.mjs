import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleGuidePage } from './survivor-meta-guide-model.mjs';
import { loadGuideContext } from './survivor-meta-guide-source.mjs';
import { validateGuideCatalog } from './survivor-meta-guide-validation.mjs';
import { renderGuideBody } from './survivor-meta-guide-render.mjs';

const DEFAULT_RELEASE = '10.2.0-r1';
const EXPECTED_COUNT = 57;
const ENVIRONMENTS = [
  ['SURVIVOR_SOLO_Q', 'solo'],
  ['SURVIVOR_COORDINATED_SWF', 'swf']
];

export class GuideValidationError extends Error {
  constructor(message, diagnostics = []) {
    super(message);
    this.name = 'GuideValidationError';
    this.diagnostics = diagnostics;
  }
}

function defaultRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[char]);
}

function parseFrontMatter(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '---') throw new Error('Stage 3B article missing front matter');
  const meta = {};
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') { end = i; break; }
    const pos = lines[i].indexOf(':');
    if (pos < 0) continue;
    const key = lines[i].slice(0, pos).trim();
    let value = lines[i].slice(pos + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    meta[key] = value;
  }
  if (end < 0) throw new Error('Stage 3B article front matter is not terminated');
  return { meta, body: lines.slice(end + 1).join('\n') };
}

export function loadSurvivorMetaSource({ rootDir = defaultRoot(), release = DEFAULT_RELEASE } = {}) {
  const base = path.join(rootDir, 'content/survivor/meta', release);
  const stage3a = path.join(base, 'stage3a');
  const stage3b = path.join(base, 'stage3b');
  const strategies = readJson(path.join(stage3a, 'strategies.json'));
  const snapshots = readJson(path.join(stage3a, 'strategy-snapshots.json'));
  const manifest = readJson(path.join(stage3b, 'strategy-pages-manifest.json'));
  if (strategies.length !== EXPECTED_COUNT || snapshots.length !== EXPECTED_COUNT || manifest.length !== EXPECTED_COUNT) {
    throw new Error(`Survivor Meta ${release} must contain ${EXPECTED_COUNT} strategies, snapshots, and manifest entries`);
  }
  const byStrategy = new Map(strategies.map(item => [item.id, item]));
  const snapshotByStrategy = new Map(snapshots.map(item => [item.strategyId, item]));
  if (byStrategy.size !== EXPECTED_COUNT || snapshotByStrategy.size !== EXPECTED_COUNT) throw new Error('duplicate Survivor Meta IDs');
  const articles = {};
  const seenPaths = new Set();
  for (const item of manifest) {
    const strategy = byStrategy.get(item.strategyId);
    const snapshot = snapshotByStrategy.get(item.strategyId);
    if (!strategy || !snapshot) throw new Error(`${item.strategyId}: manifest relationship does not resolve`);
    if (item.snapshotIdUsed !== snapshot.snapshotId) throw new Error(`${item.strategyId}: manifest snapshot mismatch`);
    const articleFile = path.join(stage3b, item.articleFilename);
    const markdown = fs.readFileSync(articleFile, 'utf8');
    const { meta } = parseFrontMatter(markdown);
    if (meta.strategyId !== item.strategyId || meta.snapshotId !== item.snapshotIdUsed) {
      throw new Error(`${item.strategyId}: article front matter relationship mismatch`);
    }
    const articlePath = normalizeArticlePath(item.slug);
    if (seenPaths.has(articlePath)) throw new Error(`duplicate Survivor Meta route: ${articlePath}`);
    seenPaths.add(articlePath);
    // Keep the imported archive bytes intact; serialize the article consistently in research HTML.
    articles[item.articleFilename] = markdown.replace(/\r\n?/g, '\n');
  }
  for (const strategy of strategies) {
    if (strategy.side !== 'SURVIVOR') throw new Error(`${strategy.id}: side must be SURVIVOR`);
    if (strategy.parentId && !byStrategy.has(strategy.parentId)) throw new Error(`${strategy.id}: unresolved parentId ${strategy.parentId}`);
    for (const child of strategy.subtypeIds || []) if (!byStrategy.has(child)) throw new Error(`${strategy.id}: unresolved subtypeId ${child}`);
  }
  return { base, strategies, snapshots, manifest, articles };
}

function normalizeArticlePath(slug) {
  if (typeof slug !== 'string' || slug.includes('\\') || /[?#]/.test(slug)) {
    throw new Error(`invalid Stage 3B slug: ${slug}`);
  }
  const trimmed = slug.replace(/^\/+|\/+$/g, '');
  const parts = trimmed.split('/');
  if (parts.length !== 2 || parts[0] !== 'survivor-meta' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[1])) {
    throw new Error(`invalid Stage 3B slug: ${slug}`);
  }
  return `${trimmed}/`;
}

function evaluation(environmentId, source) {
  return {
    environmentId,
    rankingStatus: source.rankingStatus,
    power: source.power ?? null,
    tier: source.tier ?? null,
    rankingIndex: source.rankingIndex ?? null,
    confidence: source.confidence ?? null
  };
}

export function buildRuntimeStrategies({ rootDir = defaultRoot(), release = DEFAULT_RELEASE } = {}) {
  const source = loadSurvivorMetaSource({ rootDir, release });
  const snapshotByStrategy = new Map(source.snapshots.map(item => [item.strategyId, item]));
  const manifestByStrategy = new Map(source.manifest.map(item => [item.strategyId, item]));
  return source.strategies.map(strategy => {
    const snapshot = snapshotByStrategy.get(strategy.id);
    const manifest = manifestByStrategy.get(strategy.id);
    const diagnostics = { ...snapshot.strategicDiagnostics };
    diagnostics.strategicCommitment = diagnostics.roleCommitment ?? null;
    delete diagnostics.roleCommitment;
    const articlePath = normalizeArticlePath(manifest.slug);
    return {
      id: strategy.id,
      name: strategy.name,
      alternateNames: strategy.alternateNames || [],
      slug: articlePath.split('/').filter(Boolean).at(-1),
      structuralClassification: strategy.structuralClassification,
      parentId: strategy.parentId ?? null,
      subtypeIds: strategy.subtypeIds || [],
      relatedStrategyIds: strategy.relatedStrategyIds || [],
      generalStrategicDefinition: strategy.generalStrategicDefinition || '',
      primaryRoles: strategy.primaryRoles || [],
      secondaryRoles: strategy.secondaryRoles || [],
      conceptualMechanics: strategy.conceptualMechanics || [],
      generalTags: strategy.generalTags || [],
      currentStatus: snapshot.currentStatus,
      trend: snapshot.trend,
      patchVolatility: snapshot.patchVolatility,
      prevalence: snapshot.prevalence,
      metaStability: snapshot.metaStability ?? null,
      stabilityLabel: snapshot.stabilityLabel ?? null,
      dependencyTypes: snapshot.dependencyTypes || [],
      strategicDiagnostics: diagnostics,
      environmentEvaluations: ENVIRONMENTS.map(([id, key]) => evaluation(id, snapshot[key])),
      articlePath
    };
  });
}

export function evaluationFor(strategy, environmentId) {
  return strategy.environmentEvaluations.find(item => item.environmentId === environmentId) || null;
}

export function isTierEligible(strategy, environmentId) {
  if (strategy.structuralClassification === 'PARENT STRATEGY FAMILY') return false;
  if (strategy.currentStatus === 'LEGACY') return false;
  const e = evaluationFor(strategy, environmentId);
  return !!e && ['RANKED', 'PROVISIONAL'].includes(e.rankingStatus) && e.tier != null && e.power != null;
}

export function sortCurrentTier(strategies, environmentId) {
  return [...strategies].sort((a, b) => {
    const ae = evaluationFor(a, environmentId);
    const be = evaluationFor(b, environmentId);
    const power = (be?.power ?? -Infinity) - (ae?.power ?? -Infinity);
    if (power) return power;
    const stability = (b.metaStability ?? -Infinity) - (a.metaStability ?? -Infinity);
    if (stability) return stability;
    return a.name.localeCompare(b.name);
  });
}

function inline(text) {
  let escaped = escapeHtml(text);
  const code = [];
  escaped = escaped.replace(/`([^`]+)`/g, (_, value) => {
    const token = `\u0000CODE${code.length}\u0000`;
    code.push(`<code>${value}</code>`);
    return token;
  });
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
  escaped = escaped.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => code[Number(index)]);
  return escaped;
}

function renderParagraph(lines) {
  const rendered = lines.map(line => inline(line.replace(/\s+$/, '')));
  let html = rendered[0] || '';
  for (let i = 1; i < rendered.length; i += 1) {
    const hard = / {2,}$/.test(lines[i - 1]);
    html += hard ? `<br>\n${rendered[i]}` : ` ${rendered[i]}`;
  }
  return `<p>${html}</p>`;
}

function parseTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function isTableSeparator(line) {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function renderListBlock(lines) {
  let html = '<ul>';
  let parentOpen = false;
  let nestedOpen = false;
  for (const line of lines) {
    const match = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (!match) continue;
    const nested = match[1].length > 0;
    if (!nested) {
      if (nestedOpen) { html += '</ul>'; nestedOpen = false; }
      if (parentOpen) html += '</li>';
      html += `<li>${inline(match[2])}`;
      parentOpen = true;
    } else {
      if (!parentOpen) { html += '<li>'; parentOpen = true; }
      if (!nestedOpen) { html += '<ul>'; nestedOpen = true; }
      html += `<li>${inline(match[2])}</li>`;
    }
  }
  if (nestedOpen) html += '</ul>';
  if (parentOpen) html += '</li>';
  html += '</ul>';
  return html;
}

export function renderArticleMarkdown(markdown, { headingOffset = 0 } = {}) {
  if (!Number.isInteger(headingOffset) || headingOffset < 0) throw new Error('headingOffset must be a non-negative integer');
  const { body } = parseFrontMatter(markdown);
  if (/^\s*```/m.test(body)) throw new Error('unsupported fenced code block in Stage 3B article');
  if (/^\s*>/m.test(body)) throw new Error('unsupported blockquote in Stage 3B article');
  if (/^\s*\d+\.\s+/m.test(body)) throw new Error('unsupported ordered list in Stage 3B article');
  if (/\[[^\]]+\]\([^)]+\)/.test(body)) throw new Error('unsupported Markdown link in Stage 3B article');
  if (/<[A-Za-z!/][^>]*>/.test(body)) throw new Error('raw HTML is not allowed in Stage 3B article');

  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const renderedLevel = level + headingOffset;
      if (renderedLevel > 6) throw new Error('headingOffset produces unsupported heading level');
      out.push(`<h${renderedLevel}>${inline(heading[2])}</h${renderedLevel}>`);
      i += 1;
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const block = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) block.push(lines[i++]);
      out.push(renderListBlock(block));
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(parseTableRow(lines[i++]));
      out.push(`<table><thead><tr>${header.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^#{5,6}\s+/.test(line)) throw new Error('unsupported heading level in Stage 3B article');
    const paragraph = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !(/^\s*\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))) {
      paragraph.push(lines[i++]);
    }
    out.push(renderParagraph(paragraph));
  }
  return out.join('\n');
}

function perkIdsFromSource(rootDir) {
  const dir = path.join(rootDir, 'content/survivor/perks');
  if (!fs.existsSync(dir)) throw new Error('content/survivor/perks must be imported before Survivor Meta build');
  const ids = new Set();
  for (const folder of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const folderPath = path.join(dir, folder.name);
    for (const name of fs.readdirSync(folderPath)) {
      if (!name.endsWith('.json')) continue;
      const record = readJson(path.join(folderPath, name));
      if (record.id) ids.add(record.id);
    }
  }
  return ids;
}

export function validateBuildPerkIds({ rootDir = defaultRoot(), snapshots } = {}) {
  const canonical = perkIdsFromSource(rootDir);
  const missing = [];
  let checked = 0;
  for (const snapshot of snapshots || []) {
    for (const build of snapshot.buildImplementations || []) {
      const ids = [...(build.perkIds || [])];
      for (const slot of build.perkAlternativeSlots || []) ids.push(...(slot.perkIds || []));
      for (const id of ids) {
        checked += 1;
        if (!canonical.has(id)) missing.push({ strategyId: snapshot.strategyId, buildId: build.buildId, perkId: id });
      }
    }
  }
  if (missing.length) throw new Error(`unresolved canonical BuildImplementation perk IDs: ${missing.map(item => item.perkId).join(', ')}`);
  return { checked, missing };
}

export function writeRuntimeData({ rootDir = defaultRoot(), release = DEFAULT_RELEASE, outputPath = path.join(rootDir, 'site/assets/data-survivor-meta.js') } = {}) {
  const strategies = buildRuntimeStrategies({ rootDir, release });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `window.DBD_DATA = window.DBD_DATA || {};\nwindow.DBD_DATA.survivorStrategies = ${JSON.stringify(strategies)};\n`, 'utf8');
  return strategies;
}

function detailPageHtml(model) {
  const canonical = model.canonical;
  const snapshot = model.research.snapshot;
  const bootstrap = `(function(){var parts=location.pathname.split('/').filter(Boolean);var i=parts.indexOf('dbd-helper');var base=i>=0?'/'+parts.slice(0,i+1).join('/')+'/':'/';document.write('<base href="'+base+'">');})();`;
  const publicationLabel = model.mode === 'PLAYER' ? 'Player Guide' : 'Research View Only';
  const body = renderGuideBody(model);
  if ((body.match(/<h1\b/g) || []).length !== 1) throw new Error(`${model.strategyId}: rendered detail page must contain exactly one H1`);
  return `<!doctype html><html lang="en"><head><title>${escapeHtml(canonical.name)} · Survivor Meta · DBD Field Guide</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#090a0d"><script data-dbd-base>${bootstrap}</script><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon.svg"><link rel="stylesheet" href="assets/app.css"><link rel="stylesheet" href="assets/semantic-links.css"><script defer src="assets/data-meta.js"></script><script defer src="assets/app-core.js"></script><script defer src="assets/app-pages.js"></script></head><body><div data-shell></div><main class="app-main"><div class="page meta-article-page"><p class="guide-publication-status">${publicationLabel}</p><article class="meta-article-body">${body}</article></div></main><script>document.addEventListener('DOMContentLoaded',()=>DBD_APP.injectShell('survivor-meta'));</script></body></html>\n`;
}

function runtimeText(strategies) {
  return `window.DBD_DATA = window.DBD_DATA || {};\nwindow.DBD_DATA.survivorStrategies = ${JSON.stringify(strategies)};\n`;
}

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function realCandidate(file) {
  let current = path.resolve(file);
  const suffix = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    suffix.unshift(path.basename(current));
    current = parent;
  }
  return path.resolve(fs.realpathSync.native(current), ...suffix);
}

function outputError(message) {
  return new GuideValidationError(`OUTPUT_PATH_INVALID: ${message}`);
}

function rejectSymlinkComponents(file, label) {
  const resolved = path.resolve(file);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  const relative = path.relative(parsed.root, resolved);
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw outputError(`${label} must not contain a symlink component: ${current}`);
      }
    } catch (error) {
      if (error instanceof GuideValidationError) throw error;
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
  }
}

function rejectSymlinkTree(directory, label) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw outputError(`${label} must not contain a symlink: ${file}`);
    if (entry.isDirectory()) rejectSymlinkTree(file, label);
  }
}

function validateOutputLayout({ rootDir, outputPath, detailOutputDir, preview, previewRoot, routes }) {
  const sitePath = path.join(rootDir, 'site');
  const outputTargets = [
    [rootDir, 'root directory'],
    [sitePath, 'production site'],
    [detailOutputDir, 'detail output directory'],
    [outputPath, 'runtime output']
  ];
  if (preview) outputTargets.push([previewRoot, 'preview output directory']);
  for (const route of routes) {
    const slug = route.split('/').filter(Boolean).at(-1);
    outputTargets.push([path.join(detailOutputDir, slug), `route destination ${route}`]);
  }
  for (const [target, label] of outputTargets) rejectSymlinkComponents(target, label);

  const rootReal = fs.realpathSync.native(path.resolve(rootDir));
  const siteReal = fs.realpathSync.native(sitePath);
  const detailReal = realCandidate(detailOutputDir);
  const runtimeReal = realCandidate(outputPath);

  if (preview) {
    if (!path.isAbsolute(previewRoot)) throw outputError('preview output directory must be absolute');
    if (isWithin(realCandidate(previewRoot), rootReal)) throw outputError('preview output directory must be outside the production root');
    if (isWithin(realCandidate(previewRoot), siteReal)) throw outputError('preview output directory must be outside the production site');
    if (!isWithin(runtimeReal, realCandidate(previewRoot))) throw outputError('preview runtime must remain inside the preview root');
    if (!isWithin(detailReal, realCandidate(previewRoot))) throw outputError('preview detail pages must remain inside the preview root');
  } else {
    if (!isWithin(detailReal, rootReal)) throw outputError('production detail output must remain inside the root');
    if (!isWithin(runtimeReal, rootReal)) throw outputError('production runtime output must remain inside the root');
  }
  for (const route of routes) {
    const slug = route.split('/').filter(Boolean).at(-1);
    const destination = path.join(detailOutputDir, slug);
    const destinationReal = realCandidate(destination);
    if (!isWithin(destinationReal, detailReal)) throw outputError(`route escapes detail output: ${route}`);
  }
}

function formatDiagnostics(diagnostics) {
  return diagnostics.map(error => `${error.strategyId || 'catalog'}${error.path || ''}: ${error.code}: ${error.message}`).join('\n');
}

function prepareGeneration({ rootDir, release, outputPath, detailOutputDir, preview, previewRoot }) {
  let catalog;
  try {
    catalog = validateGuideCatalog({ rootDir, release });
  } catch (error) {
    throw new GuideValidationError(error.message);
  }
  if (!catalog.ok) throw new GuideValidationError(formatDiagnostics(catalog.diagnostics), catalog.diagnostics);

  try {
    const context = loadGuideContext({ rootDir, release });
    validateBuildPerkIds({ rootDir, snapshots: context.researchSource.snapshots });
    const strategies = buildRuntimeStrategies({ rootDir, release });
    const pages = [];
    for (const item of context.researchSource.manifest) {
      const route = normalizeArticlePath(item.slug);
      const model = assembleGuidePage({
        context,
        strategyId: item.strategyId,
        guide: catalog.guides.get(item.strategyId),
        mode: preview ? 'preview' : 'production'
      });
      pages.push({ route, slug: route.split('/').filter(Boolean).at(-1), html: detailPageHtml(model) });
    }
    const routes = pages.map(page => page.route);
    if (routes.length !== EXPECTED_COUNT || new Set(routes).size !== EXPECTED_COUNT) {
      throw new Error(`generated Survivor Meta routes must contain exactly ${EXPECTED_COUNT} unique entries`);
    }
    validateOutputLayout({ rootDir, outputPath, detailOutputDir, preview, previewRoot, routes });
    return { strategies, runtime: runtimeText(strategies), pages, routes };
  } catch (error) {
    if (error instanceof GuideValidationError) throw error;
    throw new GuideValidationError(error.message, [{ code: 'PREPARATION_INVALID', path: '', message: error.message }]);
  }
}

function writePreparedDetails(outputDir, pages) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const page of pages) {
    const destination = path.join(outputDir, page.slug);
    if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, 'index.html'), page.html, 'utf8');
  }
}

function writePreparedRuntime(outputPath, runtime) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, runtime, 'utf8');
}

export function writeDetailPages({ rootDir = defaultRoot(), release = DEFAULT_RELEASE, outputDir = path.join(rootDir, 'site/survivor-meta') } = {}) {
  const prepared = prepareGeneration({
    rootDir,
    release,
    outputPath: path.join(rootDir, 'site/assets/data-survivor-meta.js'),
    detailOutputDir: outputDir,
    preview: false,
    previewRoot: null
  });
  writePreparedDetails(outputDir, prepared.pages);
  return prepared.routes;
}

export function buildSurvivorMetaSite(options = {}) {
  const rootDir = options.rootDir ?? defaultRoot();
  const release = options.release ?? DEFAULT_RELEASE;
  const preview = options.preview === true;
  if (preview && (!Object.hasOwn(options, 'outputDir') || !path.isAbsolute(String(options.outputDir || '')))) {
    throw outputError('preview requires an absolute output directory');
  }
  const previewRoot = preview ? path.resolve(options.outputDir) : null;
  const detailOutputDir = preview ? path.join(previewRoot, 'survivor-meta') : (options.outputDir ?? path.join(rootDir, 'site/survivor-meta'));
  const outputPath = options.outputPath ?? path.join(preview ? previewRoot : path.join(rootDir, 'site'), 'assets/data-survivor-meta.js');
  const prepared = prepareGeneration({ rootDir, release, outputPath, detailOutputDir, preview, previewRoot });
  if (preview) {
    rejectSymlinkTree(path.join(rootDir, 'site'), 'preview source site');
    rejectSymlinkTree(previewRoot, 'preview output directory');
    fs.cpSync(path.join(rootDir, 'site'), previewRoot, { recursive: true, force: true });
    validateOutputLayout({ rootDir, outputPath, detailOutputDir, preview, previewRoot, routes: prepared.routes });
  }
  writePreparedRuntime(outputPath, prepared.runtime);
  writePreparedDetails(detailOutputDir, prepared.pages);
  return { strategies: prepared.strategies, routes: prepared.routes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const preview = args.includes('--preview');
    const outputIndex = args.indexOf('--output-dir');
    const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
    const unknown = args.some((arg, index) => arg !== '--preview' && index !== outputIndex && !(outputIndex >= 0 && index === outputIndex + 1));
    if (unknown || (outputIndex >= 0 && (!outputDir || outputIndex !== args.length - 2)) || (!preview && outputIndex >= 0)) {
      throw new Error('Usage: node scripts/build-survivor-meta.mjs [--preview --output-dir <absolute-preview-directory>]');
    }
    const result = buildSurvivorMetaSite({ ...(preview ? { preview: true, outputDir } : {}) });
    console.log(`Built Survivor Meta: ${result.strategies.length} strategies, ${result.routes.length} detail routes`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
