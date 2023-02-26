import * as t from '@babel/types';

/**
 * @template T
 * @param {T[] | null | undefined} val
 * @returns {T | undefined}
 */
export function last(val) {
  if (Array.isArray(val)) { return val[val.length - 1]; }
}

/**
 * @returns {string | number | undefined}
 */
export const identifierToValue = (node) => {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isIdentifier(node)) return node.name;
  if (t.isNumericLiteral(node)) return node.value;
};

/**
 * @param {t.ObjectExpression | t.ArrayExpression} node
 * @param {string | number} propName
 * @returns {t.RVal | undefined} `undefined` if not supported.
 */
export function takeProperty(node, propName) {
  if (t.isObjectExpression(node)) {
    propName = String(propName);
    const prop = node.properties.find(it => t.isObjectMember(it) && identifierToValue(it.key) === propName);
    if (!prop) return t.unaryExpression('void', t.numericLiteral(0));

    if (t.isObjectMethod(prop)) {
      return (
        t.functionExpression(prop.generator ? prop.key : null, prop.params, prop.body, prop.generator, prop.async)
      );
    }
    if (t.isObjectProperty(prop)) {
      if (prop.shorthand) return prop.key;
      return (prop.value);
    }
  }

  if (t.isArrayExpression(node)) {
    if (propName === 'length') {
      if (node.elements.some(x => t.isSpreadElement(x))) return; // can't directly compute the length
      return t.numericLiteral(node.elements.length);
    }

    propName = +propName;
    if (Number.isInteger(propName) && propName >= 0) {
      for (let i = 0; i < node.elements.length; i++) {
        const el = node.elements[i];
        if (t.isSpreadElement(el)) return; // unsupported referencing: some rest element inside
        if (i === propName) return (el);
      }
      return t.unaryExpression('void', t.numericLiteral(0));
    }
  }
}

/**
 * do `Object.keys` on a object or an array
 *
 * @param {t.ObjectExpression | t.ArrayExpression} node
 * @returns {string[] | undefined} - `undefined` if fails (eg. has `...spread`)
 */
export function objectKeys(node) {
  const ans = [];

  if (t.isObjectExpression(node)) {
    for (const prop of node.properties) {
      if (t.isSpreadElement(prop)) return;
      const id = identifierToValue(prop.node.key);
      if (!id) return;

      ans.push(id);
    }
    return ans;
  }

  if (t.isArrayExpression(node)) {
    const elements = node.elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!el) continue; // empty slot
      if (t.isSpreadElement(el)) return;

      ans.push(String(i));
    }
    return ans;
  }
}

/**
 * check if `node` is nullish, or whether it is a node but presents `null | undefined`
 * @param {*} node
 */
export function isFalsyNode(node) {
  if (!node) return true;
  if (t.isUnaryExpression(node) && node.operator === 'void') return true;
  if (t.isNullLiteral(node)) return true;
  if (t.isIdentifier(node) && node.name === 'undefined') return true;
  return false;
}
