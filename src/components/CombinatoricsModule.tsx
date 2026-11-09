/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Share2,
  Download,
  GitBranch,
  Table as TableIcon,
  Calculator,
} from 'lucide-react';
import {
  exactFactorial,
  permutationPn,
  arrangementAnk,
  combinationCnk,
  expandNewtonBinomial,
  computeBayes,
  BinomialExpansionResult,
  BayesResult,
  Fraction,
} from '../utils/mathEngine';

interface CombinatoricsProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const CombinatoricsModule: React.FC<CombinatoricsProps> = ({ onSendToWhiteboard }) => {
  const [activeTab, setActiveTab] = useState<'counting' | 'binomial' | 'bayes'>('counting');

  // --- TAB 1: COUNTING (Hoán vị, Chỉnh hợp, Tổ hợp) ---
  const [nInput, setNInput] = useState<string>('10');
  const [kInput, setKInput] = useState<string>('3');
  const [countingResult, setCountingResult] = useState<{
    n: number;
    k: number;
    factorialN: number;
    pn: number;
    ank: number;
    cnk: number;
  } | null>(null);
  const [countingError, setCountingError] = useState<string | null>(null);

  // --- TAB 2: NEWTON BINOMIAL ---
  const [binA, setBinA] = useState<string>('1');
  const [binB, setBinB] = useState<string>('1');
  const [binN, setBinN] = useState<string>('5');
  const [targetDegree, setTargetDegree] = useState<string>('2'); // Test case: coeff of x^2 in (1+x)^5 is 10
  const [binomialResult, setBinomialResult] = useState<BinomialExpansionResult | null>(null);
  const [binomialError, setBinomialError] = useState<string | null>(null);

  // --- TAB 3: CONDITIONAL PROBABILITY & BAYES ---
  const [bayesPAStr, setBayesPAStr] = useState<string>('0.4'); // or 2/5
  const [bayesPBAStr, setBayesPBAStr] = useState<string>('0.8'); // or 4/5
  const [bayesPBNotAStr, setBayesPBNotAStr] = useState<string>('0.2'); // or 1/5
  const [bayesResult, setBayesResult] = useState<BayesResult | null>(null);
  const [bayesError, setBayesError] = useState<string | null>(null);

