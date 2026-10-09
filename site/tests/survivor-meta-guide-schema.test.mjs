import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { validateGuideStructure } from '../../scripts/survivor-meta-guide-validation.mjs';
import { makeFixture, makePlan, makeSlot, makeSource, makeSubstitute } from './fixtures/survivor-meta-guide-fixture.mjs';

const schema = JSON.parse(fs.readFileSync(new URL('../../content/survivor/meta-guides/schema.json', import.meta.url), 'utf8'));
const valid = guide => assert.deepEqual(validateGuideStructure(guide, schema), []);
function invalid(guide) {
  const errors = validateGuideStructure(guide, schema);
  assert.ok(errors.length > 0, 'expected structural diagnostics');
  for (const error of errors) {
    assert.equal(error.code, 'STRUCTURE_INVALID');
    assert.equal(typeof error.path, 'string');
    assert.equal(typeof error.message, 'string');
  }
  return errors;
}
function mutate(change, options) {
  const { guide } = makeFixture(options);
  change(guide);
  return guide;
}

test('schema accepts four page kinds and three gameplay shapes', () => {
  for (const kind of ['STANDARD', 'FAMILY', 'LEGACY', 'TEAM']) valid(makeFixture({ kind }).guide);
  for (const kind of ['STANDARD', 'TEAM']) {
    for (const gameplay of ['DECISIONS', 'SEQUENCE', 'ROLE_GUIDE']) valid(makeFixture({ kind, gameplay }).guide);
  }
});

test('schema rejects visual fields and copied authority', () => {
  for (const field of ['sectionWidth', 'color', 'position', 'className', 'columns', 'disclosure', 'componentSize',
    'power', 'tier', 'status', 'rankingIndex', 'confidence', 'evidence', 'name', 'slug', 'classification',
    'stability', 'trend', 'diagnostics', 'children', 'fullArticle']) {
    invalid(mutate(guide => { guide.page[field] = field === 'sectionWidth' ? '50%' : 90; }));
  }
  invalid(mutate(guide => { guide.unknown = true; }));
  for (const field of ['position', 'currentEffect', 'owner', 'unknown']) {
    invalid(mutate(guide => { guide.page.loadout = { plans: [makePlan()] }; guide.page.loadout.plans[0].slots[0][field] = 'Copied'; }));
  }
  invalid(mutate(guide => { guide.page.loadout = { plans: [makePlan()] }; guide.page.loadout.plans[0].slots[0].choices[0].currentEffect = 'Copied'; }));
});

test('schema requires exact version and envelope; metadata are not guide examples', () => {
  for (const schemaVersion of [0, 2, '1', null]) invalid(mutate(guide => { guide.schemaVersion = schemaVersion; }));
  for (const field of ['schemaVersion', 'strategyId', 'snapshotId', 'perkBaseline', 'perkReviews', 'reviewStatus', 'reviewedDate', 'page']) {
    invalid(mutate(guide => { delete guide[field]; }));
  }
  for (const value of [schema, { schemaVersion: 1, perks: { lithe: { mechanicsRevision: 1, acknowledgedFingerprint: 'a'.repeat(64) } } },
    { kind: 'STRATEGY', ref: 'X01#/id' }, null, [], 'guide', 1, true]) invalid(value);
});

test('schema rejects wrong scalar types, blank text, HTML and Markdown while retaining punctuation', () => {
  for (const summary of ['', '  \n\t', 90, false, null, [], {}, '<b>Route</b>', '<script>alert(1)</script>',
    '<!-- comment -->', '**Route**', '[Route](https://example.invalid)', '`route`', '# Heading', '- A list']) {
    invalid(mutate(guide => { guide.page.summary = summary; }));
  }
  valid(mutate(guide => { guide.page.summary = 'Wait < 5 seconds? A & B; don\'t treat 1 > 0 as advice.'; }));
  valid(mutate(guide => { guide.page.summary = 'If time < distance and distance > safety, rotate.'; }));
  invalid(mutate(guide => { guide.perkReviews = {}; }));
  invalid(mutate(guide => { guide.page.verdict.recommendation = 1; }));
});

