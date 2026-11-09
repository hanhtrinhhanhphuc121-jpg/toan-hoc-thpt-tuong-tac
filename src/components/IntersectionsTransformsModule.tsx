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
  GitCommit,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  Vector3D,
  Plane3D,
  Line3D,
  intersectLineAndPlane3D,
  intersectTwoPlanes3D,
  projectPointOntoPlane3D,
  project3DTo2D,
} from '../utils/mathEngine';

interface TransformsProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type TransformTab = 'linePlane3D' | 'planes3D' | 'transformOxy';

export const IntersectionsTransformsModule: React.FC<TransformsProps> = ({ onSendToWhiteboard }) => {
  const [tab, setTab] = useState<TransformTab>('linePlane3D');

  // --- TAB 1: LINE & PLANE INTERSECTION IN OXYZ ---
  // Line d: x = 1, y = 2, z = t (Point M0(1, 2, 0), Dir u(0, 0, 1))
  // Plane (P): z = 3 (0x + 0y + 1z - 3 = 0)
  const [linePt, setLinePt] = useState<Vector3D>({ x: 1, y: 2, z: 0 });
  const [lineDir, setLineDir] = useState<Vector3D>({ x: 0, y: 0, z: 1 });
  const [plane, setPlane] = useState<Plane3D>({ A: 0, B: 0, C: 1, D: -3 }); // z = 3

  const [linePlaneResult, setLinePlaneResult] = useState<{
    type: 'intersect' | 'parallel' | 'contained';
    point?: Vector3D;
    t?: number;
    explanation: string;
  } | null>({
    type: 'intersect',
    point: { x: 1, y: 2, z: 3 },
    t: 3,
    explanation: 'Đường thẳng d cắt mặt phẳng (P) tại duy nhất một điểm (1, 2, 3) với tham số t = 3.',
  });

  // --- TAB 2: TWO PLANES INTERSECTION ---
  const [plane1, setPlane1] = useState<Plane3D>({ A: 1, B: 1, C: 0, D: -2 }); // x + y - 2 = 0
  const [plane2, setPlane2] = useState<Plane3D>({ A: 0, B: 1, C: 1, D: -3 }); // y + z - 3 = 0
  const [twoPlanesResult, setTwoPlanesResult] = useState<string>('Giao tuyến là đường thẳng đi qua ( -1, 3, 0 ) có VTCP ( 1, -1, 1 ).');

  // --- TAB 3: OXY TRANSFORMS ---
  const [oxyPoint, setOxyPoint] = useState<{ x: number; y: number }>({ x: 2, y: 3 });
  const [vectorV, setVectorV] = useState<{ x: number; y: number }>({ x: 3, y: -1 });
  const [transformedPoint, setTransformedPoint] = useState<{ x: number; y: number }>({ x: 5, y: 2 });

  // Camera angles for 3D
  const [yaw, setYaw] = useState<number>(0.65);
  const [pitch, setPitch] = useState<number>(0.35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute Line & Plane
  const handleComputeLinePlane = () => {
    const res = intersectLineAndPlane3D({ point: linePt, dir: lineDir }, plane);
    if (res.type === 'intersect' && res.point) {
      setLinePlaneResult({
        type: 'intersect',
        point: res.point,
        t: res.t,
        explanation: `Đường thẳng d cắt mặt phẳng (P) tại điểm (${res.point.x.toFixed(2)}, ${res.point.y.toFixed(2)}, ${res.point.z.toFixed(2)}) với t = ${res.t?.toFixed(2)}.`,
      });
    } else if (res.type === 'parallel') {
      setLinePlaneResult({
        type: 'parallel',
        explanation: 'Đường thẳng song song với mặt phẳng (không có điểm chung).',
      });
    } else {
      setLinePlaneResult({
        type: 'contained',
        explanation: 'Đường thẳng nằm hoàn toàn trong mặt phẳng (vô số điểm chung).',
      });
    }
  };

  const handleReset = () => {
    // Test Case: line x=1, y=2, z=t and plane z=3 -> (1, 2, 3)
    setLinePt({ x: 1, y: 2, z: 0 });
    setLineDir({ x: 0, y: 0, z: 1 });
    setPlane({ A: 0, B: 0, C: 1, D: -3 });
    handleComputeLinePlane();
  };

  // Draw 3D or 2D Canvas
  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (tab === 'linePlane3D') {
      const center = { x: w / 2, y: h / 2 };
      const scale = 36;
      const project = (pt: Vector3D) => project3DTo2D(pt, center, scale, yaw, pitch);

      // Axes
      const o = project({ x: 0, y: 0, z: 0 });
      const xA = project({ x: 5, y: 0, z: 0 });
      const yA = project({ x: 0, y: 5, z: 0 });
      const zA = project({ x: 0, y: 0, z: 5 });

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
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

      // Plane z = 3 (polygon at z=3)
      const zPlane = -plane.D / (plane.C || 1);
      const corners: Vector3D[] = [
        { x: -3.5, y: -3.5, z: zPlane },
        { x: 3.5, y: -3.5, z: zPlane },
        { x: 3.5, y: 3.5, z: zPlane },
        { x: -3.5, y: 3.5, z: zPlane },
      ];

      ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
      ctx.beginPath();
      corners.forEach((c, idx) => {
        const sc = project(c);
        if (idx === 0) ctx.moveTo(sc.x, sc.y);
        else ctx.lineTo(sc.x, sc.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Line d: x = 1, y = 2, z from -1 to 5
      const p1 = project({ x: linePt.x - 2 * lineDir.x, y: linePt.y - 2 * lineDir.y, z: linePt.z - 2 * lineDir.z });
      const p2 = project({ x: linePt.x + 5 * lineDir.x, y: linePt.y + 5 * lineDir.y, z: linePt.z + 5 * lineDir.z });

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Intersection Point M(1, 2, 3)
      if (linePlaneResult?.point) {
        const scM = project(linePlaneResult.point);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(scM.x, scM.y, 6.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.fillText(
          `M(${linePlaneResult.point.x}, ${linePlaneResult.point.y}, ${linePlaneResult.point.z})`,
          scM.x + 8,
          scM.y - 6
        );
      }
    } else {
      // 2D Canvas for Oxy Transforms
      const ox = w / 2;
      const oy = h / 2;
      const scale = 32;

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = -8; x <= 8; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * scale, 0);
        ctx.lineTo(ox + x * scale, h);
        ctx.stroke();
      }
      for (let y = -6; y <= 6; y++) {
        ctx.beginPath();
        ctx.moveTo(0, oy - y * scale);
        ctx.lineTo(w, oy - y * scale);
        ctx.stroke();
      }

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, oy);
      ctx.lineTo(w, oy);
      ctx.moveTo(ox, 0);
      ctx.lineTo(ox, h);
      ctx.stroke();

      // Vector arrow v
      const vStart = { x: ox, y: oy };
      const vEnd = { x: ox + vectorV.x * scale, y: oy - vectorV.y * scale };
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vStart.x, vStart.y);
      ctx.lineTo(vEnd.x, vEnd.y);
      ctx.stroke();

      // Point A and A'
      const sA = { x: ox + oxyPoint.x * scale, y: oy - oxyPoint.y * scale };
      const sA2 = { x: ox + transformedPoint.x * scale, y: oy - transformedPoint.y * scale };

      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(sA.x, sA.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`A(${oxyPoint.x}, ${oxyPoint.y})`, sA.x + 8, sA.y - 4);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(sA2.x, sA2.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(`A'(${transformedPoint.x}, ${transformedPoint.y})`, sA2.x + 8, sA2.y - 4);

      // Dash translation line
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sA.x, sA.y);
      ctx.lineTo(sA2.x, sA2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    handleComputeLinePlane();
  }, [linePt, lineDir, plane]);

  useEffect(() => {
    setTimeout(drawScene, 30);
  }, [tab, linePt, lineDir, plane, linePlaneResult, oxyPoint, vectorV, transformedPoint, yaw, pitch]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
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
    a.download = `GiaoVaBienHinh_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setTab('linePlane3D')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'linePlane3D' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Giao điểm Đường thẳng & Mặt phẳng (Oxyz)
        </button>
        <button
          onClick={() => setTab('planes3D')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'planes3D' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Giao tuyến hai Mặt phẳng
        </button>
        <button
          onClick={() => setTab('transformOxy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'transformOxy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Phép biến hình (Tịnh tiến, Đối xứng)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Equation Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tab === 'linePlane3D'
                  ? 'Giao điểm d và (P)'
                  : tab === 'planes3D'
                  ? 'Hai mặt phẳng (P₁) và (P₂)'
                  : 'Phép tịnh tiến Oxy'}
              </span>

              {tab === 'linePlane3D' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                  <button
                    onClick={handleReset}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test: x=1, y=2, z=t cắt z=3
                  </button>
                </div>
              )}
            </div>

            {/* Line & Plane Inputs */}
            {tab === 'linePlane3D' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-2">
                  <span className="font-bold text-purple-700 dark:text-purple-300 block font-sans">
                    Đường thẳng d: Đi qua M₀(x₀,y₀,z₀) có VTCP u(a,b,c):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={linePt.x}
                      onChange={(e) => setLinePt({ ...linePt, x: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="x0"
                    />
                    <input
                      type="number"
                      value={linePt.y}
                      onChange={(e) => setLinePt({ ...linePt, y: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="y0"
                    />
                    <input
                      type="number"
                      value={linePt.z}
                      onChange={(e) => setLinePt({ ...linePt, z: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="z0"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <input
                      type="number"
                      value={lineDir.x}
                      onChange={(e) => setLineDir({ ...lineDir, x: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="ux"
                    />
                    <input
                      type="number"
                      value={lineDir.y}
                      onChange={(e) => setLineDir({ ...lineDir, y: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="uy"
                    />
                    <input
                      type="number"
                      value={lineDir.z}
                      onChange={(e) => setLineDir({ ...lineDir, z: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center font-bold"
                      placeholder="uz"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-2">
                  <span className="font-bold text-sky-700 dark:text-sky-300 block font-sans">
                    Mặt phẳng (P): Ax + By + Cz + D = 0:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      value={plane.A}
                      onChange={(e) => setPlane({ ...plane, A: parseFloat(e.target.value) || 0 })}
                      className="px-1.5 py-1 border rounded text-center"
                    />
                    <input
                      type="number"
                      value={plane.B}
                      onChange={(e) => setPlane({ ...plane, B: parseFloat(e.target.value) || 0 })}
                      className="px-1.5 py-1 border rounded text-center"
                    />
                    <input
                      type="number"
                      value={plane.C}
                      onChange={(e) => setPlane({ ...plane, C: parseFloat(e.target.value) || 0 })}
                      className="px-1.5 py-1 border rounded text-center font-bold"
                    />
                    <input
                      type="number"
                      value={plane.D}
                      onChange={(e) => setPlane({ ...plane, D: parseFloat(e.target.value) || 0 })}
                      className="px-1.5 py-1 border rounded text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleComputeLinePlane}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tìm giao điểm</span>
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
          {tab === 'linePlane3D' && linePlaneResult && (
            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-2 font-mono">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Kết luận tương giao:
              </span>
              <div className="text-2xl font-black text-indigo-950 dark:text-white">
                {linePlaneResult.point ? (
                  `Giao điểm M(${linePlaneResult.point.x}, ${linePlaneResult.point.y}, ${linePlaneResult.point.z})`
                ) : (
                  linePlaneResult.explanation
                )}
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-sans mt-1">
                {linePlaneResult.explanation}
              </p>
            </div>
          )}

        </div>

        {/* Right: 3D Visualization (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Mô hình tương giao trực quan (Kéo chuột để xoay 3D)
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

          <div className="flex-1 min-h-[420px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 overflow-hidden cursor-grab active:cursor-grabbing">
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
