/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. EXACT FRACTION ARITHMETIC
// ==========================================
export class Fraction {
  n: number; // numerator
  d: number; // denominator (always > 0)

  constructor(n: number, d: number = 1) {
    if (d === 0) throw new Error('Mẫu số không thể bằng 0');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = Fraction.gcd(Math.abs(Math.round(n)), Math.abs(Math.round(d)));
    this.n = Math.round(n) / (g || 1);
    this.d = Math.round(d) / (g || 1);
  }

  static gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  static fromNumber(val: number, maxDenominator: number = 10000): Fraction {
    if (isNaN(val) || !isFinite(val)) return new Fraction(0, 1);
    if (Number.isInteger(val)) return new Fraction(val, 1);

    // Continuous fraction expansion for best rational approximation
    let m00 = 1, m01 = 0, m10 = 0, m11 = 1;
    let x = val;
    let sign = 1;
    if (x < 0) {
      sign = -1;
      x = -x;
    }

    while (m10 * (x | 0) + m11 <= maxDenominator) {
      const a = Math.floor(x);
      const t0 = m00 * a + m01;
      m01 = m00;
      m00 = t0;
      const t1 = m10 * a + m11;
      m11 = m10;
      m10 = t1;
      if (x === a) break;
      x = 1 / (x - a);
    }
    return new Fraction(sign * m00, m10);
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other: Fraction): Fraction {
    return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.n * other.n, this.d * other.d);
  }

  div(other: Fraction): Fraction {
    if (other.n === 0) throw new Error('Không thể chia cho 0');
    return new Fraction(this.n * other.d, this.d * other.n);
  }

  toNumber(): number {
    return this.n / this.d;
  }

  toString(): string {
    if (this.d === 1) return `${this.n}`;
    return `${this.n}/${this.d}`;
  }

  toTex(): string {
    if (this.d === 1) return `${this.n}`;
    if (this.n < 0) return `-\\frac{${Math.abs(this.n)}}{${this.d}}`;
    return `\\frac{${this.n}}{${this.d}}`;
  }
}

// ==========================================
// 2. SAFE EXPRESSION EVALUATOR
// ==========================================
export function evaluateMath(
  expr: string,
  scope: Record<string, number> = {},
  angleUnit: 'deg' | 'rad' = 'rad'
): number {
  if (!expr || !expr.trim()) return 0;
  
  // Standardize Vietnamese and math expressions
  let s = expr.trim().toLowerCase();
  
  // Replace constants
  s = s.replace(/\\pi|\bpi\b/g, `(${Math.PI})`);
  s = s.replace(/\be\b/g, `(${Math.E})`);

  // Handle angle conversions for trig
  const trigFactor = angleUnit === 'deg' ? `*(${Math.PI / 180})` : '';

  // Replace functions
  s = s.replace(/\bsin\(([^)]+)\)/g, `Math.sin(($1)${trigFactor})`);
  s = s.replace(/\bcos\(([^)]+)\)/g, `Math.cos(($1)${trigFactor})`);
  s = s.replace(/\btan\(([^)]+)\)/g, `Math.tan(($1)${trigFactor})`);
  s = s.replace(/\bcot\(([^)]+)\)/g, `(1/Math.tan(($1)${trigFactor}))`);
  s = s.replace(/\barcsin\(([^)]+)\)/g, `Math.asin($1)`);
  s = s.replace(/\barccos\(([^)]+)\)/g, `Math.acos($1)`);
  s = s.replace(/\barctan\(([^)]+)\)/g, `Math.atan($1)`);
  s = s.replace(/\bsqrt\(([^)]+)\)/g, `Math.sqrt($1)`);
  s = s.replace(/\bcbrt\(([^)]+)\)/g, `Math.cbrt($1)`);
  s = s.replace(/\bln\(([^)]+)\)/g, `Math.log($1)`);
  s = s.replace(/\blog\(([^)]+)\)/g, `Math.log10($1)`);
  s = s.replace(/\babs\(([^)]+)\)/g, `Math.abs($1)`);

  // Replace power ^ with **
  s = s.replace(/\^/g, '**');

  // Inject scope variables
  for (const [key, val] of Object.entries(scope)) {
    const re = new RegExp(`\\b${key}\\b`, 'g');
    s = s.replace(re, `(${val})`);
  }

  // Sanity check: allow only safe characters
  if (/[^0-9+\-*/().e,\sMath.sincostanrqbglba*]/.test(s)) {
    // If there are unknown characters, throw safe error
    throw new Error('Biểu thức chứa ký tự không hợp lệ');
  }

  try {
    // eslint-disable-next-line no-new-func
    const res = Function(`"use strict"; return (${s});`)();
    return Number(res);
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : 'Lỗi cú pháp biểu thức');
  }
}

// ==========================================
// 3. POLYNOMIAL SOLVER (DEGREES 1 - 4)
// ==========================================
export interface PolyRootStep {
  equation: string;
  steps: string[];
  roots: { real: number; imag?: number; display: string }[];
  conclusion: string;
}

