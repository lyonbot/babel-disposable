import * as t from '@babel/types';
import { last } from './last';

/** @type {import('@babel/core').PluginItem} */
export const removePureCalls = {
  visitor: {
    ExpressionStatement(path) {
      const comment = last(path.node.leadingComments);
      if (comment?.value.includes('#__PURE__')) {
        comment.value = ''
        path.remove()
      }
    },
  }
}