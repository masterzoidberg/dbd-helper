import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUNTIME_EDITORIAL_META = new Set(['editorialStatus']);
const RUNTIME_MODULE_COUNT = 5;

function defaultRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function loadSurvivorRecords({ rootDir = defaultRoot() } = {}) {
  const sourceDir = path.join(rootDir, 'content/survivor/perks');
  const folders = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d{3}-\d{3}$/.test(entry.name))
    .map(entry => entry.name)
    .sort();
  if (!folders.length) throw new Error(`No survivor perk batch folders found in ${sourceDir}`);

  return folders.flatMap(folder => {
    const folderPath = path.join(sourceDir, folder);
    const files = fs.readdirSync(folderPath).filter(name => name.endsWith('.json')).sort();
    if (files.length < 1 || files.length > 5) throw new Error(`${folder}: expected 1-5 perk JSON files`);
    return files.map(file => {
      const record = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
      if (record.batch !== folder) throw new Error(`${folder}/${file}: batch must equal ${folder}`);
      return { file: `${folder}/${file}`, ...record };
    });
  });
}

function flattenRecord(record) {
  const editorial = Object.fromEntries(
    Object.entries(record.editorial).filter(([key]) => !RUNTIME_EDITORIAL_META.has(key))
  );
  return { id: record.id, ...editorial, ...record.mechanics };
}

export function loadAndFlattenSurvivorPerks(options = {}) {
  const records = loadSurvivorRecords(options);
  const ids = new Set();
  const ranks = new Set();
  const flattened = [];

  for (const record of records) {
    if (!record.id || typeof record.id !== 'string') throw new Error(`${record.file}: perk id is required`);
    if (!record.mechanics || !record.editorial) throw new Error(`${record.id}: mechanics and editorial are required`);
    if (!record.mechanics.currentEffect || typeof record.mechanics.currentEffect !== 'string') throw new Error(`${record.id}: mechanics.currentEffect is required`);
    if (!['complete','patch-watch','needs-rerank'].includes(record.editorial.editorialStatus)) {
      throw new Error(`${record.id}: unsupported editorialStatus ${record.editorial.editorialStatus}`);
    }
    const rank = record.editorial.rank;
    if (!Number.isInteger(rank) || rank < 1) throw new Error(`${record.id}: editorial rank must be a positive integer`);
    if (ids.has(record.id)) throw new Error(`Duplicate survivor perk id: ${record.id}`);
    if (ranks.has(rank)) throw new Error(`Duplicate survivor perk rank: ${rank}`);
    ids.add(record.id);
    ranks.add(rank);
    flattened.push(flattenRecord(record));
  }

  flattened.sort((a,b) => a.rank - b.rank);
  return flattened.filter(perk => perk.publicationStatus === 'published');
}

export function syncRuntimeMeta({ rootDir = defaultRoot(), metaPath = path.join(rootDir, 'site/assets/data-meta.js') } = {}) {
  const records = loadSurvivorRecords({ rootDir });
  const patches = [...new Set(records.map(record => record.verifiedLivePatch))];
  const dates = [...new Set(records.map(record => record.verifiedDate))];
  if (patches.length !== 1 || !patches[0]) throw new Error(`Survivor source must have one verifiedLivePatch; found ${patches.join(', ')}`);
  if (dates.length !== 1 || !dates[0]) throw new Error(`Survivor source must have one verifiedDate; found ${dates.join(', ')}`);
  let code = fs.readFileSync(metaPath, 'utf8');
  code = code.replace(/"livePatch":"[^"]*"/, `"livePatch":"${patches[0]}"`);
  code = code.replace(/"verifiedDate":"[^"]*"/, `"verifiedDate":"${dates[0]}"`);
  fs.writeFileSync(metaPath, code);
  return { livePatch: patches[0], verifiedDate: dates[0] };
}

export function writeRuntimeModules({ rootDir = defaultRoot(), outputDir = path.join(rootDir, 'site/assets') } = {}) {
  const perks = loadAndFlattenSurvivorPerks({ rootDir });
  fs.mkdirSync(outputDir, { recursive: true });
  const chunkSize = Math.ceil(perks.length / RUNTIME_MODULE_COUNT);

  for (let i = 0; i < RUNTIME_MODULE_COUNT; i += 1) {
    const records = perks.slice(i * chunkSize, (i + 1) * chunkSize);
    const fileName = `data-perks-${String(i + 1).padStart(2,'0')}.js`;
    fs.writeFileSync(path.join(outputDir, fileName), `window.DBD_DATA.perks.push(...${JSON.stringify(records)});\n`);
  }
  return perks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeRuntimeModules();
  syncRuntimeMeta();
}
