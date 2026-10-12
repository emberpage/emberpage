import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import { Predicate } from 'effect';
import type { Rule } from 'eslint';

const effectModule: Rule.RuleModule = {
  meta: {type:'problem',schema:[],messages:{missing:'Every code module must use Effect. Use Effect for workflows or Schema, Predicate and DateTime for pure domain code.'}},
  create(context) {
    let imported=false;
    return {
      ImportDeclaration(node) { if(node.specifiers.length > 0 && Predicate.isString(node.source.value) && (node.source.value==='effect' || node.source.value.startsWith('effect/'))) imported=true; },
      'Program:exit'(node) {
        if(!imported) context.report({node,messageId:'missing'});
      },
    };
  },
};

export default defineConfig(
  {ignores:['node_modules/**','dist/**','.output/**','.wxt/**','artifacts/**']},
  {linterOptions:{noInlineConfig:true}},
  {
    files:['**/*.{ts,tsx,mts,cts}'],
    extends:[js.configs.recommended,tseslint.configs.recommendedTypeChecked],
    languageOptions:{parserOptions:{projectService:true,tsconfigRootDir:import.meta.dirname}},
    plugins:{emberpage:{rules:{'effect-module':effectModule}}},
    rules:{
      'emberpage/effect-module':'error',
      '@typescript-eslint/no-explicit-any':'error',
      '@typescript-eslint/no-non-null-assertion':'error',
      '@typescript-eslint/ban-ts-comment':['error',{'ts-ignore':true,'ts-nocheck':true,'ts-expect-error':true}],
      '@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],
      '@typescript-eslint/no-floating-promises':'error',
      '@typescript-eslint/no-misused-promises':'error',
    },
  },
  {
    files:['src/archive.ts','src/background.ts','src/network.ts','aggregator/indexer.ts','aggregator/server.ts','aggregator/main.ts'],
    rules:{'no-restricted-syntax':[
      'error',
      {selector:"NewExpression[callee.name='Promise']",message:'Compose workflows with Effect; Promise construction belongs in a native platform adapter.'},
      {selector:"CallExpression[callee.object.name='Promise'][callee.property.name=/^(all|race|allSettled)$/]",message:'Use Effect concurrency, timeout and resource combinators in workflows.'},
    ]},
  },
);