test('schema permits optional omission and no-perk dependencies but rejects empty optional collections', () => {
  const { guide } = makeFixture();
  assert.deepEqual(guide.perkReviews, []);
  valid(guide);
  for (const field of ['strengths', 'weaknesses', 'killerCounterplay', 'commonMistakes', 'related', 'mechanics']) {
    invalid(mutate(value => { value.page[field] = []; }));
  }
  for (const field of ['environments', 'difficulty', 'loadout']) invalid(mutate(value => { value.page[field] = {}; }));
  invalid(mutate(value => { value.sources = []; }));
  for (const field of ['bestFor', 'notIdealFor']) invalid(mutate(value => { value.page.verdict[field] = []; }));
  for (const field of ['plans', 'options']) invalid(mutate(value => { value.page.loadout = { [field]: [] }; }));
  for (const field of ['opening', 'abortWhen']) invalid(mutate(value => { value.page.gameplay[field] = []; }));
  invalid(mutate(value => { value.page.gameplay.rows[0].enabledBy = []; }));
});

test('schema accepts full and partial authored plans and canonical references without copied membership', () => {
  for (const provenance of ['EDITORIAL', 'EXAMPLE']) {
    for (const completeness of ['COMPLETE', 'MODULE']) {
      for (const environment of ['SOLO_Q', 'COORDINATED_SWF', 'BOTH']) {
        valid(mutate(guide => { guide.page.loadout = { plans: [{ ...makePlan(completeness), provenance, environment }] }; }));
      }
    }
  }
  for (const slots of [[], [makeSlot()], [1, 2, 3, 4, 1].map(slot => makeSlot(slot))]) {
    invalid(mutate(guide => { guide.page.loadout = { plans: [{ ...makePlan('COMPLETE'), slots }] }; }));
  }
  for (const slots of [[], [1, 2, 3, 4, 1].map(slot => makeSlot(slot))]) {
    invalid(mutate(guide => { guide.page.loadout = { plans: [{ ...makePlan(), slots }] }; }));
  }
  for (const slot of [0, 5, 1.5, '1']) invalid(mutate(guide => { const plan = makePlan(); plan.slots[0].slot = slot; guide.page.loadout = { plans: [plan] }; }));
  const canonical = { provenance: 'CANONICAL', buildId: 'X01@10.2.0-r1:solo-representative' };
  valid(mutate(guide => { guide.page.loadout = { plans: [canonical] }; }));
  const note = { slot: 4, role: 'Rescue', usage: 'FLEX', whyItsHere: 'Choose a rescue tool.', optionReasons: [{ perkId: 'kindred', whyItsHere: 'Share information.' }], substitutes: [makeSubstitute()] };
  valid(mutate(guide => { guide.page.loadout = { plans: [{ ...canonical, notes: [note] }] }; }));
  for (const field of ['slots', 'perkIds', 'environment', 'completeness']) invalid(mutate(guide => { guide.page.loadout = { plans: [{ ...canonical, [field]: [] }] }; }));
  invalid(mutate(guide => { guide.page.loadout = { plans: [{ ...canonical, notes: [] }] }; }));
  for (const field of ['optionReasons', 'substitutes']) invalid(mutate(guide => { guide.page.loadout = { plans: [{ ...canonical, notes: [{ ...note, [field]: [] }] }] }; }));
});

test('schema enforces REQUIRED singleton and choiceCount exactly 1', () => {
  for (const usage of ['REQUIRED', 'CORE', 'SUPPORT', 'FLEX']) {
    valid(mutate(guide => { const plan = makePlan(); plan.slots[0].usage = usage; guide.page.loadout = { plans: [plan] }; }));
  }
  for (const choiceCount of [0, 2, '1', null]) invalid(mutate(guide => { const plan = makePlan(); plan.slots[0].choiceCount = choiceCount; guide.page.loadout = { plans: [plan] }; }));
  valid(mutate(guide => { const plan = makePlan(); plan.slots[0].choices.push({ perkId: 'kindred', whyItsHere: 'A different tool.' }); plan.slots[0].substitutes = [makeSubstitute()]; guide.page.loadout = { plans: [plan] }; }));
  invalid(mutate(guide => { const plan = makePlan(); plan.slots[0].choices = []; guide.page.loadout = { plans: [plan] }; }));
  invalid(mutate(guide => { const plan = makePlan(); plan.slots[0].usage = 'REQUIRED'; plan.slots[0].choices.push({ perkId: 'kindred', whyItsHere: 'A different tool.' }); guide.page.loadout = { plans: [plan] }; }));
  invalid(mutate(guide => { const plan = makePlan(); plan.slots[0].usage = 'REQUIRED'; plan.slots[0].substitutes = [makeSubstitute()]; guide.page.loadout = { plans: [plan] }; }));
});

