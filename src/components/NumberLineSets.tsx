/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Download,
  Share2,
  Sparkles,
  Layers,
  CircleDot,
  CheckCircle2,
} from 'lucide-react';
import {
  Interval,
  parseInterval,
  formatIntervals,
  intersectIntervals,
  unionIntervals,
  differenceIntervals,
  complementIntervals,
} from '../utils/mathEngine';

interface NumberLineProps {
  initialSetA?: string;
  initialSetB?: string;
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type SetOperation = 'intersect' | 'union' | 'diffAB' | 'diffBA' | 'compA';

export const NumberLineSets: React.FC<NumberLineProps> = ({
  initialSetA = '(-inf, 1] U [2, +inf)',
  initialSetB = '[0, 5)',
  onSendToWhiteboard,
}) => {
  const [setAStr, setSetAStr] = useState<string>(initialSetA);
  const [setBStr, setSetBStr] = useState<string>(initialSetB);
  const [operation, setOperation] = useState<SetOperation>('intersect');
  const [viewMode, setViewMode] = useState<'numberline' | 'venn'>('numberline');

  const [parsedA, setParsedA] = useState<Interval[]>([]);
  const [parsedB, setParsedB] = useState<Interval[]>([]);
  const [resultIntervals, setResultIntervals] = useState<Interval[]>([]);
  const [resultText, setResultText] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vennCanvasRef = useRef<HTMLCanvasElement>(null);

  // Recalculate set operations
  const handleCalculate = () => {
    const A = parseInterval(setAStr);
    const B = parseInterval(setBStr);
    setParsedA(A);
    setParsedB(B);

    let res: Interval[] = [];
    if (operation === 'intersect') {
      res = intersectIntervals(A, B);
    } else if (operation === 'union') {
      res = unionIntervals(A, B);
    } else if (operation === 'diffAB') {
      res = differenceIntervals(A, B);
    } else if (operation === 'diffBA') {
      res = differenceIntervals(B, A);
    } else if (operation === 'compA') {
      res = complementIntervals(A);
    }

    setResultIntervals(res);
    setResultText(formatIntervals(res));
  };

  useEffect(() => {
    handleCalculate();
  }, [setAStr, setBStr, operation]);

  // Redraw Stacked Aligned Number Lines
  useEffect(() => {
    if (viewMode !== 'numberline') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Determine min and max coordinates across A, B and result
    const allPoints: number[] = [-5, 5];
    const collectPoints = (intervals: Interval[]) => {
      for (const int of intervals) {
        if (isFinite(int.start)) allPoints.push(int.start);
        if (isFinite(int.end)) allPoints.push(int.end);
      }
    };
    collectPoints(parsedA);
    collectPoints(parsedB);
    collectPoints(resultIntervals);

    const minX = Math.min(...allPoints) - 2;
    const maxX = Math.max(...allPoints) + 2;

    const toScreenX = (x: number) => {
      const padding = 70;
      return padding + ((x - minX) / (maxX - minX)) * (width - padding * 2);
    };

    // Helper to draw a single standard Vietnamese high school number line
    const drawSingleLine = (
      y: number,
      label: string,
      color: string,
      intervals: Interval[],
      showHatches: boolean = true
    ) => {
      const padding = 70;
      const leftX = padding - 30;
      const rightX = width - padding + 30;

      // 1. Draw Axis Line with arrow
      ctx.save();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();

      // Arrow on right
      ctx.beginPath();
      ctx.moveTo(rightX - 8, y - 4);
      ctx.lineTo(rightX, y);
      ctx.lineTo(rightX - 8, y + 4);
      ctx.stroke();

      // Label on left
      ctx.font = 'bold 12px "Plus Jakarta Sans"';
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(label, leftX - 10, y + 4);

      // +inf, -inf
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('-∞', leftX + 10, y - 8);
      ctx.fillText('+∞', rightX - 10, y - 8);

      // 2. Identify excluded intervals to draw strikethrough hatches (gạch sọc xiên)
      if (showHatches) {
        const comp = complementIntervals(intervals);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1;

        for (const cInt of comp) {
          const sX = isFinite(cInt.start) ? toScreenX(cInt.start) : leftX;
          const eX = isFinite(cInt.end) ? toScreenX(cInt.end) : rightX;
          const stepHatch = 8;
          for (let hx = sX; hx < eX; hx += stepHatch) {
            ctx.beginPath();
            ctx.moveTo(hx, y - 10);
            ctx.lineTo(hx + 7, y + 10);
            ctx.stroke();
          }
        }
      }

      // 3. Highlight accepted interval segments
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      for (const int of intervals) {
        const sX = isFinite(int.start) ? toScreenX(int.start) : leftX;
        const eX = isFinite(int.end) ? toScreenX(int.end) : rightX;
        ctx.beginPath();
        ctx.moveTo(sX, y);
        ctx.lineTo(eX, y);
        ctx.stroke();
      }

      // 4. Draw Endpoints Brackets: [ or ] or ( or )
      for (const int of intervals) {
        // Start bracket
        if (isFinite(int.start)) {
          const sx = toScreenX(int.start);
          ctx.font = 'bold 16px "JetBrains Mono"';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(int.includeStart ? '[' : '(', sx, y + 5);

          // Number tick & label below
          ctx.font = '11px "JetBrains Mono"';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(int.start.toString(), sx, y + 20);
        }

        // End bracket
        if (isFinite(int.end)) {
          const ex = toScreenX(int.end);
          ctx.font = 'bold 16px "JetBrains Mono"';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(int.includeEnd ? ']' : ')', ex, y + 5);

          // Number tick & label below
          ctx.font = '11px "JetBrains Mono"';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(int.end.toString(), ex, y + 20);
        }
      }

      ctx.restore();
    };

    // Draw Line 1: Set A
    drawSingleLine(60, 'Tập A', '#4f46e5', parsedA);

    // Draw Line 2: Set B
    drawSingleLine(140, 'Tập B', '#0284c7', parsedB);

    // Separator line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 195);
    ctx.lineTo(width - 30, 195);
    ctx.stroke();

    // Draw Line 3: Result
    const opLabel =
      operation === 'intersect'
        ? 'A ∩ B'
        : operation === 'union'
        ? 'A ∪ B'
        : operation === 'diffAB'
        ? 'A \\ B'
        : operation === 'diffBA'
        ? 'B \\ A'
        : 'C_ℝ A';
    drawSingleLine(250, `Kết quả (${opLabel})`, '#16a34a', resultIntervals);
  }, [parsedA, parsedB, resultIntervals, operation, viewMode]);

  // Redraw Venn Diagram
  useEffect(() => {
    if (viewMode !== 'venn') return;
    const canvas = vennCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const c1x = width / 2 - 80;
    const c2x = width / 2 + 80;
    const cy = height / 2;
    const r = 110;

    // Draw Universe rectangle (R)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 25, width - 60, height - 50);
    ctx.font = 'bold 12px "Plus Jakarta Sans"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Không gian số thực ℝ', 45, 45);

    // Fill regions based on operation
    ctx.save();
    if (operation === 'intersect') {
      // Intersection clip
      ctx.beginPath();
      ctx.arc(c1x, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.beginPath();
      ctx.arc(c2x, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (operation === 'union') {
      ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.beginPath();
      ctx.arc(c1x, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c2x, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (operation === 'diffAB') {
      ctx.fillStyle = 'rgba(79, 70, 229, 0.35)';
      ctx.beginPath();
      ctx.arc(c1x, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Cut out circle B
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(c2x, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // Stroke circles
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(c1x, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(c2x, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 14px "Plus Jakarta Sans"';
    ctx.fillStyle = '#4f46e5';
    ctx.fillText('Tập A', c1x - 70, cy - 80);
    ctx.fillStyle = '#0284c7';
    ctx.fillText('Tập B', c2x + 40, cy - 80);
  }, [operation, viewMode]);

  // Export or Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = viewMode === 'numberline' ? canvasRef.current : vennCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrucSo_${operation}_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = viewMode === 'numberline' ? canvasRef.current : vennCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    if (onSendToWhiteboard) onSendToWhiteboard(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Configuration & Operations Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Phép toán Tập hợp & Trục số đồng mốc
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('numberline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'numberline' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              Trục số đồng mốc
            </button>
            <button
              onClick={() => setViewMode('venn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'venn' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              Sơ đồ Venn
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Tập hợp A (ví dụ: (-inf, 1] U [2, +inf), [0, 5))
            </label>
            <input
              type="text"
              value={setAStr}
              onChange={(e) => setSetAStr(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 font-bold text-indigo-900 dark:text-indigo-200 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Tập hợp B (ví dụ: [0, 5), (1, 4])
            </label>
            <input
              type="text"
              value={setBStr}
              onChange={(e) => setSetBStr(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 font-bold text-sky-900 dark:text-sky-200 outline-none"
            />
          </div>
        </div>

        {/* Operation buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400 mr-1">Phép toán:</span>
          <button
            onClick={() => setOperation('intersect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              operation === 'intersect' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Giao (A ∩ B)
          </button>
          <button
            onClick={() => setOperation('union')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              operation === 'union' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Hợp (A ∪ B)
          </button>
          <button
            onClick={() => setOperation('diffAB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              operation === 'diffAB' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Hiệu (A \ B)
          </button>
          <button
            onClick={() => setOperation('diffBA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              operation === 'diffBA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Hiệu (B \ A)
          </button>
          <button
            onClick={() => setOperation('compA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              operation === 'compA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Phần bù (C_ℝ A)
          </button>
        </div>
      </div>

      {/* Main Canvas View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Kết quả: <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm ml-1">{resultText}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPNG}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất PNG</span>
            </button>
            <button
              onClick={handleSendToWhiteboard}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Gửi sang Bảng viết</span>
            </button>
          </div>
        </div>

        {viewMode === 'numberline' ? (
          <div className="w-full overflow-x-auto min-h-[320px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex items-center justify-center">
            <canvas ref={canvasRef} width={850} height={320} className="block" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto min-h-[320px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex items-center justify-center">
            <canvas ref={vennCanvasRef} width={650} height={320} className="block" />
          </div>
        )}
      </div>

    </div>
  );
};