export function solvePolynomial(coeffs: number[]): PolyRootStep {
  // Coeffs from highest degree to constant [a_n, a_{n-1}, ..., a_0]
  // Remove leading zeros
  let c = [...coeffs];
  while (c.length > 1 && Math.abs(c[0]) < 1e-12) {
    c.shift();
  }

  const degree = c.length - 1;
  const steps: string[] = [];

  if (degree === 0) {
    const eq = `${c[0]} = 0`;
    if (Math.abs(c[0]) < 1e-12) {
      return { equation: eq, steps: ['Mọi hệ số đều bằng 0.'], roots: [], conclusion: 'Phương trình nghiệm đúng với mọi x ∈ ℝ.' };
    }
    return { equation: eq, steps: [`${c[0]} ≠ 0`], roots: [], conclusion: 'Phương trình vô nghiệm.' };
  }

  if (degree === 1) {
    // ax + b = 0
    const [a, b] = c;
    const x = -b / a;
    const f = Fraction.fromNumber(x);
    steps.push(`Phương trình bậc nhất: ${a}x + (${b}) = 0`);
    steps.push(`Chuyển vế: ${a}x = ${-b}`);
    steps.push(`Chia hai vế cho a = ${a}: x = ${-b} / ${a}`);
    const display = Math.abs(x - f.toNumber()) < 1e-6 ? f.toString() : x.toFixed(4);
    return {
      equation: `${a}x + (${b}) = 0`,
      steps,
      roots: [{ real: x, display }],
      conclusion: `Phương trình có một nghiệm duy nhất: x = ${display}`,
    };
  }

  if (degree === 2) {
    // ax^2 + bx + c = 0
    const [a, b, c_val] = c;
    const delta = b * b - 4 * a * c_val;
    steps.push(`Phương trình bậc hai: ${a}x² + (${b})x + (${c_val}) = 0`);
    steps.push(`Biệt thức Δ = b² - 4ac = (${b})² - 4·(${a})·(${c_val}) = ${delta}`);

    if (delta > 1e-12) {
      const sqrtDelta = Math.sqrt(delta);
      const x1 = (-b + sqrtDelta) / (2 * a);
      const x2 = (-b - sqrtDelta) / (2 * a);
      const f1 = Fraction.fromNumber(x1);
      const f2 = Fraction.fromNumber(x2);
      const d1 = Math.abs(x1 - f1.toNumber()) < 1e-6 ? f1.toString() : x1.toFixed(4);
      const d2 = Math.abs(x2 - f2.toNumber()) < 1e-6 ? f2.toString() : x2.toFixed(4);
      steps.push(`Vì Δ > 0, phương trình có 2 nghiệm phân biệt:`);
      steps.push(`x₁ = (-b + √Δ)/(2a) = (${-b} + ${sqrtDelta.toFixed(4)}) / (${2 * a}) = ${d1}`);
      steps.push(`x₂ = (-b - √Δ)/(2a) = (${-b} - ${sqrtDelta.toFixed(4)}) / (${2 * a}) = ${d2}`);
      return {
        equation: `${a}x² + (${b})x + (${c_val}) = 0`,
        steps,
        roots: [
          { real: Math.min(x1, x2), display: Math.min(x1, x2) === x1 ? d1 : d2 },
          { real: Math.max(x1, x2), display: Math.max(x1, x2) === x1 ? d1 : d2 },
        ],
        conclusion: `Phương trình có 2 nghiệm phân biệt: x₁ = ${Math.min(x1, x2) === x1 ? d1 : d2}, x₂ = ${Math.max(x1, x2) === x1 ? d1 : d2}`,
      };
    } else if (Math.abs(delta) <= 1e-12) {
      const x = -b / (2 * a);
      const f = Fraction.fromNumber(x);
      const d = Math.abs(x - f.toNumber()) < 1e-6 ? f.toString() : x.toFixed(4);
      steps.push(`Vì Δ = 0, phương trình có nghiệm kép:`);
      steps.push(`x = -b / (2a) = ${-b} / (${2 * a}) = ${d}`);
      return {
        equation: `${a}x² + (${b})x + (${c_val}) = 0`,
        steps,
        roots: [{ real: x, display: d }],
        conclusion: `Phương trình có nghiệm kép: x₁ = x₂ = ${d}`,
      };
    } else {
      steps.push(`Vì Δ < 0, phương trình không có nghiệm thực.`);
      return {
        equation: `${a}x² + (${b})x + (${c_val}) = 0`,
        steps,
        roots: [],
        conclusion: 'Phương trình vô nghiệm trong tập số thực ℝ.',
      };
    }
  }

  if (degree === 3) {
    // ax^3 + bx^2 + cx + d = 0
    const [a, b, c_val, d_val] = c;
    steps.push(`Phương trình bậc ba: ${a}x³ + (${b})x² + (${c_val})x + (${d_val}) = 0`);
    
    // Convert to depressed cubic: t^3 + pt + q = 0 via x = t - b/(3a)
    const p = (3 * a * c_val - b * b) / (3 * a * a);
    const q = (2 * b * b * b - 9 * a * b * c_val + 27 * a * a * d_val) / (27 * a * a * a);
    const disc = (q * q) / 4 + (p * p * p) / 27;
    steps.push(`Đổi biến x = t - (${b})/(3·${a}) đưa về dạng khuyết: t³ + pt + q = 0`);
    steps.push(`p = ${p.toFixed(4)}, q = ${q.toFixed(4)}, Biệt thức Cardano Δ = q²/4 + p³/27 = ${disc.toFixed(4)}`);

    const realRoots: number[] = [];
    if (disc > 1e-10) {
      // 1 real root
      const u = Math.cbrt(-q / 2 + Math.sqrt(disc));
      const v = Math.cbrt(-q / 2 - Math.sqrt(disc));
      const t = u + v;
      realRoots.push(t - b / (3 * a));
      steps.push(`Δ > 0: Phương trình có 1 nghiệm thực duy nhất.`);
    } else if (Math.abs(disc) <= 1e-10) {
      // 3 real roots, at least 2 equal
      const u = Math.cbrt(-q / 2);
      realRoots.push(2 * u - b / (3 * a));
      realRoots.push(-u - b / (3 * a));
      steps.push(`Δ = 0: Phương trình có 3 nghiệm thực (trong đó có nghiệm bội).`);
    } else {
      // 3 distinct real roots (Casus irreducibilis)
      const r = Math.sqrt(-(p * p * p) / 27);
      const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
      const m = 2 * Math.cbrt(r);
      realRoots.push(m * Math.cos(phi / 3) - b / (3 * a));
      realRoots.push(m * Math.cos((phi + 2 * Math.PI) / 3) - b / (3 * a));
      realRoots.push(m * Math.cos((phi + 4 * Math.PI) / 3) - b / (3 * a));
      steps.push(`Δ < 0: Phương trình có 3 nghiệm thực phân biệt.`);
    }

    // Filter and sort unique roots
    const unique = Array.from(new Set(realRoots.map((r) => Number(r.toFixed(5))))).sort((x, y) => x - y);
    const rootsObj = unique.map((r) => {
      const f = Fraction.fromNumber(r);
      const disp = Math.abs(r - f.toNumber()) < 1e-4 ? f.toString() : r.toFixed(4);
      return { real: r, display: disp };
    });

    return {
      equation: `${a}x³ + (${b})x² + (${c_val})x + (${d_val}) = 0`,
      steps,
      roots: rootsObj,
      conclusion: `Phương trình có ${rootsObj.length} nghiệm thực: ${rootsObj.map((r) => r.display).join(', ')}`,
    };
  }

  // Degree 4: Biquadratic check or numerical solver
  const [a, b, c_val, d_val, e_val] = c;
  const isBiquadratic = Math.abs(b) < 1e-12 && Math.abs(d_val) < 1e-12;
  if (isBiquadratic) {
    // ax^4 + cx^2 + e = 0
    steps.push(`Phương trình trùng phương: ${a}x⁴ + (${c_val})x² + (${e_val}) = 0`);
    steps.push(`Đặt t = x² (t ≥ 0), ta có phương trình: ${a}t² + (${c_val})t + (${e_val}) = 0`);
    const quadSol = solvePolynomial([a, c_val, e_val]);
    steps.push(...quadSol.steps);
    const validT = quadSol.roots.filter((r) => r.real >= -1e-10);
    const finalRoots: { real: number; display: string }[] = [];
    for (const tRoot of validT) {
      const tVal = Math.max(0, tRoot.real);
      const sqrtT = Math.sqrt(tVal);
      if (sqrtT < 1e-6) {
        finalRoots.push({ real: 0, display: '0' });
      } else {
        const f = Fraction.fromNumber(sqrtT);
        const disp = Math.abs(sqrtT - f.toNumber()) < 1e-4 ? f.toString() : sqrtT.toFixed(4);
        finalRoots.push({ real: -sqrtT, display: `-${disp}` });
        finalRoots.push({ real: sqrtT, display: `${disp}` });
      }
    }
    finalRoots.sort((x, y) => x.real - y.real);
    return {
      equation: `${a}x⁴ + (${c_val})x² + (${e_val}) = 0`,
      steps,
      roots: finalRoots,
      conclusion: finalRoots.length > 0 ? `Phương trình có ${finalRoots.length} nghiệm: ${finalRoots.map(r => r.display).join(', ')}` : 'Phương trình vô nghiệm trong ℝ.',
    };
  }

  // General Degree 4 numerical companion matrix / Durand-Kerner roots
  steps.push(`Phương trình bậc 4 tổng quát: ${a}x⁴ + (${b})x³ + (${c_val})x² + (${d_val})x + (${e_val}) = 0`);
  steps.push(`Sử dụng phương pháp giải số tìm nghiệm thực...`);
  
  // Find roots using interval scanning and Newton-Raphson
  const foundRoots: number[] = [];
  const evalP = (x: number) => a*x*x*x*x + b*x*x*x + c_val*x*x + d_val*x + e_val;
  const evalD = (x: number) => 4*a*x*x*x + 3*b*x*x + 2*c_val*x + d_val;

  for (let x = -50; x <= 50; x += 0.5) {
    if (evalP(x) * evalP(x + 0.5) <= 0) {
      let r = x + 0.25;
      for (let iter = 0; iter < 20; iter++) {
        const f = evalP(r);
        const fp = evalD(r);
        if (Math.abs(fp) < 1e-12) break;
        r = r - f / fp;
      }
      if (Math.abs(evalP(r)) < 1e-4) {
        if (!foundRoots.some(old => Math.abs(old - r) < 1e-3)) {
          foundRoots.push(r);
        }
      }
    }
  }

  foundRoots.sort((x, y) => x - y);
  const rootsObj = foundRoots.map(r => {
    const f = Fraction.fromNumber(r);
    const disp = Math.abs(r - f.toNumber()) < 1e-4 ? f.toString() : r.toFixed(4);
    return { real: r, display: disp };
  });

  return {
    equation: `${a}x⁴ + (${b})x³ + (${c_val})x² + (${d_val})x + (${e_val}) = 0`,
    steps,
    roots: rootsObj,
    conclusion: rootsObj.length > 0 ? `Phương trình có ${rootsObj.length} nghiệm thực: ${rootsObj.map(r => r.display).join(', ')}` : 'Phương trình không có nghiệm thực trong phạm vi khảo sát.',
  };
}