test('schema closes FAMILY and LEGACY shapes and TEAM has exactly four roles without page loadout', () => {
  for (const kind of ['FAMILY', 'LEGACY']) {
    for (const field of ['verdict', 'loadout', 'gameplay', 'strengths', 'difficulty', 'environments', 'mechanics', 'roles']) invalid(mutate(guide => { guide.page[field] = {}; }, { kind }));
  }
  for (const field of ['comparisons', 'successors', 'whatItWas', 'whyNotCurrent', 'historicalPerks']) {
    const kind = field === 'comparisons' ? 'FAMILY' : 'LEGACY';
    invalid(mutate(guide => { guide.page[field] = []; }, { kind }));
  }
  valid(mutate(guide => { guide.page.historicalPerks = [{ perkId: 'stake-out', historicalUse: 'Supported the old approach.' }]; }, { kind: 'LEGACY' }));
  for (const count of [0, 3, 5]) invalid(mutate(guide => { guide.page.roles = Array.from({ length: count }, (_, i) => ({ id: `role-${i}`, title: 'Task', assignment: 'Cover the task.' })); }, { kind: 'TEAM' }));
  invalid(mutate(guide => { guide.page.loadout = { plans: [makePlan()] }; }, { kind: 'TEAM' }));
  valid(mutate(guide => { guide.page.roles[0].loadout = { plans: [makePlan()] }; guide.page.canonicalTeamBuildIds = ['X02@10.2.0-r1:swf-team-architecture']; }, { kind: 'TEAM' }));
  invalid(mutate(guide => { guide.page.canonicalTeamBuildIds = []; }, { kind: 'TEAM' }));
});

test('schema enforces review-state and date shapes, not calendar semantics', () => {
  for (const reviewStatus of ['DRAFT', 'REVIEWED', 'PUBLISHED']) valid(makeFixture({ reviewStatus }).guide);
  invalid(mutate(guide => { guide.reviewedDate = '2026-10-06'; }));
  invalid(mutate(guide => { guide.reviewStatus = 'APPROVED'; }));
  for (const reviewStatus of ['REVIEWED', 'PUBLISHED']) {
    for (const reviewedDate of [null, '2026-1-06', '2026-10-06T00:00:00Z', 20261006]) invalid(mutate(guide => { guide.reviewedDate = reviewedDate; }, { reviewStatus }));
    invalid(mutate(guide => { delete guide.sources; }, { reviewStatus }));
  }
  valid(mutate(guide => { guide.reviewedDate = '2026-02-31'; }, { reviewStatus: 'REVIEWED' }));
  invalid(mutate(guide => { guide.perkBaseline.verifiedDate = 'yesterday'; }));
  for (const archiveSha256 of ['a'.repeat(63), 'A'.repeat(64), 1]) invalid(mutate(guide => { guide.perkBaseline.archiveSha256 = archiveSha256; }));
  for (const mechanicsRevision of [0, -1, 1.5, '1']) invalid(mutate(guide => { guide.perkReviews = [{ perkId: 'lithe', mechanicsRevision }]; }));
  valid(mutate(guide => { guide.perkReviews = [{ perkId: 'lithe', mechanicsRevision: 1 }]; }));
});

