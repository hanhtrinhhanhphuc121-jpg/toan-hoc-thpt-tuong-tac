/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, ArrowRight, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Fraction } from '../utils/mathEngine';

interface InequalityProps {
  onOpenInNumberLine?: (solutionIntervalStr: string) => void;
}

type IneqOp = '>=' | '>' | '<=' | '<';

export const InequalitySolver: React.FC<InequalityProps> = ({ onOpenInNumberLine }) => {
  const [activeTab, setActiveTab] = useState<'1d' | '2d' | 'lp'>('1d');

  // --- 1D INEQUALITY STATE ---
  const [a1, setA1] = useState<number>(1);
  const [b1, setB1] = useState<number>(-3);
  const [c1, setC1] = useState<number>(2);
  const [op1, setOp1] = useState<IneqOp>('>='); // x^2 - 3x + 2 >= 0
  const [sol1D, setSol1D] = useState<{ str: string; steps: string[]; intervals: string } | null>(null);

  // --- 2D INEQUALITY & LINEAR PROGRAMMING STATE ---
  const [ineqList2D, setIneqList2D] = useState<
    { id: string; a: number; b: number; op: '<=' | '>=' | '<' | '>'; c: number; color: string }[]
  >([
    { id: '1', a: 1, b: 1, op: '<=', c: 4, color: '#4f46e5' },   // x + y <= 4
    { id: '2', a: 1, b: 0, op: '>=', c: 0, color: '#16a34a' },   // x >= 0
    { id: '3', a: 0, b: 1, op: '>=', c: 0, color: '#ea580c' },   // y >= 0
    { id: '4', a: 2, b: 1, op: '<=', c: 6, color: '#dc2626' },   // 2x + y <= 6
  ]);

  // Objective function F(x, y) = cX * x + cY * y
  const [objX, setObjX] = useState<number>(3);
  const [objY, setObjY] = useState<number>(2);
  const [lpVertices, setLpVertices] = useState<{ x: number; y: number; val: number }[]>([]);
  const [lpExtrema, setLpExtrema] = useState<{ min: { x: number; y: number; val: number }; max: { x: number; y: number; val: number } } | null>(null);

  const canvas2DRef = useRef<HTMLCanvasElement>(null);

  // Solve 1D Quadratic Inequality: ax^2 + bx + c (op) 0
  const handleSolve1D = () => {
    const a = a1;
    const b = b1;
    const c = c1;
    const op = op1;

    const steps: string[] = [];
    steps.push(`Xét tam thức bậc hai f(x) = ${a}x² + (${b})x + (${c})`);

    if (Math.abs(a) < 1e-12) {
      // Degenerate to linear: bx + c (op) 0
      if (Math.abs(b) < 1e-12) {
        const isTrue = op === '>=' ? c >= 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c < 0;
        const conclusion = isTrue ? '(-∞, +∞)' : '∅';
        setSol1D({
          str: `Tập nghiệm: ${conclusion}`,
          steps: [`Bất phương trình suy biến thành: ${c} ${op} 0 (${isTrue ? 'luôn đúng' : 'vô nghiệm'})`],
          intervals: conclusion,
        });
        return;
      }
      const xRoot = -c / b;
      const frac = Fraction.fromNumber(xRoot);
      const d = Math.abs(xRoot - frac.toNumber()) < 1e-5 ? frac.toString() : xRoot.toFixed(4);
      let resInterval = '';
      if ((b > 0 && (op === '>=' || op === '>')) || (b < 0 && (op === '<=' || op === '<'))) {
        resInterval = op.includes('=') ? `[${d}, +∞)` : `(${d}, +∞)`;
      } else {
        resInterval = op.includes('=') ? `(-∞, ${d}]` : `(-∞, ${d})`;
      }
      setSol1D({
        str: `Tập nghiệm: S = ${resInterval}`,
        steps: [`Hạ bậc về bậc nhất: ${b}x + (${c}) ${op} 0`, `Nghiệm: x = ${d}`],
        intervals: resInterval,
      });
      return;
    }

    const delta = b * b - 4 * a * c;
    steps.push(`Biệt thức Δ = b² - 4ac = (${b})² - 4·(${a})·(${c}) = ${delta}`);

    let intervalStr = '';

    if (delta > 1e-12) {
      const sqrtDelta = Math.sqrt(delta);
      const xA = (-b - sqrtDelta) / (2 * a);
      const xB = (-b + sqrtDelta) / (2 * a);
      const x1 = Math.min(xA, xB);
      const x2 = Math.max(xA, xB);

      const f1 = Fraction.fromNumber(x1);
      const f2 = Fraction.fromNumber(x2);
      const d1 = Math.abs(x1 - f1.toNumber()) < 1e-5 ? f1.toString() : x1.toFixed(4);
      const d2 = Math.abs(x2 - f2.toNumber()) < 1e-5 ? f2.toString() : x2.toFixed(4);

      steps.push(`Δ > 0: Tam thức có 2 nghiệm phân biệt x₁ = ${d1}, x₂ = ${d2}`);
      steps.push(`Dấu của tam thức bậc hai (quy tắc "Trong trái - Ngoài cùng" so với hệ số a = ${a}):`);
      steps.push(`• f(x) cùng dấu với a (${a > 0 ? '+' : '-'}) khi x ∈ (-∞, ${d1}) ∪ (${d2}, +∞)`);
      steps.push(`• f(x) trái dấu với a (${a > 0 ? '-' : '+'}) khi x ∈ (${d1}, ${d2})`);

      // Determine condition based on op and sign of a
      const wantSameSignAsA = (a > 0 && (op === '>=' || op === '>')) || (a < 0 && (op === '<=' || op === '<'));

      if (wantSameSignAsA) {
        if (op === '>=' || op === '<=') {
          intervalStr = `(-∞, ${d1}] ∪ [${d2}, +∞)`;
        } else {
          intervalStr = `(-∞, ${d1}) ∪ (${d2}, +∞)`;
        }
      } else {
        if (op === '>=' || op === '<=') {
          intervalStr = `[${d1}, ${d2}]`;
        } else {
          intervalStr = `(${d1}, ${d2})`;
        }
      }
    } else if (Math.abs(delta) <= 1e-12) {
      const x0 = -b / (2 * a);
      const f0 = Fraction.fromNumber(x0);
      const d0 = Math.abs(x0 - f0.toNumber()) < 1e-5 ? f0.toString() : x0.toFixed(4);
      steps.push(`Δ = 0: Tam thức có nghiệm kép x₀ = ${d0}`);

      if (a > 0) {
        if (op === '>=') intervalStr = '(-∞, +∞)';
        else if (op === '>') intervalStr = `(-∞, ${d0}) ∪ (${d0}, +∞)`;
        else if (op === '<=') intervalStr = `[${d0}, ${d0}]`;
        else intervalStr = '∅';
      } else {
        if (op === '<=') intervalStr = '(-∞, +∞)';
        else if (op === '<') intervalStr = `(-∞, ${d0}) ∪ (${d0}, +∞)`;
        else if (op === '>=') intervalStr = `[${d0}, ${d0}]`;
        else intervalStr = '∅';
      }
    } else {
      steps.push(`Δ < 0: Tam thức luôn cùng dấu với hệ số a = ${a} với mọi x ∈ ℝ.`);
      const sameSign = (a > 0 && (op === '>=' || op === '>')) || (a < 0 && (op === '<=' || op === '<'));
      intervalStr = sameSign ? '(-∞, +∞)' : '∅';
    }

    setSol1D({
      str: `Tập nghiệm: S = ${intervalStr}`,
      steps,
      intervals: intervalStr,
    });
  };

  useEffect(() => {
    handleSolve1D();
  }, [a1, b1, c1, op1]);

  // Solve 2D Feasible Region & Linear Programming
  const handleSolve2D = () => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Viewport [-2, 8] x [-2, 8]
    const xMin = -2, xMax = 7, yMin = -2, yMax = 7;
    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Draw Grid & Axes
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let x = Math.floor(xMin); x <= xMax; x++) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), 0);
      ctx.lineTo(toScreenX(x), height);
      ctx.stroke();
    }
    for (let y = Math.floor(yMin); y <= yMax; y++) {
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(y));
      ctx.lineTo(width, toScreenY(y));
      ctx.stroke();
    }

    // Axes
    const ox = toScreenX(0);
    const oy = toScreenY(0);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(width, oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, height);
    ctx.lineTo(ox, 0);
    ctx.stroke();

    // Check feasible points on grid to shade region
    const gridRes = 250;
    const dx = (xMax - xMin) / gridRes;
    const dy = (yMax - yMin) / gridRes;

    const isFeasible = (x: number, y: number) => {
      for (const ineq of ineqList2D) {
        const lhs = ineq.a * x + ineq.b * y;
        if (ineq.op === '<=' && lhs > ineq.c + 1e-6) return false;
        if (ineq.op === '<' && lhs >= ineq.c - 1e-6) return false;
        if (ineq.op === '>=' && lhs < ineq.c - 1e-6) return false;
        if (ineq.op === '>' && lhs <= ineq.c + 1e-6) return false;
      }
      return true;
    };

    // Shade feasible region
    ctx.fillStyle = 'rgba(79, 70, 229, 0.18)';
    for (let i = 0; i < gridRes; i++) {
      for (let j = 0; j < gridRes; j++) {
        const x = xMin + i * dx;
        const y = yMin + j * dy;
        if (isFeasible(x, y)) {
          ctx.fillRect(toScreenX(x), toScreenY(y + dy), (width / gridRes) + 1, (height / gridRes) + 1);
        }
      }
    }

    // Draw boundary lines: SOLID for <=, >= and DASHED for <, >
    for (const ineq of ineqList2D) {
      ctx.save();
      ctx.strokeStyle = ineq.color;
      ctx.lineWidth = 2;
      const isStrict = ineq.op === '<' || ineq.op === '>';
      if (isStrict) {
        ctx.setLineDash([6, 4]); // Dashed line!
      } else {
        ctx.setLineDash([]); // Solid line!
      }

      ctx.beginPath();
      if (Math.abs(ineq.b) > 1e-6) {
        // y = (c - ax) / b
        const y1 = (ineq.c - ineq.a * xMin) / ineq.b;
        const y2 = (ineq.c - ineq.a * xMax) / ineq.b;
        ctx.moveTo(toScreenX(xMin), toScreenY(y1));
        ctx.lineTo(toScreenX(xMax), toScreenY(y2));
      } else if (Math.abs(ineq.a) > 1e-6) {
        // x = c / a (vertical line)
        const xVal = ineq.c / ineq.a;
        ctx.moveTo(toScreenX(xVal), 0);
        ctx.lineTo(toScreenX(xVal), height);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Calculate candidate corner vertices of the feasible polygon
    const candidateVertices: { x: number; y: number }[] = [];
    const lines = ineqList2D.map(inq => ({ a: inq.a, b: inq.b, c: inq.c }));

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const l1 = lines[i];
        const l2 = lines[j];
        const det = l1.a * l2.b - l1.b * l2.a;
        if (Math.abs(det) > 1e-6) {
          const vx = (l1.c * l2.b - l1.b * l2.c) / det;
          const vy = (l1.a * l2.c - l1.c * l2.a) / det;
          if (isFeasible(vx, vy)) {
            // Check unique
            if (!candidateVertices.some(v => Math.hypot(v.x - vx, v.y - vy) < 1e-4)) {
              candidateVertices.push({ x: vx, y: vy });
            }
          }
        }
      }
    }

    // Evaluate objective function at vertices
    const evaluated = candidateVertices.map(v => ({
      x: v.x,
      y: v.y,
      val: objX * v.x + objY * v.y,
    }));

    setLpVertices(evaluated);

    if (evaluated.length > 0) {
      let minV = evaluated[0];
      let maxV = evaluated[0];
      for (const ev of evaluated) {
        if (ev.val < minV.val) minV = ev;
        if (ev.val > maxV.val) maxV = ev;
      }
      setLpExtrema({ min: minV, max: maxV });
    } else {
      setLpExtrema(null);
    }

    // Draw Vertex dots
    for (const v of evaluated) {
      const sx = toScreenX(v.x);
      const sy = toScreenY(v.y);

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`, sx + 8, sy - 6);
    }
  };

  useEffect(() => {
    if (activeTab === '2d' || activeTab === 'lp') {
      handleSolve2D();
    }
  }, [activeTab, ineqList2D, objX, objY]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('1d')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === '1d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Bất phương trình 1 ẩn
          </button>
          <button
            onClick={() => setActiveTab('2d')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === '2d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Miền nghiệm 2 ẩn (Hệ trục Oxy)
          </button>
          <button
            onClick={() => setActiveTab('lp')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'lp' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Quy hoạch tuyến tính (Min/Max F)
          </button>
        </div>
      </div>

      {/* TAB 1: 1-VARIABLE INEQUALITIES */}
      {activeTab === '1d' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Bất phương trình bậc hai: ax² + bx + c (≥ 0, &gt; 0, ≤ 0, &lt; 0)
              </span>

              {/* Sample test case button */}
              <button
                onClick={() => {
                  setA1(1);
                  setB1(-3);
                  setC1(2);
                  setOp1('>=');
                }}
                className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
              >
                Bài mẫu: x² - 3x + 2 ≥ 0
              </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={a1}
                  onChange={(e) => setA1(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2.5 py-1.5 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold"
                />
                <span className="text-sm font-bold font-mono">x² +</span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={b1}
                  onChange={(e) => setB1(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2.5 py-1.5 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold"
                />
                <span className="text-sm font-bold font-mono">x +</span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={c1}
                  onChange={(e) => setC1(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2.5 py-1.5 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold"
                />
              </div>

              {/* Operator */}
              <select
                value={op1}
                onChange={(e) => setOp1(e.target.value as IneqOp)}
                className="px-3 py-1.5 text-sm font-mono font-bold border border-indigo-400 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 outline-none"
              >
                <option value=">=">≥</option>
                <option value=">">&gt;</option>
                <option value="<=">≤</option>
                <option value="<">&lt;</option>
              </select>

              <span className="text-sm font-bold font-mono">0</span>

              <button
                onClick={handleSolve1D}
                className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Giải bất phương trình</span>
              </button>
            </div>
          </div>

          {/* Solution & Transfer to Number Line */}
          {sol1D && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Các bước xét dấu:
              </span>
              <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                {sol1D.steps.map((st, i) => (
                  <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {st}
                  </p>
                ))}
              </div>

              {/* Conclusion and Transfer Action */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Kết luận tập nghiệm
                    </div>
                    <div className="text-base font-bold text-emerald-950 dark:text-emerald-100 font-mono mt-0.5">
                      {sol1D.str}
                    </div>
                  </div>
                </div>

                {/* CRITICAL WORKFLOW BUTTON: Mở tập nghiệm trong Trục số */}
                <button
                  onClick={() => {
                    if (onOpenInNumberLine) {
                      onOpenInNumberLine(sol1D.intervals);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  title="Chuyển trực tiếp tập nghiệm sang phân hệ Trục số & Tập hợp"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Mở tập nghiệm trong Trục số</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & 3: 2D REGION & LINEAR PROGRAMMING */}
      {(activeTab === '2d' || activeTab === 'lp') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: System of 2D inequalities & LP formulation (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Hệ bất phương trình bậc nhất 2 ẩn
                </span>
                <span className="text-[11px] text-slate-400">
                  Liền (≤, ≥) / Đứt (&lt;, &gt;)
                </span>
              </div>

              <div className="space-y-2">
                {ineqList2D.map((inq, idx) => (
                  <div
                    key={inq.id}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-1.5 text-xs font-mono"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: inq.color }} />
                    <input
                      type="number"
                      value={inq.a}
                      onChange={(e) => {
                        const newList = [...ineqList2D];
                        newList[idx].a = parseFloat(e.target.value) || 0;
                        setIneqList2D(newList);
                      }}
                      className="w-10 px-1 py-0.5 border rounded text-center"
                    />
                    <span>x +</span>
                    <input
                      type="number"
                      value={inq.b}
                      onChange={(e) => {
                        const newList = [...ineqList2D];
                        newList[idx].b = parseFloat(e.target.value) || 0;
                        setIneqList2D(newList);
                      }}
                      className="w-10 px-1 py-0.5 border rounded text-center"
                    />
                    <span>y</span>
                    <select
                      value={inq.op}
                      onChange={(e) => {
                        const newList = [...ineqList2D];
                        newList[idx].op = e.target.value as any;
                        setIneqList2D(newList);
                      }}
                      className="px-1 py-0.5 border rounded bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="<=">≤</option>
                      <option value="<">&lt;</option>
                      <option value=">=">≥</option>
                      <option value=">">&gt;</option>
                    </select>
                    <input
                      type="number"
                      value={inq.c}
                      onChange={(e) => {
                        const newList = [...ineqList2D];
                        newList[idx].c = parseFloat(e.target.value) || 0;
                        setIneqList2D(newList);
                      }}
                      className="w-12 px-1 py-0.5 border rounded text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Objective function for Linear Programming */}
            {activeTab === 'lp' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Hàm mục tiêu F(x, y) = ax + by
                </span>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span>F(x, y) =</span>
                  <input
                    type="number"
                    value={objX}
                    onChange={(e) => setObjX(parseFloat(e.target.value) || 0)}
                    className="w-14 px-2 py-1 border rounded text-center font-bold"
                  />
                  <span>x +</span>
                  <input
                    type="number"
                    value={objY}
                    onChange={(e) => setObjY(parseFloat(e.target.value) || 0)}
                    className="w-14 px-2 py-1 border rounded text-center font-bold"
                  />
                  <span>y</span>
                </div>

                {lpExtrema && (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1 font-mono">
                    <div className="font-bold text-indigo-900 dark:text-indigo-200">
                      Giá trị lớn nhất: Max F = {lpExtrema.max.val} tại ({lpExtrema.max.x.toFixed(1)}, {lpExtrema.max.y.toFixed(1)})
                    </div>
                    <div className="font-bold text-indigo-900 dark:text-indigo-200">
                      Giá trị nhỏ nhất: Min F = {lpExtrema.min.val} tại ({lpExtrema.min.x.toFixed(1)}, {lpExtrema.min.y.toFixed(1)})
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Feasible Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Minh họa miền nghiệm Oxy (Tô màu miền chấp nhận)
              </span>
              <span className="text-[11px] text-slate-400">
                Đỉnh đa giác miền nghiệm: {lpVertices.length}
              </span>
            </div>

            <div className="flex-1 min-h-[380px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
              <canvas
                ref={canvas2DRef}
                width={520}
                height={400}
                className="w-full h-full block"
              />
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
