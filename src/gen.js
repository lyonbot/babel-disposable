// Import { run } from '@babel/core/lib/transformation';
import { transformSync } from '@babel/core';
import constantFolding from 'babel-plugin-minify-constant-folding';
import deadCode from 'babel-plugin-minify-dead-code-elimination';
import { removePureCalls } from './transformers/removePureCalls';
import { disposableObject } from './transformers/disposableObject';
import { bakeObjectKeys } from './transformers/bakeObjectKeys';
import { disposableFunction } from './transformers/disposableFunction';
import { simplifyIIFE } from './transformers/simplifyIIFE';

export function gen(code) {
  const plugins = [
    [constantFolding],
    [deadCode],
    [removePureCalls],
    [disposableObject],
    [disposableFunction],
    [bakeObjectKeys],
    [simplifyIIFE],
  ];

  console.clear();
  const resp = transformSync(code, { plugins });

  return resp.code;
}
