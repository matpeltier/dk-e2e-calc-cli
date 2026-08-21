<<<<<<< HEAD
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI_PATH = fileURLToPath(new URL('../src/calc.js', import.meta.url));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    ...options,
  });
}

test('eval evaluates a quoted expression and prints the result', () => {
  const result = runCli(['eval', '2 + 3 * 4']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '14');
});

test('eval reuses the same parser semantics for parentheses', () => {
  const result = runCli(['eval', '(2 + 3) * 4']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '20');
});

test('eval prints parser errors to stderr and exits nonzero', () => {
  const result = runCli(['eval', '2 +']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unexpected end of input/);
  assert.equal(result.stdout.trim(), '');
});

test('repl reads expressions line by line until EOF printing each result', () => {
  const result = runCli(['repl'], { input: '2 + 3\n10 / 4\n(2 + 3) * 4\n' });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split('\n'), ['5', '2.5', '20']);
});

test('repl skips blank lines without printing results', () => {
  const result = runCli(['repl'], { input: '\n2+3\n   \n6 * 7\n' });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split('\n'), ['5', '42']);
});

test('repl keeps reading after an invalid line', () => {
  const result = runCli(['repl'], { input: '2 +\n1 / 0\n3 + 4\n' });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Unexpected end of input/);
  assert.match(result.stderr, /Division by zero/);
  assert.equal(result.stdout.trim(), '7');
});

test('repl exits cleanly on immediate EOF with empty output', () => {
  const result = runCli(['repl'], { input: '' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '');
});

test('unknown command fails with usage on stderr', () => {
  const result = runCli(['frobnicate']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});

test('missing command fails with usage on stderr', () => {
  const result = runCli([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
=======
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { evaluate, formatResult } from '../src/calc.js';

const cliPath = fileURLToPath(new URL('../src/calc.js', import.meta.url));

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' });
}

describe('evaluate', () => {
  it('computes addition and subtraction', () => {
    assert.equal(evaluate('1 + 2'), 3);
    assert.equal(evaluate('10 - 4 - 3'), 3);
  });

  it('respects operator precedence', () => {
    assert.equal(evaluate('2+3*4'), 14);
    assert.equal(evaluate('20 - 6 / 3'), 18);
    assert.equal(evaluate('2 * 3 + 4 * 5'), 26);
  });

  it('respects parentheses', () => {
    assert.equal(evaluate('(2 + 3) * 4'), 20);
    assert.equal(evaluate('((1 + 1))'), 2);
    assert.equal(evaluate('(2 + 3) * (4 - 1)'), 15);
  });

  it('supports unary minus and plus', () => {
    assert.equal(evaluate('-5'), -5);
    assert.equal(evaluate('--5'), 5);
    assert.equal(evaluate('-2 + 3'), 1);
    assert.equal(evaluate('2 * -3'), -6);
    assert.equal(evaluate('+7'), 7);
  });

  it('handles decimal numbers', () => {
    assert.equal(evaluate('0.5 + 0.25'), 0.75);
    assert.equal(evaluate('.5 * 4'), 2);
  });

  it('performs division', () => {
    assert.equal(evaluate('10 / 4'), 2.5);
    assert.equal(evaluate('9 / 3 / 3'), 1);
  });

  it('throws on division by zero', () => {
    assert.throws(() => evaluate('1 / 0'), /division by zero/);
    assert.throws(() => evaluate('5 / (3 - 3)'), /division by zero/);
  });

  it('throws on invalid tokens', () => {
    assert.throws(() => evaluate('2 & 3'), /unexpected character "&"/);
    assert.throws(() => evaluate('abc'), /unexpected character "a"/);
  });

  it('throws on syntax errors', () => {
    assert.throws(() => evaluate('2 +'), /unexpected end of expression/);
    assert.throws(() => evaluate('(2 + 3'), /expected "\)"/);
    assert.throws(() => evaluate('2 3'), /unexpected token number 3/);
    assert.throws(() => evaluate('* 2'), /unexpected token "\*"/);
  });

  it('throws on empty input', () => {
    assert.throws(() => evaluate(''), /empty expression/);
    assert.throws(() => evaluate('   '), /empty expression/);
  });
});

describe('formatResult', () => {
  it('prints integers without decimal part', () => {
    assert.equal(formatResult(14), '14');
    assert.equal(formatResult(-3), '-3');
  });

  it('keeps fractional results', () => {
    assert.equal(formatResult(2.5), '2.5');
  });
});

describe('CLI', () => {
  it('prints the numeric result', () => {
    const result = runCli(['eval', '2+3*4']);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '14');
  });

  it('evaluates parenthesized expressions', () => {
    const result = runCli(['eval', '(2 + 3) * 4']);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '20');
  });

  it('evaluates unary minus', () => {
    const result = runCli(['eval', '-3 + 5']);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '2');
  });

  it('exits non-zero with a clear error on division by zero', () => {
    const result = runCli(['eval', '1 / 0']);
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Error: division by zero');
    assert.equal(result.stdout, '');
  });

  it('exits non-zero with a clear error on invalid tokens', () => {
    const result = runCli(['eval', '2 $ 3']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error: unexpected character "\$"/);
  });

  it('exits non-zero on syntax errors', () => {
    const result = runCli(['eval', '(1 + 2']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error: /);
  });

  it('exits non-zero when the expression is missing', () => {
    const result = runCli(['eval']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Error: eval expects exactly one quoted expression/);
  });

  it('prints usage and exits non-zero for unknown commands', () => {
    const result = runCli(['frobnicate']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });

  it('prints usage and exits non-zero when no command is given', () => {
    const result = runCli([]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });
>>>>>>> origin/main
});
