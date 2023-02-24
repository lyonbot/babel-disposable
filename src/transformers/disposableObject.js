import * as t from '@babel/types';
import { last, identifierToValue } from './utils';

const COMMENT_DISPOSABLE_MARK = '#__DISPOSE__'
const markDisposable = Symbol('__DISPOSE__')

/**
 * @param {t.ObjectExpression | t.ArrayExpression} node
 * @param {string | number} propName
 * @returns {t.RVal | undefined} `undefined` if not supported.
 */
function takeProperty(node, propName) {
  if (t.isObjectExpression(node)) {
    propName = String(propName);
    const prop = node.properties.find(it => t.isObjectMember(it) && identifierToValue(it.key) === propName);
    if (!prop) return t.unaryExpression('void', t.numericLiteral(0))

    if (t.isObjectMethod(prop)) {
      return addDisposableTag(
        t.functionExpression(prop.generator ? prop.key : null, prop.params, prop.body, prop.generator, prop.async)
      )
    }
    if (t.isObjectProperty(prop)) {
      if (prop.shorthand) return prop.key
      return addDisposableTag(prop.value)
    }
  }

  if (t.isArrayExpression(node)) {
    if (propName === 'length') {
      if (node.elements.some(x => t.isSpreadElement(x))) return // can't directly compute the length
      return t.numericLiteral(node.elements.length)
    }

    propName = +propName
    for (let i = 0; i < node.elements.length; i++) {
      let el = node.elements[i]
      if (t.isSpreadElement(el)) return; // unsupported referencing: some rest element inside
      if (i === propName) return addDisposableTag(el)
    }
    return t.unaryExpression('void', t.numericLiteral(0))
  }
}

/**
 * @template T
 * @param {T} node 
 * @returns {T}
 */
function addDisposableTag(node) {
  if (t.isObjectExpression(node) || t.isArrayExpression(node)) {
    if (last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) return node; // already marked
    node = t.addComment(node, 'leading', COMMENT_DISPOSABLE_MARK)
    node[markDisposable] = true;
  }

  return node
}

/**
 * @returns {node is t.ObjectExpression | t.ArrayExpression | t.Literal}
 */
function isDisposableSource(node) {
  if (!last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) return false; // not disposable object
  if (!(t.isObjectExpression(node) || t.isArrayExpression(node) || t.isLiteral(node))) return false;

  node[markDisposable] = true;
  return true;
}

/** @type {import('@babel/core').PluginItem} */
export const disposableObject = {
  visitor: {
    VariableDeclarator(rootPath) {
      if (!isDisposableSource(rootPath.node.init)) return

      let queue = [[rootPath.node.id, rootPath.node.init]]
      let scope = rootPath.scope
      // let newDeclaratorList = []

      while (queue.length) {
        const [id, source] = queue.shift()

        // ----------[normal identifier]------------
        if (t.isIdentifier(id)) {
          // const foo = #obj
          // simply replace all occurs

          const binding = scope.getBinding(id.name)
          // console.log('magical process binding :', id.name, binding)

          if (binding.referenced) {
            // is referenced. replace all occurs, and the owning MemberExpression
            binding.referencePaths.forEach(path => {
              let replaceWith = source
              while (path.parentPath.isMemberExpression()) {
                const propName = identifierToValue(path.parent.property)
                if (!propName) break;

                const nextReplaceWith = takeProperty(replaceWith, propName)
                if (!nextReplaceWith) break // property not supported

                replaceWith = nextReplaceWith
                path = path.parentPath
              }

              [path] = path.replaceWith(t.cloneDeepWithoutLoc(replaceWith))

              // ----------------------------------------------------------------
              // special optimize!

              if (path.parentPath.isSpreadElement()) {
                // [1,2, ...disposedArray] => [1,2,3,4]
                if (path.isArrayExpression() && path.parentPath.parentPath.isArrayExpression()) {
                  path.parentPath.replaceWithMultiple(path.node.elements)
                }

                // {a,b, ...disposedObj} => {b,a,d}
                if (path.isObjectExpression() && path.parentPath.parentPath.isObjectExpression()) {
                  path.parentPath.replaceWithMultiple(path.node.properties)
                  // TODO: erase duplicated keys
                }
                return
              }
            })
            // } else {
            //   // not referenced. maybe keep this declarat
            //   newDeclaratorList.push(t.variableDeclarator(id, source))
          }

          continue
        }

        // ----------[object]------------
        if (t.isObjectPattern(id)) {
          if (!t.isObjectExpression(source)) throw new Error('Must be an object expression')
          let propertiesForRest = [...source.properties]

          id.properties.forEach(property => {
            if (t.isObjectProperty(property)) {
              let fromProperty = property.key
              let toProperty = property.value // 
              let defaultExpr

              if (t.isAssignmentPattern(toProperty)) {
                //  const { foo = 123 }
                //  const { foo: bar = 123 }
                //  const { foo: { x, y } = def }
                defaultExpr = toProperty.right
                toProperty = toProperty.left
              }

              // warn: `toProperty` could be a nested ObjectPattern or ArrayPattern
              //  const { foo: { x, y } }
              //  const { foo: { x, y } = def }

              const fromPropertyId = identifierToValue(fromProperty)
              if (!fromPropertyId) throw new Error('no fromPropertyId')

              let subSource = takeProperty(source, fromPropertyId)
              if (defaultExpr) subSource = subSource ? t.logicalExpression('||', subSource, defaultExpr) : defaultExpr
              queue.push([toProperty, subSource])

              propertiesForRest = propertiesForRest.filter(x => identifierToValue(x.key) !== fromPropertyId)
              // console.log('special cares :', fromPropertyId, ' -> ', identifierToValue(toProperty), subSource)
            }

            if (t.isRestElement(property)) {
              queue.push([property.argument, addDisposableTag(t.objectExpression(propertiesForRest))])
            }
          })
        }

        // ----------[array]------------
        if (t.isArrayPattern(id)) {
          if (!t.isArrayExpression(source)) throw new Error('Must be an array expression')
          let metSpreadElementInSource = -1
          for (let i = 0; i < id.elements.length; i++) {
            const srcItem = addDisposableTag(source.elements[i]) || t.unaryExpression('void', t.numericLiteral(0))
            if (t.isSpreadElement(srcItem)) metSpreadElementInSource = i

            const el = id.elements[i]
            if (!el) continue   // empty slot like const [,,,,it]

            if (t.isRestElement(el) && (metSpreadElementInSource === -1 || metSpreadElementInSource === i)) {
              // const [...rest]
              queue.push([el.argument, addDisposableTag(t.arrayExpression(source.elements.slice(i)))])
              break
            }

            if (metSpreadElementInSource !== -1) {
              throw new Error('Currently not supported: taking a element from "restElement"')
            }

            if (t.isIdentifier(el)) {
              // const [abc] = 
              queue.push([el, srcItem])
            }

            if (t.isAssignmentPattern(el)) {
              // const [abc = 1234] = 
              const defaultExpr = el.right
              queue.push([el.left, t.logicalExpression('??', srcItem, defaultExpr)])
            }
          }
        }
      }

      rootPath.remove()
    },
    MemberExpression(path) {
      // usually this is already processed. but due to other plugins, we might meet code like:
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }[true ? 'b' : 'a'])
      // log(/*#__DISPOSE__*/{ a: 1, b: 2 }['b'])

      const obj = path.node.object
      const propName = identifierToValue(path.node.property)
      if (!isDisposableSource(obj)) return
      if (!propName) return

      const newNode = takeProperty(obj, propName)
      if (newNode) path.replaceWith(newNode)
    }
  }
}


