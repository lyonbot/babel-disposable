import * as t from '@babel/types';
import { identifierToValue, objectKeys } from './utils';

/** @type {import('@babel/core').PluginItem} */
export const bakeObjectKeys = {
  visitor: {
    CallExpression(path) {
      const arg = path.get('arguments')[0];
      if (path.node.arguments.length !== 1) return;

      if (!t.matchesPattern(path.node.callee, ['Object', 'keys'])) return;
      if (path.scope.getBinding('Object')) return;

      const keys = objectKeys(arg.node);
      if (keys) {
        path.replaceWith(t.arrayExpression(Array.from(keys, str => t.stringLiteral(str))));
        return;
      }

      // failed to process!
      // not processable, but we can remove the meanless "property values" / "element values"
      // by replacing all values to number "1"

      if (arg.isObjectExpression()) {
        arg.get('properties').forEach(prop => {
          const key = identifierToValue(prop.node.key);
          if (key) prop.replaceWith(t.objectProperty(t.stringLiteral(key), t.numericLiteral(1)));
        });
        return;
      }

      if (arg.isArrayExpression()) {
        arg.get('elements').forEach(el => {
          if (el.node && !el.isSpreadElement()) el.replaceWith(t.numericLiteral(1));
        });
      }
    },
  },
};
