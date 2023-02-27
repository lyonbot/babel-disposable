import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { last, isFalsyNode, takeProperty } from './misc';

const COMMENT_DISPOSABLE_MARK = '#__DISPOSE__';
const markDisposable = Symbol('__DISPOSE__');

/**
 * @template T
 * @param {T} node
 * @returns {T}
 */
export function addDisposableTag(node) {
  if (!node || node[markDisposable])
    return node;

  if (t.isLiteral(node) || isFalsyNode(node)) {
    // do not make too many comments
    node[markDisposable] = true;
  }

  if (t.isObjectExpression(node) || t.isArrayExpression(node)) {
    // NOTE: babel cloneNode will discard [markDisposable]
    // so we shall avoid adding duplicated comment marker
    if (!last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK)) {
      node = t.addComment(node, 'leading', COMMENT_DISPOSABLE_MARK);
    }

    node[markDisposable] = true;
  }

  return node;
}

/**
 * @returns {node is t.ObjectExpression | t.ArrayExpression | t.Literal}
 */
export function isDisposableSource(node) {
  if (!node)
    return false;
  if (node[markDisposable])
    return true;
  if (!last(node.leadingComments)?.value.includes(COMMENT_DISPOSABLE_MARK))
    return false; // not disposable object
  if (!(t.isObjectExpression(node) || t.isArrayExpression(node) || t.isLiteral(node) || t.isFalsyNode(node)))
    return false;

  node[markDisposable] = true;
  return true;
}

/**
 * Before we directly call `path.replaceWith(replaceWith)`, bubble up through `path`,
 * find a outer path (typically a `MemberExpression`) 
 * and new `Node` (extracted from `source`) 
 * so we can perform a more effective `newPath.replaceWith(newReplaceWith)`
 * 
 * @param {NodePath} path
 * @param {t.Node} replaceWith
 */
export function getReplacementOnOuterMemberExpression(path, replaceWith) {
  while (
    (path.parentPath.isMemberExpression() || path.parentPath.isOptionalMemberExpression()) &&
    path.parent.object === path.node
  ) {
    // note: this logic is a duplication of following "ObjectExpression|ArrayExpression" visitor
    // do the member-replacing here, will create less Nodes, increasing the speed.

    let prop = path.parentPath.get('property');
    let propName;

    if (path.parentPath.node.computed) propName = prop.evaluate().value;
    else if (prop.isIdentifier()) propName = prop.node.name;
    if (propName == undefined) break;

    const nextReplaceWith = takeProperty(replaceWith, propName, path.parentPath.node.optional);
    if (!nextReplaceWith) break; // property not supported

    replaceWith = nextReplaceWith;
    path = path.parentPath;
  }

  return { path, replaceWith };
}
