import * as t from '@babel/types';
import {
  last, identifierToValue, takeProperty, isFalsyNode,
} from './utils';

const COMMENT_DISPOSABLE_MARK = '#__DISPOSE__';
const markDisposable = Symbol('__DISPOSE__');

/**
 * @template T
 * @param {T} node
 * @returns {T}
 */
export function addDisposableTag(node) {
  if (!node || node[markDisposable]) return node;

  if (t.isLiteral(node)) {
    // do not make too many comments
    node[markDisposable] = true;
  }

  if (t.isObjectExpression(node) || t.isArrayExpression(node)) {
    // NOTE: babel cloneNode will discard [markDisposable]
    // so we shall avoid adding duplicated comment marker
    if (!last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) {
      node = t.addComment(node, 'leading', COMMENT_DISPOSABLE_MARK);
    }

    node[markDisposable] = true;
  }

  return node;
}

/**
 * @returns {node is t.ObjectExpression | t.ArrayExpression | t.Literal}
 */
export function isDisposableSource(node) {
  if (!node) return false;
  if (node[markDisposable]) return true;
  if (!last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) return false; // not disposable object
  if (!(t.isObjectExpression(node) || t.isArrayExpression(node) || t.isLiteral(node))) return false;

  node[markDisposable] = true;
  return true;
}