test('schema validates source syntax and complete reviewed substitutes', () => {
  for (const kind of ['STRATEGY', 'SNAPSHOT', 'PERK', 'PUBLICATION']) valid(mutate(guide => { guide.sources = [makeSource(kind)]; }));
  valid(mutate(guide => { guide.sources = [{ kind: 'STRATEGY', ref: 'X01#/a~1b/~0/0' }]; }));
  for (const source of [{ kind: 'STRATEGY', ref: 'X01#not-a-pointer' }, { kind: 'PERK', ref: ' lithe#/mechanics' },
    { kind: 'STRATEGY', ref: 'X01#/bad~2escape' }, { kind: 'PUBLICATION', ref: 'X01# ' },
    { kind: 'URL', ref: 'https://example.invalid' }, { ...makeSource(), url: 'Copied' }]) invalid(mutate(guide => { guide.sources = [source]; }));
  for (const field of ['perkId', 'provenance', 'why', 'source', 'reviewedDate']) invalid(mutate(guide => { const substitute = makeSubstitute(); delete substitute[field]; const plan = makePlan(); plan.slots[0].substitutes = [substitute]; guide.page.loadout = { plans: [plan] }; }));
  invalid(mutate(guide => { const substitute = makeSubstitute(); substitute.provenance = 'CANONICAL'; const plan = makePlan(); plan.slots[0].substitutes = [substitute]; guide.page.loadout = { plans: [plan] }; }));
});

test('schema validates loadout options, items and their forbidden combinations', () => {
  for (const usage of ['CORE', 'SUPPORT', 'FLEX', 'OUTDATED_TRAP', 'ALTERNATIVE']) {
    const option = { perkId: 'kindred', usage, whyItsHere: 'Support the next objective.' };
    if (usage === 'ALTERNATIVE') option.replaces = { planId: 'route-tools', slot: 1 };
    valid(mutate(guide => { guide.page.loadout = { options: [option] }; }));
    if (usage === 'ALTERNATIVE') { delete option.replaces; invalid(mutate(guide => { guide.page.loadout = { options: [option] }; })); }
    else invalid(mutate(guide => { guide.page.loadout = { options: [{ ...option, replaces: { planId: 'route-tools', slot: 1 } }] }; }));
  }
  for (const status of ['REQUIRED', 'RECOMMENDED', 'OPTIONAL']) {
    const item = { id: 'rescue-item', status, name: 'Flashlight', why: 'Support a rescue.', addOns: [{ name: 'Battery', why: 'Support repeated use.' }] };
    valid(mutate(guide => { guide.page.loadout = { item }; }));
    for (const field of ['name', 'why']) { const broken = { ...item }; delete broken[field]; invalid(mutate(guide => { guide.page.loadout = { item: broken }; })); }
    invalid(mutate(guide => { guide.page.loadout = { item: { ...item, addOns: [] } }; }));
  }
  valid(mutate(guide => { guide.page.loadout = { item: { id: 'no-item', status: 'NONE', why: 'No carried tool needed.' } }; }));
  for (const extra of [{ name: 'Flashlight' }, { addOns: [{ name: 'Battery', why: 'Useful.' }] }]) invalid(mutate(guide => { guide.page.loadout = { item: { id: 'no-item', status: 'NONE', ...extra } }; }));
});

test('schema validates difficulty, environments, related and all gameplay option shapes', () => {
  for (const label of ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']) valid(mutate(guide => {
    guide.page.difficulty = { learning: { label, why: 'Learn the route.' } };
    guide.page.environments = { soloQ: ['Use independent cues.'], coordinatedSwf: ['Share the cue.'] };
    guide.page.related = [{ strategyId: 'P01', relationship: 'COMBINE_WITH', why: 'A compatible approach.' }];
    guide.page.mechanics = [{ id: 'route-cue', explanation: 'Use the visible cue.' }];
  }));
  invalid(mutate(guide => { guide.page.difficulty = { learning: { label: 90, why: 'Learn.' } }; }));
  invalid(mutate(guide => { guide.page.environments = { soloQ: [] }; }));
  invalid(mutate(guide => { guide.page.related = [{ strategyId: 'P01', relationship: 'PARENT', why: 'Copied canonical edge.' }]; }));
  for (const [gameplay, fields] of [['DECISIONS', ['opening', 'abortWhen']], ['SEQUENCE', ['activationWhen', 'abortWhen', 'afterSuccess']], ['ROLE_GUIDE', ['handoffWhen', 'abortWhen']]]) {
    valid(mutate(guide => { for (const field of fields) guide.page.gameplay[field] = ['Use a concrete cue.']; }, { gameplay }));
    for (const field of fields) invalid(mutate(guide => { guide.page.gameplay[field] = []; }, { gameplay }));
    invalid(mutate(guide => { guide.page.gameplay.unknown = 'No'; }, { gameplay }));
  }
});

