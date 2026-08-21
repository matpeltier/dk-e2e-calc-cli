#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

class CalcError extends Error {}

class DivisionByZeroError extends CalcError {
  constructor() {
    super('division by zero');
  }
}

const WHITESPACE = /\s/;
const DIGITS = /[0-9]/;

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (WHITESPACE.test(ch)) {
      i++;
      continue;
    }
    if (DIGITS.test(ch) || (ch === '.' && DIGITS.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < input.length && DIGITS.test(input[j])) j++;
      if (input[j] === '.') {
        j++;
        while (j < input.length && DIGITS.test(input[j])) j++;
      }
      tokens.push({ type: 'NUMBER', value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: ch });
      i++;
      continue;
    }
    throw new CalcError(`unexpected character "${ch}" at position ${i}`);
  }
  return tokens;
}

function createParser(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume() {
    const token = tokens[pos];
    if (!token) {
      throw new CalcError('unexpected end of expression');
    }
    pos++;
    return token;
  }

  function expect(type) {
    const token = peek();
    if (!token || token.type !== type) {
      throw new CalcError(`expected "${type}" but found ${describe(token)}`);
    }
    return consume();
  }

  function describe(token) {
    if (!token) return 'end of expression';
    return token.type === 'NUMBER' ? `number ${token.value}` : `"${token.type}"`;
  }

  function parseExpr() {
    let value = parseTerm();
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = consume().type;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (peek() && (peek().type === '*' || peek().type === '/')) {
      const op = consume().type;
      const rhs = parseFactor();
      if (op === '/') {
        if (rhs === 0) {
          throw new DivisionByZeroError();
        }
        value = value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }

  function parseFactor() {
    const token = peek();
    if (!token) {
      throw new CalcError('unexpected end of expression');
    }
    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }
    if (token.type === '(') {
      consume();
      const value = parseExpr();
      expect(')');
      return value;
    }
    if (token.type === '-' || token.type === '+') {
      consume();
      const value = parseFactor();
      return token.type === '-' ? -value : value;
    }
    throw new CalcError(`unexpected token ${describe(token)}`);
  }

  return {
    parse() {
      const value = parseExpr();
      const trailing = peek();
      if (trailing) {
        throw new CalcError(`unexpected token ${describe(trailing)} after end of expression`);
      }
      return value;
    },
  };
}

export function evaluate(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new CalcError('empty expression');
  }
  const tokens = tokenize(expression);
  if (tokens.length === 0) {
    throw new CalcError('empty expression');
  }
  return createParser(tokens).parse();
}

export function formatResult(value) {
  if (!Number.isFinite(value)) {
    throw new CalcError('result is not a finite number');
  }
  return String(Number(value));
}

const USAGE = `Usage: node src/calc.js eval "<expression>"
       node src/calc.js repl

Evaluates arithmetic expressions with + - * / and parentheses.

Commands:
  eval  Evaluate a single quoted expression and print the result.
  repl  Read expressions from stdin, one per line, printing each
        result until EOF. Errors are reported per line.

Examples:
  node src/calc.js eval "2 + 3 * 4"
  node src/calc.js eval "(2 + 3) * 4"
  echo "2 + 3" | node src/calc.js repl
`;

function startRepl() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    const expression = line.trim();
    if (expression === '') return;
    try {
      const result = evaluate(expression);
      process.stdout.write(`${formatResult(result)}\n`);
    } catch (err) {
      process.stderr.write(`Error: ${err.message}\n`);
    }
  });
}

function main(argv) {
  const [command, ...args] = argv;
  if (command === 'repl') {
    if (args.length !== 0) {
      process.stderr.write('Error: repl does not accept arguments\n\n');
      process.stderr.write(USAGE);
      return 1;
    }
    startRepl();
    return 0;
  }
  if (command !== 'eval') {
    process.stderr.write(USAGE);
    return 1;
  }
  if (args.length !== 1) {
    process.stderr.write('Error: eval expects exactly one quoted expression\n\n');
    process.stderr.write(USAGE);
    return 1;
  }
  try {
    const result = evaluate(args[0]);
    process.stdout.write(`${formatResult(result)}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
