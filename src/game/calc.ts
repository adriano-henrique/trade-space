// A small, safe calculator for the formula notebook. It understands numbers (1,361 or 1.38e-23),
// + - * / ^, brackets, a few functions, pi and e, and whatever symbols the current formula defines.
// Nothing is ever passed to eval.

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
}
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E }

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string }

function tokenize(input: string): Token[] {
  const s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3')
  const out: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      i++
    } else if (/[0-9.]/.test(c)) {
      const m = /^[0-9][0-9,]*\.?[0-9]*(e[+-]?[0-9]+)?|^\.[0-9]+(e[+-]?[0-9]+)?/i.exec(s.slice(i))
      if (!m) throw new Error(`I can’t read the number at “${s.slice(i, i + 6)}”`)
      out.push({ t: 'num', v: Number(m[0].replace(/,/g, '')) })
      i += m[0].length
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i))!
      out.push({ t: 'id', v: m[0] })
      i += m[0].length
    } else if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', v: c })
      i++
    } else throw new Error(`I don’t know the symbol “${c}”`)
  }
  return out
}

/** Evaluate an expression. Throws an Error with a readable message when it cannot. */
export function calculate(input: string, vars: Record<string, number> = {}): number {
  const tokens = tokenize(input)
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v
  const lookup = (name: string) => {
    if (name in vars) return vars[name]
    const lower = name.toLowerCase()
    if (lower in CONSTANTS) return CONSTANTS[lower]
    throw new Error(`I don’t know “${name}”`)
  }

  function sum(): number {
    let v = product()
    while (isOp('+') || isOp('-')) v = tokens[pos++].v === '+' ? v + product() : v - product()
    return v
  }
  function product(): number {
    let v = unary()
    while (isOp('*') || isOp('/')) v = tokens[pos++].v === '*' ? v * unary() : v / unary()
    return v
  }
  function unary(): number {
    if (isOp('-')) {
      pos++
      return -unary()
    }
    if (isOp('+')) pos++
    return power()
  }
  function power(): number {
    const base = atom()
    if (isOp('^')) {
      pos++
      return base ** unary()
    }
    return base
  }
  function atom(): number {
    const tok = tokens[pos++]
    if (!tok) throw new Error('Something is missing at the end')
    if (tok.t === 'num') return tok.v
    if (tok.t === 'id') {
      if (isOp('(')) {
        const fn = FUNCTIONS[tok.v.toLowerCase()]
        if (!fn) throw new Error(`I don’t know the function “${tok.v}”`)
        pos++
        const arg = sum()
        if (!isOp(')')) throw new Error('A bracket is not closed')
        pos++
        return fn(arg)
      }
      return lookup(tok.v)
    }
    if (tok.v === '(') {
      const v = sum()
      if (!isOp(')')) throw new Error('A bracket is not closed')
      pos++
      return v
    }
    throw new Error(`I did not expect “${tok.v}” there`)
  }

  if (tokens.length === 0) throw new Error('Type something to work out')
  const result = sum()
  if (pos < tokens.length) throw new Error(`I did not expect “${tokens[pos].v}” there`)
  if (!Number.isFinite(result)) throw new Error('That has no real answer (check the square root, acos or a divide by zero)')
  return result
}
