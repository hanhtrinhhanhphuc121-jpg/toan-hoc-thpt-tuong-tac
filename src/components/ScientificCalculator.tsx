/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Delete,
  History,
  Bookmark,
  Check,
  Sparkles,
} from 'lucide-react';
import { evaluateMath, Fraction } from '../utils/mathEngine';

interface CalculatorProps {
  initialHistory?: { expr: string; result: string; exact?: string }[];
  initialVariables?: Record<string, number>;
  initialAngleUnit?: 'deg' | 'rad';
  onUpdateState?: (data: { history: any[]; variables: any; angleUnit: 'deg' | 'rad' }) => void;
}

export const ScientificCalculator: React.FC<CalculatorProps> = ({
  initialHistory = [],
  initialVariables = { A: 0, B: 0, C: 0, X: 0, Y: 0, M: 0, Ans: 0 },
  initialAngleUnit = 'rad',
  onUpdateState,
}) => {
  const [expression, setExpression] = useState<string>('');
  const [displayResult, setDisplayResult] = useState<string>('');
  const [exactFraction, setExactFraction] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [angleUnit, setAngleUnit] = useState<'deg' | 'rad'>(initialAngleUnit);
  const [history, setHistory] = useState<{ expr: string; result: string; exact?: string }[]>(initialHistory);
  const [variables, setVariables] = useState<Record<string, number>>(initialVariables);
  const [selectedVarToStore, setSelectedVarToStore] = useState<string | null>(null);

  const notifyUpdate = (newHist = history, newVars = variables, newUnit = angleUnit) => {
    if (onUpdateState) {
      onUpdateState({ history: newHist, variables: newVars, angleUnit: newUnit });
    }
  };

  const handleInsert = (str: string) => {
    setExpression((prev) => prev + str);
    setErrorMessage('');
  };

  const handleClear = () => {
    setExpression('');
    setDisplayResult('');
    setExactFraction('');
    setErrorMessage('');
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;
    try {
      setErrorMessage('');
      const val = evaluateMath(expression, variables, angleUnit);

      if (isNaN(val)) {
        setErrorMessage('Không xác định (NaN)');
        return;
      }

      if (!isFinite(val)) {
        setErrorMessage('Vô cùng (Math ERROR: Chia cho 0)');
        return;
      }

      const formattedVal = Number.isInteger(val) ? val.toString() : val.toFixed(6).replace(/\.?0+$/, '');
      setDisplayResult(formattedVal);

      // Try exact fraction reduction
      let exact = '';
      try {
        const frac = Fraction.fromNumber(val);
        if (frac.d !== 1 && frac.d <= 5000 && Math.abs(val - frac.toNumber()) < 1e-6) {
          exact = frac.toString();
          setExactFraction(exact);
        } else {
          setExactFraction('');
        }
      } catch {
        setExactFraction('');
      }

      // Update Ans variable
      const newVars = { ...variables, Ans: val };
      setVariables(newVars);

      // Add to history
      const newHist = [{ expr: expression, result: formattedVal, exact }, ...history.slice(0, 24)];
      setHistory(newHist);
      notifyUpdate(newHist, newVars, angleUnit);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi cú pháp tính toán');
      setDisplayResult('');
      setExactFraction('');
    }
  };

  const handleStoreVar = (varName: string) => {
    const val = parseFloat(displayResult);
    if (isNaN(val)) return;
    const newVars = { ...variables, [varName]: val };
    setVariables(newVars);
    setSelectedVarToStore(null);
    notifyUpdate(history, newVars, angleUnit);
  };

  const handleToggleAngle = () => {
    const nextUnit = angleUnit === 'deg' ? 'rad' : 'deg';
    setAngleUnit(nextUnit);
    notifyUpdate(history, variables, nextUnit);
  };

  // Sample problems
  const SAMPLES = [
    { label: 'Phân số: 1/2 + 1/3', expr: '1/2 + 1/3' },
    { label: 'Căn thức: sqrt(144) + sqrt(25)', expr: 'sqrt(144) + sqrt(25)' },
    { label: 'Lượng giác: sin(pi/6) + cos(pi/3)', expr: 'sin(pi/6) + cos(pi/3)' },
    { label: 'Lũy thừa: 2^10 - 2^8', expr: '2^10 - 2^8' },
    { label: 'Logarit: log(1000) + ln(e^2)', expr: 'log(1000) + ln(e^2)' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT: Main Calculator & Keypad (8 cols) */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Top bar with DEG/RAD and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAngle}
              className={`px-3 py-1 rounded-md text-xs font-bold font-mono transition-colors ${
                angleUnit === 'deg'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {angleUnit.toUpperCase()}
            </button>
            <span className="text-xs text-slate-400">
              {angleUnit === 'deg' ? 'Chế độ Độ (0° - 360°)' : 'Chế độ Radian (rad)'}
            </span>
          </div>

          <button
            onClick={handleClear}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            Xóa màn hình (AC)
          </button>
        </div>

        {/* Calculator Display Screen */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
          {/* Expression Input */}
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Nhập biểu thức (vd: 1/2 + sqrt(3)/2)..."
            className="w-full bg-transparent text-right font-mono text-xl sm:text-2xl text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCalculate();
            }}
          />

          {/* Results display */}
          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <div>
              {errorMessage ? (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errorMessage}
                </span>
              ) : exactFraction ? (
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  Phân số chính xác: {exactFraction}
                </span>
              ) : null}
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {displayResult ? `= ${displayResult}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-5 gap-2 select-none">
          {/* Row 1: Fractions & Functions */}
          <button onClick={() => handleInsert('/')} className="cal-btn-func">a/b</button>
          <button onClick={() => handleInsert('sqrt(')} className="cal-btn-func">√x</button>
          <button onClick={() => handleInsert('cbrt(')} className="cal-btn-func">∛x</button>
          <button onClick={() => handleInsert('^')} className="cal-btn-func">xʸ</button>
          <button onClick={handleBackspace} className="cal-btn-action bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
            <Delete className="w-4 h-4 mx-auto" />
          </button>

          {/* Row 2: Trig Functions */}
          <button onClick={() => handleInsert('sin(')} className="cal-btn-func">sin</button>
          <button onClick={() => handleInsert('cos(')} className="cal-btn-func">cos</button>
          <button onClick={() => handleInsert('tan(')} className="cal-btn-func">tan</button>
          <button onClick={() => handleInsert('cot(')} className="cal-btn-func">cot</button>
          <button onClick={() => handleInsert('abs(')} className="cal-btn-func">|x|</button>

          {/* Row 3: Logarithms & Constants */}
          <button onClick={() => handleInsert('ln(')} className="cal-btn-func">ln</button>
          <button onClick={() => handleInsert('log(')} className="cal-btn-func">log₁₀</button>
          <button onClick={() => handleInsert('pi')} className="cal-btn-func">π</button>
          <button onClick={() => handleInsert('e')} className="cal-btn-func">e</button>
          <button onClick={() => handleInsert('^2')} className="cal-btn-func">x²</button>

          {/* Row 4: Numbers 7, 8, 9 & Parentheses */}
          <button onClick={() => handleInsert('7')} className="cal-btn-num">7</button>
          <button onClick={() => handleInsert('8')} className="cal-btn-num">8</button>
          <button onClick={() => handleInsert('9')} className="cal-btn-num">9</button>
          <button onClick={() => handleInsert('(')} className="cal-btn-op">(</button>
          <button onClick={() => handleInsert(')')} className="cal-btn-op">)</button>

          {/* Row 5: Numbers 4, 5, 6 & Mul, Div */}
          <button onClick={() => handleInsert('4')} className="cal-btn-num">4</button>
          <button onClick={() => handleInsert('5')} className="cal-btn-num">5</button>
          <button onClick={() => handleInsert('6')} className="cal-btn-num">6</button>
          <button onClick={() => handleInsert('*')} className="cal-btn-op">×</button>
          <button onClick={() => handleInsert('/')} className="cal-btn-op">÷</button>

          {/* Row 6: Numbers 1, 2, 3 & Add, Sub */}
          <button onClick={() => handleInsert('1')} className="cal-btn-num">1</button>
          <button onClick={() => handleInsert('2')} className="cal-btn-num">2</button>
          <button onClick={() => handleInsert('3')} className="cal-btn-num">3</button>
          <button onClick={() => handleInsert('+')} className="cal-btn-op">+</button>
          <button onClick={() => handleInsert('-')} className="cal-btn-op">−</button>

          {/* Row 7: 0, decimal, Ans, and Equals */}
          <button onClick={() => handleInsert('0')} className="cal-btn-num col-span-2">0</button>
          <button onClick={() => handleInsert('.')} className="cal-btn-num">.</button>
          <button onClick={() => handleInsert('Ans')} className="cal-btn-op font-bold text-xs">Ans</button>
          <button
            onClick={handleCalculate}
            className="cal-btn-equals bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-sm"
          >
            =
          </button>
        </div>

        {/* Sample presets strip */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Biểu thức mẫu nhanh:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setExpression(s.expr);
                  setErrorMessage('');
                }}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT: Memory Variables & History (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Memory Variables Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              Biến nhớ (STO / RCL)
            </span>
            <span className="text-[11px] text-slate-400">Click để gọi biến</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Object.entries(variables).map(([name, val]) => (
              <div key={name} className="flex flex-col">
                <button
                  onClick={() => handleInsert(name)}
                  className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                  title={`Giá trị hiện tại: ${val}. Bấm để chèn ${name} vào biểu thức`}
                >
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{name}:</span>
                  <span className="text-xs font-mono block truncate text-slate-700 dark:text-slate-300">
                    {val}
                  </span>
                </button>
                {displayResult && (
                  <button
                    onClick={() => handleStoreVar(name)}
                    className="text-[10px] text-slate-400 hover:text-indigo-600 mt-0.5 text-center"
                    title={`Lưu kết quả ${displayResult} vào biến ${name}`}
                  >
                    Gán → {name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Calculation History */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Lịch sử tính toán ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={() => {
                  setHistory([]);
                  notifyUpdate([], variables, angleUnit);
                }}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Xóa lịch sử
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Chưa có phép tính nào trong phiên này.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setExpression(item.expr);
                    setDisplayResult(item.result);
                    setExactFraction(item.exact || '');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                >
                  <div className="text-xs font-mono text-slate-500 truncate">{item.expr}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-indigo-600 font-mono">{item.exact ? `[${item.exact}]` : ''}</span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                      = {item.result}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .cal-btn-func {
          padding: 0.625rem;
          border-radius: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8125rem;
          font-weight: 600;
          background-color: var(--cal-func-bg, #f1f5f9);
          color: #334155;
          transition: background-color 0.15s;
        }
        .cal-btn-func:hover {
          background-color: #e2e8f0;
        }
        .dark .cal-btn-func {
          background-color: #1e293b;
          color: #cbd5e1;
        }
        .dark .cal-btn-func:hover {
          background-color: #334155;
        }

        .cal-btn-num {
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.125rem;
          font-weight: 600;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          transition: background-color 0.15s;
        }
        .cal-btn-num:hover {
          background-color: #f8fafc;
        }
        .dark .cal-btn-num {
          background-color: #0f172a;
          border-color: #1e293b;
          color: #f8fafc;
        }
        .dark .cal-btn-num:hover {
          background-color: #1e293b;
        }

        .cal-btn-op {
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.125rem;
          font-weight: 600;
          background-color: #e0e7ff;
          color: #3730a3;
          transition: background-color 0.15s;
        }
        .cal-btn-op:hover {
          background-color: #c7d2fe;
        }
        .dark .cal-btn-op {
          background-color: #312e81;
          color: #e0e7ff;
        }

        .cal-btn-action {
          padding: 0.625rem;
          border-radius: 0.5rem;
          transition: opacity 0.15s;
        }
      `}</style>
    </div>
  );
};
