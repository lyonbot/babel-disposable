// Import { run } from '@babel/core/lib/transformation';
import { transformSync } from '@babel/core';
import constantFolding from 'babel-plugin-minify-constant-folding';
import deadCode from 'babel-plugin-minify-dead-code-elimination';
import { removePureCalls } from '../transformers/removePureCalls.js';
import { disposableObject } from '../transformers/disposableObject.js';
import { bakeObjectKeys } from '../transformers/bakeObjectKeys.js';
import { disposableFunction } from '../transformers/disposableFunction.js';
import { simplifyIIFE } from '../transformers/simplifyIIFE.js';

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
