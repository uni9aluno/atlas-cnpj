// Testes do cache em memória de respostas (ver createCache em dist/app.js).
// Rodar com: node --test tests/cache.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(fileURLToPath(new URL('../dist/app.js', import.meta.url)), 'utf8');
const start = source.indexOf('function createCache');
const end = source.indexOf('const responseCache');
assert.ok(start >= 0 && end > start, 'createCache não encontrado em dist/app.js');
const context = vm.createContext({ Map });
vm.runInContext(source.slice(start, end), context);
const { createCache } = context;

test('devolve o valor guardado dentro do TTL', () => {
  let t = 0;
  const cache = createCache(1000, () => t);
  cache.set('a', { x: 1 });
  t = 999;
  assert.deepEqual(cache.get('a'), { x: 1 });
});

test('expira depois do TTL', () => {
  let t = 0;
  const cache = createCache(1000, () => t);
  cache.set('a', 1);
  t = 1001;
  assert.equal(cache.get('a'), undefined);
});

test('chave inexistente retorna undefined e chaves são independentes', () => {
  const cache = createCache(1000);
  cache.set('cnpj:1', 'um');
  assert.equal(cache.get('cnpj:2'), undefined);
  assert.equal(cache.get('suframa:1'), undefined);
});
