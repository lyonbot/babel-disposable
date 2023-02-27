import * as t from '@babel/types';
import { addDisposableTag } from './utils/disposable';
import { identifierToValue, objectKeys } from './utils/misc';

/** @type {import('@babel/core').PluginItem} */
export const bakeObjectKeys = {
  visitor: {
    CallExpression(path) {
      const arg = path.get('arguments')[0];
      if (path.node.arguments.length !== 1) return;
      if (!(arg.isObjectExpression() || arg.isArrayExpression())) return;

      if (!t.matchesPattern(path.node.callee, ['Object', 'keys'])) return;
      if (path.scope.getBinding('Object')) return;

      // ------------------------------------------------
      // now Object.keys(...) get an ObjectExpression or ArrayExpression

      const keys = objectKeys(arg.node);
      if (keys) {
        let newArray = addDisposableTag(t.arrayExpression(Array.from(keys, str => t.stringLiteral(str))));
        path.replaceWith(newArray);
        return;
      }

      // ------------------------------------------------
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