  const treeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Parse fraction or decimal helper
  const parseProb = (str: string): number => {
    str = str.trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return num / den;
    }
    return parseFloat(str);
  };

  // 1. CALCULATE COUNTING
  const handleCalculateCounting = (customN?: string, customK?: string) => {
    setCountingError(null);
    const n = parseInt(customN !== undefined ? customN : nInput, 10);
    const k = parseInt(customK !== undefined ? customK : kInput, 10);

    if (isNaN(n) || isNaN(k) || n < 0 || k < 0) {
      setCountingError('Vui lòng nhập n và k là các số nguyên không âm (n, k ≥ 0).');
      setCountingResult(null);
      return;
    }

    if (k > n) {
      setCountingError(`Điều kiện chọn không lặp: k phải nhỏ hơn hoặc bằng n (hiện tại k = ${k} > n = ${n}).`);
      setCountingResult(null);
      return;
    }

    if (n > 60) {
      setCountingError('Để đảm bảo số nguyên chính xác tuyệt đối trong JavaScript, vui lòng nhập n ≤ 60.');
      setCountingResult(null);
      return;
    }

    const facN = exactFactorial(n);
    const pn = permutationPn(n);
    const ank = arrangementAnk(n, k);
    const cnk = combinationCnk(n, k);

    setCountingResult({ n, k, factorialN: facN, pn, ank, cnk });
  };

  const handleResetCounting = () => {
    setNInput('10');
    setKInput('3');
    setCountingError(null);
    handleCalculateCounting('10', '3');
  };

  // 2. CALCULATE BINOMIAL
  const handleCalculateBinomial = (cA?: string, cB?: string, cN?: string, cDeg?: string) => {
    setBinomialError(null);
    const a = parseFloat(cA !== undefined ? cA : binA);
    const b = parseFloat(cB !== undefined ? cB : binB);
    const n = parseInt(cN !== undefined ? cN : binN, 10);
    const targetDeg = cDeg !== undefined && cDeg.trim() !== '' ? parseInt(cDeg, 10) : undefined;

    if (isNaN(a) || isNaN(b) || isNaN(n) || n < 0 || !Number.isInteger(n)) {
      setBinomialError('Hệ số a, b phải là số thực và số mũ n phải là số nguyên không âm.');
      setBinomialResult(null);
      return;
    }

    if (n > 20) {
      setBinomialError('Số mũ n vượt quá giới hạn hiển thị (tối đa n ≤ 20 để bảo đảm bảng khai triển trực quan).');
      setBinomialResult(null);
      return;
    }

    if (targetDeg !== undefined && (isNaN(targetDeg) || targetDeg < 0 || targetDeg > n)) {
      setBinomialError(`Bậc chỉ định phải là số nguyên thỏa mãn 0 ≤ bậc ≤ ${n}.`);
      setBinomialResult(null);
      return;
    }

    const res = expandNewtonBinomial(a, b, n, targetDeg);
    setBinomialResult(res);
  };

  const handleResetBinomial = () => {
    setBinA('1');
    setBinB('1');
    setBinN('5');
    setTargetDegree('2');
    setBinomialError(null);
    handleCalculateBinomial('1', '1', '5', '2');
  };

  // 3. CALCULATE BAYES
  const handleCalculateBayes = (cPA?: string, cPBA?: string, cPBNotA?: string) => {
    setBayesError(null);
    const pA = parseProb(cPA !== undefined ? cPA : bayesPAStr);
    const pBA = parseProb(cPBA !== undefined ? cPBA : bayesPBAStr);
    const pBNotA = parseProb(cPBNotA !== undefined ? cPBNotA : bayesPBNotAStr);

    if (isNaN(pA) || isNaN(pBA) || isNaN(pBNotA)) {
      setBayesError('Vui lòng nhập xác suất hợp lệ dưới dạng số thập phân (ví dụ 0.4) hoặc phân số (ví dụ 2/5).');
      setBayesResult(null);
      return;
    }

    const res = computeBayes(pA, pBA, pBNotA);
    if ('error' in res) {
      setBayesError(res.error);
      setBayesResult(null);
      return;
    }

    setBayesResult(res);
  };

  const handleResetBayes = () => {
    setBayesPAStr('0.4');
    setBayesPBAStr('0.8');
    setBayesPBNotAStr('0.2');
    setBayesError(null);
    handleCalculateBayes('0.4', '0.8', '0.2');
  };

  // Draw Tree Diagram for Bayes
  const drawBayesTree = () => {
    const canvas = treeCanvasRef.current;
    if (!canvas || !bayesResult) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    const rootX = 40;
    const rootY = h / 2;

    const layer1X = 200;
    const topY = 65;
    const botY = h - 65;

    const layer2X = 390;
    const leafY1 = 35;
    const leafY2 = 105;
    const leafY3 = h - 105;
    const leafY4 = h - 35;

    // Helper to draw connecting branch line with text
    const drawBranch = (x1: number, y1: number, x2: number, y2: number, label: string, color = '#4f46e5') => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Label on branch
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 10;
      ctx.fillStyle = '#475569';
      ctx.fillText(label, midX - 25, midY);
    };

    // Helper node
    const drawNode = (x: number, y: number, text: string, bg = '#e0e7ff', textCol = '#312e81') => {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
    };

    // Draw Root
    drawNode(rootX, rootY, 'Ω', '#f1f5f9', '#0f172a');

    // Root to A and A_bar
    drawBranch(rootX, rootY, layer1X, topY, `P(A)=${bayesResult.pA}`, '#6366f1');
    drawBranch(rootX, rootY, layer1X, botY, `P(Ā)=${bayesResult.pNotA.toFixed(2)}`, '#94a3b8');

    drawNode(layer1X, topY, 'A', '#dbeafe', '#1e40af');
    drawNode(layer1X, botY, 'Ā', '#f1f5f9', '#475569');

    // A to B and B_bar
    drawBranch(layer1X, topY, layer2X, leafY1, `P(B|A)=${bayesResult.pBgivenA}`, '#10b981');
    drawBranch(layer1X, topY, layer2X, leafY2, `P(B̄|A)=${(1 - bayesResult.pBgivenA).toFixed(2)}`, '#cbd5e1');

    drawNode(layer2X, leafY1, 'B', '#dcfce7', '#166534');
    drawNode(layer2X, leafY2, 'B̄', '#f1f5f9', '#64748b');

    // A_bar to B and B_bar
    drawBranch(layer1X, botY, layer2X, leafY3, `P(B|Ā)=${bayesResult.pBgivenNotA}`, '#f59e0b');
    drawBranch(layer1X, botY, layer2X, leafY4, `P(B̄|Ā)=${(1 - bayesResult.pBgivenNotA).toFixed(2)}`, '#cbd5e1');

    drawNode(layer2X, leafY3, 'B', '#fef3c7', '#92400e');
    drawNode(layer2X, leafY4, 'B̄', '#f1f5f9', '#64748b');

    // Joint probability texts on right
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`P(A∩B) = ${bayesResult.pBandA.toFixed(4)}`, layer2X + 26, leafY1);
    ctx.fillText(`P(A∩B̄) = ${(bayesResult.pA * (1 - bayesResult.pBgivenA)).toFixed(4)}`, layer2X + 26, leafY2);
    ctx.fillText(`P(Ā∩B) = ${bayesResult.pBandNotA.toFixed(4)}`, layer2X + 26, leafY3);
    ctx.fillText(`P(Ā∩B̄) = ${(bayesResult.pNotA * (1 - bayesResult.pBgivenNotA)).toFixed(4)}`, layer2X + 26, leafY4);
  };

  useEffect(() => {
    handleCalculateCounting('10', '3');
    handleCalculateBinomial('1', '1', '5', '2');
    handleCalculateBayes('0.4', '0.8', '0.2');
  }, []);

  useEffect(() => {
    if (activeTab === 'bayes' && bayesResult) {
      setTimeout(drawBayesTree, 40);
    }
  }, [activeTab, bayesResult]);

  // Export tree to whiteboard
  const handleSendTreeToWhiteboard = () => {
    const canvas = treeCanvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  const handleExportTreePNG = () => {
    const canvas = treeCanvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `SoDoCay_Bayes_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Tab Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('counting')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'counting'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Hoán vị – Chỉnh hợp – Tổ hợp</span>
        </button>
        <button
          onClick={() => setActiveTab('binomial')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'binomial'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Nhị thức Newton (a + bx)ⁿ</span>
        </button>
        <button
          onClick={() => setActiveTab('bayes')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bayes'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Xác suất có điều kiện & Định lý Bayes</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: COUNTING PRINCIPLES */}
      {/* ============================================================== */}
      {activeTab === 'counting' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Đại số tổ hợp: Giai thừa, Hoán vị, Chỉnh hợp và Tổ hợp
              </span>

              {/* Sample loader */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setNInput('10');
                    setKInput('3');
                    handleCalculateCounting('10', '3');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test: C₁₀³ = 120
                </button>
                <button
                  onClick={() => {
                    setNInput('7');
                    setKInput('4');
                    handleCalculateCounting('7', '4');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  A₇⁴ & C₇⁴
                </button>
              </div>
            </div>

            {countingError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{countingError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Tổng số phần tử n
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={nInput}
                  onChange={(e) => setNInput(e.target.value)}
                  className="w-28 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Số phần tử chọn k
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={kInput}
                  onChange={(e) => setKInput(e.target.value)}
                  className="w-28 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div className="flex items-end gap-2 pt-5">
                <button
                  onClick={() => handleCalculateCounting()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính các giá trị</span>
                </button>
                <button
                  onClick={handleResetCounting}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          </div>

          {countingResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Tổ hợp C_n^k */}
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    Tổ hợp C_{countingResult.n}^{countingResult.k}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 font-bold">
                    Không xét thứ tự
                  </span>
                </div>

                <div className="text-3xl font-black font-mono text-indigo-950 dark:text-white">
                  C_{countingResult.n}^{countingResult.k} = {countingResult.cnk.toLocaleString('vi-VN')}
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60">
                  <p className="text-slate-500 font-sans font-semibold">Công thức → Thay số:</p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                    C_n^k = n! / [k! · (n - k)!]
                  </p>
                  <p>
                    = {countingResult.n}! / [{countingResult.k}! · ({countingResult.n} - {countingResult.k})!]
                  </p>
                  <p>
                    = {countingResult.n}! / [{countingResult.k}! · {countingResult.n - countingResult.k}!] = {countingResult.cnk}
                  </p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Khi nào dùng:</span> Dùng khi lấy ra {countingResult.k} phần tử từ {countingResult.n} phần tử mà <strong>thứ tự sắp đặt không quan trọng</strong> (ví dụ: chọn 3 học sinh đi thi, chọn 3 đỉnh tạo tam giác).
                </div>
              </div>

              {/* Card 2: Chỉnh hợp A_n^k */}
              <div className="bg-white dark:bg-slate-900 border-2 border-sky-200 dark:border-sky-900 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                    Chỉnh hợp A_{countingResult.n}^{countingResult.k}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 font-bold">
                    Có xét thứ tự
                  </span>
                </div>

                <div className="text-3xl font-black font-mono text-sky-950 dark:text-white">
                  A_{countingResult.n}^{countingResult.k} = {countingResult.ank.toLocaleString('vi-VN')}
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60">
                  <p className="text-slate-500 font-sans font-semibold">Công thức → Thay số:</p>
                  <p className="text-sky-600 dark:text-sky-400 font-bold">
                    A_n^k = n! / (n - k)!
                  </p>
                  <p>
                    = {countingResult.n}! / ({countingResult.n} - {countingResult.k})!
                  </p>
                  <p>
                    = {countingResult.n}! / {countingResult.n - countingResult.k}! = {countingResult.ank}
                  </p>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 rounded-xl text-xs text-sky-900 dark:text-sky-200">
                  <span className="font-bold">Khi nào dùng:</span> Dùng khi lấy ra {countingResult.k} phần tử từ {countingResult.n} phần tử và <strong>có sắp thứ tự vào các vị trí</strong> (ví dụ: bầu Lớp trưởng, Bí thư, Thủ quỹ; lập số có 3 chữ số khác nhau).
                </div>
              </div>

              {/* Comparison & Permutation Box */}
              <div className="md:col-span-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                    Mối liên hệ giữa Chỉnh hợp và Tổ hợp: A_n^k = k! · C_n^k
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    {countingResult.k}! = {exactFactorial(countingResult.k)}
                  </span>
                </div>
                <p className="text-emerald-950 dark:text-emerald-100">
                  Một tổ hợp gồm {countingResult.k} phần tử khi đem hoán vị vị trí sẽ tạo ra {countingResult.k}! chỉnh hợp khác nhau:
                  <span className="font-mono font-bold ml-1">
                    {countingResult.ank} = {exactFactorial(countingResult.k)} × {countingResult.cnk}
                  </span>.
                </p>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NEWTON BINOMIAL */}
      {/* ============================================================== */}
      {activeTab === 'binomial' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Khai triển Nhị thức Newton: (a + bx)ⁿ
              </span>

              {/* Sample */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setBinA('1');
                    setBinB('1');
                    setBinN('5');
                    setTargetDegree('2');
                    handleCalculateBinomial('1', '1', '5', '2');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test: Hệ số x² trong (1+x)⁵ là 10
                </button>
                <button
                  onClick={() => {
                    setBinA('2');
                    setBinB('-1');
                    setBinN('4');
                    setTargetDegree('3');
                    handleCalculateBinomial('2', '-1', '4', '3');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  (2 - x)⁴ tìm x³
                </button>
              </div>
            </div>

            {binomialError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{binomialError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Hệ số a
                </label>
                <input
                  type="number"
                  step="any"
                  value={binA}
                  onChange={(e) => setBinA(e.target.value)}
                  className="w-20 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Hệ số b (của x)
                </label>
                <input
                  type="number"
                  step="any"
                  value={binB}
                  onChange={(e) => setBinB(e.target.value)}
                  className="w-20 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Số mũ n (n ≤ 20)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={binN}
                  onChange={(e) => setBinN(e.target.value)}
                  className="w-24 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Tìm hệ số xᵐ (bậc m)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={targetDegree}
                  onChange={(e) => setTargetDegree(e.target.value)}
                  placeholder="Ví dụ 2"
                  className="w-28 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>

              <div className="flex items-end gap-2 pt-5">
                <button
                  onClick={() => handleCalculateBinomial()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Khai triển & Tìm hệ số</span>
                </button>
                <button
                  onClick={handleResetBinomial}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          </div>

          {binomialResult && (
            <div className="space-y-4">
              
              {/* Highlight Target Term */}
              {binomialResult.targetTerm && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                      Hệ số của số hạng chứa x^{binomialResult.targetTerm.targetPower}:
                    </span>
                    <div className="text-3xl font-black font-mono text-indigo-950 dark:text-white mt-1">
                      Hệ số = {binomialResult.targetTerm.coeff}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Số hạng đầy đủ:</span>
                    <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {binomialResult.targetTerm.termStr}
                    </span>
                  </div>
                </div>
              )}

              {/* General Term Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 font-mono text-xs space-y-1">
                <span className="text-slate-500 font-bold font-sans uppercase tracking-wider block">
                  Số hạng tổng quát thứ k+1:
                </span>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {binomialResult.generalTermStr}
                </p>
                <p className="text-slate-400">
                  (với k ∈ [0, {binomialResult.n}], gồm {binomialResult.n + 1} số hạng)
                </p>
              </div>

              {/* Full Expansion */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block font-sans">
                  Khai triển đầy đủ ({binA} + {binB}x)^{binN}:
                </span>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 text-sm font-bold text-slate-900 dark:text-white overflow-x-auto">
                  {binomialResult.expansionStr}
                </div>

                {/* Table of all terms */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2 px-3">k</th>
                        <th className="py-2 px-3">Công thức số hạng T_(k+1)</th>
                        <th className="py-2 px-3">Bậc của x</th>
                        <th className="py-2 px-3 text-right">Hệ số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {binomialResult.terms.map((t) => (
                        <tr
                          key={t.k}
                          className={`${
                            binomialResult.targetTerm?.targetPower === t.power
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 font-bold text-indigo-900 dark:text-indigo-200'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-3 font-bold">{t.k}</td>
                          <td className="py-2 px-3 font-mono">
                            C_{binomialResult.n}^{t.k} · ({binA})^{binomialResult.n - t.k} · ({binB}x)^{t.k}
                          </td>
                          <td className="py-2 px-3">x^{t.power}</td>
                          <td className="py-2 px-3 text-right font-bold font-mono">{t.coeff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CONDITIONAL PROBABILITY & BAYES */}
      {/* ============================================================== */}
      {activeTab === 'bayes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Xác suất có điều kiện P(A|B) & Định lý Bayes
              </span>

              {/* Sample */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setBayesPAStr('0.4');
                    setBayesPBAStr('0.8');
                    setBayesPBNotAStr('0.2');
                    handleCalculateBayes('0.4', '0.8', '0.2');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test: P(A)=0.4, P(B|A)=0.8, P(B|Ā)=0.2 ⇒ P(A|B)=8/11
                </button>
                <button
                  onClick={() => {
                    setBayesPAStr('1/100');
                    setBayesPBAStr('95/100');
                    setBayesPBNotAStr('2/100');
                    handleCalculateBayes('1/100', '95/100', '2/100');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Y học: Xét nghiệm dương tính
                </button>
              </div>
            </div>

            {bayesError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bayesError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Xác suất tiên nghiệm P(A)
                </label>
                <input
                  type="text"
                  value={bayesPAStr}
                  onChange={(e) => setBayesPAStr(e.target.value)}
                  placeholder="0.4 hoặc 2/5"
                  className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  P(B | A)
                </label>
                <input
                  type="text"
                  value={bayesPBAStr}
                  onChange={(e) => setBayesPBAStr(e.target.value)}
                  placeholder="0.8 hoặc 4/5"
                  className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  P(B | Ā)
                </label>
                <input
                  type="text"
                  value={bayesPBNotAStr}
                  onChange={(e) => setBayesPBNotAStr(e.target.value)}
                  placeholder="0.2 hoặc 1/5"
                  className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleCalculateBayes()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tính xác suất Bayes</span>
              </button>
              <button
                onClick={handleResetBayes}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          {bayesResult && (
            <div className="space-y-6">
              
              {/* Highlight Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* P(A|B) */}
                <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-1">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                    Xác suất hậu nghiệm Bayes P(A | B):
                  </span>
                  <div className="text-3xl font-black font-mono text-indigo-950 dark:text-white">
                    {bayesResult.pAgivenBExact}
                  </div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 font-mono block">
                    ≈ {(bayesResult.pAgivenB * 100).toFixed(4)}%
                  </span>
                </div>

                {/* P(B) Total Probability */}
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Xác suất toàn phần P(B):
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-950 dark:text-white">
                    {bayesResult.pBExact}
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono block">
                    = P(A∩B) + P(Ā∩B) = {(bayesResult.pB * 100).toFixed(4)}%
                  </span>
                </div>

              </div>

              {/* Tree Diagram & 2x2 Contingency Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Tree Diagram Canvas (7 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                      Sơ đồ cây xác suất (Probability Tree Diagram)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleExportTreePNG}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                        title="Xuất ảnh PNG"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleSendTreeToWhiteboard}
                        className="px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" /> Gửi bảng
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 overflow-hidden">
                    <canvas ref={treeCanvasRef} width={520} height={230} className="w-full h-full block" />
                  </div>
                </div>

                {/* Right: 2x2 Contingency Table (5 cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-sky-600" />
                    Bảng phân phối xác suất 2 × 2
                  </span>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <th className="p-2 border border-slate-200 dark:border-slate-700"></th>
                          <th className="p-2 border border-slate-200 dark:border-slate-700">B</th>
                          <th className="p-2 border border-slate-200 dark:border-slate-700">B̄</th>
                          <th className="p-2 border border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 font-bold">Tổng</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-900">A</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-indigo-600">{bayesResult.pBandA.toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700">{(bayesResult.pA - bayesResult.pBandA).toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold bg-indigo-50/50">{bayesResult.pA.toFixed(4)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-900">Ā</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-sky-600">{bayesResult.pBandNotA.toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700">{(bayesResult.pNotA - bayesResult.pBandNotA).toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold bg-indigo-50/50">{bayesResult.pNotA.toFixed(4)}</td>
                        </tr>
                        <tr className="font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                          <td className="p-2 border border-slate-200 dark:border-slate-700">Tổng</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700">{bayesResult.pB.toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700">{(1 - bayesResult.pB).toFixed(4)}</td>
                          <td className="p-2 border border-slate-200 dark:border-slate-700">1.0000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Bảng 2×2 cho thấy trực quan xác suất đồng thời và điều kiện biên.
                  </p>
                </div>

              </div>

              {/* Step by step calculations */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 font-mono text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block font-sans">
                  Các bước giải chi tiết theo SGK Toán THPT:
                </span>
                <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300">
                  {bayesResult.steps.map((st, i) => (
                    <p key={i}>{st}</p>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
