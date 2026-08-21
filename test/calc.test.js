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
});
