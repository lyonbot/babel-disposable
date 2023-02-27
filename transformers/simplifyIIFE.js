import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

/** @type {import('@babel/core').PluginItem} */
export const simplifyIIFE = {
  visitor: {
    CallExpression(path) {
      // turn simple IIFE into normal expression
      const callee = path.get('callee');
      if (!callee.isFunction()) return;
      if (callee.node.async || callee.node.generator) return;
      if (callee.node.params.length) return;
      if (path.node.arguments.length) return;

      /** @type {NodePath} */
      let body = callee.get('body');
      if (body.isBlockStatement()) {
        let replaceWith;
        let stmts = body.get('body');
        if (stmts.length === 0) {
          // use undefined
        } else if (stmts.length === 1) {
          const stmt = stmts[0];
          if (stmt.isReturnStatement()) replaceWith = stmt.node.argument;
          else if (stmt.isExpressionStatement()) replaceWith = t.unaryExpression('void', stmt.node.expression);
          else return; // unknown stuff. maybe a for-loop or if statement?
        } else {
          // not supported
          return;
        }

        path.replaceWith(replaceWith || t.unaryExpression('void', t.numericLiteral(0)));
      } else {
        path.replaceWith(body.node);
      }
    },
  },
};
