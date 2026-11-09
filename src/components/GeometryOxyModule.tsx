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
  Maximize2,
} from 'lucide-react';
import { Point2D, computeTriangleOxy, TriangleOxyInfo } from '../utils/mathEngine';

interface GeometryOxyProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type OxyShapeMode = 'triangle' | 'circle' | 'line' | 'conic';

export const GeometryOxyModule: React.FC<GeometryOxyProps> = ({ onSendToWhiteboard }) => {
  const [shapeMode, setShapeMode] = useState<OxyShapeMode>('triangle');

  // Triangle points A, B, C
  const [ptA, setPtA] = useState<Point2D>({ x: 0, y: 0, label: 'A' });
  const [ptB, setPtB] = useState<Point2D>({ x: 4, y: 0, label: 'B' });
  const [ptC, setPtC] = useState<Point2D>({ x: 0, y: 3, label: 'C' });

  // Conic state
  const [conicType, setConicType] = useState<'ellipse' | 'hyperbola' | 'parabola'>('ellipse');
  const [conicA, setConicA] = useState<number>(3);
  const [conicB, setConicB] = useState<number>(2);

  // Circle state: (x - a)^2 + (y - b)^2 = R^2
  const [circleCenter, setCircleCenter] = useState<Point2D>({ x: 1, y: 1, label: 'I' });
  const [circleR, setCircleR] = useState<number>(2.5);

  // Line state: ax + by + c = 0
  const [lineCoeffs, setLineCoeffs] = useState<{ a: number; b: number; c: number }>({ a: 1, b: -2, c: 2 });

  // Triangle metrics result
  const [triInfo, setTriInfo] = useState<TriangleOxyInfo | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Interactive dragging on Canvas
  const [draggingPoint, setDraggingPoint] = useState<'A' | 'B' | 'C' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute triangle info
  const handleCompute = () => {
    setErrorBanner(null);
    if (shapeMode === 'triangle') {
      const res = computeTriangleOxy(ptA, ptB, ptC);
      setTriInfo(res);
      if (res.isCollinear) {
        setErrorBanner('Cảnh báo: Ba điểm A, B, C thẳng hàng (diện tích = 0), không tạo thành tam giác!');
      }
    }
  };

  const handleReset = () => {
    // Test case: A(0,0), B(4,0), C(0,3)
    setPtA({ x: 0, y: 0, label: 'A' });
    setPtB({ x: 4, y: 0, label: 'B' });
    setPtC({ x: 0, y: 3, label: 'C' });
    setErrorBanner(null);
    const res = computeTriangleOxy({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 });
    setTriInfo(res);
  };

  // Canvas drawing
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Coordinate system parameters: Center at (w/2, h/2), Scale: 35 px per unit
    const ox = w / 2 - 20;
    const oy = h / 2 + 30;
    const scale = 36;

    const toScreenX = (x: number) => ox + x * scale;
    const toScreenY = (y: number) => oy - y * scale;
    const toMathX = (px: number) => (px - ox) / scale;
    const toMathY = (py: number) => (oy - py) / scale;

    // Draw Grid & Axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let x = -10; x <= 10; x++) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), 0);
      ctx.lineTo(toScreenX(x), h);
      ctx.stroke();
    }
    for (let y = -8; y <= 8; y++) {
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(y));
      ctx.lineTo(w, toScreenY(y));
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    // Ox
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.stroke();
    // Oy
    ctx.beginPath();
    ctx.moveTo(ox, h);
    ctx.lineTo(ox, 0);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillText('x', w - 15, oy - 6);
    ctx.fillText('y', ox + 6, 15);
    ctx.fillText('O', ox - 12, oy + 14);

    // MODE 1: TRIANGLE
    if (shapeMode === 'triangle' && triInfo) {
      const sA = { x: toScreenX(ptA.x), y: toScreenY(ptA.y) };
      const sB = { x: toScreenX(ptB.x), y: toScreenY(ptB.y) };
      const sC = { x: toScreenX(ptC.x), y: toScreenY(ptC.y) };

      // Fill triangle
      if (!triInfo.isCollinear) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.lineTo(sC.x, sC.y);
        ctx.closePath();
        ctx.fill();

        // Circumcircle
        if (triInfo.circumcenter) {
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(toScreenX(triInfo.circumcenter.x), toScreenY(triInfo.circumcenter.y), triInfo.rCircum * scale, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Incircle
        if (triInfo.incenter) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(toScreenX(triInfo.incenter.x), toScreenY(triInfo.incenter.y), triInfo.rIn * scale, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Edges
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sA.x, sA.y);
      ctx.lineTo(sB.x, sB.y);
      ctx.lineTo(sC.x, sC.y);
      ctx.closePath();
      ctx.stroke();

      // Special Points: G (Centroid), H (Orthocenter), O (Circumcenter), I (Incenter)
      const specialPts: { p: Point2D | null; color: string; label: string }[] = [
        { p: triInfo.centroid, color: '#dc2626', label: 'G (Trọng tâm)' },
        { p: triInfo.circumcenter, color: '#0284c7', label: 'O (Ngoại tiếp)' },
        { p: triInfo.orthocenter, color: '#9333ea', label: 'H (Trực tâm)' },
        { p: triInfo.incenter, color: '#16a34a', label: 'I (Nội tiếp)' },
      ];

      for (const sp of specialPts) {
        if (!sp.p) continue;
        const sx = toScreenX(sp.p.x);
        const sy = toScreenY(sp.p.y);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = 'bold 10px "JetBrains Mono"';
        ctx.fillText(sp.label.split(' ')[0], sx + 6, sy - 4);
      }

      // Vertices A, B, C (Large drag handles)
      const vertices = [
        { pt: ptA, name: 'A' },
        { pt: ptB, name: 'B' },
        { pt: ptC, name: 'C' },
      ];

      for (const v of vertices) {
        const sx = toScreenX(v.pt.x);
        const sy = toScreenY(v.pt.y);
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.fillText(`${v.name}(${v.pt.x.toFixed(1)}, ${v.pt.y.toFixed(1)})`, sx + 9, sy - 6);
      }
    }

    // MODE 2: CIRCLE
    if (shapeMode === 'circle') {
      const cx = toScreenX(circleCenter.x);
      const cy = toScreenY(circleCenter.y);
      const rPx = circleR * scale;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`I(${circleCenter.x}, ${circleCenter.y})`, cx + 8, cy - 6);
    }

    // MODE 3: LINE
    if (shapeMode === 'line') {
      const { a, b, c } = lineCoeffs;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (Math.abs(b) > 1e-6) {
        const x1 = -8;
        const y1 = (-a * x1 - c) / b;
        const x2 = 8;
        const y2 = (-a * x2 - c) / b;
        ctx.moveTo(toScreenX(x1), toScreenY(y1));
        ctx.lineTo(toScreenX(x2), toScreenY(y2));
      } else {
        const xFix = -c / a;
        ctx.moveTo(toScreenX(xFix), 0);
        ctx.lineTo(toScreenX(xFix), h);
      }
      ctx.stroke();
    }

    // MODE 4: CONIC
    if (shapeMode === 'conic') {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      if (conicType === 'ellipse') {
        // x^2/a^2 + y^2/b^2 = 1
        for (let t = 0; t <= 2 * Math.PI + 0.05; t += 0.05) {
          const x = conicA * Math.cos(t);
          const y = conicB * Math.sin(t);
          if (t === 0) ctx.moveTo(toScreenX(x), toScreenY(y));
          else ctx.lineTo(toScreenX(x), toScreenY(y));
        }
      } else if (conicType === 'hyperbola') {
        // x^2/a^2 - y^2/b^2 = 1 (two branches)
        for (let sign of [1, -1]) {
          let first = true;
          for (let y = -6; y <= 6; y += 0.1) {
            const x = sign * conicA * Math.sqrt(1 + (y * y) / (conicB * conicB));
            if (first) {
              ctx.moveTo(toScreenX(x), toScreenY(y));
              first = false;
            } else {
              ctx.lineTo(toScreenX(x), toScreenY(y));
            }
          }
        }
      } else if (conicType === 'parabola') {
        // y^2 = 2px -> x = y^2 / 2p (with p = conicA)
        const p = Math.max(0.2, conicA);
        let first = true;
        for (let y = -6; y <= 6; y += 0.1) {
          const x = (y * y) / (2 * p);
          if (first) {
            ctx.moveTo(toScreenX(x), toScreenY(y));
            first = false;
          } else {
            ctx.lineTo(toScreenX(x), toScreenY(y));
          }
        }
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    handleCompute();
  }, [shapeMode, ptA, ptB, ptC, conicType, conicA, conicB, circleCenter, circleR, lineCoeffs]);

  useEffect(() => {
    setTimeout(drawCanvas, 30);
  }, [shapeMode, ptA, ptB, ptC, conicType, conicA, conicB, circleCenter, circleR, lineCoeffs, triInfo]);

  // Mouse handlers for dragging points on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (shapeMode !== 'triangle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ox = canvas.width / 2 - 20;
    const oy = canvas.height / 2 + 30;
    const scale = 36;

    const hit = (p: Point2D) => {
      const sx = ox + p.x * scale;
      const sy = oy - p.y * scale;
      return Math.hypot(mx - sx, my - sy) < 18;
    };

    if (hit(ptA)) setDraggingPoint('A');
    else if (hit(ptB)) setDraggingPoint('B');
    else if (hit(ptC)) setDraggingPoint('C');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ox = canvas.width / 2 - 20;
    const oy = canvas.height / 2 + 30;
    const scale = 36;

    const mathX = Math.round(((mx - ox) / scale) * 2) / 2; // snap 0.5
    const mathY = Math.round(((oy - my) / scale) * 2) / 2;

    if (draggingPoint === 'A') setPtA({ ...ptA, x: mathX, y: mathY });
    else if (draggingPoint === 'B') setPtB({ ...ptB, x: mathX, y: mathY });
    else if (draggingPoint === 'C') setPtC({ ...ptC, x: mathX, y: mathY });
  };

  const handleMouseUp = () => setDraggingPoint(null);

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `HinhOxy_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header Mode Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setShapeMode('triangle')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            shapeMode === 'triangle' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Tam giác Oxy & Bốn tâm
        </button>
        <button
          onClick={() => setShapeMode('circle')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            shapeMode === 'circle' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Đường tròn
        </button>
        <button
          onClick={() => setShapeMode('line')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            shapeMode === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Đường thẳng
        </button>
        <button
          onClick={() => setShapeMode('conic')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            shapeMode === 'conic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Đường Conic (Elip, Hypebol, Parabol)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Coordinates & Calculations (5-6 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {shapeMode === 'triangle'
                  ? 'Tọa độ ba đỉnh tam giác'
                  : shapeMode === 'circle'
                  ? 'Phương trình đường tròn'
                  : shapeMode === 'line'
                  ? 'Phương trình đường thẳng'
                  : 'Tham số đường Conic'}
              </span>

              {shapeMode === 'triangle' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                  <button
                    onClick={handleReset}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test: A(0,0), B(4,0), C(0,3)
                  </button>
                </div>
              )}
            </div>

            {errorBanner && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Triangle inputs */}
            {shapeMode === 'triangle' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                    <span className="font-bold text-indigo-600 block mb-1">Đỉnh A</span>
                    <div className="flex items-center gap-1">
                      <span>x:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptA.x}
                        onChange={(e) => setPtA({ ...ptA, x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span>y:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptA.y}
                        onChange={(e) => setPtA({ ...ptA, y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                    <span className="font-bold text-indigo-600 block mb-1">Đỉnh B</span>
                    <div className="flex items-center gap-1">
                      <span>x:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptB.x}
                        onChange={(e) => setPtB({ ...ptB, x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span>y:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptB.y}
                        onChange={(e) => setPtB({ ...ptB, y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                    <span className="font-bold text-indigo-600 block mb-1">Đỉnh C</span>
                    <div className="flex items-center gap-1">
                      <span>x:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptC.x}
                        onChange={(e) => setPtC({ ...ptC, x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span>y:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ptC.y}
                        onChange={(e) => setPtC({ ...ptC, y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans">
                  * Mẹo: Có thể bấm và kéo trực tiếp các điểm A, B, C trên khung hình bên phải để tương tác trực quan.
                </p>
              </div>
            )}

            {/* Circle inputs */}
            {shapeMode === 'circle' && (
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block">Tâm x₀</label>
                  <input
                    type="number"
                    value={circleCenter.x}
                    onChange={(e) => setCircleCenter({ ...circleCenter, x: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Tâm y₀</label>
                  <input
                    type="number"
                    value={circleCenter.y}
                    onChange={(e) => setCircleCenter({ ...circleCenter, y: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Bán kính R</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={circleR}
                    onChange={(e) => setCircleR(parseFloat(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 border rounded-lg text-center font-bold"
                  />
                </div>
              </div>
            )}

            {/* Conic inputs */}
            {shapeMode === 'conic' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConicType('ellipse')}
                    className={`px-3 py-1.5 rounded-lg font-bold ${conicType === 'ellipse' ? 'bg-indigo-600 text-white' : 'border'}`}
                  >
                    Elip (E)
                  </button>
                  <button
                    onClick={() => setConicType('hyperbola')}
                    className={`px-3 py-1.5 rounded-lg font-bold ${conicType === 'hyperbola' ? 'bg-indigo-600 text-white' : 'border'}`}
                  >
                    Hypebol (H)
                  </button>
                  <button
                    onClick={() => setConicType('parabola')}
                    className={`px-3 py-1.5 rounded-lg font-bold ${conicType === 'parabola' ? 'bg-indigo-600 text-white' : 'border'}`}
                  >
                    Parabol (P)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Bán trục lớn a / tham số p</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={conicA}
                      onChange={(e) => setConicA(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 border rounded-lg text-center font-bold"
                    />
                  </div>
                  {conicType !== 'parabola' && (
                    <div>
                      <label className="text-[10px] text-slate-400 block">Bán trục bé b</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={conicB}
                        onChange={(e) => setConicB(parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border rounded-lg text-center font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line inputs */}
            {shapeMode === 'line' && (
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block">Hệ số a</label>
                  <input
                    type="number"
                    value={lineCoeffs.a}
                    onChange={(e) => setLineCoeffs({ ...lineCoeffs, a: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Hệ số b</label>
                  <input
                    type="number"
                    value={lineCoeffs.b}
                    onChange={(e) => setLineCoeffs({ ...lineCoeffs, b: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Hệ số c</label>
                  <input
                    type="number"
                    value={lineCoeffs.c}
                    onChange={(e) => setLineCoeffs({ ...lineCoeffs, c: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-center"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCompute}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Cập nhật số đo</span>
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

          {/* Triangle metrics results */}
          {shapeMode === 'triangle' && triInfo && !triInfo.isCollinear && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 font-mono text-xs">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Kết quả đo đạc & Bốn tâm của tam giác ABC:
              </span>

              {/* Area & Perimeter */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200">
                  <span className="text-indigo-600 block text-[10px]">DIỆN TÍCH S(ABC)</span>
                  <span className="text-2xl font-black text-indigo-950 dark:text-white mt-0.5 block">
                    {triInfo.area.toFixed(4).replace(/\.?0+$/, '')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                  <span className="text-slate-400 block text-[10px]">CHU VI & CÁC CẠNH</span>
                  <div className="text-[11px] text-slate-800 dark:text-slate-200 mt-1">
                    a = {triInfo.a.toFixed(2)}, b = {triInfo.b.toFixed(2)}, c = {triInfo.c.toFixed(2)}
                  </div>
                  <span className="font-bold text-slate-600 block mt-0.5">2p = {triInfo.perimeter.toFixed(2)}</span>
                </div>
              </div>

              {/* Four Centers */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg">
                  <span className="font-bold text-rose-700 dark:text-rose-400">Trọng tâm G:</span>
                  <span className="font-bold">
                    G({triInfo.centroid.x.toFixed(2)}, {triInfo.centroid.y.toFixed(2)})
                  </span>
                </div>

                {triInfo.circumcenter && (
                  <div className="flex items-center justify-between p-2 bg-sky-50/50 dark:bg-sky-950/20 rounded-lg">
                    <span className="font-bold text-sky-700 dark:text-sky-400">Tâm ngoại tiếp O:</span>
                    <span className="font-bold">
                      O({triInfo.circumcenter.x.toFixed(2)}, {triInfo.circumcenter.y.toFixed(2)}), R = {triInfo.rCircum.toFixed(2)}
                    </span>
                  </div>
                )}

                {triInfo.orthocenter && (
                  <div className="flex items-center justify-between p-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg">
                    <span className="font-bold text-purple-700 dark:text-purple-400">Trực tâm H:</span>
                    <span className="font-bold">
                      H({triInfo.orthocenter.x.toFixed(2)}, {triInfo.orthocenter.y.toFixed(2)})
                    </span>
                  </div>
                )}

                {triInfo.incenter && (
                  <div className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Tâm nội tiếp I:</span>
                    <span className="font-bold">
                      I({triInfo.incenter.x.toFixed(2)}, {triInfo.incenter.y.toFixed(2)}), r = {triInfo.rIn.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Interactive Canvas (6-7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Khung nhìn Oxy tương tác trực quan
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
              className="w-full h-full block"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
