import * as t from '@babel/types';
import { COMMENT_DISPOSED_FUNCTION, isDisposableFunction } from './utils/disposable';
import { isFalsyNode } from './utils/misc';

/** @type {import('@babel/core').PluginItem} */
export const disposableFunction = {
  visitor: {
    CallExpression(path) {
      // console.log('find call', generate(path.node.callee));
      const callee = path.get('callee');
      if (!callee.isIdentifier()) return;

      const binding = path.scope.getBinding(callee.node.name);
      let fnPath = binding?.path;
      if (fnPath?.isVariableDeclarator()) fnPath = fnPath.get('init');
      if (!fnPath?.isFunction()) return;
      if (!isDisposableFunction(fnPath)) return;

      // ----------------------------------------------------------------

      const paramValues = path.node.arguments;
      let fn = t.cloneNode(fnPath.node, true);
      if (fn.params.length > 0) {
        if (t.isExpression(fn.body))
          fn.body = t.blockStatement([t.returnStatement(fn.body)]);

        // TODO: support `arguments` in body

        let declaratorList = [];
        if (paramValues.some(n => n.type === 'SpreadElement')) {
          // has `spreadElement`. heck off
          declaratorList.push(t.variableDeclarator(
            t.arrayPattern(fn.params),
            t.arrayExpression(paramValues),
          ));
        } else {
          // separate into vars
          for (let i = 0; i < fn.params.length; i++) {
            const param = fn.params[i];
            if (t.isRestElement(param)) {
              declaratorList.push(t.variableDeclarator(
                param.argument,
                t.arrayExpression(paramValues),
              ));
              break;
            }

            const paramValue = paramValues.shift() || t.unaryExpression('void', t.numericLiteral(0));
            if (t.isAssignmentPattern(param)) {
              declaratorList.push(t.variableDeclarator(param.left, isFalsyNode(paramValue) ? param.right : paramValue));
            } else {
              declaratorList.push(t.variableDeclarator(param, paramValue));
            }
          }
        }

        fn.params = [];
        fn.body.body.unshift(t.variableDeclaration('var', declaratorList));
      }

      if (t.isFunctionDeclaration(fn)) {
        fn = t.functionExpression(fn.id, [], fn.body, fn.generator, fn.async);
      }

      // ----------------------------------------------------------------

      let expr = t.callExpression(fn, []);
      expr = t.addComment(expr, 'leading', COMMENT_DISPOSED_FUNCTION);

      [path] = path.replaceWith(expr);
    },
  },
};
