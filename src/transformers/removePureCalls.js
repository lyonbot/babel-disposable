import * as t from '@babel/types';
import { last } from './utils';

const remove = path => {
  const comment = last(path.node.leadingComments);
  if (comment?.value.includes('#__PURE__')) {
    comment.value = '';
    path.remove();
    return true;
  }
};

/** @type {import('@babel/core').PluginItem} */
export const removePureCalls = {
  visitor: {
    CallExpression(path) {
      // case 1: a dumb variable declaration
      if (path.parentPath.isVariableDeclarator() && !path.scope.getBinding(path.parentPath.get('id'))?.referenced && remove(path)) return;

      // case 2: a single line invoking
      if ((path = path.parentPath).isExpressionStatement() && remove(path)) return;
    },

    TemplateLiteral(path) {
      const evalResult = path.evaluate();
      if (evalResult.confident) path.replaceWith(t.stringLiteral(evalResult.value));
    },
  },
};