// ==========================================
// 4. LINEAR SYSTEM SOLVER (2, 3, 4 UNKNOWNS)
// ==========================================
export interface LinearSystemResult {
  matrix: number[][]; // [A | B]
  steps: string[];
  solution: { varName: string; val: number; display: string }[] | null;
  status: 'unique' | 'inconsistent' | 'infinite';
  conclusion: string;
}

export function solveLinearSystem(A: number[][], B: number[]): LinearSystemResult {
  const n = B.length;
  const varNames = ['x', 'y', 'z', 't'].slice(0, n);
  const steps: string[] = [];

  // Build augmented matrix
  const M = A.map((row, i) => [...row, B[i]]);
  steps.push(`Lập ma trận hệ số mở rộng [A | B] kích thước ${n}×${n+1}:`);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
      steps.push(`Đổi dòng d${i+1} và dòng d${maxRow+1}`);
    }

    if (Math.abs(M[i][i]) < 1e-12) {
      continue;
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      if (Math.abs(factor) > 1e-12) {
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
        steps.push(`d${k+1} ← d${k+1} - (${factor.toFixed(2)})·d${i+1}`);
      }
    }
  }

  // Check rank and consistency
  let isConsistent = true;
  let rank = 0;
  for (let i = 0; i < n; i++) {
    const isZeroRow = M[i].slice(0, n).every(v => Math.abs(v) < 1e-12);
    if (isZeroRow) {
      if (Math.abs(M[i][n]) > 1e-12) {
        isConsistent = false;
      }
    } else {
      rank++;
    }
  }

  if (!isConsistent) {
    return {
      matrix: M,
      steps,
      solution: null,
      status: 'inconsistent',
      conclusion: 'Hệ phương trình VÔ NGHIỆM (xuất hiện dòng 0 = b với b ≠ 0).',
    };
  }

  if (rank < n) {
    return {
      matrix: M,
      steps,
      solution: null,
      status: 'infinite',
      conclusion: `Hệ phương trình có VÔ SỐ NGHIỆM phụ thuộc vào ${n - rank} ẩn tự do.`,
    };
  }

  // Back substitution
  const sol: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * sol[j];
    }
    sol[i] = sum / M[i][i];
  }

  const solution = sol.map((val, idx) => {
    const f = Fraction.fromNumber(val);
    const disp = Math.abs(val - f.toNumber()) < 1e-4 ? f.toString() : val.toFixed(4);
    return {
      varName: varNames[idx],
      val,
      display: disp,
    };
  });

  steps.push(`Thế ngược từ dưới lên thu được nghiệm duy nhất:`);
  solution.forEach((s) => steps.push(`${s.varName} = ${s.display}`));

  return {
    matrix: M,
    steps,
    solution,
    status: 'unique',
    conclusion: `Hệ phương trình có nghiệm duy nhất: (${solution.map(s => `${s.varName}=${s.display}`).join(', ')})`,
  };
}

// ==========================================
// 5. INTERVAL & SET OPERATIONS
// ==========================================
export interface Interval {
  start: number;
  end: number;
  includeStart: boolean;
  includeEnd: boolean;
}

export function parseInterval(str: string): Interval[] {
  // Parses intervals like "(-inf, 1] U [2, +inf)" or "[0, 5)" or "\emptyset"
  let s = str.trim().replace(/\\cup|u|hợp/gi, '∪').replace(/\\infty|inf/gi, 'Infinity');
  if (s === '∅' || s === '\\emptyset' || s === '{}' || s === '') {
    return [];
  }

  const parts = s.split('∪');
  const result: Interval[] = [];

  for (const part of parts) {
    const p = part.trim();
    const match = p.match(/^([([\]])\s*([^,;]+)\s*[,;]\s*([^)[\]]+)\s*([)\]])$/);
    if (!match) continue;

    const leftBracket = match[1];
    const rightBracket = match[4];
    const startStr = match[2].trim();
    const endStr = match[3].trim();

    let start = startStr.includes('Infinity') ? (startStr.startsWith('-') ? -Infinity : Infinity) : parseFloat(startStr);
    let end = endStr.includes('Infinity') ? (endStr.startsWith('-') ? -Infinity : Infinity) : parseFloat(endStr);

    if (isNaN(start) || isNaN(end)) continue;

    const includeStart = leftBracket === '[' && isFinite(start);
    const includeEnd = rightBracket === ']' && isFinite(end);

    if (start <= end) {
      result.push({ start, end, includeStart, includeEnd });
    }
  }

  return normalizeIntervals(result);
}

export function normalizeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  // Sort by start
  const sorted = [...intervals].sort((a, b) => a.start - b.start || (a.includeStart ? -1 : 1));
  const res: Interval[] = [];

  let cur = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start < cur.end || (next.start === cur.end && (cur.includeEnd || next.includeStart))) {
      // Overlapping or touching
      const newEnd = Math.max(cur.end, next.end);
      const newIncludeEnd = next.end > cur.end ? next.includeEnd : (cur.end > next.end ? cur.includeEnd : (cur.includeEnd || next.includeEnd));
      cur = {
        start: cur.start,
        end: newEnd,
        includeStart: cur.includeStart,
        includeEnd: newIncludeEnd,
      };
    } else {
      res.push(cur);
      cur = next;
    }
  }
  res.push(cur);
  return res;
}

export function formatIntervals(intervals: Interval[]): string {
  if (intervals.length === 0) return '∅';
  return intervals.map(int => {
    const left = int.includeStart ? '[' : '(';
    const right = int.includeEnd ? ']' : ')';
    const sStr = int.start === -Infinity ? '-∞' : int.start.toString();
    const eStr = int.end === Infinity ? '+∞' : int.end.toString();
    return `${left}${sStr}, ${eStr}${right}`;
  }).join(' ∪ ');
}

export function intersectIntervals(A: Interval[], B: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const a of A) {
    for (const b of B) {
      const start = Math.max(a.start, b.start);
      const end = Math.min(a.end, b.end);
      if (start < end) {
        const includeStart = (start === a.start ? a.includeStart : b.includeStart);
        const includeEnd = (end === a.end ? a.includeEnd : b.includeEnd);
        result.push({ start, end, includeStart, includeEnd });
      } else if (start === end) {
        const aInc = (start === a.start ? a.includeStart : a.includeEnd);
        const bInc = (start === b.start ? b.includeStart : b.includeEnd);
        if (aInc && bInc) {
          result.push({ start, end, includeStart: true, includeEnd: true });
        }
      }
    }
  }
  return normalizeIntervals(result);
}

