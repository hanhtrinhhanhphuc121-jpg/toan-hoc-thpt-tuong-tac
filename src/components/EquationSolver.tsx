/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Sparkles, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  solvePolynomial,
  solveLinearSystem,
  evaluateMath,
  Fraction,
  PolyRootStep,
  LinearSystemResult,
} from '../utils/mathEngine';

type SolverType = 'polynomial' | 'system' | 'rootSearch';

export const EquationSolver: React.FC = () => {
  const [solverType, setSolverType] = useState<SolverType>('polynomial');

  // --- POLYNOMIAL STATE ---
  const [polyDegree, setPolyDegree] = useState<number>(2);
  const [polyCoeffs, setPolyCoeffs] = useState<number[]>([1, -3, 2]); // default x^2 - 3x + 2 = 0
  const [polyResult, setPolyResult] = useState<PolyRootStep | null>(null);

  // --- LINEAR SYSTEM STATE ---
  const [systemSize, setSystemSize] = useState<number>(2);
  const [matrixA, setMatrixA] = useState<number[][]>([
    [2, 1],
    [1, -1],
  ]);
  const [vectorB, setVectorB] = useState<number[]>([4, -1]);
  const [systemResult, setSystemResult] = useState<LinearSystemResult | null>(null);

  // --- ROOT SEARCH (f(x) = 0 on [a, b]) STATE ---
  const [rootExpr, setRootExpr] = useState<string>('cos(x) - x');
  const [intervalA, setIntervalA] = useState<number>(0);
  const [intervalB, setIntervalB] = useState<number>(1);
  const [bisectionSteps, setBisectionSteps] = useState<{ iter: number; a: number; b: number; mid: number; fMid: number }[]>([]);
  const [rootFound, setRootFound] = useState<{ root: number; display: string } | null>(null);
  const [rootError, setRootError] = useState<string>('');

  // Handle Polynomial Solve
  const handleSolvePoly = (coeffsToSolve = polyCoeffs) => {
    const res = solvePolynomial(coeffsToSolve);
    setPolyResult(res);
  };

  const handleChangePolyDegree = (deg: number) => {
    setPolyDegree(deg);
    let newCoeffs: number[] = [];
    if (deg === 1) newCoeffs = [2, -4]; // 2x - 4 = 0
    else if (deg === 2) newCoeffs = [1, -3, 2]; // x^2 - 3x + 2 = 0
    else if (deg === 3) newCoeffs = [1, -6, 11, -6]; // x^3 - 6x^2 + 11x - 6 = 0 -> 1, 2, 3
    else if (deg === 4) newCoeffs = [1, 0, -5, 0, 4]; // x^4 - 5x^2 + 4 = 0 -> +-1, +-2
    setPolyCoeffs(newCoeffs);
    handleSolvePoly(newCoeffs);
  };

  // Handle Linear System Solve
  const handleSolveSystem = (mA = matrixA, vB = vectorB) => {
    const res = solveLinearSystem(mA, vB);
    setSystemResult(res);
  };

  const handleChangeSystemSize = (n: number) => {
    setSystemSize(n);
    if (n === 2) {
      setMatrixA([[2, 1], [1, -1]]);
      setVectorB([4, -1]);
      handleSolveSystem([[2, 1], [1, -1]], [4, -1]);
    } else if (n === 3) {
      setMatrixA([
        [1, 2, -1],
        [2, -1, 1],
        [1, 1, 1],
      ]);
      setVectorB([2, 5, 6]);
      handleSolveSystem([
        [1, 2, -1],
        [2, -1, 1],
        [1, 1, 1],
      ], [2, 5, 6]);
    } else if (n === 4) {
      setMatrixA([
        [1, 1, 1, 1],
        [1, 2, 3, 4],
        [2, -1, 1, 1],
        [1, 0, -1, 2],
      ]);
      setVectorB([10, 30, 8, 5]);
      handleSolveSystem([
        [1, 1, 1, 1],
        [1, 2, 3, 4],
        [2, -1, 1, 1],
        [1, 0, -1, 2],
      ], [10, 30, 8, 5]);
    }
  };

  // Handle Root Search
  const handleSolveRootSearch = () => {
    setRootError('');
    setBisectionSteps([]);
    setRootFound(null);

    try {
      const fA = evaluateMath(rootExpr, { x: intervalA });
      const fB = evaluateMath(rootExpr, { x: intervalB });

      if (fA * fB > 0) {
        setRootError(`f(a)·f(b) = (${fA.toFixed(3)})·(${fB.toFixed(3)}) > 0: Không đảm bảo có nghiệm đổi dấu trên khoảng [${intervalA}, ${intervalB}]. Hãy chọn khoảng khác.`);
        return;
      }

      let a = intervalA;
      let b = intervalB;
      const steps = [];

      for (let iter = 1; iter <= 25; iter++) {
        const mid = (a + b) / 2;
        const fMid = evaluateMath(rootExpr, { x: mid });
        steps.push({ iter, a, b, mid, fMid });

        if (Math.abs(fMid) < 1e-7 || Math.abs(b - a) < 1e-7) {
          break;
        }

        const fa = evaluateMath(rootExpr, { x: a });
        if (fa * fMid < 0) {
          b = mid;
        } else {
          a = mid;
        }
      }

      setBisectionSteps(steps);
      const finalMid = steps[steps.length - 1].mid;
      const frac = Fraction.fromNumber(finalMid);
      const disp = Math.abs(finalMid - frac.toNumber()) < 1e-5 ? `${frac.toString()} ≈ ${finalMid.toFixed(6)}` : finalMid.toFixed(6);
      setRootFound({ root: finalMid, display: disp });
    } catch (err: unknown) {
      setRootError(err instanceof Error ? err.message : 'Lỗi đánh giá hàm số');
    }
  };

  // Preset loaders
  const loadPolyPreset = (deg: number, coeffs: number[]) => {
    setPolyDegree(deg);
    setPolyCoeffs(coeffs);
    handleSolvePoly(coeffs);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Mode Selector Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSolverType('polynomial');
              if (!polyResult) handleSolvePoly();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              solverType === 'polynomial'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Đa thức bậc 1–4
          </button>
          <button
            onClick={() => {
              setSolverType('system');
              if (!systemResult) handleSolveSystem();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              solverType === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Hệ phương trình 2–4 ẩn
          </button>
          <button
            onClick={() => setSolverType('rootSearch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              solverType === 'rootSearch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Nghiệm f(x) = 0 trên [a, b]
          </button>
        </div>
      </div>

      {/* MODE 1: POLYNOMIAL EQUATIONS */}
      {solverType === 'polynomial' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Chọn bậc đa thức:
                </span>
                {[1, 2, 3, 4].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleChangePolyDegree(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      polyDegree === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Bậc {d}
                  </button>
                ))}
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Bài mẫu:</span>
                <button
                  onClick={() => loadPolyPreset(2, [1, -3, 2])}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  x² - 3x + 2 = 0
                </button>
                <button
                  onClick={() => loadPolyPreset(3, [1, -6, 11, -6])}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  x³ - 6x² + 11x - 6 = 0
                </button>
                <button
                  onClick={() => loadPolyPreset(4, [1, 0, -5, 0, 4])}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Trùng phương x⁴ - 5x² + 4 = 0
                </button>
              </div>
            </div>

            {/* Coefficients input row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {polyCoeffs.map((c, i) => {
                const pwr = polyDegree - i;
                const pwrStr = pwr === 0 ? '' : pwr === 1 ? 'x' : `x${pwr === 2 ? '²' : pwr === 3 ? '³' : '⁴'}`;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="any"
                      value={c}
                      onChange={(e) => {
                        const newCoeffs = [...polyCoeffs];
                        newCoeffs[i] = parseFloat(e.target.value) || 0;
                        setPolyCoeffs(newCoeffs);
                      }}
                      className="w-20 px-2.5 py-1.5 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-center outline-none focus:border-indigo-600 font-bold"
                    />
                    <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                      {pwrStr}
                    </span>
                    {i < polyCoeffs.length - 1 && (
                      <span className="text-slate-400 font-bold text-sm">+</span>
                    )}
                  </div>
                );
              })}
              <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">= 0</span>
              
              <button
                onClick={() => handleSolvePoly()}
                className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Giải phương trình</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          {polyResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Phương trình: <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">{polyResult.equation}</span>
                </span>
              </div>

              {/* Step by step */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Các bước biến đổi:
                </span>
                <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                  {polyResult.steps.map((st, idx) => (
                    <p key={idx} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {st}
                    </p>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Kết luận nghiệm
                  </div>
                  <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100 font-mono mt-0.5">
                    {polyResult.conclusion}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: LINEAR SYSTEMS */}
      {solverType === 'system' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Số lượng ẩn số:
                </span>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleChangeSystemSize(n)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      systemSize === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Hệ {n} ẩn
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleSolveSystem()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Giải hệ</span>
              </button>
            </div>

            {/* Matrix Input Grid */}
            <div className="space-y-2 pt-2">
              {matrixA.map((row, r) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6">pt {r+1}:</span>
                  {row.map((val, c) => {
                    const varName = ['x', 'y', 'z', 't'][c];
                    return (
                      <div key={c} className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => {
                            const newA = matrixA.map((rw) => [...rw]);
                            newA[r][c] = parseFloat(e.target.value) || 0;
                            setMatrixA(newA);
                          }}
                          className="w-16 px-2 py-1 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-center font-bold"
                        />
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mr-2">
                          {varName}
                        </span>
                        {c < row.length - 1 && <span className="text-slate-400 mr-1">+</span>}
                      </div>
                    );
                  })}
                  <span className="text-slate-600 dark:text-slate-300 font-bold mx-1">=</span>
                  <input
                    type="number"
                    step="any"
                    value={vectorB[r]}
                    onChange={(e) => {
                      const newB = [...vectorB];
                      newB[r] = parseFloat(e.target.value) || 0;
                      setVectorB(newB);
                    }}
                    className="w-20 px-2 py-1 text-sm font-mono border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-center font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* System Results Box */}
          {systemResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Khử Gauss từng bước:
              </span>
              <div className="space-y-1 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                {systemResult.steps.map((st, idx) => (
                  <p key={idx} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {st}
                  </p>
                ))}
              </div>

              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                systemResult.status === 'unique'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-950 dark:text-amber-100'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Kết luận nghiệm của hệ
                  </div>
                  <div className="text-sm font-bold font-mono mt-0.5">
                    {systemResult.conclusion}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: ROOT SEARCH ON [A, B] */}
      {solverType === 'rootSearch' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Tìm nghiệm số phương trình phi tuyến f(x) = 0 (Phương pháp chia đôi & Newton)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Biểu thức f(x)
                </label>
                <input
                  type="text"
                  value={rootExpr}
                  onChange={(e) => setRootExpr(e.target.value)}
                  placeholder="ví dụ: cos(x) - x"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Cận đầu a
                </label>
                <input
                  type="number"
                  step="any"
                  value={intervalA}
                  onChange={(e) => setIntervalA(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Cận cuối b
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="any"
                    value={intervalB}
                    onChange={(e) => setIntervalB(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    onClick={handleSolveRootSearch}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Tìm</span>
                  </button>
                </div>
              </div>
            </div>

            {rootError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rootError}</span>
              </div>
            )}
          </div>

          {/* Root Search Iterations Table */}
          {bisectionSteps.length > 0 && rootFound && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Nghiệm xấp xỉ tìm được:
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100">
                    x* = {rootFound.display}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Sau {bisectionSteps.length} bước lặp (sai số &lt; 10⁻⁷)
                </span>
              </div>

              <div className="overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-center">Bước k</th>
                      <th className="py-2 px-3 font-mono">Khoảng [a, b]</th>
                      <th className="py-2 px-3 font-mono">Điểm giữa c = (a+b)/2</th>
                      <th className="py-2 px-3 font-mono">f(c)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {bisectionSteps.map((st) => (
                      <tr key={st.iter} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-3 text-center font-bold">{st.iter}</td>
                        <td className="py-1.5 px-3">[{st.a.toFixed(6)}, {st.b.toFixed(6)}]</td>
                        <td className="py-1.5 px-3 font-bold text-indigo-600">{st.mid.toFixed(6)}</td>
                        <td className="py-1.5 px-3 text-slate-500">{st.fMid.toExponential(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
