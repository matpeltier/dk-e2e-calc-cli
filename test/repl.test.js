import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const cliPath = fileURLToPath(new URL('../src/calc.js', import.meta.url));

function runRepl(inputText) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, 'repl'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ status: code, stdout, stderr });
    });
    child.stdin.write(inputText);
    child.stdin.end();
  });
}

describe('repl', () => {
  it('prints a result for each piped expression until EOF', async () => {
    const result = await runRepl('2 + 3\n10 - 4\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '5\n6\n');
    assert.equal(result.stderr, '');
  });

  it('respects operator precedence while piping expressions', async () => {
    const result = await runRepl('2 + 3 * 4\n20 - 6 / 3\n2 * 3 + 4 * 5\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '14\n18\n26\n');
  });

  it('evaluates parenthesized expressions', async () => {
    const result = await runRepl('(2 + 3) * 4\n((1 + 1))\n(2 + 3) * (4 - 1)\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '20\n2\n15\n');
  });

  it('reuses the same parser as eval for the same expression', async () => {
    const expression = '(8 - 2) / 4';
    const replResult = await runRepl(`${expression}\n`);
    const evalResult = spawnSync(process.execPath, [cliPath, 'eval', expression], {
      encoding: 'utf8',
    });
    assert.equal(replResult.status, 0);
    assert.equal(evalResult.status, 0);
    assert.equal(replResult.stdout, evalResult.stdout);
    assert.equal(replResult.stdout, '1.5\n');
  });

  it('reports division by zero and keeps processing later lines', async () => {
    const result = await runRepl('1 / 0\n8 / (4 - 4)\n9 / 3\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '3\n');
    assert.equal(result.stderr, 'Error: division by zero\nError: division by zero\n');
  });

  it('reports invalid expressions on stderr without stopping the session', async () => {
    const result = await runRepl('2 +\n(1 + 2\n3 * 3\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '9\n');
    assert.match(result.stderr, /^Error: unexpected end of expression\n/m);
    assert.match(result.stderr, /^Error: /m);
  });

  it('skips blank lines silently', async () => {
    const result = await runRepl('\n   \n7 * 6\n\n');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '42\n');
    assert.equal(result.stderr, '');
  });

  it('exits 0 immediately when stdin closes with no input', async () => {
    const result = await runRepl('');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });

  it('exits non-zero when repl receives extra arguments', () => {
    const result = spawnSync(process.execPath, [cliPath, 'repl', 'bogus'], {
      encoding: 'utf8',
      input: '',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });
});
