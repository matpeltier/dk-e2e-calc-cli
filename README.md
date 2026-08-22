# dk-e2e-calc-cli

Tiny expression calculator CLI — Dark Kitchen E2E phase 2 (multi-agent, custom workflow, fallbacks).

Evaluate a single expression:

```sh
node src/calc.js eval "2 + 3 * 4"
```

Read expressions from stdin, one per line, printing each result until EOF:

```sh
printf '2 + 3\n1 / 4\n' | node src/calc.js repl
```

Blank lines are skipped; invalid lines report an error on stderr and the REPL keeps going.