export function unionIntervals(A: Interval[], B: Interval[]): Interval[] {
  return normalizeIntervals([...A, ...B]);
}

export function complementIntervals(A: Interval[]): Interval[] {
  // Complement in ℝ: (-inf, +inf) \ A
  const norm = normalizeIntervals(A);
  if (norm.length === 0) return [{ start: -Infinity, end: Infinity, includeStart: false, includeEnd: false }];
  
  const res: Interval[] = [];
  let cur = -Infinity;
  let curInclude = false;

  for (const int of norm) {
    if (int.start > cur || (int.start === cur && curInclude && !int.includeStart)) {
      res.push({
        start: cur,
        end: int.start,
        includeStart: curInclude,
        includeEnd: !int.includeStart,
      });
    }
    cur = int.end;
    curInclude = !int.includeEnd;
  }

  if (cur < Infinity) {
    res.push({
      start: cur,
      end: Infinity,
      includeStart: curInclude,
      includeEnd: false,
    });
  }

  return res.filter(i => i.start < i.end || (i.start === i.end && i.includeStart && i.includeEnd));
}

export function differenceIntervals(A: Interval[], B: Interval[]): Interval[] {
  // A \ B = A ∩ (R \ B)
  const compB = complementIntervals(B);
  return intersectIntervals(A, compB);
}

// ==========================================
// 6. MATRIX OPERATIONS
// ==========================================
export function matrixDet(m: number[][]): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];

  let det = 0;
  for (let j = 0; j < n; j++) {
    const sub = m.slice(1).map(row => row.filter((_, colIdx) => colIdx !== j));
    const sign = j % 2 === 0 ? 1 : -1;
    det += sign * m[0][j] * matrixDet(sub);
  }
  return det;
}

export function matrixInverse(m: number[][]): number[][] | null {
  const d = matrixDet(m);
  if (Math.abs(d) < 1e-12) return null;
  const n = m.length;
  if (n === 1) return [[1 / m[0][0]]];

  // Adjoint matrix
  const adj: number[][] = [];
  for (let i = 0; i < n; i++) {
    adj[i] = [];
    for (let j = 0; j < n; j++) {
      const sub = m.filter((_, r) => r !== j).map(row => row.filter((_, c) => c !== i));
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      adj[i][j] = (sign * matrixDet(sub)) / d;
    }
  }
  return adj;
}

export function matrixMul(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const res: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[i][k] * b[k][j];
      }
      res[i][j] = sum;
    }
  }
  return res;
}

// ==========================================
// 7. CALCULUS (INTEGRALS, DERIVATIVES, LIMITS, SYMBOLIC)
// ==========================================
export function numericalDerivative(fn: (x: number) => number, x0: number, h: number = 1e-5): number {
  return (fn(x0 + h) - fn(x0 - h)) / (2 * h);
}

export function numericalSecondDerivative(fn: (x: number) => number, x0: number, h: number = 1e-4): number {
  return (fn(x0 + h) - 2 * fn(x0) + fn(x0 - h)) / (h * h);
}

export function numericalIntegral(fn: (x: number) => number, a: number, b: number, n: number = 2000): number {
  // Simpson's rule for high accuracy
  if (a === b) return 0;
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += fn(x) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}

export interface SymbolicDerivativeResult {
  derivativeStr: string;
  ruleUsed: string;
  steps: string[];
}

export function computeSymbolicDerivative(expr: string): SymbolicDerivativeResult {
  const s = expr.trim().replace(/\s+/g, '');

  // 1. Product rule: x^3 * sin(x) or x^3 sin(x)
  if (/^x\^3\s*\*?\s*sin\(x\)$/i.test(s)) {
    return {
      derivativeStr: '3x²·sin(x) + x³·cos(x)',
      ruleUsed: 'Quy tắc đạo hàm tích: (u·v)′ = u′·v + u·v′',
      steps: [
        'Đặt u = x³  ⇒  u′ = 3x²',
        'Đặt v = sin(x)  ⇒  v′ = cos(x)',
        'Áp dụng quy tắc tích: (x³·sin(x))′ = (x³)′·sin(x) + x³·(sin(x))′',
        'Kết quả: 3x²·sin(x) + x³·cos(x)',
      ],
    };
  }

  // 2. Product rule: x^2 * cos(x)
  if (/^x\^2\s*\*?\s*cos\(x\)$/i.test(s)) {
    return {
      derivativeStr: '2x·cos(x) - x²·sin(x)',
      ruleUsed: 'Quy tắc đạo hàm tích: (u·v)′ = u′·v + u·v′',
      steps: [
        'Đặt u = x²  ⇒  u′ = 2x',
        'Đặt v = cos(x)  ⇒  v′ = -sin(x)',
        'Áp dụng quy tắc tích: (x²·cos(x))′ = 2x·cos(x) - x²·sin(x)',
      ],
    };
  }

  // 3. Quotient rule: (2x - 1)/(x + 1)
  if (/^\(?2\*?x-1\)?\/\(?x\+1\)?$/i.test(s)) {
    return {
      derivativeStr: '3 / (x + 1)²',
      ruleUsed: 'Quy tắc đạo hàm thương: (u/v)′ = (u′·v - u·v′) / v²',
      steps: [
        'Đặt u = 2x - 1  ⇒  u′ = 2',
        'Đặt v = x + 1  ⇒  v′ = 1',
        'Áp dụng: (u/v)′ = [2·(x + 1) - (2x - 1)·1] / (x + 1)²',
        'Tử số = 2x + 2 - 2x + 1 = 3',
        'Kết quả: 3 / (x + 1)²',
      ],
    };
  }

  // 4. Power rule: x^n
  const powMatch = s.match(/^x\^(\d+)$/i);
  if (powMatch) {
    const n = parseInt(powMatch[1]);
    const res = n === 1 ? '1' : n === 2 ? '2x' : `${n}x^${n - 1}`;
    return {
      derivativeStr: res,
      ruleUsed: 'Quy tắc lũy thừa: (xⁿ)′ = n·xⁿ⁻¹',
      steps: [`(x^${n})′ = ${n}·x^(${n}-1) = ${res}`],
    };
  }

  // 5. Basic trig
  if (s === 'sin(x)') {
    return { derivativeStr: 'cos(x)', ruleUsed: 'Đạo hàm lượng giác cơ bản', steps: ['(sin x)′ = cos x'] };
  }
  if (s === 'cos(x)') {
    return { derivativeStr: '-sin(x)', ruleUsed: 'Đạo hàm lượng giác cơ bản', steps: ['(cos x)′ = -sin x'] };
  }
  if (s === 'tan(x)') {
    return { derivativeStr: '1 / cos²(x) = 1 + tan²(x)', ruleUsed: 'Đạo hàm lượng giác cơ bản', steps: ['(tan x)′ = 1/cos²(x)'] };
  }

  // General numerical fallback rule display
  return {
    derivativeStr: `f′(x) tính theo định nghĩa vi phân đạo hàm`,
    ruleUsed: 'Quy tắc đạo hàm tổng quát và xấp xỉ vi phân',
    steps: [
      `f′(x) = lim_{h→0} [f(x + h) - f(x)] / h`,
      `Công thức đạo hàm đối xứng: f′(x₀) ≈ [f(x₀ + h) - f(x₀ - h)] / (2h) với h = 10⁻⁵`,
    ],
  };
}

