const OPERATOR_PATTERN = /[+\-*/]/;
const DIGIT_PATTERN = /[0-9]/;
const WHITESPACE_PATTERN = /\s/;

function tokenize(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (WHITESPACE_PATTERN.test(char)) {
      index += 1;
      continue;
    }

    if (DIGIT_PATTERN.test(char)) {
      let end = index;
      while (end < input.length && DIGIT_PATTERN.test(input[end])) {
        end += 1;
      }
      if (input[end] === '.') {
        end += 1;
        while (end < input.length && DIGIT_PATTERN.test(input[end])) {
          end += 1;
        }
      }
      tokens.push({ type: 'number', value: Number(input.slice(index, end)) });
      index = end;
      continue;
    }

    if (OPERATOR_PATTERN.test(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: char === '(' ? 'lparen' : 'rparen', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character "${char}"`);
  }

  return tokens;
}

function createParser(tokens) {
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function advance() {
    return tokens[position++];
  }

  function parseExpression() {
    let left = parseTerm();

    while (isOperator('+') || isOperator('-')) {
      const operator = advance().value;
      const right = parseTerm();
      left = operator === '+' ? left + right : left - right;
    }

    return left;
  }

  function parseTerm() {
    let left = parseFactor();

    while (isOperator('*') || isOperator('/')) {
      const operator = advance().value;
      const right = parseFactor();
      if (operator === '/') {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left /= right;
      } else {
        left *= right;
      }
    }

    return left;
  }

  function parseFactor() {
    if (isOperator('-')) {
      advance();
      return -parseFactor();
    }

    return parsePrimary();
  }

  function parsePrimary() {
    const token = advance();

    if (!token) {
      throw new Error('Unexpected end of input');
    }

    if (token.type === 'number') {
      return token.value;
    }

    if (token.type === 'lparen') {
      const value = parseExpression();
      const closing = advance();
      if (!closing) {
        throw new Error('Unclosed parenthesis');
      }
      if (closing.type !== 'rparen') {
        throw new Error(`Unexpected token "${closing.value}"`);
      }
      return value;
    }

    throw new Error(`Unexpected token "${token.value}"`);
  }

  function isOperator(value) {
    const token = peek();
    return Boolean(token) && token.type === 'operator' && token.value === value;
  }

  return {
    parseExpression,
    hasRemainingTokens() {
      return position < tokens.length;
    },
    peekNextToken() {
      return tokens[position];
    },
  };
}

export function evaluate(expression) {
  const tokens = tokenize(expression);

  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  const parser = createParser(tokens);
  const result = parser.parseExpression();

  if (parser.hasRemainingTokens()) {
    const extra = parser.peekNextToken();
    if (extra.type === 'number') {
      throw new Error('Unexpected number');
    }
    throw new Error(`Unexpected token "${extra.value}"`);
  }

  return result;
}
