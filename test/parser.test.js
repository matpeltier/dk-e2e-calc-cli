import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/parser.js';

test('evaluates addition', () => {
  assert.equal(evaluate('2 + 3'), 5);
});

test('evaluates subtraction', () => {
  assert.equal(evaluate('10 - 4'), 6);
});

test('evaluates multiplication', () => {
  assert.equal(evaluate('6 * 7'), 42);
});

test('evaluates division', () => {
  assert.equal(evaluate('10 / 4'), 2.5);
});

test('multiplication binds tighter than addition', () => {
  assert.equal(evaluate('2 + 3 * 4'), 14);
});

test('left-associates same-precedence operators', () => {
  assert.equal(evaluate('10 - 3 - 2'), 5);
  assert.equal(evaluate('100 / 10 / 2'), 5);
});

test('parentheses override precedence', () => {
  assert.equal(evaluate('(2 + 3) * 4'), 20);
});

test('supports nested parentheses', () => {
  assert.equal(evaluate('((1 + 2) * (3 + 4))'), 21);
});

test('supports unary minus', () => {
  assert.equal(evaluate('-5 + 3'), -2);
  assert.equal(evaluate('2 * -3'), -6);
});

test('supports decimal numbers', () => {
  assert.equal(evaluate('3.5 + 0.25'), 3.75);
});

test('tolerates arbitrary whitespace', () => {
  assert.equal(evaluate('  2   +\t3 '), 5);
  assert.equal(evaluate('2+3'), 5);
});

test('throws on empty input', () => {
  assert.throws(() => evaluate(''), /Empty expression/);
  assert.throws(() => evaluate('   '), /Empty expression/);
});

test('throws on invalid characters', () => {
  assert.throws(() => evaluate('2 & 3'), /Unexpected character "&"/);
});

test('throws on trailing garbage', () => {
  assert.throws(() => evaluate('2 3'), /Unexpected number/);
});

test('throws on incomplete expression', () => {
  assert.throws(() => evaluate('2 +'), /Unexpected end of input/);
});

test('throws on unmatched closing parenthesis', () => {
  assert.throws(() => evaluate('1 + 2)'), /Unexpected token "\)"/);
});

test('throws on unclosed parenthesis', () => {
  assert.throws(() => evaluate('(1 + 2'), /Unclosed parenthesis/);
});

test('throws on division by zero', () => {
  assert.throws(() => evaluate('1 / 0'), /Division by zero/);
});
