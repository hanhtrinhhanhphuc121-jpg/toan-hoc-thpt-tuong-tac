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
  Sigma,
  Box,
  Layers,
} from 'lucide-react';
import { evaluateMath, numericalIntegral, Fraction, project3DTo2D, Vector3D } from '../utils/mathEngine';

interface AreaVolumeProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const AreaVolumeModule: React.FC<AreaVolumeProps> = ({ onSendToWhiteboard }) => {
  const [fExpr, setFExpr] = useState<string>('x'); // Test case: y = x
  const [gExpr, setGExpr] = useState<string>('0'); // y = 0
  const [boundA, setBoundA] = useState<number>(0); // a = 0
  const [boundB, setBoundB] = useState<number>(1); // b = 1
  const [axis, setAxis] = useState<'Ox' | 'Oy'>('Ox');

  // Visualization mode: 2D plane area vs 3D solid of revolution
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Results
  const [areaResult, setAreaResult] = useState<number | null>(0.5); // S = 1/2
  const [areaFrac, setAreaFrac] = useState<string>('1/2');
  const [volResult, setVolResult] = useState<number | null>(Math.PI / 3); // V = pi / 3 = 1.047197
  const [volPiFrac, setVolPiFrac] = useState<string>('1/3'); // 1/3 pi

