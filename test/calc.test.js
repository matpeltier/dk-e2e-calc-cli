import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { evaluate, formatResult } from '../src/calc.js';

const cliPath = fileURLToPath(new URL('../src/calc.js', import.meta.url));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    ...options,
  });
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

  it('combines precedence and parentheses in one expression', () => {
    assert.equal(evaluate('(2 + 3) * 4 - 6 / 3'), 18);
    assert.equal(evaluate('(20 - 6 / 3) / (2 * (1 + 1))'), 4.5);
    assert.equal(evaluate('2 * (3 + (4 - 1) * 5)'), 36);
  });

  it('ignores surrounding and inner whitespace', () => {
    assert.equal(evaluate('  7\t*\n6 '), 42);
    assert.equal(evaluate('\t( 1+2 )\n'), 3);
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
    assert.equal(formatResult(-0.75), '-0.75');
  });

  it('throws on non-finite results', () => {
    assert.throws(() => formatResult(Infinity), /not a finite number/);
    assert.throws(() => formatResult(NaN), /not a finite number/);
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
});

describe('CLI repl', () => {
  it('reads expressions line by line until EOF printing one result per line', () => {
    const result = runCli(['repl'], { input: '2+3*4\n10 / 4\n(2 + 3) * 4\n' });
    assert.equal(result.status, 0);
    assert.deepEqual(result.stdout.split('\n'), ['14', '2.5', '20', '']);
  });

  it('skips blank lines without printing results', () => {
    const result = runCli(['repl'], { input: '\n2+3\n   \n6*7\n' });
    assert.equal(result.status, 0);
    assert.deepEqual(result.stdout.trim().split('\n'), ['5', '42']);
    assert.equal(result.stderr, '');
  });

  it('keeps reading after invalid and division-by-zero lines', () => {
    const result = runCli(['repl'], { input: '2 +\n1 / 0\n3 + 4\n' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /unexpected end of expression/);
    assert.match(result.stderr, /division by zero/);
    assert.deepEqual(result.stdout.trim().split('\n'), ['7']);
  });

  it('exits cleanly with no output on empty stdin', () => {
    const result = runCli(['repl'], { input: '' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });

  it('shares parser semantics with eval for the same expression', () => {
    const fromEval = runCli(['eval', '(2 + 3) * (4 - 1)']);
    const fromRepl = runCli(['repl'], { input: '(2 + 3) * (4 - 1)\n' });
    assert.equal(fromEval.status, 0);
    assert.equal(fromRepl.status, 0);
    assert.equal(fromRepl.stdout.trim(), fromEval.stdout.trim());
  });
});