test('schema validates enabledBy syntax and unique array values without resolving references', () => {
  const enabledBy = ['perk:lithe', 'slot:route-tools#1', 'slot:X01@10.2.0-r1:solo-representative#4', 'item:rescue-item', 'mechanic:route-cue', 'role:flex'];
  valid(mutate(guide => { guide.page.gameplay.rows[0].enabledBy = enabledBy; }));
  for (const ref of ['perk: lithe', 'perk:Lithe', 'slot:route-tools#0', 'slot:route-tools#5', 'slot:route-tools', 'item:', 'tool:lithe', ' mechanic:route-cue']) invalid(mutate(guide => { guide.page.gameplay.rows[0].enabledBy = [ref]; }));
  invalid(mutate(guide => { guide.page.gameplay.rows[0].enabledBy = ['perk:lithe', 'perk:lithe']; }));
  // Ownership, unique IDs/slot numbers and dependency sets are later semantic checks.
  valid(mutate(guide => { guide.strategyId = 'Z99'; guide.page.loadout = { plans: [{ ...makePlan('COMPLETE'), slots: [1, 1, 1, 1].map((slot, i) => ({ ...makeSlot(slot), role: `Task ${i}` })) }] }; }));
});

test('validator rejects unsupported schema keywords including unused definitions and bad references', () => {
  for (const keyword of ['anyOf', 'allOf', 'not', 'if', 'format', 'minProperties', 'default', 'unevaluatedProperties', 'patternProperties']) {
    const changed = structuredClone(schema);
    changed.$defs.unused = { type: 'string', [keyword]: true };
    assert.throws(() => validateGuideStructure(makeFixture().guide, changed), /Unsupported schema keyword/);
  }
  assert.throws(() => validateGuideStructure(makeFixture().guide, { $ref: 'https://example.invalid/schema' }), /local.*ref/i);
  assert.throws(() => validateGuideStructure(makeFixture().guide, { $ref: '#/$defs/missing', $defs: {} }), /unresolved.*ref/i);
});

test('validator handles local refs, oneOf exclusivity, structural uniqueness and deterministic nonmutating diagnostics', () => {
  assert.deepEqual(validateGuideStructure({ a: 'yes' }, { type: 'object', properties: { a: { $ref: '#/$defs/a~1b~0c' } }, required: ['a'], additionalProperties: false, $defs: { 'a/b~c': { const: 'yes' } } }), []);
  assert.ok(validateGuideStructure('yes', { oneOf: [{ type: 'string' }, { const: 'yes' }] }).some(error => error.code === 'STRUCTURE_INVALID'));
  assert.deepEqual(validateGuideStructure([{ a: 1 }, { a: 2 }], { type: 'array', uniqueItems: true }), []);
  assert.ok(validateGuideStructure([{ a: 1, b: 2 }, { b: 2, a: 1 }], { type: 'array', uniqueItems: true }).length);
  const guide = mutate(value => { value.page.verdict.recommendation = 1; });
  const before = structuredClone({ guide, schema });
  const first = invalid(guide);
  assert.deepEqual(invalid(guide), first);
  assert.deepEqual({ guide, schema }, before);
  assert.ok(first.some(error => error.path.endsWith('/page/verdict/recommendation')));
});

