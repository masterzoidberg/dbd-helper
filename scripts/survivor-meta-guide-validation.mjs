import { isDeepStrictEqual } from 'node:util';

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
        // Include the nearest branch's actionable field paths, not every unrelated shape.
        const nearest = branches.reduce((best, branch) => branch.length < best.length ? branch : best);
        errors.push(...nearest);
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
