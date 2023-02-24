import * as t from '@babel/types';
import { last, identifierToValue } from './last';

const COMMENT_DISPOSABLE_MARK = '#__DISPOSE__'

/** @type {import('@babel/core').PluginItem} */
export const moveStaticProperties = {
  visitor: {
    VariableDeclaration(rootPath) {
      Object.entries(rootPath.getBindingIdentifierPaths()).forEach(
        ([name, idPath]) => {
          const binding = idPath.scope.getBinding(idPath)
          if (!binding.constant) return; // variable is re-assigned

          const objValue = binding.path.isVariableDeclarator() && binding.path.get('init')
          if (!objValue || !objValue.isObjectExpression()) return; // not object
          if (!last(objValue.node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) return; // not disposable object

          let hasReferences = binding.referenced
          binding.referencePaths.forEach(path => {
            let replaceWith = objValue
            while (path.parentPath.isMemberExpression()) {
              let propName = identifierToValue(path.parentPath.get('property'))
              if (!propName) break;

              let propValue = replaceWith.isObjectExpression() && replaceWith.get('properties').find(it => identifierToValue(it.get('key')) === propName)
              if (!propValue) {
                // property not exists
                path = path.parentPath;
                path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)))
                return;
              }

              if (!propValue.isObjectProperty()) break;
              if (propValue.node.computed) break;

              let nextReplaceWith = propValue.node.shorthand ? propValue.get('key') : propValue.get('value')
              replaceWith = nextReplaceWith
              path = path.parentPath
            }

            let [newPath] = path.replaceWith(t.cloneDeepWithoutLoc(replaceWith.node))
            if (replaceWith.isObjectExpression()) newPath.addComment('leading', COMMENT_DISPOSABLE_MARK)
          })

          if (hasReferences) {
            // already transferred to somewhere else.
            // can dispose this now
            objValue.replaceWith(t.nullLiteral())
          }
        }
      )
    }
  }
}


