#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { evaluate } from './parser.js';

const USAGE = 'Usage: node src/calc.js eval "<expression>" | node src/calc.js repl';

function runEval(args) {
  const expression = args.join(' ').trim();
  try {
    console.log(evaluate(expression));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

function runRepl() {
  const rl = createInterface({ input: process.stdin });

  rl.on('line', (line) => {
    const expression = line.trim();
    if (expression === '') {
      return;
    }
    try {
      console.log(evaluate(expression));
    } catch (error) {
      console.error(error.message);
    }
  });

  rl.on('close', () => {
    process.exitCode = 0;
  });
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'eval') {
  runEval(args.slice(1));
} else if (command === 'repl') {
  runRepl();
} else {
  console.error(USAGE);
  process.exitCode = 1;
}
