/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Compass, Play, RotateCcw, Share2, Download, Sparkles, CheckCircle2 } from 'lucide-react';

interface TrigProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

const SPECIAL_ANGLES = [
  { deg: 0, rad: '0', label: '0°' },
  { deg: 30, rad: 'π/6', label: '30° (π/6)' },
  { deg: 45, rad: 'π/4', label: '45° (π/4)' },
  { deg: 60, rad: 'π/3', label: '60° (π/3)' },
  { deg: 90, rad: 'π/2', label: '90° (π/2)' },
  { deg: 120, rad: '2π/3', label: '120°' },
  { deg: 135, rad: '3π/4', label: '135°' },
  { deg: 150, rad: '5π/6', label: '150° (5π/6)' },
  { deg: 180, rad: 'π', label: '180° (π)' },
  { deg: 270, rad: '3π/2', label: '270°' },
  { deg: 360, rad: '2π', label: '360° (2π)' },
];

export const TrigonometryModule: React.FC<TrigProps> = ({ onSendToWhiteboard }) => {
  const [angleDeg, setAngleDeg] = useState<number>(30); // default 30 deg
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Equation solver state: sin x = a, cos x = a, tan x = a
  const [eqFunc, setEqFunc] = useState<'sin' | 'cos' | 'tan'>('sin');
  const [paramA, setParamA] = useState<number>(0.5); // Test case: sin x = 1/2
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(2 * Math.PI); // [0, 2pi]
  const [solutions, setSolutions] = useState<{
    general: string[];
    filtered: { radStr: string; degStr: string; val: number }[];
  }>({
    general: ['x = π/6 + k2π', 'x = 5π/6 + k2π (k ∈ ℤ)'],
    filtered: [
      { radStr: 'π/6', degStr: '30.0°', val: Math.PI / 6 },
      { radStr: '5π/6', degStr: '150.0°', val: (5 * Math.PI) / 6 },
    ],
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const angleRad = (angleDeg * Math.PI) / 180;
  const sinVal = Math.sin(angleRad);
  const cosVal = Math.cos(angleRad);
  const tanVal = Math.abs(cosVal) > 1e-6 ? sinVal / cosVal : NaN;

  // Solve trigonometric equation
  const handleSolve = () => {
    const general: string[] = [];
    const filtered: { radStr: string; degStr: string; val: number }[] = [];

    if (eqFunc === 'sin') {
      if (Math.abs(paramA) > 1) {
        setSolutions({ general: ['Phương trình vô nghiệm (do |a| > 1)'], filtered: [] });
        return;
      }
      const alpha = Math.asin(paramA);
      const isHalf = Math.abs(paramA - 0.5) < 1e-4;
      const alphaStr = isHalf ? 'π/6' : `${alpha.toFixed(3)}`;
      const piMinusAlphaStr = isHalf ? '5π/6' : `${(Math.PI - alpha).toFixed(3)}`;

      general.push(`x = ${alphaStr} + k2π  (k ∈ ℤ)`);
      general.push(`x = π - ${alphaStr} + k2π = ${piMinusAlphaStr} + k2π  (k ∈ ℤ)`);

      // Filter in [rangeStart, rangeEnd]
      for (let k = -10; k <= 10; k++) {
        const x1 = alpha + k * 2 * Math.PI;
        if (x1 >= rangeStart - 1e-5 && x1 <= rangeEnd + 1e-5) {
          const rStr = isHalf && k === 0 ? 'π/6' : `${x1.toFixed(3)} rad`;
          filtered.push({ radStr: rStr, degStr: `${((x1 * 180) / Math.PI).toFixed(1)}°`, val: x1 });
        }
        const x2 = Math.PI - alpha + k * 2 * Math.PI;
        if (x2 >= rangeStart - 1e-5 && x2 <= rangeEnd + 1e-5) {
          const rStr = isHalf && k === 0 ? '5π/6' : `${x2.toFixed(3)} rad`;
          filtered.push({ radStr: rStr, degStr: `${((x2 * 180) / Math.PI).toFixed(1)}°`, val: x2 });
        }
      }
    } else if (eqFunc === 'cos') {
      if (Math.abs(paramA) > 1) {
        setSolutions({ general: ['Phương trình vô nghiệm (do |a| > 1)'], filtered: [] });
        return;
      }
      const alpha = Math.acos(paramA);
      const isHalf = Math.abs(paramA - 0.5) < 1e-4;
      const alphaStr = isHalf ? 'π/3' : `${alpha.toFixed(3)}`;
      general.push(`x = ±${alphaStr} + k2π  (k ∈ ℤ)`);

      for (let k = -10; k <= 10; k++) {
        const x1 = alpha + k * 2 * Math.PI;
        if (x1 >= rangeStart - 1e-5 && x1 <= rangeEnd + 1e-5) {
          filtered.push({ radStr: `${x1.toFixed(3)} rad`, degStr: `${((x1 * 180) / Math.PI).toFixed(1)}°`, val: x1 });
        }
        const x2 = -alpha + k * 2 * Math.PI;
        if (x2 >= rangeStart - 1e-5 && x2 <= rangeEnd + 1e-5) {
          filtered.push({ radStr: `${x2.toFixed(3)} rad`, degStr: `${((x2 * 180) / Math.PI).toFixed(1)}°`, val: x2 });
        }
      }
    } else if (eqFunc === 'tan') {
      const alpha = Math.atan(paramA);
      general.push(`x = ${alpha.toFixed(3)} + kπ  (k ∈ ℤ)`);
      for (let k = -10; k <= 10; k++) {
        const x = alpha + k * Math.PI;
        if (x >= rangeStart - 1e-5 && x <= rangeEnd + 1e-5) {
          filtered.push({ radStr: `${x.toFixed(3)} rad`, degStr: `${((x * 180) / Math.PI).toFixed(1)}°`, val: x });
        }
      }
    }

    filtered.sort((p, q) => p.val - q.val);
    setSolutions({ general, filtered });
  };

  useEffect(() => {
    handleSolve();
  }, [eqFunc, paramA, rangeStart, rangeEnd]);

  // Draw Unit Circle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const R = 135;

    // Coordinate Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    // Ox (cos)
    ctx.beginPath();
    ctx.moveTo(15, cy);
    ctx.lineTo(width - 15, cy);
    ctx.stroke();

    // Oy (sin)
    ctx.beginPath();
    ctx.moveTo(cx, height - 15);
    ctx.lineTo(cx, 15);
    ctx.stroke();

    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('cos', width - 25, cy - 8);
    ctx.fillText('sin', cx + 8, 26);
    ctx.fillText('O', cx - 12, cy + 14);

    // Tangent Axis (x = 1 line at cx + R)
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + R, 15);
    ctx.lineTo(cx + R, height - 15);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Trục tan', cx + R + 4, 30);
    ctx.restore();

    // Unit Circle
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Point M(cos, sin)
    const mx = cx + R * cosVal;
    const my = cy - R * sinVal;

    // Ray OM
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.stroke();

    // Angle Arc
    ctx.save();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, -angleRad, 0, angleRad > 0);
    ctx.stroke();
    ctx.restore();

    // Projections onto Ox and Oy
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94a3b8';

    // to cos axis
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, cy);
    ctx.stroke();

    // to sin axis
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(cx, my);
    ctx.stroke();
    ctx.restore();

    // Colored segments on axes
    // cos (blue)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, cy);
    ctx.stroke();

    // sin (green)
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, my);
    ctx.stroke();

    // Point M
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 12px "Plus Jakarta Sans"';
    ctx.fillText(`M (α = ${angleDeg}°)`, mx + 8, my - 6);
  }, [angleDeg, angleRad, cosVal, sinVal]);

  // Mouse drag handler on unit circle
  const updateAngleFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const px = e.clientX - rect.left - cx;
    const py = cy - (e.clientY - rect.top);

    let rad = Math.atan2(py, px);
    if (rad < 0) rad += 2 * Math.PI;
    const deg = Math.round((rad * 180) / Math.PI);
    setAngleDeg(deg);
  };

  // Export PNG & Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `LuongGiac_${Date.now()}.png`;
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
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Đường tròn lượng giác đơn vị & Giải phương trình lượng giác cơ bản
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setEqFunc('sin');
                setParamA(0.5);
                setRangeStart(0);
                setRangeEnd(2 * Math.PI);
                setAngleDeg(30);
              }}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              Test Case: sin(x) = 1/2 trên [0, 2π]
            </button>
            <button
              onClick={() => {
                setAngleDeg(0);
                setEqFunc('sin');
                setParamA(0.5);
              }}
              className="p-1.5 border rounded-lg text-slate-500 hover:bg-slate-100"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Special Angles Buttons */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Góc lượng giác đặc biệt:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SPECIAL_ANGLES.map((ang) => (
              <button
                key={ang.deg}
                onClick={() => setAngleDeg(ang.deg)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                  angleDeg === ang.deg
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                {ang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Equation Solver (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            Giải phương trình lượng giác & Lọc nghiệm trên khoảng
          </span>

          <div className="flex items-center gap-2">
            <select
              value={eqFunc}
              onChange={(e) => setEqFunc(e.target.value as any)}
              className="px-3 py-2 text-sm font-bold font-mono border rounded-lg bg-slate-50 dark:bg-slate-950"
            >
              <option value="sin">sin(x) =</option>
              <option value="cos">cos(x) =</option>
              <option value="tan">tan(x) =</option>
            </select>

            <input
              type="number"
              step="any"
              value={paramA}
              onChange={(e) => setParamA(parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 text-sm font-mono border rounded-lg font-bold text-center"
            />

            <button
              onClick={handleSolve}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm ml-auto"
            >
              Giải & Lọc nghiệm
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Khoảng nghiệm từ a</label>
              <input
                type="number"
                step="any"
                value={rangeStart}
                onChange={(e) => setRangeStart(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 font-mono border rounded"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">đến b (2π ≈ 6.283)</label>
              <input
                type="number"
                step="any"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 font-mono border rounded"
              />
            </div>
          </div>

          {/* Solutions display */}
          <div className="space-y-3 pt-2">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Họ nghiệm tổng quát:
              </span>
              <div className="space-y-1 pl-2 border-l-2 border-indigo-200 mt-1">
                {solutions.general.map((g, i) => (
                  <p key={i} className="text-xs font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {g}
                  </p>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Nghiệm thuộc đoạn [{rangeStart.toFixed(2)}, {rangeEnd.toFixed(2)}] ({solutions.filtered.length} nghiệm):
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {solutions.filtered.map((sol, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-100"
                  >
                    x_{idx + 1} = {sol.radStr} ({sol.degStr})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Unit Circle Interactive (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Đường tròn đơn vị (Kéo chuột trực tiếp)
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

          <div className="w-full flex justify-center py-2">
            <canvas
              ref={canvasRef}
              width={380}
              height={340}
              onMouseDown={(e) => {
                setIsDragging(true);
                updateAngleFromCanvas(e);
              }}
              onMouseMove={(e) => {
                if (isDragging) updateAngleFromCanvas(e);
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              className="cursor-pointer block"
            />
          </div>

          {/* Angle Slider */}
          <div className="w-full px-4 mb-2">
            <div className="flex justify-between text-xs font-mono font-bold mb-1">
              <span>Góc α = {angleDeg}°</span>
              <span>{(angleRad / Math.PI).toFixed(2)}π rad</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={angleDeg}
              onChange={(e) => setAngleDeg(parseInt(e.target.value) || 0)}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Exact Value boxes */}
          <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200">
              <span className="text-[10px] text-green-700 dark:text-green-300 font-bold block">sin α</span>
              <span className="text-sm font-bold text-green-900 dark:text-green-100">{sinVal.toFixed(4)}</span>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200">
              <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold block">cos α</span>
              <span className="text-sm font-bold text-sky-900 dark:text-sky-100">{cosVal.toFixed(4)}</span>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">tan α</span>
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                {isNaN(tanVal) ? 'Không xác định' : tanVal.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
