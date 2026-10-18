// Matemática financeira pura. Fluxos são mensais, índice = mês (0 = hoje).

/** Taxa anual para mensal, sempre composta. */
export function aaToAm(aa: number): number {
  return Math.pow(1 + aa, 1 / 12) - 1;
}

export function amToAa(am: number): number {
  return Math.pow(1 + am, 12) - 1;
}

export function npv(rate: number, flows: number[]): number {
  let v = 0;
  for (let t = 0; t < flows.length; t++) v += flows[t]! / Math.pow(1 + rate, t);
  return v;
}

function signChanges(flows: number[]): number {
  let changes = 0;
  let last = 0;
  for (const f of flows) {
    if (Math.abs(f) < 1e-9) continue;
    const s = Math.sign(f);
    if (last !== 0 && s !== last) changes++;
    last = s;
  }
  return changes;
}

/**
 * TIR mensal. Procura todas as raízes do VPL entre −99% e +1000% ao mês por
 * varredura + bisseção. Devolve null quando não há raiz ou quando há mais de
 * uma (fluxo com várias trocas de sinal): nesses casos a TIR engana, e o VPL
 * é que vale.
 */
export function irr(flows: number[]): number | null {
  if (signChanges(flows) === 0) return null;
  const roots: number[] = [];
  // grade fina entre −99% e +50% a.m. (onde ficam as taxas reais), grossa até +1000%
  const grid: number[] = [];
  for (let i = 0; i < 1500; i++) grid.push(-0.99 + (1.49 * i) / 1500);
  for (let i = 0; i <= 500; i++) grid.push(0.5 + (9.5 * i) / 500);
  let prevX = grid[0]!;
  let prevV = npv(prevX, flows);
  for (let i = 1; i < grid.length; i++) {
    const x = grid[i]!;
    const v = npv(x, flows);
    if (prevV === 0) roots.push(prevX);
    else if (Math.sign(v) !== Math.sign(prevV)) {
      let a = prevX;
      let b = x;
      let fa = prevV;
      for (let k = 0; k < 200; k++) {
        const m = (a + b) / 2;
        const fm = npv(m, flows);
        if (Math.sign(fm) === Math.sign(fa)) {
          a = m;
          fa = fm;
        } else b = m;
        if (b - a < 1e-12) break;
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevV = v;
  }
  return roots.length === 1 ? roots[0]! : null;
}

/** Primeiro mês em que o acumulado fica ≥ 0 (descontado a `rate` se informada). */
export function payback(flows: number[], rate = 0): number | null {
  let acc = 0;
  for (let t = 0; t < flows.length; t++) {
    acc += flows[t]! / Math.pow(1 + rate, t);
    if (t > 0 && acc >= -1e-6) return t;
  }
  return null;
}