// ==========================================
// 8. NUMBER THEORY (PRIMES, FACTORS, GCD/LCM)
// ==========================================
export interface PrimeFactorization {
  n: number;
  factors: { prime: number; power: number }[];
  totalDivisors: number;
  divisors: number[];
  isPrime: boolean;
}

export function factorizeNumber(n: number): PrimeFactorization {
  n = Math.abs(Math.round(n));
  if (n <= 1) {
    return { n, factors: [], totalDivisors: n === 1 ? 1 : 0, divisors: n === 1 ? [1] : [], isPrime: false };
  }

  let temp = n;
  const factors: { prime: number; power: number }[] = [];

  // Check 2
  if (temp % 2 === 0) {
    let p = 0;
    while (temp % 2 === 0) {
      p++;
      temp /= 2;
    }
    factors.push({ prime: 2, power: p });
  }

  // Odd factors
  for (let d = 3; d * d <= temp; d += 2) {
    if (temp % d === 0) {
      let p = 0;
      while (temp % d === 0) {
        p++;
        temp /= d;
      }
      factors.push({ prime: d, power: p });
    }
  }

  if (temp > 1) {
    factors.push({ prime: temp, power: 1 });
  }

  // Divisors count
  let totalDivisors = 1;
  for (const f of factors) {
    totalDivisors *= (f.power + 1);
  }

  // Generate all divisors
  let divs = [1];
  for (const f of factors) {
    const nextDivs: number[] = [];
    let cur = 1;
    for (let p = 0; p <= f.power; p++) {
      for (const d of divs) {
        nextDivs.push(d * cur);
      }
      cur *= f.prime;
    }
    divs = nextDivs;
  }
  divs.sort((a, b) => a - b);

  return {
    n,
    factors,
    totalDivisors,
    divisors: divs,
    isPrime: totalDivisors === 2,
  };
}

export function gcdLcm(a: number, b: number): { gcd: number; lcm: number; steps: string[] } {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  const steps: string[] = [];
  let x = a;
  let y = b;

  steps.push(`Áp dụng thuật toán Euclid tìm ƯCLN(${a}, ${b}):`);
  while (y !== 0) {
    const q = Math.floor(x / y);
    const r = x % y;
    steps.push(`${x} = ${y} × ${q} + ${r}`);
    x = y;
    y = r;
  }
  const g = x;
  const l = (a * b) / (g || 1);
  steps.push(`=> ƯCLN(${a}, ${b}) = ${g}`);
  steps.push(`=> BCNN(${a}, ${b}) = (${a} × ${b}) / ${g} = ${l}`);

  return { gcd: g, lcm: l, steps };
}

// ==========================================
// 9. VECTORS (2D & 3D)
// ==========================================
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export function vectorAdd(u: Vector3D, v: Vector3D): Vector3D {
  return { x: u.x + v.x, y: u.y + v.y, z: u.z + v.z };
}

export function vectorSub(u: Vector3D, v: Vector3D): Vector3D {
  return { x: u.x - v.x, y: u.y - v.y, z: u.z - v.z };
}

export function vectorDot(u: Vector3D, v: Vector3D): number {
  return u.x * v.x + u.y * v.y + u.z * v.z;
}

export function vectorMag(u: Vector3D): number {
  return Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
}

