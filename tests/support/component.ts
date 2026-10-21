import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
const require = createRequire(import.meta.url);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
export function component(file: string, mocks: Record<string, unknown>): any {
  const source = readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports: any = {};
  const imports = { react: React, 'react/jsx-runtime': require('react/jsx-runtime'), ...mocks };
  runInNewContext(js, { exports, process: { env: {} }, require: (id: string) => { if (!(id in imports)) throw new Error('Unmocked boundary ' + id); return imports[id as keyof typeof imports]; }, setTimeout, clearTimeout, AbortController });
  return exports;
}
