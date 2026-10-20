// Testes dos links de consulta pública do Sintegra por UF (ver sintegraLink em dist/app.js).
// Rodar com: node --test tests/sintegra.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(fileURLToPath(new URL('../dist/app.js', import.meta.url)), 'utf8');
const start = source.indexOf('const SINTEGRA_PORTAL');
const end = source.indexOf('function render(');
assert.ok(start >= 0 && end > start, 'Bloco do Sintegra não encontrado em dist/app.js');
const context = vm.createContext({ Object, String });
vm.runInContext(`${source.slice(start, end)}; this.SINTEGRA_URLS = SINTEGRA_URLS; this.sintegraLink = sintegraLink; this.SINTEGRA_PORTAL = SINTEGRA_PORTAL;`, context);
const { SINTEGRA_URLS, sintegraLink, SINTEGRA_PORTAL } = context;

test('UF com consulta própria devolve o endereço da UF', () => {
  const link = sintegraLink('SP');
  assert.equal(link.direct, true);
  assert.match(link.url, /^https?:\/\/.*cadesp/);
});

test('aceita minúsculas e UF sem consulta própria cai no portal nacional', () => {
  assert.equal(sintegraLink('sp').direct, true);
  for (const uf of ['MG', 'PI', 'XX', '', null, undefined, 'constructor', '__proto__']) {
    assert.deepEqual({ ...sintegraLink(uf) }, { url: SINTEGRA_PORTAL, direct: false }, String(uf));
  }
});

test('todos os endereços são http(s) e as chaves são UFs de 2 letras', () => {
  for (const [uf, url] of Object.entries(SINTEGRA_URLS)) {
    assert.match(uf, /^[A-Z]{2}$/);
    assert.match(url, /^https?:\/\//);
  }
});