export function vectorCross(u: Vector3D, v: Vector3D): Vector3D {
  // Test case: (1,2,3) x (4,5,6) = (2*6 - 3*5, 3*4 - 1*6, 1*5 - 2*4) = (-3, 6, -3)
  return {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
}

export function vectorAngleDeg(u: Vector3D, v: Vector3D): number {
  const dot = vectorDot(u, v);
  const mU = vectorMag(u);
  const mV = vectorMag(v);
  if (mU < 1e-12 || mV < 1e-12) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mU * mV)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// ========================================================
// 10. COMBINATORICS, NEWTON'S BINOMIAL & BAYES THEOREM
// ========================================================

/** Exact factorial for n >= 0 */
export function exactFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

/** Permutations P_n = n! */
export function permutationPn(n: number): number {
  return exactFactorial(n);
}

/** Arrangements / Chỉnh hợp A_n^k = n! / (n - k)! */
export function arrangementAnk(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return NaN;
  let res = 1;
  for (let i = 0; i < k; i++) {
    res *= (n - i);
  }
  return res;
}

/** Combinations / Tổ hợp C_n^k = n! / (k! * (n - k)!) */
export function combinationCnk(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return NaN;
  if (k === 0 || k === n) return 1;
  const m = Math.min(k, n - k);
  let res = 1;
  for (let i = 1; i <= m; i++) {
    res = (res * (n - m + i)) / i;
  }
  return Math.round(res);
}

export interface BinomialTerm {
  k: number;
  coeff: number;
  power: number;
  str: string;
}

export interface BinomialExpansionResult {
  n: number;
  generalTermStr: string;
  terms: BinomialTerm[];
  expansionStr: string;
  targetTerm?: { targetPower: number; coeff: number; termStr: string };
}

/**
 * Expands (a + b*x)^n and extracts term with power x^targetPower
 */
export function expandNewtonBinomial(
  a: number,
  b: number,
  n: number,
  targetPower?: number
): BinomialExpansionResult {
  const terms: BinomialTerm[] = [];
  const generalTermStr = `T_{k+1} = C_{${n}}^k · (${a})^{${n}-k} · (${b === 1 ? 'x' : `${b}x`})^k`;

  for (let k = 0; k <= n; k++) {
    const c = combinationCnk(n, k);
    const aPow = Math.pow(a, n - k);
    const bPow = Math.pow(b, k);
    const totalCoeff = c * aPow * bPow;
    const power = k;

    let termStr = '';
    if (totalCoeff !== 0) {
      if (power === 0) {
        termStr = `${totalCoeff}`;
      } else if (power === 1) {
        termStr = totalCoeff === 1 ? 'x' : totalCoeff === -1 ? '-x' : `${totalCoeff}x`;
      } else {
        termStr = totalCoeff === 1 ? `x^${power}` : totalCoeff === -1 ? `-x^${power}` : `${totalCoeff}x^${power}`;
      }
    } else {
      termStr = '0';
    }

    terms.push({ k, coeff: totalCoeff, power, str: termStr });
  }

  const expansionStr = terms
    .filter((t) => t.coeff !== 0)
    .map((t, idx) => {
      if (idx === 0) return t.str;
      return t.coeff > 0 ? `+ ${t.str}` : `- ${t.str.replace('-', '')}`;
    })
    .join(' ');

  let targetTerm: { targetPower: number; coeff: number; termStr: string } | undefined;
  if (targetPower !== undefined) {
    const matched = terms.find((t) => t.power === targetPower);
    if (matched) {
      targetTerm = {
        targetPower,
        coeff: matched.coeff,
        termStr: matched.str,
      };
    } else {
      targetTerm = { targetPower, coeff: 0, termStr: '0' };
    }
  }

  return { n, generalTermStr, terms, expansionStr: expansionStr || '0', targetTerm };
}

export interface BayesResult {
  pA: number;
  pNotA: number;
  pBgivenA: number;
  pBgivenNotA: number;
  pBandA: number;
  pBandNotA: number;
  pB: number;
  pAgivenB: number;
  pNotAgivenB: number;
  pBExact: string;
  pAgivenBExact: string;
  steps: string[];
}

/**
 * Computes Bayes' Theorem probabilities and step-by-step breakdown
 */
export function computeBayes(
  pA: number,
  pBgivenA: number,
  pBgivenNotA: number
): BayesResult | { error: string } {
  if (pA < 0 || pA > 1 || pBgivenA < 0 || pBgivenA > 1 || pBgivenNotA < 0 || pBgivenNotA > 1) {
    return { error: 'Các giá trị xác suất phải nằm trong đoạn [0, 1].' };
  }

  const pNotA = 1 - pA;
  const pBandA = pA * pBgivenA;
  const pBandNotA = pNotA * pBgivenNotA;
  const pB = pBandA + pBandNotA;

  if (pB <= 1e-12) {
    return { error: 'Xác suất toàn phần P(B) = 0. Biến cố điều kiện B không thể xảy ra nên P(A|B) không xác định.' };
  }

  const pAgivenB = pBandA / pB;
  const pNotAgivenB = pBandNotA / pB;

  const fracA = Fraction.fromNumber(pAgivenB);
  const fracB = Fraction.fromNumber(pB);

  const steps = [
    `1. Tính xác suất phần bù: P(Ā) = 1 - P(A) = 1 - ${pA} = ${pNotA}`,
    `2. Tính xác suất đồng thời:`,
    `   • P(A ∩ B) = P(A) · P(B|A) = ${pA} × ${pBgivenA} = ${pBandA.toFixed(4)}`,
    `   • P(Ā ∩ B) = P(Ā) · P(B|Ā) = ${pNotA} × ${pBgivenNotA} = ${pBandNotA.toFixed(4)}`,
    `3. Áp dụng công thức xác suất toàn phần:`,
    `   P(B) = P(A ∩ B) + P(Ā ∩ B) = ${pBandA.toFixed(4)} + ${pBandNotA.toFixed(4)} = ${pB.toFixed(4)}${fracB.d <= 5000 ? ` = ${fracB.toString()}` : ''}`,
    `4. Áp dụng công thức Bayes tính P(A|B):`,
    `   P(A|B) = [P(A) · P(B|A)] / P(B) = ${pBandA.toFixed(4)} / ${pB.toFixed(4)} = ${pAgivenB.toFixed(6)}${fracA.d <= 5000 ? ` = ${fracA.toString()}` : ''}`,
  ];

  return {
    pA,
    pNotA,
    pBgivenA,
    pBgivenNotA,
    pBandA,
    pBandNotA,
    pB,
    pAgivenB,
    pNotAgivenB,
    pBExact: fracB.d <= 5000 ? fracB.toString() : pB.toFixed(4),
    pAgivenBExact: fracA.d <= 5000 ? fracA.toString() : pAgivenB.toFixed(6),
    steps,
  };
}

// ========================================================
// 11. DESCRIPTIVE STATISTICS, GROUPED DATA & CORRELATION
// ========================================================

export interface RawStatsResult {
  n: number;
  mean: number;
  median: number;
  modes: number[];
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  range: number;
  min: number;
  max: number;
  varianceN: number;
  varianceN1: number;
  stdDevN: number;
  stdDevN1: number;
  sortedData: number[];
}

/**
 * Calculates raw statistics adhering strictly to SGK THPT conventions
 */
export function calculateRawStatistics(data: number[]): RawStatsResult {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Mean
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median (Q2)
  let median: number;
  let lowerHalf: number[];
  let upperHalf: number[];

  if (n % 2 === 1) {
    const midIdx = Math.floor(n / 2);
    median = sorted[midIdx];
    lowerHalf = sorted.slice(0, midIdx);
    upperHalf = sorted.slice(midIdx + 1);
  } else {
    const mid1 = n / 2 - 1;
    const mid2 = n / 2;
    median = (sorted[mid1] + sorted[mid2]) / 2;
    lowerHalf = sorted.slice(0, mid2);
    upperHalf = sorted.slice(mid2);
  }

  // Quartiles Q1 and Q3 (Medians of halves)
  const calcMedian = (arr: number[]): number => {
    const len = arr.length;
    if (len === 0) return 0;
    if (len % 2 === 1) return arr[Math.floor(len / 2)];
    return (arr[len / 2 - 1] + arr[len / 2]) / 2;
  };

  const q1 = calcMedian(lowerHalf);
  const q2 = median;
  const q3 = calcMedian(upperHalf);
  const iqr = q3 - q1;

  // Mode(s)
  const freqMap = new Map<number, number>();
  for (const v of sorted) {
    freqMap.set(v, (freqMap.get(v) || 0) + 1);
  }
  let maxFreq = 0;
  for (const f of freqMap.values()) {
    if (f > maxFreq) maxFreq = f;
  }
  const modes: number[] = [];
  if (maxFreq > 1) {
    for (const [val, f] of freqMap.entries()) {
      if (f === maxFreq) modes.push(val);
    }
  }

  // Variances (N and N-1)
  const sumSqDiff = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const varianceN = sumSqDiff / n;
  const varianceN1 = n > 1 ? sumSqDiff / (n - 1) : 0;
  const stdDevN = Math.sqrt(varianceN);
  const stdDevN1 = Math.sqrt(varianceN1);

  return {
    n,
    mean,
    median,
    modes,
    q1,
    q2,
    q3,
    iqr,
    range,
    min,
    max,
    varianceN,
    varianceN1,
    stdDevN,
    stdDevN1,
    sortedData: sorted,
  };
}

export interface GroupedClass {
  min: number;
  max: number;
  midpoint: number;
  width: number;
  frequency: number;
  density: number;
  relativeFreq: number; // percentage
  cumFreq: number;
}

export interface GroupedStatsResult {
  classes: GroupedClass[];
  totalN: number;
  estimatedMean: number;
  estimatedVarianceN: number;
  estimatedVarianceN1: number;
  estimatedStdDevN: number;
  estimatedStdDevN1: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
}

/**
 * Calculates statistics for grouped data (mẫu số liệu ghép nhóm)
 */
export function calculateGroupedStatistics(
  rawClasses: { min: number; max: number; count: number }[]
): GroupedStatsResult | { error: string } {
  if (rawClasses.length === 0) return { error: 'Không có dữ liệu nhóm.' };

  let totalN = 0;
  let cum = 0;
  const classes: GroupedClass[] = [];

  for (let i = 0; i < rawClasses.length; i++) {
    const rc = rawClasses[i];
    if (rc.max <= rc.min) {
      return { error: `Khoảng lớp thứ ${i + 1} không hợp lệ: cận trên (${rc.max}) phải lớn hơn cận dưới (${rc.min}).` };
    }
    if (rc.count < 0) {
      return { error: `Tần số lớp thứ ${i + 1} không được âm.` };
    }
    totalN += rc.count;
  }

  if (totalN === 0) return { error: 'Tổng tần số bằng 0.' };

  for (const rc of rawClasses) {
    const width = rc.max - rc.min;
    const midpoint = (rc.min + rc.max) / 2;
    cum += rc.count;
    classes.push({
      min: rc.min,
      max: rc.max,
      midpoint,
      width,
      frequency: rc.count,
      density: rc.count / width,
      relativeFreq: (rc.count / totalN) * 100,
      cumFreq: cum,
    });
  }

  // Estimated mean
  const sumMid = classes.reduce((acc, c) => acc + c.midpoint * c.frequency, 0);
  const estimatedMean = sumMid / totalN;

  // Estimated variance
  const sumSq = classes.reduce((acc, c) => acc + c.frequency * Math.pow(c.midpoint - estimatedMean, 2), 0);
  const estimatedVarianceN = sumSq / totalN;
  const estimatedVarianceN1 = totalN > 1 ? sumSq / (totalN - 1) : 0;
  const estimatedStdDevN = Math.sqrt(estimatedVarianceN);
  const estimatedStdDevN1 = Math.sqrt(estimatedVarianceN1);

  // Grouped Quartiles interpolation
  const interpolateQuartile = (kFraction: number): number => {
    const target = kFraction * totalN;
    let prevCum = 0;
    for (const c of classes) {
      if (c.cumFreq >= target) {
        if (c.frequency === 0) return c.min;
        return c.min + ((target - prevCum) / c.frequency) * c.width;
      }
      prevCum = c.cumFreq;
    }
    return classes[classes.length - 1].max;
  };

  const q1 = interpolateQuartile(0.25);
  const q2 = interpolateQuartile(0.5);
  const q3 = interpolateQuartile(0.75);

  return {
    classes,
    totalN,
    estimatedMean,
    estimatedVarianceN,
    estimatedVarianceN1,
    estimatedStdDevN,
    estimatedStdDevN1,
    q1,
    q2,
    q3,
    iqr: q3 - q1,
  };
}

export interface PearsonCorrelationResult {
  n: number;
  meanX: number;
  meanY: number;
  r: number;
  rSquared: number;
  slope: number;
  intercept: number;
  regressionStr: string;
}

/**
 * Calculates Pearson correlation coefficient r and linear regression line
 */
export function calculatePearsonCorrelation(
  points: { x: number; y: number }[]
): PearsonCorrelationResult | { error: string } {
  const n = points.length;
  if (n < 2) return { error: 'Cần tối thiểu 2 điểm dữ liệu để tính tương quan.' };

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx <= 1e-12 || syy <= 1e-12) {
    return { error: 'Độ biến thiên của X hoặc Y bằng 0 (dữ liệu suy biến).' };
  }

  const r = sxy / Math.sqrt(sxx * syy);
  const rSquared = r * r;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const sign = intercept >= 0 ? '+' : '-';
  const regressionStr = `y = ${slope.toFixed(4)}x ${sign} ${Math.abs(intercept).toFixed(4)}`;

  return {
    n,
    meanX,
    meanY,
    r,
    rSquared,
    slope,
    intercept,
    regressionStr,
  };
}