  // 3D camera
  const [yaw, setYaw] = useState<number>(0.65);
  const [pitch, setPitch] = useState<number>(0.35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute Area & Volume
  const handleCompute = () => {
    try {
      const a = Math.min(boundA, boundB);
      const b = Math.max(boundA, boundB);

      // Area = int |f(x) - g(x)| dx
      const areaFn = (x: number) => {
        const y1 = evaluateMath(fExpr, { x });
        const y2 = evaluateMath(gExpr, { x });
        return Math.abs(y1 - y2);
      };

      const s = numericalIntegral(areaFn, a, b);
      setAreaResult(s);
      const sFrac = Fraction.fromNumber(s);
      setAreaFrac(sFrac.d <= 5000 && Math.abs(s - sFrac.toNumber()) < 1e-4 ? sFrac.toString() : s.toFixed(4));

      // Volume around Ox: V = pi * int |f(x)^2 - g(x)^2| dx
      const volFn = (x: number) => {
        const y1 = evaluateMath(fExpr, { x });
        const y2 = evaluateMath(gExpr, { x });
        const rOuter = Math.max(Math.abs(y1), Math.abs(y2));
        const rInner = Math.min(Math.abs(y1), Math.abs(y2));
        return Math.PI * (rOuter * rOuter - rInner * rInner);
      };

      const v = numericalIntegral(volFn, a, b);
      setVolResult(v);

      const vOverPi = v / Math.PI;
      const vFrac = Fraction.fromNumber(vOverPi);
      if (vFrac.d <= 5000 && Math.abs(vOverPi - vFrac.toNumber()) < 1e-4) {
        setVolPiFrac(vFrac.toString());
      } else {
        setVolPiFrac((v / Math.PI).toFixed(4));
      }
    } catch {
      setAreaResult(null);
      setVolResult(null);
    }
  };

  const handleReset = () => {
    // Test Case: y = x, y = 0, [0, 1] around Ox -> S = 1/2, V = pi/3
    setFExpr('x');
    setGExpr('0');
    setBoundA(0);
    setBoundB(1);
    setAxis('Ox');
    setViewMode('2d');
    setAreaResult(0.5);
    setAreaFrac('1/2');
    setVolResult(Math.PI / 3);
    setVolPiFrac('1/3');
  };

  // Draw 2D or 3D
  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (viewMode === '2d') {
      // 2D Area Plot with shaded region
      const ox = w / 3;
      const oy = h / 2 + 50;
      const scale = 70;

      const toScreenX = (x: number) => ox + x * scale;
      const toScreenY = (y: number) => oy - y * scale;

      // Axes
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, oy);
      ctx.lineTo(w, oy);
      ctx.moveTo(ox, h);
      ctx.lineTo(ox, 0);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillText('Ox', w - 20, oy - 6);
      ctx.fillText('Oy', ox + 6, 16);

      // Shaded Area between a and b
      const a = Math.min(boundA, boundB);
      const b = Math.max(boundA, boundB);
      const steps = 150;
      const dx = (b - a) / steps;

      ctx.fillStyle = 'rgba(79, 70, 229, 0.28)';
      ctx.beginPath();

      // Top curve f(x)
      for (let i = 0; i <= steps; i++) {
        const x = a + i * dx;
        try {
          const y = evaluateMath(fExpr, { x });
          const sx = toScreenX(x);
          const sy = toScreenY(y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        } catch {}
      }

      // Bottom curve g(x) backwards
      for (let i = steps; i >= 0; i--) {
        const x = a + i * dx;
        try {
          const y = evaluateMath(gExpr, { x });
          ctx.lineTo(toScreenX(x), toScreenY(y));
        } catch {}
      }
      ctx.closePath();
      ctx.fill();

      // Curve f(x)
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 3) {
        const x = (px - ox) / scale;
        try {
          const y = evaluateMath(fExpr, { x });
          const sy = toScreenY(y);
          if (px === 0) ctx.moveTo(px, sy);
          else ctx.lineTo(px, sy);
        } catch {}
      }
      ctx.stroke();

      // Bounds marks
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`a = ${a}`, toScreenX(a) - 10, oy + 16);
      ctx.fillText(`b = ${b}`, toScreenX(b) - 10, oy + 16);
    } else {
      // 3D Solid of Revolution
      const center = { x: w / 2, y: h / 2 };
      const scale = 50;
      const project = (pt: Vector3D) => project3DTo2D(pt, center, scale, yaw, pitch);

      // 3D Axis
      const o = project({ x: 0, y: 0, z: 0 });
      const xA = project({ x: 4, y: 0, z: 0 });
      const yA = project({ x: 0, y: 3, z: 0 });
      const zA = project({ x: 0, y: 0, z: 3 });

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(xA.x, xA.y);
      ctx.stroke();

      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(yA.x, yA.y);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(zA.x, zA.y);
      ctx.stroke();

      // Render revolution surface rings
      const a = Math.min(boundA, boundB);
      const b = Math.max(boundA, boundB);
      const xSlices = 16;
      const radSteps = 24;

      ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.lineWidth = 1;

      for (let i = 0; i < xSlices; i++) {
        const x1 = a + (i / xSlices) * (b - a);
        const x2 = a + ((i + 1) / xSlices) * (b - a);
        const r1 = Math.abs(evaluateMath(fExpr, { x: x1 }));
        const r2 = Math.abs(evaluateMath(fExpr, { x: x2 }));

        for (let j = 0; j < radSteps; j++) {
          const t1 = (j / radSteps) * 2 * Math.PI;
          const t2 = ((j + 1) / radSteps) * 2 * Math.PI;

          const p1 = project({ x: x1, y: r1 * Math.cos(t1), z: r1 * Math.sin(t1) });
          const p2 = project({ x: x1, y: r1 * Math.cos(t2), z: r1 * Math.sin(t2) });
          const p3 = project({ x: x2, y: r2 * Math.cos(t2), z: r2 * Math.sin(t2) });
          const p4 = project({ x: x2, y: r2 * Math.cos(t1), z: r2 * Math.sin(t1) });

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  };

  useEffect(() => {
    handleCompute();
  }, [fExpr, gExpr, boundA, boundB, axis]);

  useEffect(() => {
    setTimeout(drawScene, 30);
  }, [viewMode, fExpr, gExpr, boundA, boundB, axis, yaw, pitch, areaResult, volResult]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== '3d') return;
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || viewMode !== '3d') return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setYaw((prev) => prev + dx * 0.01);
    setPitch((prev) => Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, prev - dy * 0.01)));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `DienTichTheTich_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Mode View Switcher: 2D Plane Area vs 3D Revolution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === '2d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Diện tích hình phẳng (2D)</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === '3d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Khối tròn xoay (3D)</span>
          </button>
        </div>

        {/* Sample Shortcut */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
          <button
            onClick={handleReset}
            className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
          >
            Test: y=x trên [0, 1] quay Ox ⇒ S=1/2, V=π/3
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Bounds & Integrals (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Hai đường giới hạn & Cận tích phân
            </span>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 font-sans">
                  Đường phía trên / ngoài f(x)
                </label>
                <input
                  type="text"
                  value={fExpr}
                  onChange={(e) => setFExpr(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 dark:bg-slate-950"
                  placeholder="ví dụ: x, sin(x), x^2"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 font-sans">
                  Đường phía dưới / trong g(x)
                </label>
                <input
                  type="text"
                  value={gExpr}
                  onChange={(e) => setGExpr(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 dark:bg-slate-950"
                  placeholder="0 (trục hoành) hoặc đường thứ hai"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 font-sans">
                    Cận dưới a
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={boundA}
                    onChange={(e) => setBoundA(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 font-sans">
                    Cận trên b
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={boundB}
                    onChange={(e) => setBoundB(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border rounded-xl text-center font-bold"
                  />
                </div>
              </div>

              {/* Axis of rotation */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border font-sans text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Trục quay tròn xoay:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setAxis('Ox')}
                    className={`px-3 py-1 rounded font-bold ${axis === 'Ox' ? 'bg-indigo-600 text-white' : 'border'}`}
                  >
                    Quay quanh Ox
                  </button>
                  <button
                    onClick={() => setAxis('Oy')}
                    className={`px-3 py-1 rounded font-bold ${axis === 'Oy' ? 'bg-indigo-600 text-white' : 'border'}`}
                  >
                    Quay quanh Oy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCompute}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tính Diện tích & Thể tích</span>
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Area Result */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 space-y-1 font-mono">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Diện tích hình phẳng S:
              </span>
              <div className="text-2xl font-black text-indigo-950 dark:text-white">
                S = {areaFrac}
              </div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block font-sans">
                ∫_{boundA}^{boundB} |f(x) - g(x)| dx = {areaResult?.toFixed(4)}
              </span>
            </div>

            {/* Volume Result */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 space-y-1 font-mono">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block font-sans">
                Thể tích khối tròn xoay V:
              </span>
              <div className="text-2xl font-black text-emerald-950 dark:text-white">
                V = {volPiFrac !== '1' ? `${volPiFrac}π` : 'π'}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-sans">
                ≈ {volResult?.toFixed(4)} (đơn vị thể tích)
              </span>
            </div>

          </div>

          {/* Explanation Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 rounded-2xl text-xs space-y-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Quy tắc xác định bán kính tròn xoay:
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              • <strong>Bán kính ngoài R(x):</strong> Khoảng cách từ đường cong xa nhất đến trục quay Ox: R(x) = max(|f(x)|, |g(x)|).
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              • <strong>Bán kính trong r(x):</strong> Khoảng cách từ đường cong gần trục quay nhất đến trục quay: r(x) = min(|f(x)|, |g(x)|).
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              • <strong>Công thức vi phân thể tích:</strong> dV = π [R(x)² - r(x)²] dx.
            </p>
          </div>

        </div>

        {/* Right: Graphic Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {viewMode === '2d'
                ? 'Miền diện tích phẳng được tô màu (Shaded Plane Region)'
                : 'Mô phỏng 3D khối tròn xoay (Kéo chuột để xoay)'}
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

          <div className="flex-1 min-h-[420px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={540}
              height={420}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full block"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
