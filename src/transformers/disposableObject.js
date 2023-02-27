import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { getReplacementOnOuterMemberExpression, isDisposableSource, addDisposableTag } from './utils/disposable';
import { identifierToValue, takeProperty, isFalsyNode } from './utils/misc';

/** @type {import('@babel/core').PluginItem} */
export const disposableObject = {
  visitor: {
    VariableDeclarator(rootPath) {
      if (!isDisposableSource(rootPath.node.init)) return;

      const { scope } = rootPath;
      const newDeclaratorList = [];
      let nothingChanges = false;
      diveInto(rootPath.get('id'), rootPath.get('init').node, true);

      /**
       * use DFS method to handle dependency problems for `var {a:a1, b=a1, ...r} = ...`
       *
       * @param {NodePath<t.LVal>} id
       * @param {t.Expression} source
       * @param {boolean} topLevel
       */
      function diveInto(id, source, topLevel) {
        // ----------[normal identifier]------------
        if (id.isIdentifier()) {
          // const foo = #obj
          // simply replace all occurs

          const binding = scope.getBinding(id.node.name);

          if (!binding.constant) {
            // variable is changed. can't dispose the references
            // keep the declarator

            if (topLevel) nothingChanges = true;
            else newDeclaratorList.push(t.variableDeclarator(id.node, source));

            return;
          }

          if (binding.referenced) {
            // is referenced. replace all occurs, and the owning MemberExpression
            binding.referencePaths.forEach((path) => {
              const hoisted = getReplacementOnOuterMemberExpression(path, source);
              [path] = hoisted.path.replaceWith(addDisposableTag(t.cloneDeepWithoutLoc(hoisted.replaceWith)));

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
        if (id.isObjectPattern()) {
          if (!t.isArrayExpression(source) && !t.isObjectExpression(source)) {
            if (topLevel) throw new Error('Cannot use destructing from a non-object');

            // handle `{ foo, bar } = defaultValue` that derived from `var { unexist: { foo, bar } = defaultValue } = {}`
            newDeclaratorList.push(t.variableDeclarator(id.node, source));
            return;
          }

          const takenKeys = new Set();
          id.get('properties').forEach((property) => {
            if (property.isObjectProperty()) {
              const fromProperty = property.get('key');
              let toProperty = property.get('value'); //
              let defaultExpr;

              if (toProperty.isAssignmentPattern()) {
                //  const { foo = 123 }
                //  const { foo: bar = 123 }
                //  const { foo: { x, y } = def }
                defaultExpr = toProperty.get('right');
                toProperty = toProperty.get('left');
              }

              // warn: `toProperty` could be a nested ObjectPattern or ArrayPattern
              //  const { foo: { x, y } }
              //  const { foo: { x, y } = def }

              // also, fromProperty could be an integer; an expression
              //  const { 0: firstEl, 1: secondEl } = ['a', 'b', 'c']
              //  const { [id]: xxxx } = yyyy   // property.node.computed

              let fromPropertyId = property.node.computed
                ? fromProperty.evaluate().value
                : identifierToValue(fromProperty.node); // is Identifier
              if (fromPropertyId === undefined) throw new Error('no fromPropertyId');

              let subSource = addDisposableTag(takeProperty(source, fromPropertyId));
              if (defaultExpr) subSource = isFalsyNode(subSource) ? defaultExpr : subSource;
              if (!subSource) throw new Error('failed to destruct field: ' + fromPropertyId);
              diveInto(toProperty, subSource);

              takenKeys.add(String(fromPropertyId));
            }

            if (property.isRestElement()) {
              // let { foo, ...rest } = {foo,bar,baz}
              // -- turn into `let rest = {bar,baz}`
              const propertiesForRest = [];
              if (t.isObjectExpression(source)) {
                source.properties.forEach((prop) => {
                  if (t.isSpreadElement(prop) || !takenKeys.has(identifierToValue(prop.key))) {
                    propertiesForRest.push(prop);
                  }
                });
              } else if (t.isArrayExpression(source)) {
                // workaround for 
                //  let { 0: _, ...rest } = [1,2,3]
                // -- turn into  `let rest = { '1': 2, '2': 3 }`
                // -- but not works when the array contains spreadElement
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

              diveInto(property.get('argument'), addDisposableTag(t.objectExpression(propertiesForRest)));
            }
          });

          return;
        }

        // ----------[array]------------
        if (id.isArrayPattern()) {
          if (!t.isArrayExpression(source)) {
            if (topLevel) throw new Error('Must be an array expression');

            // cannot handle the RVal
            newDeclaratorList.push(t.variableDeclarator(id.node, source));
            return;
          }

          let metSpreadElementInSource = -1;
          let elements = id.get('elements');
          for (let i = 0; i < elements.length; i++) {
            const srcItem = addDisposableTag(source.elements[i]) || t.unaryExpression('void', t.numericLiteral(0));
            if (t.isSpreadElement(srcItem)) metSpreadElementInSource = i;

            const el = elements[i];
            if (!el.node) continue; // empty slot like const [,,,,it]

            if (el.isRestElement() && (metSpreadElementInSource === -1 || metSpreadElementInSource === i)) {
              // const [...rest]
              diveInto(el.get('argument'), addDisposableTag(t.arrayExpression(source.elements.slice(i))));
              break;
            }

            if (metSpreadElementInSource !== -1) {
              throw new Error('Currently not supported: taking a element from "restElement"');
            }

            if (el.isIdentifier() || el.isObjectPattern() || el.isArrayPattern()) {
              // const [abc] =
              diveInto(el, srcItem);
            }

            if (el.isAssignmentPattern()) {
              // const [abc = 1234] =
              const src = isFalsyNode(srcItem) ? el.node.right : srcItem;
              diveInto(el.get('left'), src);
            }
          }
        }
      }

      if (nothingChanges) return; // avoid dead-loop

      if (newDeclaratorList.length) rootPath.replaceWithMultiple(newDeclaratorList);
      else rootPath.remove();

      scope.crawl(); // rebuild binding infos because some declarators are removed or updated.
    },

    /**
     * @param {import('@babel/core').NodePath<t.ObjectExpression | t.ArrayExpression>} path
     */
    'ObjectExpression|ArrayExpression'(path) {
      // usually this is already processed. but due to other plugins, we might meet code like:
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }[true ? 'b' : 'a'])
      // log(/*#__DISPOSE_[id]*/{ xxxx: 2 yyyy   // 
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }['b'])

      if (!isDisposableSource(path.node)) return;
      const hoisted = getReplacementOnOuterMemberExpression(path, path.node);
      if (hoisted.path !== path) hoisted.path.replaceWith(addDisposableTag(hoisted.replaceWith));
    },
  },
};