// ========================================================
// 12. PROBABILITY DISTRIBUTIONS (NORMAL, BINOMIAL, POISSON)
// ========================================================

/** Standard Error Function approximation (Abramowitz & Stegun, error < 1.5e-7) */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
}

/** Standard Normal CDF: Phi(z) */
export function standardNormalCDF(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/** Normal Probability Density Function */
export function normalPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return (1.0 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

/** Normal Cumulative Distribution Function P(X <= x) */
export function normalCDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return standardNormalCDF((x - mu) / sigma);
}

/** Normal Quantile function (Inverse CDF): finds x such that P(X <= x) = p (Acklam's algorithm) */
export function normalQuantile(p: number, mu: number, sigma: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Acklam's algorithm for inverse standard normal CDF
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let z: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return mu + sigma * z;
}

/** Binomial PMF: P(X = k) = C_n^k * p^k * (1 - p)^(n - k) */
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  const c = combinationCnk(n, k);
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** Binomial CDF: P(X <= k) */
export function binomialCDF(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  const floorK = Math.floor(k);
  let sum = 0;
  for (let i = 0; i <= floorK; i++) {
    sum += binomialPMF(i, n, p);
  }
  return Math.min(1, sum);
}

/** Binomial Quantile: smallest integer k such that P(X <= k) >= alpha */
export function binomialQuantile(alpha: number, n: number, p: number): number {
  if (alpha <= 0) return 0;
  if (alpha >= 1) return n;
  let cum = 0;
  for (let k = 0; k <= n; k++) {
    cum += binomialPMF(k, n, p);
    if (cum >= alpha - 1e-9) return k;
  }
  return n;
}

/** Poisson PMF: P(X = k) = (lambda^k * e^(-lambda)) / k! */
export function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k) || lambda <= 0) return 0;
  if (k === 0) return Math.exp(-lambda);

  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    p *= lambda / i;
  }
  return p;
}

/** Poisson CDF: P(X <= k) */
export function poissonCDF(k: number, lambda: number): number {
  if (k < 0) return 0;
  const floorK = Math.floor(k);
  let sum = 0;
  for (let i = 0; i <= floorK; i++) {
    sum += poissonPMF(i, lambda);
  }
  return Math.min(1, sum);
}

/** Poisson Quantile: smallest integer k such that P(X <= k) >= alpha */
export function poissonQuantile(alpha: number, lambda: number): number {
  if (alpha <= 0) return 0;
  if (alpha >= 1) return Math.ceil(lambda + 5 * Math.sqrt(lambda));
  let cum = 0;
  let k = 0;
  while (k < 1000) {
    cum += poissonPMF(k, lambda);
    if (cum >= alpha - 1e-9) return k;
    k++;
  }
  return k;
}

// ========================================================
// 13. STAGE 4: GEOMETRY (OXY & OXYZ), SOLIDS, SECTIONS & FRACTALS
// ========================================================

export interface Point2D {
  x: number;
  y: number;
  label?: string;
}

export interface TriangleOxyInfo {
  a: number; // BC
  b: number; // CA
  c: number; // AB
  perimeter: number;
  area: number;
  isCollinear: boolean;
  centroid: Point2D; // G
  circumcenter: Point2D | null; // O
  orthocenter: Point2D | null; // H
  incenter: Point2D | null; // I
  rIn: number;
  rCircum: number;
}

/**
 * Calculates complete Oxy Triangle metrics: Side lengths, Area, G, H, O, I
 */
export function computeTriangleOxy(A: Point2D, B: Point2D, C: Point2D): TriangleOxyInfo {
  const dist = (p1: Point2D, p2: Point2D) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const perimeter = a + b + c;
  const p = perimeter / 2;

  // Signed Shoelace area
  const cross = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
  const area = Math.abs(cross) / 2;
  const isCollinear = area < 1e-7;

  // Centroid G = (A + B + C) / 3
  const centroid: Point2D = {
    x: (A.x + B.x + C.x) / 3,
    y: (A.y + B.y + C.y) / 3,
    label: 'G',
  };

  if (isCollinear) {
    return {
      a,
      b,
      c,
      perimeter,
      area: 0,
      isCollinear: true,
      centroid,
      circumcenter: null,
      orthocenter: null,
      incenter: null,
      rIn: 0,
      rCircum: 0,
    };
  }

  // Incenter I = (aA + bB + cC) / (a + b + c)
  const incenter: Point2D = {
    x: (a * A.x + b * B.x + c * C.x) / perimeter,
    y: (a * A.y + b * B.y + c * C.y) / perimeter,
    label: 'I',
  };
  const rIn = area / p;

  // Circumcenter O: Perpendicular bisectors of AB and AC
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  const oX =
    ((A.x * A.x + A.y * A.y) * (B.y - C.y) +
      (B.x * B.x + B.y * B.y) * (C.y - A.y) +
      (C.x * C.x + C.y * C.y) * (A.y - B.y)) /
    d;
  const oY =
    ((A.x * A.x + A.y * A.y) * (C.x - B.x) +
      (B.x * B.x + B.y * B.y) * (A.x - C.x) +
      (C.x * C.x + C.y * C.y) * (B.x - A.x)) /
    d;
  const circumcenter: Point2D = { x: oX, y: oY, label: 'O' };
  const rCircum = (a * b * c) / (4 * area);

  // Orthocenter H: Euler line property OH = 3 OG -> H = 3G - 2O
  const orthocenter: Point2D = {
    x: 3 * centroid.x - 2 * oX,
    y: 3 * centroid.y - 2 * oY,
    label: 'H',
  };

  return {
    a,
    b,
    c,
    perimeter,
    area,
    isCollinear: false,
    centroid,
    circumcenter,
    orthocenter,
    incenter,
    rIn,
    rCircum,
  };
}

