// import { run } from '@babel/core/lib/transformation';
import { NodePath, transformSync } from '@babel/core';
import * as t from '@babel/types';
import constantFolding from 'babel-plugin-minify-constant-folding';
import deadCode from 'babel-plugin-minify-dead-code-elimination';
import { removePureCalls } from './transformers/removePureCalls';
import { moveStaticProperties } from './transformers/moveStaticProperties';
import ast2code from "@babel/generator";

export function gen(code) {
  const plugins = [
    [constantFolding],
    [deadCode],
    [removePureCalls],
    [moveStaticProperties],
  ];

  console.clear()
  const resp = transformSync(code, { plugins });
  // console.log(resp);

  return resp.code;
}

/**
 * @param {NodePath} path
 * @returns {string | undefined}
 */
const identifierToValue = (path) => {
  if (path.isStringLiteral()) return path.node.value;
  if (path.isIdentifier()) return path.node.name;
};

/**
 * @param {NodePath<t.ObjectExpression>} path
 */
const getValueFromObjectLiteral = (path, propName) => {
  if (!path?.isObjectExpression()) return null;
  for (const member of path.get('properties')) {
    if (identifierToValue(it.get('key')) !== propName) continue;

    if (member.isSpreadElement()) continue;
    if (member.isObjectMethod()) {
      if (propName === 'name') {
        let str = identifierToValue(member.get('key'));
        if (str) return t.stringLiteral(str);
      }
    }
    if (member.isObjectProperty()) {
      if (member.node.shorthand) return member.get('key');
      if (member.node.computed) return; // not supported
      return member.get('value');
    }

    return;
  }
  const member = members.find((it) => {
    return key.node.value === propName;
  });

  if (member.node.shorthand) return member.get('key'); // identifier
};

/** @type {import('@babel/core').PluginItem} */
const propertyMove = {
  visitor: {
    VariableDeclarator: function processVariableDeclarator(path) {
      const initializer = path.get('init')
      if (!initializer?.isObjectExpression()) return;

      let objName = path.get('id').node.name
      const binding = path.scope.getBinding(objName)
      if (!binding?.constant) return;

      /** @type { Record<string, NodePath<t.MemberExpression>[] | 'bad'> } */
      const subs = {} // { name => Path[] }

      for (let ref of binding.referencePaths) {
        let mem = ref.parentPath
        if (!mem.isMemberExpression()) continue;

        let propName = identifierToValue(mem.get('property'))
        if (!propName) continue;

        let store = subs[propName]
        if (!store) store = subs[propName] = []
        if (store === 'bad') continue // is not constant -- maybe mutated!

        if (mem.isLVal()) {
          subs[propName] = 'bad'
          continue
        }

        // is normal referencing
        store.push(mem)
      }

      for (let propName of Object.keys(subs)) {
        let store = subs[propName]
        if (store === 'bad') continue // is not constant -- maybe mutated!

        let decl = initializer.get('properties').find(it => it.isObjectMember() && identifierToValue(it.get('key')) === propName);
        if (!decl?.isObjectMember()) {
          // invalid reference! replace with undefined
          for (let path of store) path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)))
          continue
        }
        if (decl.node.computed) continue // not supported

        // ----------------------------------------------------------------

        if (decl.node.shorthand) {
          for (let memPath of store) memPath.replaceWith(t.identifier(propName))
        } else {
          let newBindingId = path.scope.generateUid(objName + '_' + propName)
          let newPath = path.insertBefore(t.variableDeclarator(t.identifier(newBindingId), decl.node.value))[0]

          path.scope.registerBinding(binding.kind, newPath)
          let newBinding = path.scope.getBinding(newBindingId)

          decl.set('value', t.identifier(newBindingId))
          newBinding.reference(decl.get('value'))

          for (let memPath of store) newBinding.reference(memPath.replaceWith(t.identifier(newBindingId))[0])

          console.log('bewb', newBinding)

          // recursively process the new variable
          if (newPath.get('value')?.isObjectExpression()) {
            console.log('conm')
            processVariableDeclarator(newPath)
          }
        }
      }
    },
  }
}