test('native JSON.parse retains last duplicate key and validator does not parse or coerce inputs', () => {
  const serialized = JSON.stringify(makeFixture().guide);
  valid(JSON.parse(serialized.replace('"schemaVersion":1', '"schemaVersion":2,"schemaVersion":1')));
  invalid(JSON.parse(serialized.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":2')));
  invalid(serialized);
  invalid(mutate(guide => { guide.strategyId = ' X01'; }));
  invalid(mutate(guide => { guide.snapshotId = 'X01@10.2.0-r1 '; }));
});

test('schema rejects trailing newlines in exact IDs and dates but permits RFC6901 pointer field punctuation', () => {
  for (const strategyId of ['X01\n', 'X01\r\n']) invalid(mutate(guide => { guide.strategyId = strategyId; }));
  invalid(mutate(guide => { guide.snapshotId += '\n'; }));
  invalid(mutate(guide => { guide.perkBaseline.verifiedDate += '\n'; }));
  invalid(mutate(guide => { guide.perkBaseline.archiveSha256 += '\n'; }));
  invalid(mutate(guide => { guide.page.gameplay.rows[0].enabledBy = ['perk:lithe\n']; }));
  valid(mutate(guide => { guide.sources = [{ kind: 'STRATEGY', ref: 'X01#/field_with_underscores' }]; }));
});

test('schema rejects Setext headings and reference-style Markdown in plain text', async t => {
  for (const summary of [
    'Rotate\n=====', 'Rotate\r\n-----',
    '[Route][guide]\n\n[guide]: https://example.invalid',
    '[Route][]\n\n[Route]: https://example.invalid',
    '[Route]\n\n[Route]: https://example.invalid',
    '[guide]: https://example.invalid'
  ]) {
    await t.test(JSON.stringify(summary), () => {
      invalid(mutate(guide => { guide.page.summary = summary; }));
    });
  }
  valid(mutate(guide => { guide.page.summary = 'Rotate when needed.\nKeep the next route open [if safe].'; }));
});

test('schema accepts RFC6901 whitespace and angle brackets in all pointer source branches', async t => {
  for (const kind of ['STRATEGY', 'SNAPSHOT', 'PERK']) {
    const prefix = makeSource(kind).ref.split('#')[0];
    for (const pointer of ['/field with spaces', '/<field>', '/field\twith\nwhitespace', '/field with spaces/<field>/~0/~1/']) {
      await t.test(`${kind} ${JSON.stringify(pointer)}`, () => {
        valid(mutate(guide => { guide.sources = [{ kind, ref: `${prefix}#${pointer}` }]; }));
      });
    }
    for (const ref of [` ${prefix}#/field`, `${prefix} #/field`, `${prefix}#not-a-pointer`, `${prefix}#/bad~2escape`, `${prefix}#/bad~`]) {
      invalid(mutate(guide => { guide.sources = [{ kind, ref }]; }));
    }
  }
});

test('schema vocabulary enforces bounds, Unicode length, null, items, required and closed properties', () => {
  const samples = [
    [1, { type: 'integer', minimum: 1, maximum: 4 }, true],
    [0, { type: 'integer', minimum: 1 }, false],
    [5, { type: 'integer', maximum: 4 }, false],
    [1.5, { type: 'integer' }, false],
    ['😀', { type: 'string', minLength: 2 }, false],
    ['ab', { type: 'string', minLength: 2, pattern: '^ab$' }, true],
    [null, { type: 'null' }, true],
    ['null', { type: 'null' }, false],
    [[1], { type: 'array', minItems: 1, maxItems: 1, items: { type: 'integer' } }, true],
    [['1'], { type: 'array', items: { type: 'integer' } }, false],
    [[], { type: 'array', minItems: 1 }, false],
    [[1, 2], { type: 'array', maxItems: 1 }, false],
    [{}, { type: 'object', required: ['a'], properties: { a: { const: 1 } }, additionalProperties: false }, false],
    [{ a: 1, b: 2 }, { type: 'object', properties: { a: { const: 1 } }, additionalProperties: false }, false],
    [{ a: 1 }, { type: 'object', properties: { a: { const: 1 } }, additionalProperties: false }, true]
  ];
  for (const [value, localSchema, accepted] of samples) {
    assert.equal(validateGuideStructure(value, localSchema).length === 0, accepted, JSON.stringify({ value, localSchema }));
  }
});
