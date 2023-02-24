import * as t from '@babel/types';
import { identifierToValue } from './utils'

/** @type {import('@babel/core').PluginItem} */
export const bakeObjectKeys = {
  visitor: {
    CallExpression(path) {
      const arg = path.get('arguments')[0]
      if (path.node.arguments.length !== 1) return

      if (!t.matchesPattern(path.node.callee, ['Object', 'keys'])) return
      if (path.scope.getBinding('Object')) return

      const keys = new Set()

      if (arg.isObjectExpression()) {
        const properties = arg.get('properties')
        for (const prop of properties) {
          if (prop.isSpreadElement()) {
            // not processable, but we can remove the meanless "property values"
            // by replacing all values to number "1"
            properties.forEach(prop => {
              let key = identifierToValue(prop.node.key)
              if (key) prop.replaceWith(t.objectProperty(t.stringLiteral(key), t.numericLiteral(1)))
            })
            return;
          }

          const id = identifierToValue(prop.node.key)
          if (!id) return; // not processable
          keys.add(id)
        }
      }
      else if (arg.isArrayExpression()) {
        const elements = arg.get('elements')
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (!element.node) continue;
          if (element.isSpreadElement()) {
            // not processable, but we can remove the meanless "element values"
            // by replacing all values to number "1"
            elements.forEach(el => {
              if (el.node && !el.isSpreadElement()) el.replaceWith(t.numericLiteral(1))
            })
            return;
          }
          keys.add(String(i))
        }
      }

      path.replaceWith(t.arrayExpression(Array.from(keys, str => t.stringLiteral(str))))
    }
  }
}