/** @type {import('@babel/core').PluginItem} */
export const disposableObject = {
  visitor: {
    VariableDeclarator(rootPath) {
      if (!isDisposableSource(rootPath.node.init)) return;

      const { scope } = rootPath;
      const newDeclaratorList = [];
      let nothingChanges = false;
      diveInto(rootPath.node.id, rootPath.node.init, true);

      /**
       * use DFS method to handle dependency problems for `var {a:a1, b=a1, ...r} = ...`
       *
       * @param {t.LVal} id
       * @param {t.Expression} source
       * @param {boolean} topLevel
       */
      function diveInto(id, source, topLevel) {
        // ----------[normal identifier]------------
        if (t.isIdentifier(id)) {
          // const foo = #obj
          // simply replace all occurs

          const binding = scope.getBinding(id.name);
          // console.log('magical process binding :', id.name, binding)

          if (!binding.constant) {
            // variable is changed. can't dispose the references
            // keep the declarator

            if (topLevel) nothingChanges = true;
            else newDeclaratorList.push(t.variableDeclarator(id, source));

            return;
          }

          if (binding.referenced) {
            // is referenced. replace all occurs, and the owning MemberExpression
            binding.referencePaths.forEach((path) => {
              let replaceWith = source;
              while (path.parentPath.isMemberExpression()) {
                const propName = identifierToValue(path.parent.property);
                if (propName === undefined) break;

                const nextReplaceWith = takeProperty(replaceWith, propName);
                if (!nextReplaceWith) break; // property not supported

                replaceWith = nextReplaceWith;
                path = path.parentPath;
              }

              [path] = path.replaceWith(addDisposableTag(t.cloneDeepWithoutLoc(replaceWith)));

              // ----------------------------------------------------------------
              // special optimize!

              if (path.parentPath.isSpreadElement()) {
                // [1,2, ...disposedArray] => [1,2,3,4]
                if (path.isArrayExpression() && path.parentPath.parentPath.isArrayExpression()) {
                  path.parentPath.replaceWithMultiple(path.node.elements);
                }

                // {a,b, ...disposedObj} => {b,a,d}
                if (path.isObjectExpression() && path.parentPath.parentPath.isObjectExpression()) {
                  path.parentPath.replaceWithMultiple(path.node.properties);
                  // TODO: erase duplicated keys
                }
              }
            });
            // } else {
            //   // not referenced. maybe keep this declarat
            //   newDeclaratorList.push(t.variableDeclarator(id, source))
          }

          return;
        }

        // ----------[object]------------
        if (t.isObjectPattern(id)) {
          if (!t.isArrayExpression(source) && !t.isObjectExpression(source)) {
            if (topLevel) throw new Error('Cannot use destructing from a non-object');

            // handle `{ foo, bar } = defaultValue` that derived from `var { unexist: { foo, bar } = defaultValue } = {}`
            newDeclaratorList.push(t.variableDeclarator(id, source));
            return;
          }

          const takenKeys = new Set();
          id.properties.forEach((property) => {
            if (t.isObjectProperty(property)) {
              const fromProperty = property.key;
              let toProperty = property.value; //
              let defaultExpr;

              if (t.isAssignmentPattern(toProperty)) {
                //  const { foo = 123 }
                //  const { foo: bar = 123 }
                //  const { foo: { x, y } = def }
                defaultExpr = toProperty.right;
                toProperty = toProperty.left;
              }

              // warn: `toProperty` could be a nested ObjectPattern or ArrayPattern
              //  const { foo: { x, y } }
              //  const { foo: { x, y } = def }

              // also, fromProperty could be an integer.
              //  const { 0: firstEl, 1: secondEl } = ['a', 'b', 'c']

              const fromPropertyId = identifierToValue(fromProperty);
              if (fromPropertyId === undefined) throw new Error('no fromPropertyId');

              let subSource = addDisposableTag(takeProperty(source, fromPropertyId));
              if (defaultExpr) subSource = isFalsyNode(subSource) ? defaultExpr : subSource;
              diveInto(toProperty, subSource);

              takenKeys.add(fromPropertyId);
            }

            if (t.isRestElement(property)) {
              // the { ...rest }
              const propertiesForRest = [];
              if (t.isObjectExpression(source)) {
                source.properties.forEach((prop) => {
                  if (t.isSpreadProperty(prop) || !takenKeys.has(identifierToValue(prop.key))) {
                    propertiesForRest.push(prop);
                  }
                });
              } else if (t.isArrayExpression(source)) {
                for (let i = 0; i < source.elements.length; i++) {
                  const el = source.elements[i];
                  if (!el) continue; // empty slot
                  if (t.isSpreadElement(el)) throw new Error('not supported: destructing rest from array');

                  propertiesForRest.push(t.objectProperty(
                    t.stringLiteral(String(i)),
                    el,
                  ));
                }
              }

              diveInto(property.argument, addDisposableTag(t.objectExpression(propertiesForRest)));
            }
          });

          return;
        }

        // ----------[array]------------
        if (t.isArrayPattern(id)) {
          if (!t.isArrayExpression(source)) {
            if (topLevel) throw new Error('Must be an array expression');

            // cannot handle the RVal
            newDeclaratorList.push(t.variableDeclarator(id, source));
            return;
          }

          let metSpreadElementInSource = -1;
          for (let i = 0; i < id.elements.length; i++) {
            const srcItem = addDisposableTag(source.elements[i]) || t.unaryExpression('void', t.numericLiteral(0));
            if (t.isSpreadElement(srcItem)) metSpreadElementInSource = i;

            const el = id.elements[i];
            if (!el) continue; // empty slot like const [,,,,it]

            if (t.isRestElement(el) && (metSpreadElementInSource === -1 || metSpreadElementInSource === i)) {
              // const [...rest]
              diveInto(el.argument, addDisposableTag(t.arrayExpression(source.elements.slice(i))));
              break;
            }

            if (metSpreadElementInSource !== -1) {
              throw new Error('Currently not supported: taking a element from "restElement"');
            }

            if (t.isIdentifier(el)) {
              // const [abc] =
              diveInto(el, srcItem);
            }

            if (t.isAssignmentPattern(el)) {
              // const [abc = 1234] =
              const defaultExpr = el.right;
              diveInto(el.left, isFalsyNode(srcItem) ? defaultExpr : srcItem);
            }
          }
        }
      }

      if (nothingChanges) return; // avoid dead-loop

      if (newDeclaratorList.length) rootPath.replaceWithMultiple(newDeclaratorList);
      else rootPath.remove();

      scope.crawl(); // rebuild binding infos because some declarators are removed or updated.
    },
    MemberExpression(path) {
      // usually this is already processed. but due to other plugins, we might meet code like:
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }[true ? 'b' : 'a'])
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }['b'])

      const obj = path.node.object;
      const propName = identifierToValue(path.node.property);
      if (!isDisposableSource(obj)) return;
      if (propName === undefined) return;

      const newNode = takeProperty(obj, propName);
      if (newNode) path.replaceWith(addDisposableTag(newNode));
    },
  },
};
