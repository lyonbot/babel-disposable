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
 * @param {NodePath} path
 * @returns {string | undefined}
 */
export const identifierToValue = (path) => {
  if (path.isStringLiteral()) return path.node.value;
  if (path.isIdentifier()) return path.node.name;
};
