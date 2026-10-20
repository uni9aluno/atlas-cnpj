// Testes do validador de CNPJ (numérico e alfanumérico).
// Rodar com: node --test tests/validador.test.mjs
// O app.js é um script de navegador (usa DOM no topo), então as funções puras
// são extraídas do código-fonte em vez de importadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(fileURLToPath(new URL('../dist/app.js', import.meta.url)), 'utf8');
const start = source.indexOf('function normalizeCnpj');
const end = source.indexOf('function formatCnae');
assert.ok(start >= 0 && end > start, 'Funções do validador não encontradas em dist/app.js');

const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const { isValidCnpj, normalizeCnpj, formatCnpj } = context;

test('CNPJs numéricos válidos', () => {
  for (const cnpj of ['33.000.167/0001-01', '19.131.243/0001-97', '17.687.734/0001-93', '33000167000101']) {
    assert.equal(isValidCnpj(cnpj), true, cnpj);
  }
});

test('CNPJ alfanumérico válido', () => {
  assert.equal(isValidCnpj('12.ABC.345/01DE-35'), true);
  assert.equal(isValidCnpj('12abc34501de35'), true, 'minúsculas são normalizadas');
});

test('CNPJs inválidos', () => {
  const invalidos = [
    '33.000.167/0001-02', // dígito verificador errado
    '33.000.167/0001-10',
    '00.000.000/0000-00', // sequência repetida
    '11111111111111',
    '12.ABC.345/01DE-36',
    '12.ABC.345/01DE-3A', // dígitos verificadores devem ser numéricos
    '',
    '123',
  ];
  for (const cnpj of invalidos) assert.equal(isValidCnpj(cnpj), false, cnpj);
});

test('normalizeCnpj remove pontuação, põe em maiúsculas e limita a 14', () => {
  assert.equal(normalizeCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
  assert.equal(normalizeCnpj('33.000.167/0001-01999'), '33000167000101');
});

test('formatCnpj aplica a máscara progressivamente', () => {
  assert.equal(formatCnpj('33'), '33');
  assert.equal(formatCnpj('33000'), '33.000');
  assert.equal(formatCnpj('33000167000101'), '33.000.167/0001-01');
  assert.equal(formatCnpj('12abc34501de35'), '12.ABC.345/01DE-35');
});
