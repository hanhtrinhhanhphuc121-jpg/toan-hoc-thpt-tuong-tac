/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  Layers,
  ScatterChart,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Share2,
  Download,
  ClipboardPaste,
} from 'lucide-react';
import {
  calculateRawStatistics,
  calculateGroupedStatistics,
  calculatePearsonCorrelation,
  RawStatsResult,
  GroupedStatsResult,
  PearsonCorrelationResult,
} from '../utils/mathEngine';

interface StatisticsProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type StatMode = 'raw' | 'freq' | 'grouped' | 'bivariate';

export const StatisticsModule: React.FC<StatisticsProps> = ({ onSendToWhiteboard }) => {
  const [mode, setMode] = useState<StatMode>('raw');

  // --- MODE 1: RAW DATA STATE ---
  const [rawText, setRawText] = useState<string>('3, 5, 7, 8, 9, 11, 12, 12'); // Test case
  const [varianceType, setVarianceType] = useState<'n' | 'n-1'>('n');
  const [rawResult, setRawResult] = useState<RawStatsResult | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  // --- MODE 2: VALUE & FREQUENCY STATE ---
  const [freqRows, setFreqRows] = useState<{ x: string; freq: string }[]>([
    { x: '5', freq: '2' },
    { x: '6', freq: '5' },
    { x: '7', freq: '8' },
    { x: '8', freq: '10' },
    { x: '9', freq: '3' },
  ]);
  const [freqResult, setFreqResult] = useState<RawStatsResult | null>(null);
  const [freqError, setFreqError] = useState<string | null>(null);

  // --- MODE 3: GROUPED DATA STATE ---
  const [groupedRows, setGroupedRows] = useState<{ min: string; max: string; count: string }[]>([
    { min: '40', max: '50', count: '5' },
    { min: '50', max: '60', count: '12' },
    { min: '60', max: '70', count: '18' },
    { min: '70', max: '80', count: '10' },
    { min: '80', max: '90', count: '5' },
  ]);
  const [groupedResult, setGroupedResult] = useState<GroupedStatsResult | null>(null);
  const [groupedError, setGroupedError] = useState<string | null>(null);

  // --- MODE 4: BIVARIATE DATA STATE ---
  const [bivariateText, setBivariateText] = useState<string>(
    '1, 2\n2, 3.5\n3, 5\n4, 6.5\n5, 8.5\n6, 9.8\n7, 11.2'
  );
  const [bivariateResult, setBivariateResult] = useState<PearsonCorrelationResult | null>(null);
  const [bivariateError, setBivariateError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. COMPUTE RAW DATA
  const handleComputeRaw = (customText?: string) => {
    setRawError(null);
    const text = customText !== undefined ? customText : rawText;
    const tokens = text.split(/[\s,;\t\n]+/).filter(Boolean);
    if (tokens.length === 0) {
      setRawError('Vui lòng nhập danh sách số liệu.');
      setRawResult(null);
      return;
    }

    const numbers: number[] = [];
    for (const t of tokens) {
      const num = parseFloat(t);
      if (isNaN(num)) {
        setRawError(`Dữ liệu không hợp lệ: "${t}" không phải là số.`);
        setRawResult(null);
        return;
      }
      numbers.push(num);
    }

    if (numbers.length < 2) {
      setRawError('Cần tối thiểu 2 số liệu để tính toán đặc trưng thống kê.');
      setRawResult(null);
      return;
    }

    const res = calculateRawStatistics(numbers);
    setRawResult(res);
  };

  const handleResetRaw = () => {
    setRawText('3, 5, 7, 8, 9, 11, 12, 12');
    setRawError(null);
    handleComputeRaw('3, 5, 7, 8, 9, 11, 12, 12');
  };

  // 2. COMPUTE FREQUENCY TABLE
  const handleComputeFreq = () => {
    setFreqError(null);
    const dataList: number[] = [];
    for (let i = 0; i < freqRows.length; i++) {
      const r = freqRows[i];
      if (!r.x.trim() || !r.freq.trim()) continue;
      const xVal = parseFloat(r.x);
      const fVal = parseInt(r.freq, 10);
      if (isNaN(xVal)) {
        setFreqError(`Dòng ${i + 1}: Giá trị x "${r.x}" không hợp lệ.`);
        return;
      }
      if (isNaN(fVal) || fVal <= 0) {
        setFreqError(`Dòng ${i + 1}: Tần số "${r.freq}" phải là số nguyên dương > 0.`);
        return;
      }
      for (let k = 0; k < fVal; k++) {
        dataList.push(xVal);
      }
    }

    if (dataList.length < 2) {
      setFreqError('Cần tối thiểu 2 phần tử để tính thống kê.');
      return;
    }

    const res = calculateRawStatistics(dataList);
    setFreqResult(res);
  };

  // 3. COMPUTE GROUPED DATA
  const handleComputeGrouped = () => {
    setGroupedError(null);
    const parsed: { min: number; max: number; count: number }[] = [];

    for (let i = 0; i < groupedRows.length; i++) {
      const r = groupedRows[i];
      if (!r.min.trim() || !r.max.trim() || !r.count.trim()) continue;
      const minVal = parseFloat(r.min);
      const maxVal = parseFloat(r.max);
      const countVal = parseFloat(r.count);

      if (isNaN(minVal) || isNaN(maxVal) || isNaN(countVal)) {
        setGroupedError(`Dòng ${i + 1}: Chứa ô trống hoặc ký tự không hợp lệ.`);
        return;
      }

      if (maxVal <= minVal) {
        setGroupedError(`Dòng ${i + 1}: Cận trên (${maxVal}) phải lớn hơn cận dưới (${minVal}).`);
        return;
      }

      if (countVal < 0) {
        setGroupedError(`Dòng ${i + 1}: Tần số (${countVal}) không được âm.`);
        return;
      }

      parsed.push({ min: minVal, max: maxVal, count: countVal });
    }

    // Check for overlap
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].max > parsed[i + 1].min) {
        setGroupedError(
          `Cảnh báo lớp chồng lấn: Lớp [${parsed[i].min}; ${parsed[i].max}) đè lên lớp [${parsed[i + 1].min}; ${parsed[i + 1].max}).`
        );
        return;
      }
    }

    const res = calculateGroupedStatistics(parsed);
    if ('error' in res) {
      setGroupedError(res.error);
      return;
    }
    setGroupedResult(res);
  };

  // 4. COMPUTE BIVARIATE
  const handleComputeBivariate = () => {
    setBivariateError(null);
    const lines = bivariateText.trim().split(/\r?\n/).filter(Boolean);
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[\s,;\t]+/).filter(Boolean);
      if (parts.length < 2) continue;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (isNaN(x) || isNaN(y)) {
        setBivariateError(`Dòng ${i + 1}: "${lines[i]}" không phải là cặp (x, y) hợp lệ.`);
        return;
      }
      points.push({ x, y });
    }

    if (points.length < 2) {
      setBivariateError('Cần tối thiểu 2 điểm dữ liệu (x, y) để tính tương quan.');
      return;
    }

    const res = calculatePearsonCorrelation(points);
    if ('error' in res) {
      setBivariateError(res.error);
      return;
    }
    setBivariateResult(res);
  };

  // Draw Charts depending on Mode
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (mode === 'raw' && rawResult) {
      // Draw Box Plot & Dot Plot
      drawBoxAndDotPlot(ctx, w, h, rawResult);
    } else if (mode === 'freq' && freqResult) {
      // Draw Bar Chart & Frequency Line
      drawBarChart(ctx, w, h);
    } else if (mode === 'grouped' && groupedResult) {
      // Draw Grouped Histogram with Frequency Density
      drawGroupedHistogram(ctx, w, h, groupedResult);
    } else if (mode === 'bivariate' && bivariateResult) {
      // Draw Scatter Plot & Regression Line
      drawScatterPlot(ctx, w, h, bivariateResult);
    }
  };

  const drawBoxAndDotPlot = (ctx: CanvasRenderingContext2D, w: number, h: number, res: RawStatsResult) => {
    const margin = 50;
    const plotW = w - 2 * margin;
    const xMin = res.min;
    const xMax = res.max;
    const range = xMax === xMin ? 1 : xMax - xMin;

    const toScreenX = (val: number) => margin + ((val - xMin) / range) * plotW;

    // Number line axis
    const axisY = h - 60;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin - 10, axisY);
    ctx.lineTo(w - margin + 10, axisY);
    ctx.stroke();

    // Ticks & labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    const ticks = 6;
    for (let i = 0; i <= ticks; i++) {
      const v = xMin + (i / ticks) * range;
      const px = toScreenX(v);
      ctx.beginPath();
      ctx.moveTo(px, axisY - 4);
      ctx.lineTo(px, axisY + 4);
      ctx.stroke();
      ctx.fillText(v.toFixed(1), px, axisY + 16);
    }

    // 1. BOX PLOT (in middle: y = 80)
    const boxY = 70;
    const boxH = 40;

    const q1X = toScreenX(res.q1);
    const q2X = toScreenX(res.q2);
    const q3X = toScreenX(res.q3);
    const minX = toScreenX(res.min);
    const maxX = toScreenX(res.max);

    // Whiskers
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Left whisker
    ctx.moveTo(minX, boxY);
    ctx.lineTo(q1X, boxY);
    ctx.moveTo(minX, boxY - 10);
    ctx.lineTo(minX, boxY + 10);
    // Right whisker
    ctx.moveTo(q3X, boxY);
    ctx.lineTo(maxX, boxY);
    ctx.moveTo(maxX, boxY - 10);
    ctx.lineTo(maxX, boxY + 10);
    ctx.stroke();

    // Box body (Q1 to Q3)
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fillRect(q1X, boxY - boxH / 2, q3X - q1X, boxH);
    ctx.strokeStyle = '#4f46e5';
    ctx.strokeRect(q1X, boxY - boxH / 2, q3X - q1X, boxH);

    // Median line (Q2)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(q2X, boxY - boxH / 2);
    ctx.lineTo(q2X, boxY + boxH / 2);
    ctx.stroke();

    // Labels for box plot
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`Me=Q₂=${res.q2}`, q2X, boxY - boxH / 2 - 8);
    ctx.fillStyle = '#4f46e5';
    ctx.fillText(`Q₁=${res.q1}`, q1X, boxY + boxH / 2 + 14);
    ctx.fillText(`Q₃=${res.q3}`, q3X, boxY + boxH / 2 + 14);

    // 2. DOT PLOT (below box plot, y = 160)
    const dotY = axisY - 15;
    const freqCount = new Map<number, number>();
    for (const v of res.sortedData) {
      const cur = freqCount.get(v) || 0;
      freqCount.set(v, cur + 1);
      const px = toScreenX(v);
      const py = dotY - cur * 10;
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawBarChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const validRows = freqRows.filter((r) => r.x.trim() && r.freq.trim() && !isNaN(parseFloat(r.x)));
    if (validRows.length === 0) return;

    const margin = 50;
    const plotW = w - 2 * margin;
    const plotH = h - 2 * margin;

    const maxFreq = Math.max(...validRows.map((r) => parseInt(r.freq, 10) || 1));
    const barW = (plotW / validRows.length) * 0.6;
    const slotW = plotW / validRows.length;

    // Axis
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(margin, margin);
    ctx.stroke();

    const points: { x: number; y: number }[] = [];

    // Bars
    validRows.forEach((r, i) => {
      const f = parseInt(r.freq, 10) || 0;
      const barH = (f / maxFreq) * plotH;
      const x = margin + i * slotW + (slotW - barW) / 2;
      const y = h - margin - barH;

      ctx.fillStyle = 'rgba(79, 70, 229, 0.7)';
      ctx.fillRect(x, y, barW, barH);
      ctx.strokeStyle = '#4338ca';
      ctx.strokeRect(x, y, barW, barH);

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(r.x, x + barW / 2, h - margin + 16);

      // Value top
      ctx.fillStyle = '#4f46e5';
      ctx.fillText(`${f}`, x + barW / 2, y - 5);

      points.push({ x: x + barW / 2, y });
    });

    // Frequency Polygon (Đường gấp khúc tần số)
    if (points.length > 1) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      for (const p of points) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const drawGroupedHistogram = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    res: GroupedStatsResult
  ) => {
    const margin = 50;
    const plotW = w - 2 * margin;
    const plotH = h - 2 * margin;

    const minX = res.classes[0].min;
    const maxX = res.classes[res.classes.length - 1].max;
    const rangeX = maxX - minX || 1;

    // Use density so column area reflects frequency!
    const maxDensity = Math.max(...res.classes.map((c) => c.density));

    const toScreenX = (x: number) => margin + ((x - minX) / rangeX) * plotW;
    const toScreenY = (d: number) => h - margin - (d / (maxDensity || 1)) * plotH;

    // Axis
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(margin, margin);
    ctx.stroke();

    // Bars
    res.classes.forEach((c) => {
      const x1 = toScreenX(c.min);
      const x2 = toScreenX(c.max);
      const y = toScreenY(c.density);
      const barW = x2 - x1;
      const barH = h - margin - y;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
      ctx.fillRect(x1, y, barW, barH);
      ctx.strokeStyle = '#0284c7';
      ctx.strokeRect(x1, y, barW, barH);

      // Label bounds on axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(`${c.min}`, x1, h - margin + 14);

      // Frequency in middle of bar
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`m=${c.frequency}`, x1 + barW / 2, y + barH / 2);
    });

    const last = res.classes[res.classes.length - 1];
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${last.max}`, toScreenX(last.max), h - margin + 14);
  };

  const drawScatterPlot = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    res: PearsonCorrelationResult
  ) => {
    const lines = bivariateText.trim().split(/\r?\n/).filter(Boolean);
    const pts = lines.map((l) => {
      const p = l.split(/[\s,;\t]+/).filter(Boolean);
      return { x: parseFloat(p[0]) || 0, y: parseFloat(p[1]) || 0 };
    });

    const margin = 50;
    const plotW = w - 2 * margin;
    const plotH = h - 2 * margin;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const rangeX = xMax === xMin ? 1 : xMax - xMin;
    const rangeY = yMax === yMin ? 1 : yMax - yMin;

    const toScreenX = (x: number) => margin + ((x - xMin) / rangeX) * plotW;
    const toScreenY = (y: number) => h - margin - ((y - yMin) / rangeY) * plotH;

    // Axis
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.moveTo(margin, h - margin);
    ctx.lineTo(margin, margin);
    ctx.stroke();

    // Regression Line
    const x1 = xMin;
    const y1 = res.slope * x1 + res.intercept;
    const x2 = xMax;
    const y2 = res.slope * x2 + res.intercept;

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toScreenX(x1), toScreenY(y1));
    ctx.lineTo(toScreenX(x2), toScreenY(y2));
    ctx.stroke();

    // Data points
    for (const p of pts) {
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(toScreenX(p.x), toScreenY(p.y), 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#312e81';
      ctx.stroke();
    }
  };

  useEffect(() => {
    handleComputeRaw('3, 5, 7, 8, 9, 11, 12, 12');
    handleComputeFreq();
    handleComputeGrouped();
    handleComputeBivariate();
  }, []);

  useEffect(() => {
    setTimeout(drawChart, 40);
  }, [mode, rawResult, freqResult, groupedResult, bivariateResult, varianceType]);

  // Export & send to whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `ThongKe_${mode}_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveMode('raw')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'raw'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Dữ liệu thô (Raw Data)</span>
        </button>
        <button
          onClick={() => setActiveMode('freq')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'freq'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Giá trị & Tần số</span>
        </button>
        <button
          onClick={() => setActiveMode('grouped')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'grouped'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dữ liệu ghép nhóm [a; b)</span>
        </button>
        <button
          onClick={() => setActiveMode('bivariate')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'bivariate'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ScatterChart className="w-3.5 h-3.5" />
          <span>Dữ liệu hai biến & Tương quan</span>
        </button>
      </div>

      {/* Main Grid: Inputs on Left (5-6 cols), Visual Chart on Right (6-7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Data inputs & Actions */}
        <div className="lg:col-span-6 space-y-4 flex flex-col">
          
          {/* MODE 1: RAW DATA */}
          {mode === 'raw' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Mẫu số liệu thô
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                  <button
                    onClick={() => {
                      setRawText('3, 5, 7, 8, 9, 11, 12, 12');
                      handleComputeRaw('3, 5, 7, 8, 9, 11, 12, 12');
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test: 3, 5, 7, 8, 9, 11, 12, 12
                  </button>
                </div>
              </div>

              {rawError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rawError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Nhập danh sách số liệu (ngăn cách bằng dấu phẩy, khoảng trắng hoặc dán từ Excel)
                </label>
                <textarea
                  rows={3}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Variance formula toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Quy ước mẫu số phương sai:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVarianceType('n')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      varianceType === 'n' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border'
                    }`}
                  >
                    Chia cho n (SGK chuẩn)
                  </button>
                  <button
                    onClick={() => setVarianceType('n-1')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      varianceType === 'n-1' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border'
                    }`}
                  >
                    Chia cho n - 1 (Hiệu chỉnh)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleComputeRaw()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính các số đặc trưng</span>
                </button>
                <button
                  onClick={handleResetRaw}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: VALUE & FREQUENCY */}
          {mode === 'freq' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Bảng tần số & tần suất
              </span>

              {freqError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{freqError}</span>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                {freqRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-slate-400 font-bold text-right">{i + 1}.</span>
                    <input
                      type="number"
                      placeholder="x"
                      value={r.x}
                      onChange={(e) => {
                        const next = [...freqRows];
                        next[i].x = e.target.value;
                        setFreqRows(next);
                      }}
                      className="w-24 px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-center"
                    />
                    <span className="text-slate-400">tần số</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="n"
                      value={r.freq}
                      onChange={(e) => {
                        const next = [...freqRows];
                        next[i].freq = e.target.value;
                        setFreqRows(next);
                      }}
                      className="w-24 px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-center font-bold"
                    />
                    <button
                      onClick={() => setFreqRows(freqRows.filter((_, idx) => idx !== i))}
                      className="text-rose-500 hover:text-rose-700 text-xs px-2"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFreqRows([...freqRows, { x: '', freq: '1' }])}
                  className="px-3 py-1.5 border border-dashed rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                >
                  + Thêm dòng
                </button>
                <button
                  onClick={handleComputeFreq}
                  className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính toán</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: GROUPED DATA */}
          {mode === 'grouped' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Mẫu số liệu ghép nhóm [a; b)
              </span>

              {groupedError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{groupedError}</span>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                {groupedRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-400">[</span>
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => {
                        const next = [...groupedRows];
                        next[i].min = e.target.value;
                        setGroupedRows(next);
                      }}
                      className="w-16 px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-center"
                    />
                    <span>;</span>
                    <input
                      type="number"
                      value={r.max}
                      onChange={(e) => {
                        const next = [...groupedRows];
                        next[i].max = e.target.value;
                        setGroupedRows(next);
                      }}
                      className="w-16 px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-center"
                    />
                    <span className="text-slate-400">) :</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="tần số"
                      value={r.count}
                      onChange={(e) => {
                        const next = [...groupedRows];
                        next[i].count = e.target.value;
                        setGroupedRows(next);
                      }}
                      className="w-20 px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-center font-bold"
                    />
                    <button
                      onClick={() => setGroupedRows(groupedRows.filter((_, idx) => idx !== i))}
                      className="text-rose-500 hover:text-rose-700 text-xs px-2"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGroupedRows([...groupedRows, { min: '', max: '', count: '1' }])}
                  className="px-3 py-1.5 border border-dashed rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                >
                  + Thêm nhóm
                </button>
                <button
                  onClick={handleComputeGrouped}
                  className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính số ước lượng</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 4: BIVARIATE */}
          {mode === 'bivariate' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Dữ liệu hai biến (x, y) & Hệ số tương quan Pearson
              </span>

              {bivariateError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bivariateError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Nhập từng cặp (x, y) trên mỗi dòng:
                </label>
                <textarea
                  rows={5}
                  value={bivariateText}
                  onChange={(e) => setBivariateText(e.target.value)}
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleComputeBivariate}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính tương quan</span>
                </button>
              </div>
            </div>
          )}

          {/* STATISTICAL SUMMARY METRICS */}
          {mode === 'raw' && rawResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 font-mono text-xs">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Bảng đặc trưng thống kê mẫu số liệu:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">CỠ MẪU (n)</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                    {rawResult.n}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200">
                  <span className="text-indigo-600 block text-[10px]">SỐ TRUNG BÌNH (x̄)</span>
                  <span className="text-xl font-black text-indigo-950 dark:text-white mt-0.5 block">
                    {rawResult.mean.toFixed(3).replace(/\.?0+$/, '')}
                  </span>
                </div>
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200">
                  <span className="text-sky-600 block text-[10px]">TRUNG VỊ (Me = Q₂)</span>
                  <span className="text-xl font-black text-sky-950 dark:text-white mt-0.5 block">
                    {rawResult.median}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200">
                  <span className="text-emerald-600 block text-[10px]">MỐT (Mo)</span>
                  <span className="text-xl font-black text-emerald-950 dark:text-white mt-0.5 block">
                    {rawResult.modes.length > 0 ? rawResult.modes.join(', ') : 'Không có'}
                  </span>
                </div>
              </div>

              {/* Quartiles row */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Tứ phân vị: Q₁ = {rawResult.q1}, Q₂ = {rawResult.q2}, Q₃ = {rawResult.q3}</span>
                  <span className="text-slate-500">Khoảng tứ phân vị Δ_Q = {rawResult.iqr}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Quy ước SGK THPT: Q₂ là trung vị của toàn bộ mẫu; Q₁ và Q₃ lần lượt là trung vị của nửa dưới và nửa trên.
                </div>
              </div>

              {/* Variance & Std Dev */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">
                    PHƯƠNG SAI {varianceType === 'n' ? 's² (chia n)' : 's² (chia n-1)'}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {varianceType === 'n' ? rawResult.varianceN.toFixed(4) : rawResult.varianceN1.toFixed(4)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">
                    ĐỘ LỆCH CHUẨN {varianceType === 'n' ? 's' : 's hiệu chỉnh'}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {varianceType === 'n' ? rawResult.stdDevN.toFixed(4) : rawResult.stdDevN1.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* GROUPED ESTIMATED SUMMARY */}
          {mode === 'grouped' && groupedResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block font-sans">
                Đặc trưng mẫu số liệu ghép nhóm (Giá trị ước lượng):
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200">
                  <span className="text-sky-600 block text-[10px]">TRUNG BÌNH ƯỚC LƯỢNG x̄</span>
                  <span className="text-lg font-bold text-sky-950 dark:text-white">
                    ≈ {groupedResult.estimatedMean.toFixed(3)}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200">
                  <span className="text-indigo-600 block text-[10px]">TRUNG VỊ GHÉP NHÓM Me</span>
                  <span className="text-lg font-bold text-indigo-950 dark:text-white">
                    ≈ {groupedResult.q2.toFixed(3)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">ĐỘ LỆCH CHUẨN s</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ≈ {groupedResult.estimatedStdDevN.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border text-[11px] text-slate-500 font-sans">
                Tứ phân vị nội suy: Q₁ ≈ {groupedResult.q1.toFixed(2)}, Q₂ ≈ {groupedResult.q2.toFixed(2)}, Q₃ ≈ {groupedResult.q3.toFixed(2)}.
              </div>
            </div>
          )}

          {/* BIVARIATE SUMMARY */}
          {mode === 'bivariate' && bivariateResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Hệ số tương quan tuyến tính Pearson:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200">
                  <span className="text-indigo-600 block text-[10px]">HỆ SỐ PEARSON r</span>
                  <span className="text-2xl font-black text-indigo-950 dark:text-white">
                    r = {bivariateResult.r.toFixed(4)}
                  </span>
                  <span className="text-[11px] text-indigo-700 block mt-1">
                    {Math.abs(bivariateResult.r) > 0.8
                      ? 'Tương quan rất mạnh'
                      : Math.abs(bivariateResult.r) > 0.5
                      ? 'Tương quan vừa phải'
                      : 'Tương quan yếu'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">ĐƯỜNG HỒI QUY TUYẾN TÍNH</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                    {bivariateResult.regressionStr}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Hệ số xác định R² = {bivariateResult.rSquared.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Canvas & Charts (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {mode === 'raw'
                ? 'Biểu đồ hộp (Box Plot) & Biểu đồ chấm (Dot Plot)'
                : mode === 'freq'
                ? 'Biểu đồ cột & Đường gấp khúc tần số'
                : mode === 'grouped'
                ? 'Biểu đồ tần số ghép nhóm (Diện tích = Tần số)'
                : 'Biểu đồ phân tán (Scatter Plot) & Đường hồi quy'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportPNG}
                className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
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

          <div className="flex-1 min-h-[360px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 overflow-hidden">
            <canvas ref={canvasRef} width={500} height={360} className="w-full h-full block" />
          </div>
        </div>

      </div>

    </div>
  );

  function setActiveMode(newMode: StatMode) {
    setMode(newMode);
    setTimeout(drawChart, 40);
  }
};
