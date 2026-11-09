/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Share2,
  Download,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  normalPDF,
  normalCDF,
  normalQuantile,
  binomialPMF,
  binomialCDF,
  binomialQuantile,
  poissonPMF,
  poissonCDF,
  poissonQuantile,
} from '../utils/mathEngine';

interface DistributionsProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type DistType = 'normal' | 'binomial' | 'poisson';
type ProbQueryType = 'le' | 'ge' | 'interval' | 'eq' | 'quantile';

export const DistributionsModule: React.FC<DistributionsProps> = ({ onSendToWhiteboard }) => {
  const [distType, setDistType] = useState<DistType>('normal');
  const [queryType, setQueryType] = useState<ProbQueryType>('le');

  // Parameters
  // 1. Normal: mu, sigma
  const [normalMu, setNormalMu] = useState<number>(0);
  const [normalSigma, setNormalSigma] = useState<number>(1);

  // 2. Binomial: n, p
  const [binN, setBinN] = useState<number>(10);
  const [binP, setBinP] = useState<number>(0.5);

  // 3. Poisson: lambda
  const [poisLambda, setPoisLambda] = useState<number>(2);

  // Query bounds
  const [boundX, setBoundX] = useState<number>(1.96); // Test Case 1: P(Z <= 1.96) = 0.9750
  const [boundA, setBoundA] = useState<number>(-1);
  const [boundB, setBoundB] = useState<number>(1);
  const [kExact, setKExact] = useState<number>(5); // Test Case 2: B(10, 0.5) at k=5 is 0.24609375
  const [alphaQuantile, setAlphaQuantile] = useState<number>(0.975);

  // Inclusive / Exclusive endpoint toggles for discrete distributions
  const [includeLeft, setIncludeLeft] = useState<boolean>(true);
  const [includeRight, setIncludeRight] = useState<boolean>(true);

  // Results & Errors
  const [calcResult, setCalcResult] = useState<{
    label: string;
    value: number;
    exactStr?: string;
    explanation: string;
  } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate Probability or Quantile
  const handleCalculate = () => {
    setErrorBanner(null);

    try {
      if (distType === 'normal') {
        if (normalSigma <= 0) {
          setErrorBanner('Độ lệch chuẩn σ phải là số dương lớn hơn 0 (σ > 0).');
          setCalcResult(null);
          return;
        }

        if (queryType === 'le') {
          const prob = normalCDF(boundX, normalMu, normalSigma);
          setCalcResult({
            label: `P(X ≤ ${boundX})`,
            value: prob,
            explanation: `Xác suất tích lũy từ -∞ đến ${boundX} theo phân phối chuẩn N(${normalMu}, ${normalSigma}²).`,
          });
        } else if (queryType === 'ge') {
          const prob = 1 - normalCDF(boundX, normalMu, normalSigma);
          setCalcResult({
            label: `P(X ≥ ${boundX})`,
            value: prob,
            explanation: `Xác suất phần đuôi trên từ ${boundX} đến +∞: 1 - P(X < ${boundX}).`,
          });
        } else if (queryType === 'interval') {
          const lower = Math.min(boundA, boundB);
          const upper = Math.max(boundA, boundB);
          const prob = normalCDF(upper, normalMu, normalSigma) - normalCDF(lower, normalMu, normalSigma);
          setCalcResult({
            label: `P(${lower} ≤ X ≤ ${upper})`,
            value: prob,
            explanation: `Xác suất trên khoảng [${lower}, ${upper}]: Φ((${upper} - ${normalMu})/${normalSigma}) - Φ((${lower} - ${normalMu})/${normalSigma}).`,
          });
        } else if (queryType === 'quantile') {
          if (alphaQuantile <= 0 || alphaQuantile >= 1) {
            setErrorBanner('Mức xác suất tích lũy α của phân vị phải nằm trong khoảng (0, 1).');
            return;
          }
          const xVal = normalQuantile(alphaQuantile, normalMu, normalSigma);
          setCalcResult({
            label: `Phân vị x_(${alphaQuantile})`,
            value: xVal,
            explanation: `Giá trị x sao cho P(X ≤ x) = ${alphaQuantile}.`,
          });
        }
      } else if (distType === 'binomial') {
        if (binN <= 0 || !Number.isInteger(binN)) {
          setErrorBanner('Số phép thử n phải là số nguyên dương lớn hơn 0.');
          return;
        }
        if (binP < 0 || binP > 1) {
          setErrorBanner('Xác suất thành công p phải thuộc đoạn [0, 1].');
          return;
        }

        if (queryType === 'eq') {
          const prob = binomialPMF(kExact, binN, binP);
          setCalcResult({
            label: `P(X = ${kExact})`,
            value: prob,
            explanation: `Xác suất nhận đúng ${kExact} lần thành công trong ${binN} phép thử Bernoulli: C_${binN}^${kExact} · ${binP}^${kExact} · (1 - ${binP})^(${binN - kExact}).`,
          });
        } else if (queryType === 'le') {
          const kTarget = includeRight ? Math.floor(boundX) : Math.ceil(boundX) - 1;
          const prob = binomialCDF(kTarget, binN, binP);
          setCalcResult({
            label: includeRight ? `P(X ≤ ${boundX})` : `P(X < ${boundX})`,
            value: prob,
            explanation: `Tổng xác suất rời rạc từ k = 0 đến k = ${kTarget}.`,
          });
        } else if (queryType === 'ge') {
          const kTarget = includeLeft ? Math.ceil(boundX) : Math.floor(boundX) + 1;
          const prob = 1 - binomialCDF(kTarget - 1, binN, binP);
          setCalcResult({
            label: includeLeft ? `P(X ≥ ${boundX})` : `P(X > ${boundX})`,
            value: prob,
            explanation: `Tổng xác suất rời rạc từ k = ${kTarget} đến ${binN}.`,
          });
        } else if (queryType === 'interval') {
          const lowK = includeLeft ? Math.ceil(boundA) : Math.floor(boundA) + 1;
          const highK = includeRight ? Math.floor(boundB) : Math.ceil(boundB) - 1;
          let prob = 0;
          for (let k = Math.max(0, lowK); k <= Math.min(binN, highK); k++) {
            prob += binomialPMF(k, binN, binP);
          }
          setCalcResult({
            label: `P(${lowK} ≤ X ≤ ${highK})`,
            value: prob,
            explanation: `Tổng xác suất các điểm nguyên trong khoảng từ ${lowK} đến ${highK}.`,
          });
        } else if (queryType === 'quantile') {
          const kQ = binomialQuantile(alphaQuantile, binN, binP);
          setCalcResult({
            label: `Phân vị k_(${alphaQuantile})`,
            value: kQ,
            explanation: `Giá trị nguyên nhỏ nhất k sao cho xác suất tích lũy P(X ≤ k) ≥ ${alphaQuantile}.`,
          });
        }
      } else if (distType === 'poisson') {
        if (poisLambda <= 0) {
          setErrorBanner('Tham số λ phải là số dương lớn hơn 0 (λ > 0).');
          return;
        }

        if (queryType === 'eq') {
          const prob = poissonPMF(kExact, poisLambda);
          setCalcResult({
            label: `P(X = ${kExact})`,
            value: prob,
            explanation: `Xác suất Poisson tại k = ${kExact}: (λ^k · e^(-λ)) / k! = (${poisLambda}^${kExact} · e^(-${poisLambda})) / ${kExact}!.`,
          });
        } else if (queryType === 'le') {
          const kTarget = includeRight ? Math.floor(boundX) : Math.ceil(boundX) - 1;
          const prob = poissonCDF(kTarget, poisLambda);
          setCalcResult({
            label: includeRight ? `P(X ≤ ${boundX})` : `P(X < ${boundX})`,
            value: prob,
            explanation: `Tổng xác suất rời rạc Poisson từ 0 đến ${kTarget}.`,
          });
        } else if (queryType === 'ge') {
          const kTarget = includeLeft ? Math.ceil(boundX) : Math.floor(boundX) + 1;
          const prob = 1 - poissonCDF(kTarget - 1, poisLambda);
          setCalcResult({
            label: includeLeft ? `P(X ≥ ${boundX})` : `P(X > ${boundX})`,
            value: prob,
            explanation: `Tổng xác suất rời rạc Poisson từ ${kTarget} đến +∞.`,
          });
        } else if (queryType === 'interval') {
          const lowK = includeLeft ? Math.ceil(boundA) : Math.floor(boundA) + 1;
          const highK = includeRight ? Math.floor(boundB) : Math.ceil(boundB) - 1;
          let prob = 0;
          for (let k = Math.max(0, lowK); k <= Math.max(0, highK); k++) {
            prob += poissonPMF(k, poisLambda);
          }
          setCalcResult({
            label: `P(${lowK} ≤ X ≤ ${highK})`,
            value: prob,
            explanation: `Tổng xác suất rời rạc Poisson từ ${lowK} đến ${highK}.`,
          });
        } else if (queryType === 'quantile') {
          const kQ = poissonQuantile(alphaQuantile, poisLambda);
          setCalcResult({
            label: `Phân vị k_(${alphaQuantile})`,
            value: kQ,
            explanation: `Giá trị nguyên nhỏ nhất k sao cho xác suất tích lũy Poisson P(X ≤ k) ≥ ${alphaQuantile}.`,
          });
        }
      }
    } catch {
      setErrorBanner('Lỗi khi tính toán phân phối.');
    }
  };

  // Draw Distribution Chart
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const marginX = 50;
    const marginY = 40;
    const plotW = w - 2 * marginX;
    const plotH = h - 2 * marginY;

    if (distType === 'normal') {
      // Draw Continuous Normal Bell Curve
      const xMin = normalMu - 4 * normalSigma;
      const xMax = normalMu + 4 * normalSigma;
      const rangeX = xMax - xMin;
      const maxDensity = normalPDF(normalMu, normalMu, normalSigma) * 1.15;

      const toX = (val: number) => marginX + ((val - xMin) / rangeX) * plotW;
      const toY = (d: number) => h - marginY - (d / maxDensity) * plotH;

      // Axis
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, h - marginY);
      ctx.lineTo(w - marginX, h - marginY);
      ctx.stroke();

      // Determine Shaded Domain
      let shadeStart = xMin;
      let shadeEnd = xMin;
      if (queryType === 'le') {
        shadeStart = xMin;
        shadeEnd = boundX;
      } else if (queryType === 'ge') {
        shadeStart = boundX;
        shadeEnd = xMax;
      } else if (queryType === 'interval') {
        shadeStart = Math.min(boundA, boundB);
        shadeEnd = Math.max(boundA, boundB);
      } else if (queryType === 'quantile' && calcResult) {
        shadeStart = xMin;
        shadeEnd = calcResult.value;
      }

      // Draw Shaded Region under the curve
      ctx.fillStyle = 'rgba(79, 70, 229, 0.35)';
      ctx.beginPath();
      ctx.moveTo(toX(shadeStart), h - marginY);
      const steps = 150;
      for (let i = 0; i <= steps; i++) {
        const curX = shadeStart + (i / steps) * (shadeEnd - shadeStart);
        const curY = normalPDF(curX, normalMu, normalSigma);
        ctx.lineTo(toX(curX), toY(curY));
      }
      ctx.lineTo(toX(shadeEnd), h - marginY);
      ctx.closePath();
      ctx.fill();

      // Draw Bell Curve Line
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let px = 0; px <= plotW; px++) {
        const curX = xMin + (px / plotW) * rangeX;
        const curY = normalPDF(curX, normalMu, normalSigma);
        const py = toY(curY);
        if (px === 0) ctx.moveTo(toX(curX), py);
        else ctx.lineTo(toX(curX), py);
      }
      ctx.stroke();

      // Key tick marks: mu, mu +- sigma, mu +- 2sigma
      const keyPoints = [
        { val: normalMu, label: 'μ' },
        { val: normalMu - normalSigma, label: 'μ-σ' },
        { val: normalMu + normalSigma, label: 'μ+σ' },
        { val: normalMu - 2 * normalSigma, label: 'μ-2σ' },
        { val: normalMu + 2 * normalSigma, label: 'μ+2σ' },
      ];

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      for (const kp of keyPoints) {
        const px = toX(kp.val);
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(px, h - marginY);
        ctx.lineTo(px, toY(normalPDF(kp.val, normalMu, normalSigma)));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(kp.label, px, h - marginY + 14);
        ctx.fillText(`${kp.val.toFixed(1)}`, px, h - marginY + 26);
      }
    } else {
      // Discrete Bar Chart for Binomial or Poisson
      const isBin = distType === 'binomial';
      const maxK = isBin ? Math.min(30, binN) : Math.min(30, Math.ceil(poisLambda + 4 * Math.sqrt(poisLambda)));
      const pmfFn = (k: number) => (isBin ? binomialPMF(k, binN, binP) : poissonPMF(k, poisLambda));

      let maxP = 0;
      for (let k = 0; k <= maxK; k++) {
        const p = pmfFn(k);
        if (p > maxP) maxP = p;
      }
      maxP = maxP * 1.15 || 0.1;

      const slotW = plotW / (maxK + 1);
      const barW = Math.max(2, slotW * 0.7);

      // Axis
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, h - marginY);
      ctx.lineTo(w - marginX, h - marginY);
      ctx.stroke();

      // Helper to check if k is in active event
      const isInEvent = (k: number): boolean => {
        if (queryType === 'eq') return k === kExact;
        if (queryType === 'le') return includeRight ? k <= boundX : k < boundX;
        if (queryType === 'ge') return includeLeft ? k >= boundX : k > boundX;
        if (queryType === 'interval') {
          const l = includeLeft ? k >= boundA : k > boundA;
          const r = includeRight ? k <= boundB : k < boundB;
          return l && r;
        }
        if (queryType === 'quantile' && calcResult) return k <= calcResult.value;
        return false;
      };

      // Draw bars
      for (let k = 0; k <= maxK; k++) {
        const p = pmfFn(k);
        const barH = (p / maxP) * plotH;
        const x = marginX + k * slotW + (slotW - barW) / 2;
        const y = h - marginY - barH;

        const active = isInEvent(k);

        ctx.fillStyle = active ? '#4f46e5' : '#cbd5e1';
        ctx.fillRect(x, y, barW, barH);
        ctx.strokeStyle = active ? '#312e81' : '#94a3b8';
        ctx.strokeRect(x, y, barW, barH);

        // Labels
        if (maxK <= 20 || k % 2 === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '9px "JetBrains Mono"';
          ctx.textAlign = 'center';
          ctx.fillText(`${k}`, x + barW / 2, h - marginY + 14);
        }
      }
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [
    distType,
    queryType,
    normalMu,
    normalSigma,
    binN,
    binP,
    poisLambda,
    boundX,
    boundA,
    boundB,
    kExact,
    alphaQuantile,
    includeLeft,
    includeRight,
  ]);

  useEffect(() => {
    setTimeout(drawChart, 40);
  }, [
    distType,
    queryType,
    normalMu,
    normalSigma,
    binN,
    binP,
    poisLambda,
    boundX,
    boundA,
    boundB,
    kExact,
    alphaQuantile,
    includeLeft,
    includeRight,
    calcResult,
  ]);

  // Sample Loaders
  const handleLoadSample = (sample: 'testNorm' | 'testBin' | 'testPois') => {
    if (sample === 'testNorm') {
      // Test Case 5: Z ~ N(0, 1), P(Z <= 1.96) = 0.9750
      setDistType('normal');
      setNormalMu(0);
      setNormalSigma(1);
      setQueryType('le');
      setBoundX(1.96);
    } else if (sample === 'testBin') {
      // Test Case 6: X ~ B(10, 0.5), P(X = 5) = 0.24609375
      setDistType('binomial');
      setBinN(10);
      setBinP(0.5);
      setQueryType('eq');
      setKExact(5);
    } else if (sample === 'testPois') {
      // Test Case 7: X ~ Pois(2), P(X = 0) = e^(-2) = 0.1353353
      setDistType('poisson');
      setPoisLambda(2);
      setQueryType('eq');
      setKExact(0);
    }
  };

  const handleReset = () => {
    handleLoadSample('testNorm');
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `PhanPhoi_${distType}_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Distribution Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => {
            setDistType('normal');
            if (queryType === 'eq') setQueryType('le');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            distType === 'normal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Chuẩn N(μ, σ²) (Gauss)
        </button>
        <button
          onClick={() => setDistType('binomial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            distType === 'binomial'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Nhị thức B(n, p)
        </button>
        <button
          onClick={() => setDistType('poisson')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            distType === 'poisson'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Poisson Pois(λ)
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Parameters, Query & Results (5-6 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card: Parameters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {distType === 'normal'
                  ? 'Tham số Phân phối Chuẩn'
                  : distType === 'binomial'
                  ? 'Tham số Phân phối Nhị thức'
                  : 'Tham số Phân phối Poisson'}
              </span>

              {/* Sample Shortcuts */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                {distType === 'normal' && (
                  <button
                    onClick={() => handleLoadSample('testNorm')}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test 5: P(Z ≤ 1.96) ≈ 0.9750
                  </button>
                )}
                {distType === 'binomial' && (
                  <button
                    onClick={() => handleLoadSample('testBin')}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test 6: B(10, 0.5) k=5
                  </button>
                )}
                {distType === 'poisson' && (
                  <button
                    onClick={() => handleLoadSample('testPois')}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test 7: Pois(2) k=0
                  </button>
                )}
              </div>
            </div>

            {errorBanner && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Inputs based on Dist */}
            {distType === 'normal' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Kỳ vọng μ (Trung bình)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={normalMu}
                    onChange={(e) => setNormalMu(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Độ lệch chuẩn σ (&gt; 0)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={normalSigma}
                    onChange={(e) => setNormalSigma(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
              </div>
            )}

            {distType === 'binomial' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Số phép thử n
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={binN}
                    onChange={(e) => setBinN(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Xác suất thành công p
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={binP}
                    onChange={(e) => setBinP(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
              </div>
            )}

            {distType === 'poisson' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Cường độ trung bình λ (&gt; 0)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={poisLambda}
                  onChange={(e) => setPoisLambda(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                />
              </div>
            )}

            {/* Query Type selection buttons */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block">
                Chọn dạng biến cố cần tính:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {distType !== 'normal' && (
                  <button
                    onClick={() => setQueryType('eq')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      queryType === 'eq' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border'
                    }`}
                  >
                    P(X = k)
                  </button>
                )}
                <button
                  onClick={() => setQueryType('le')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    queryType === 'le' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border'
                  }`}
                >
                  P(X ≤ x)
                </button>
                <button
                  onClick={() => setQueryType('ge')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    queryType === 'ge' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border'
                  }`}
                >
                  P(X ≥ x)
                </button>
                <button
                  onClick={() => setQueryType('interval')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    queryType === 'interval' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border'
                  }`}
                >
                  P(a ≤ X ≤ b)
                </button>
                <button
                  onClick={() => setQueryType('quantile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    queryType === 'quantile' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border'
                  }`}
                >
                  Phân vị α
                </button>
              </div>
            </div>

            {/* Query Bounds Inputs */}
            <div className="pt-2">
              {queryType === 'eq' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Giá trị chính xác k
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={kExact}
                    onChange={(e) => setKExact(parseInt(e.target.value, 10) || 0)}
                    className="w-32 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
              )}

              {(queryType === 'le' || queryType === 'ge') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                        Mốc x
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={boundX}
                        onChange={(e) => setBoundX(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                      />
                    </div>

                    {distType !== 'normal' && (
                      <div className="pt-5 flex items-center gap-2 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={queryType === 'le' ? includeRight : includeLeft}
                            onChange={(e) => {
                              if (queryType === 'le') setIncludeRight(e.target.checked);
                              else setIncludeLeft(e.target.checked);
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span>Lấy dấu bằng (≤ / ≥)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {queryType === 'interval' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                      Cận dưới a
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={boundA}
                      onChange={(e) => setBoundA(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                      Cận trên b
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={boundB}
                      onChange={(e) => setBoundB(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                    />
                  </div>
                </div>
              )}

              {queryType === 'quantile' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Mức xác suất tích lũy α (0 &lt; α &lt; 1)
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    max="0.999"
                    step="0.025"
                    value={alphaQuantile}
                    onChange={(e) => setAlphaQuantile(parseFloat(e.target.value) || 0.5)}
                    className="w-36 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950 text-center"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCalculate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tính xác suất</span>
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          {/* Results card */}
          {calcResult && (
            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-2 font-mono">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Kết quả: {calcResult.label}
              </span>
              <div className="text-3xl font-black text-indigo-950 dark:text-white">
                = {calcResult.value.toFixed(6).replace(/\.?0+$/, '')}
              </div>
              <span className="text-xs text-indigo-700 dark:text-indigo-400 block font-sans">
                {calcResult.explanation}
              </span>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive Visual Canvas (6-7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {distType === 'normal'
                ? 'Đường mật độ phân phối chuẩn (Đường cong Gauss & miền tô)'
                : 'Biểu đồ xác suất rời rạc (Các cột được tô màu)'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportPNG}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                title="Xuất ảnh PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSendToWhiteboard}
                className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> Gửi bảng
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[380px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 overflow-hidden">
            <canvas ref={canvasRef} width={520} height={380} className="w-full h-full block" />
          </div>
        </div>

      </div>

    </div>
  );
};
