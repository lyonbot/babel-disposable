import * as t from '@babel/types';

/**
 * @template T
 * @param {T[] | null | undefined} val
 * @returns {T | undefined}
 */
export function last(val) {
  if (Array.isArray(val))
    return val[val.length - 1];
}

/**
 * @returns {string | number | undefined}
 */
export const identifierToValue = (node) => {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isIdentifier(node)) return node.name;
  if (t.isNumericLiteral(node)) return node.value;
};