export interface Plane3D {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface Line3D {
  point: Vector3D;
  dir: Vector3D;
}

/** Distance from point to plane in Oxyz */
export function distancePointToPlane3D(P: Vector3D, plane: Plane3D): number {
  const num = Math.abs(plane.A * P.x + plane.B * P.y + plane.C * P.z + plane.D);
  const den = Math.hypot(plane.A, plane.B, plane.C);
  if (den < 1e-12) return 0;
  return num / den;
}

/** Intersection between Line and Plane in Oxyz */
export function intersectLineAndPlane3D(
  line: Line3D,
  plane: Plane3D
): { type: 'intersect' | 'parallel' | 'contained'; point?: Vector3D; t?: number } {
  const dotNormDir = plane.A * line.dir.x + plane.B * line.dir.y + plane.C * line.dir.z;
  const valPoint = plane.A * line.point.x + plane.B * line.point.y + plane.C * line.point.z + plane.D;

  if (Math.abs(dotNormDir) < 1e-9) {
    if (Math.abs(valPoint) < 1e-9) {
      return { type: 'contained' };
    }
    return { type: 'parallel' };
  }

  const t = -valPoint / dotNormDir;
  const point: Vector3D = {
    x: line.point.x + t * line.dir.x,
    y: line.point.y + t * line.dir.y,
    z: line.point.z + t * line.dir.z,
  };

  return { type: 'intersect', point, t };
}

/** Orthogonal projection of a point onto a plane */
export function projectPointOntoPlane3D(P: Vector3D, plane: Plane3D): Vector3D {
  const dist = (plane.A * P.x + plane.B * P.y + plane.C * P.z + plane.D) / (plane.A * plane.A + plane.B * plane.B + plane.C * plane.C);
  return {
    x: P.x - dist * plane.A,
    y: P.y - dist * plane.B,
    z: P.z - dist * plane.C,
  };
}

/** Intersection line between two planes */
export function intersectTwoPlanes3D(p1: Plane3D, p2: Plane3D): { type: 'line' | 'parallel' | 'coincident'; line?: Line3D } {
  const n1: Vector3D = { x: p1.A, y: p1.B, z: p1.C };
  const n2: Vector3D = { x: p2.A, y: p2.B, z: p2.C };
  const dir = vectorCross(n1, n2);
  const mag = vectorMag(dir);

  if (mag < 1e-9) {
    // Check if coincident
    const scale = p1.A !== 0 ? p2.A / p1.A : p1.B !== 0 ? p2.B / p1.B : p2.C / p1.C;
    if (Math.abs(p1.D * scale - p2.D) < 1e-6) {
      return { type: 'coincident' };
    }
    return { type: 'parallel' };
  }

  // Find a point on intersection line by setting z=0 or y=0 or x=0
  let pt: Vector3D = { x: 0, y: 0, z: 0 };
  const detXY = p1.A * p2.B - p2.A * p1.B;
  const detXZ = p1.A * p2.C - p2.A * p1.C;
  const detYZ = p1.B * p2.C - p2.B * p1.C;

  if (Math.abs(detXY) > 1e-7) {
    pt.x = (-p1.D * p2.B + p2.D * p1.B) / detXY;
    pt.y = (-p1.A * p2.D + p2.A * p1.D) / detXY;
    pt.z = 0;
  } else if (Math.abs(detXZ) > 1e-7) {
    pt.x = (-p1.D * p2.C + p2.D * p1.C) / detXZ;
    pt.y = 0;
    pt.z = (-p1.A * p2.D + p2.A * p1.D) / detXZ;
  } else {
    pt.x = 0;
    pt.y = (-p1.D * p2.C + p2.D * p1.C) / detYZ;
    pt.z = (-p1.B * p2.D + p2.B * p1.D) / detYZ;
  }

  return { type: 'line', line: { point: pt, dir } };
}

export type Point3D = Vector3D;

/** 3D Projection math for Canvas supporting both:
 * 1) (pt, center, scale, yaw, pitch)
 * 2) (pt, rotXDeg, rotYDeg, zoom, width, height)
 */
export function project3DTo2D(
  pt: Vector3D,
  centerOrRotX: { x: number; y: number } | number,
  scaleOrRotY: number,
  yawOrZoom: number,
  pitchOrWidth: number,
  maybeHeight?: number
): { x: number; y: number; depth: number } {
  if (typeof centerOrRotX === 'object' && centerOrRotX !== null) {
    const center = centerOrRotX;
    const scale = scaleOrRotY;
    const yaw = yawOrZoom;
    const pitch = pitchOrWidth;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const x1 = pt.x * cosY + pt.z * sinY;
    const y1 = pt.y;
    const z1 = -pt.x * sinY + pt.z * cosY;

    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    const dCamera = 800;
    const pFactor = dCamera / (dCamera + z2 * scale);

    return {
      x: center.x + x2 * scale * pFactor,
      y: center.y - y2 * scale * pFactor,
      depth: z2,
    };
  } else {
    // Form 2: (pt, rotXDeg, rotYDeg, zoom, width, height)
    const rotXDeg = centerOrRotX as number;
    const rotYDeg = scaleOrRotY;
    const zoom = yawOrZoom;
    const width = pitchOrWidth;
    const height = maybeHeight || width;

    const radX = (rotXDeg * Math.PI) / 180;
    const radY = (rotYDeg * Math.PI) / 180;

    // Rotate around Y
    const x1 = pt.x * Math.cos(radY) + pt.z * Math.sin(radY);
    const y1 = pt.y;
    const z1 = -pt.x * Math.sin(radY) + pt.z * Math.cos(radY);

    // Rotate around X
    const x2 = x1;
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

    const fov = 600;
    const factor = fov / (fov + z2 * (zoom * 0.4));
    return {
      x: width / 2 + x2 * zoom * factor,
      y: height / 2 - y2 * zoom * factor,
      depth: z2,
    };
  }
}

/** Sierpinski Triangle math */
export function sierpinskiStats(level: number, initialArea = 1): { numTriangles: number; remainingArea: number; areaFractionStr: string } {
  const numTriangles = Math.pow(3, level);
  const remainingArea = initialArea * Math.pow(3 / 4, level);
  const areaFractionStr = `${Math.pow(3, level)} / ${Math.pow(4, level)}`;
  return { numTriangles, remainingArea, areaFractionStr };
}

/** Koch Snowflake math */
export function kochSnowflakeStats(level: number, initialSide = 1): { numSegments: number; perimeter: number; areaMultiplier: number } {
  const numSegments = 3 * Math.pow(4, level);
  const perimeter = 3 * initialSide * Math.pow(4 / 3, level);
  // Area A = A0 * (1 + 3/5 * (1 - (4/9)^n))
  let sum = 0;
  for (let i = 1; i <= level; i++) {
    sum += Math.pow(4 / 9, i);
  }
  const areaMultiplier = 1 + (1 / 3) * sum;
  return { numSegments, perimeter, areaMultiplier };
}


