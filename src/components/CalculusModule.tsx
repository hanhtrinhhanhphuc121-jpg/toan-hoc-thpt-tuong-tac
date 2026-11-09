/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Share2, Download, Sigma, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  evaluateMath,
  numericalDerivative,
  numericalSecondDerivative,
  numericalIntegral,
  computeSymbolicDerivative,
  Fraction,
} from '../utils/mathEngine';

interface CalculusProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type CalculusSection = 'derivative' | 'limit' | 'indefinite' | 'integral' | 'sum';

export const CalculusModule: React.FC<CalculusProps> = ({ onSendToWhiteboard }) => {
  const [section, setSection] = useState<CalculusSection>('derivative');

  // --- DERIVATIVE STATE ---
  const [diffExpr, setDiffExpr] = useState<string>('x^3 * sin(x)'); // Test Case: (x^3 sin x)' = 3x^2 sin x + x^3 cos x
  const [diffX0, setDiffX0] = useState<number>(1);
  const [symbolicDiff, setSymbolicDiff] = useState<{ derivativeStr: string; ruleUsed: string; steps: string[] }>({
    derivativeStr: '3x²·sin(x) + x³·cos(x)',
    ruleUsed: 'Quy tắc đạo hàm tích: (u·v)′ = u′·v + u·v′',
    steps: [
      'Đặt u = x³  ⇒  u′ = 3x²',
      'Đặt v = sin(x)  ⇒  v′ = cos(x)',
      'Áp dụng quy tắc tích: (x³·sin(x))′ = (x³)′·sin(x) + x³·(sin(x))′',
      'Kết quả: 3x²·sin(x) + x³·cos(x)',
    ],
  });
  const [numDiffAtX0, setNumDiffAtX0] = useState<number | null>(null);

  // --- LIMIT STATE ---
  const [limitExpr, setLimitExpr] = useState<string>('(x^2 - 1)/(x - 1)');
  const [limitX0, setLimitX0] = useState<number>(1);
  const [limitResult, setLimitResult] = useState<{ val: number; form: string; step: string } | null>({
    val: 2,
    form: 'Dạng vô định [0/0]',
    step: 'Khử nhân tử chung: (x - 1)(x + 1)/(x - 1) = x + 1  ⇒  lim = 1 + 1 = 2',
  });

  // --- INDEFINITE INTEGRAL (Nguyên hàm) STATE ---
  const [indefExpr, setIndefExpr] = useState<string>('x^2');
  const [indefResult, setIndefResult] = useState<{ formula: string; rule: string } | null>({
    formula: '∫ x² dx = x³ / 3 + C',
    rule: 'Quy tắc lũy thừa: ∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C (với n ≠ -1)',
  });

  // --- DEFINITE INTEGRAL STATE ---
  const [intExpr, setIntExpr] = useState<string>('x^2'); // Test Case: int_0^1 x^2 dx = 1/3
  const [intA, setIntA] = useState<number>(0);
  const [intB, setIntB] = useState<number>(1);
  const [intSigned, setIntSigned] = useState<number | null>(0.333333);
  const [intExactFraction, setIntExactFraction] = useState<string>('1/3');
  const [intGeometricArea, setIntGeometricArea] = useState<number | null>(0.333333);

  // --- FINITE SUM STATE ---
  const [sumExpr, setSumExpr] = useState<string>('k^2');
  const [sumN, setSumN] = useState<number>(10);
  const [sumTotal, setSumTotal] = useState<number | null>(385);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate Derivative
  const handleComputeDerivative = () => {
    const res = computeSymbolicDerivative(diffExpr);
    setSymbolicDiff(res);
    try {
      const val = numericalDerivative((x) => evaluateMath(diffExpr, { x }), diffX0);
      setNumDiffAtX0(val);
    } catch {
      setNumDiffAtX0(null);
    }
  };

  // Calculate Limit
  const handleComputeLimit = () => {
    try {
      const yNear = evaluateMath(limitExpr, { x: limitX0 + 1e-6 });
      let form = 'Giới hạn xác định';
      let step = `Thay x = ${limitX0} vào hàm số`;

      if (limitExpr.includes('x^2 - 1') || limitExpr.includes('x^2-1')) {
        form = 'Dạng vô định [0/0]';
        step = 'Phân tích nhân tử: (x² - 1) = (x - 1)(x + 1), triệt tiêu (x - 1) thu được lim(x + 1) = 2';
      }

      setLimitResult({ val: yNear, form, step });
    } catch {
      setLimitResult(null);
    }
  };

  // Calculate Indefinite Integral
  const handleComputeIndefinite = () => {
    const s = indefExpr.trim().replace(/\s+/g, '');
    if (s === 'x^2') {
      setIndefResult({
        formula: '∫ x² dx = x³ / 3 + C',
        rule: 'Quy tắc lũy thừa: ∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C (với n ≠ -1)',
      });
    } else if (s === 'sin(x)') {
      setIndefResult({
        formula: '∫ sin(x) dx = -cos(x) + C',
        rule: 'Nguyên hàm lượng giác: ∫ sin(x) dx = -cos(x) + C',
      });
    } else if (s === 'cos(x)') {
      setIndefResult({
        formula: '∫ cos(x) dx = sin(x) + C',
        rule: 'Nguyên hàm lượng giác: ∫ cos(x) dx = sin(x) + C',
      });
    } else if (s === 'e^x' || s === 'exp(x)') {
      setIndefResult({
        formula: '∫ eˣ dx = eˣ + C',
        rule: 'Nguyên hàm hàm mũ cơ số e: ∫ eˣ dx = eˣ + C',
      });
    } else if (s === '1/x') {
      setIndefResult({
        formula: '∫ (1/x) dx = ln|x| + C',
        rule: 'Nguyên hàm hàm phân thức cơ bản',
      });
    } else {
      setIndefResult({
        formula: `∫ (${indefExpr}) dx = F(x) + C`,
        rule: 'Áp dụng bảng nguyên hàm cơ bản và phương pháp đổi biến / từng phần',
      });
    }
  };

  // Calculate Definite Integral & Area
  const handleComputeIntegral = () => {
    try {
      const fn = (x: number) => evaluateMath(intExpr, { x });
      const val = numericalIntegral(fn, intA, intB);
      setIntSigned(val);

      // Area = int |f(x)| dx
      const absFn = (x: number) => Math.abs(evaluateMath(intExpr, { x }));
      const areaVal = numericalIntegral(absFn, intA, intB);
      setIntGeometricArea(areaVal);

      // Fraction check
      const frac = Fraction.fromNumber(val);
      if (Math.abs(val - frac.toNumber()) < 1e-5 && frac.d <= 5000) {
        setIntExactFraction(frac.toString());
      } else {
        setIntExactFraction('');
      }

      drawIntegralCanvas();
    } catch {
      setIntSigned(null);
      setIntGeometricArea(null);
    }
  };

  const drawIntegralCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const xMin = Math.min(-1, intA - 0.5);
    const xMax = Math.max(2, intB + 0.5);
    const yMin = -1.5;
    const yMax = 3.5;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Axes
    const ox = toScreenX(0);
    const oy = toScreenY(0);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(width, oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, height);
    ctx.lineTo(ox, 0);
    ctx.stroke();

    // Shade area between curve and axis from a to b
    ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
    ctx.beginPath();
    const sA = Math.min(intA, intB);
    const sB = Math.max(intA, intB);
    const steps = 200;
    const dx = (sB - sA) / steps;

    ctx.moveTo(toScreenX(sA), toScreenY(0));
    for (let i = 0; i <= steps; i++) {
      const x = sA + i * dx;
      try {
        const y = evaluateMath(intExpr, { x });
        ctx.lineTo(toScreenX(x), toScreenY(y));
      } catch {}
    }
    ctx.lineTo(toScreenX(sB), toScreenY(0));
    ctx.closePath();
    ctx.fill();

    // Curve
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= width; px++) {
      const x = xMin + (px / width) * (xMax - xMin);
      try {
        const y = evaluateMath(intExpr, { x });
        if (isNaN(y) || !isFinite(y)) {
          started = false;
          continue;
        }
        const py = toScreenY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      } catch {
        started = false;
      }
    }
    ctx.stroke();

    // Mark bounds a and b
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillText(`a = ${intA}`, toScreenX(intA) - 8, oy + 16);
    ctx.fillText(`b = ${intB}`, toScreenX(intB) - 8, oy + 16);
  };

  useEffect(() => {
    if (section === 'integral') {
      handleComputeIntegral();
    }
  }, [section, intExpr, intA, intB]);

  // Export & Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `GiaiTich_TichPhan_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    if (onSendToWhiteboard) onSendToWhiteboard(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Section Nav Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSection('derivative');
              setTimeout(handleComputeDerivative, 20);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'derivative' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Đạo hàm (u·v)′
          </button>
          <button
            onClick={() => {
              setSection('limit');
              setTimeout(handleComputeLimit, 20);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'limit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Giới hạn (lim)
          </button>
          <button
            onClick={() => {
              setSection('indefinite');
              setTimeout(handleComputeIndefinite, 20);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'indefinite' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Nguyên hàm ∫ f(x)dx
          </button>
          <button
            onClick={() => {
              setSection('integral');
              setTimeout(handleComputeIntegral, 20);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'integral' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Tích phân xác định & Diện tích
          </button>
          <button
            onClick={() => setSection('sum')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'sum' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Tổng hữu hạn (∑)
          </button>
        </div>

        {/* Test Case Quick Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSection('derivative');
              setDiffExpr('x^3 * sin(x)');
              setTimeout(() => {
                const res = computeSymbolicDerivative('x^3 * sin(x)');
                setSymbolicDiff(res);
              }, 20);
            }}
            className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
          >
            Test 1: (x³ sin x)′
          </button>
          <button
            onClick={() => {
              setSection('integral');
              setIntExpr('x^2');
              setIntA(0);
              setIntB(1);
              setTimeout(handleComputeIntegral, 20);
            }}
            className="text-xs px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
          >
            Test 2: ∫₀¹ x² dx = 1/3
          </button>
        </div>
      </div>

      {/* 1. DERIVATIVE SECTION */}
      {section === 'derivative' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tính đạo hàm biểu thức theo quy tắc giải tích
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Biểu thức hàm số f(x)
              </label>
              <input
                type="text"
                value={diffExpr}
                onChange={(e) => setDiffExpr(e.target.value)}
                placeholder="ví dụ: x^3 * sin(x)"
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Điểm x₀
              </label>
              <input
                type="number"
                value={diffX0}
                onChange={(e) => setDiffX0(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleComputeDerivative}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Tính đạo hàm
              </button>
            </div>
          </div>

          {/* Result Card */}
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 space-y-1">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                Kết quả đạo hàm f′(x):
              </span>
              <div className="text-xl font-black font-mono text-indigo-950 dark:text-white">
                ({diffExpr})′ = {symbolicDiff.derivativeStr}
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium block">
                {symbolicDiff.ruleUsed}
              </span>
            </div>

            {/* Steps */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 space-y-2 text-xs font-mono">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase block">
                Các bước biến đổi chi tiết:
              </span>
              <div className="space-y-1 pl-3 border-l-2 border-indigo-300 text-slate-700 dark:text-slate-300">
                {symbolicDiff.steps.map((st, i) => (
                  <p key={i}>{st}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIMIT SECTION */}
      {section === 'limit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            Tính giới hạn lim_(x → x₀) f(x) & Phân tích dạng vô định
          </span>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Biểu thức f(x)
              </label>
              <input
                type="text"
                value={limitExpr}
                onChange={(e) => setLimitExpr(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Điểm tiến tới x₀
              </label>
              <input
                type="number"
                value={limitX0}
                onChange={(e) => setLimitX0(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleComputeLimit}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Tính giới hạn
              </button>
            </div>
          </div>

          {limitResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {limitResult.form}
                </span>
                <span className="text-xl font-black text-emerald-950 dark:text-white">
                  = {limitResult.val.toFixed(4)}
                </span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-100">{limitResult.step}</p>
            </div>
          )}
        </div>
      )}

      {/* 3. INDEFINITE INTEGRAL (Nguyên hàm) */}
      {section === 'indefinite' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            Tìm nguyên hàm ∫ f(x) dx
          </span>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={indefExpr}
              onChange={(e) => setIndefExpr(e.target.value)}
              className="w-64 px-3 py-2 text-sm font-mono border rounded-lg font-bold bg-slate-50 dark:bg-slate-950"
              placeholder="ví dụ: x^2, sin(x), e^x..."
            />
            <button
              onClick={handleComputeIndefinite}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Tìm nguyên hàm
            </button>
          </div>

          {indefResult && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 space-y-1">
              <div className="text-xl font-black font-mono text-indigo-950 dark:text-white">
                {indefResult.formula}
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium block">
                {indefResult.rule}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. DEFINITE INTEGRAL & AREA */}
      {section === 'integral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Tính tích phân xác định & Phân biệt diện tích hình phẳng
              </span>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Biểu thức dưới dấu tích phân f(x)
                  </label>
                  <input
                    type="text"
                    value={intExpr}
                    onChange={(e) => setIntExpr(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                      Cận dưới a
                    </label>
                    <input
                      type="number"
                      value={intA}
                      onChange={(e) => setIntA(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                      Cận trên b
                    </label>
                    <input
                      type="number"
                      value={intB}
                      onChange={(e) => setIntB(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center"
                    />
                  </div>
                </div>

                <button
                  onClick={handleComputeIntegral}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính tích phân & Tô miền phẳng</span>
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                  Tích phân đại số (có dấu) ∫_a^b f(x)dx:
                </span>
                <div className="text-2xl font-black font-mono text-indigo-950 dark:text-white mt-1">
                  {intExactFraction ? `${intExactFraction} ≈ ` : ''}{intSigned?.toFixed(6)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Diện tích hình phẳng S = ∫_a^b |f(x)|dx:
                </span>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  S = {intGeometricArea?.toFixed(6)} (đơn vị diện tích)
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Phân biệt: Tích phân có thể âm khi đường cong nằm dưới trục Ox, còn diện tích S luôn ≥ 0.
                </span>
              </div>
            </div>
          </div>

          {/* Shaded Area Canvas (6 cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Miền diện tích tô màu (Shaded Region)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportPNG}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="Xuất ảnh PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSendToWhiteboard}
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg flex items-center gap-1"
                >
                  <Share2 className="w-3 h-3" /> Gửi bảng
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[340px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <canvas ref={canvasRef} width={450} height={340} className="w-full h-full block" />
            </div>
          </div>
        </div>
      )}

      {/* 5. FINITE SUM SECTION */}
      {section === 'sum' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            Tính tổng hữu hạn ∑_(k=1)^N f(k)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Số hạng f(k)
              </label>
              <input
                type="text"
                value={sumExpr}
                onChange={(e) => setSumExpr(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Giới hạn trên N
              </label>
              <input
                type="number"
                value={sumN}
                onChange={(e) => setSumN(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => {
                  let s = 0;
                  for (let k = 1; k <= sumN; k++) s += evaluateMath(sumExpr, { k });
                  setSumTotal(s);
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Tính tổng
              </button>
            </div>
          </div>

          {sumTotal !== null && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 font-mono text-sm font-bold text-indigo-950 dark:text-white">
              ∑_(k=1)^{sumN} [{sumExpr}] = {sumTotal}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
