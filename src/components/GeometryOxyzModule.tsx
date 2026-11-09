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
  Eye,
  Box,
  Compass,
} from 'lucide-react';
import {
  Vector3D,
  Plane3D,
  Line3D,
  distancePointToPlane3D,
  project3DTo2D,
} from '../utils/mathEngine';

interface GeometryOxyzProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type OxyzEntity = 'pointPlane' | 'line' | 'sphere' | 'box';

export const GeometryOxyzModule: React.FC<GeometryOxyzProps> = ({ onSendToWhiteboard }) => {
  const [entityMode, setEntityMode] = useState<OxyzEntity>('pointPlane');

  // Point A and Plane: Ax + By + Cz + D = 0
  const [ptA, setPtA] = useState<Vector3D>({ x: 1, y: 2, z: 3 }); // Test Case: distance to z=0 is 3
  const [plane, setPlane] = useState<Plane3D>({ A: 0, B: 0, C: 1, D: 0 }); // z = 0

  // Line: M0 + t * u
  const [linePt, setLinePt] = useState<Vector3D>({ x: 1, y: 2, z: 0 });
  const [lineDir, setLineDir] = useState<Vector3D>({ x: 0, y: 0, z: 1 });

  // Sphere: Center I(a, b, c), Radius R
  const [sphereI, setSphereI] = useState<Vector3D>({ x: 0, y: 0, z: 0 });
  const [sphereR, setSphereR] = useState<number>(2);

  // 3D View Camera parameters
  const [yaw, setYaw] = useState<number>(0.65); // Angle around Y
  const [pitch, setPitch] = useState<number>(0.35); // Angle around X
  const [scale, setScale] = useState<number>(35);

  const [distanceResult, setDistanceResult] = useState<number | null>(3);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute distance
  const handleCompute = () => {
    const d = distancePointToPlane3D(ptA, plane);
    setDistanceResult(d);
  };

  const handleReset = () => {
    // Test Case: A(1, 2, 3), Plane z = 0
    setPtA({ x: 1, y: 2, z: 3 });
    setPlane({ A: 0, B: 0, C: 1, D: 0 });
    setYaw(0.65);
    setPitch(0.35);
    setScale(35);
    setDistanceResult(3);
  };

  const setViewPreset = (preset: 'default' | 'ox' | 'oy' | 'oz' | 'iso') => {
    if (preset === 'default') {
      setYaw(0.65);
      setPitch(0.35);
    } else if (preset === 'ox') {
      setYaw(Math.PI / 2);
      setPitch(0);
    } else if (preset === 'oy') {
      setYaw(0);
      setPitch(Math.PI / 2);
    } else if (preset === 'oz') {
      setYaw(0);
      setPitch(0);
    } else if (preset === 'iso') {
      setYaw(Math.PI / 4);
      setPitch(Math.atan(1 / Math.SQRT2));
    }
  };

  // Canvas 3D rendering
  const draw3D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const center = { x: w / 2, y: h / 2 };

    const project = (pt: Vector3D) => project3DTo2D(pt, center, scale, yaw, pitch);

    // Draw 3D Axes: Ox (red), Oy (green), Oz (blue)
    const o = project({ x: 0, y: 0, z: 0 });
    const xAx = project({ x: 5, y: 0, z: 0 });
    const yAx = project({ x: 0, y: 5, z: 0 });
    const zAx = project({ x: 0, y: 0, z: 5 });

    const drawAxis = (to: { x: number; y: number }, color: string, label: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(label, to.x + 4, to.y - 4);
    };

    drawAxis(xAx, '#ef4444', 'Ox');
    drawAxis(yAx, '#10b981', 'Oy');
    drawAxis(zAx, '#3b82f6', 'Oz');

    // Draw Grid Plane z = 0
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const p1 = project({ x: i, y: -4, z: 0 });
      const p2 = project({ x: i, y: 4, z: 0 });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = project({ x: -4, y: i, z: 0 });
      const p4 = project({ x: 4, y: i, z: 0 });
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // MODE 1: POINT & PLANE
    if (entityMode === 'pointPlane') {
      // Draw plane as quad
      const pCorners: Vector3D[] = [
        { x: -4, y: -4, z: 0 },
        { x: 4, y: -4, z: 0 },
        { x: 4, y: 4, z: 0 },
        { x: -4, y: 4, z: 0 },
      ];
      // If plane is not z=0, shift z
      if (plane.C !== 0) {
        pCorners.forEach((c) => {
          c.z = (-plane.A * c.x - plane.B * c.y - plane.D) / plane.C;
        });
      }

      ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
      ctx.beginPath();
      pCorners.forEach((c, idx) => {
        const sc = project(c);
        if (idx === 0) ctx.moveTo(sc.x, sc.y);
        else ctx.lineTo(sc.x, sc.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Point A
      const scA = project(ptA);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(scA.x, scA.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.fillText(`A(${ptA.x}, ${ptA.y}, ${ptA.z})`, scA.x + 8, scA.y - 6);

      // Projection of A on plane z=0: A'(x, y, 0)
      const projA = { x: ptA.x, y: ptA.y, z: (-plane.A * ptA.x - plane.B * ptA.y - plane.D) / (plane.C || 1) };
      const scProj = project(projA);

      // Distance line (perpendicular)
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(scA.x, scA.y);
      ctx.lineTo(scProj.x, scProj.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(scProj.x, scProj.y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Label distance
      const midSc = { x: (scA.x + scProj.x) / 2, y: (scA.y + scProj.y) / 2 };
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`d = ${distanceResult?.toFixed(2)}`, midSc.x + 6, midSc.y);
    }

    // MODE 2: LINE
    if (entityMode === 'line') {
      const p1 = project({
        x: linePt.x - 4 * lineDir.x,
        y: linePt.y - 4 * lineDir.y,
        z: linePt.z - 4 * lineDir.z,
      });
      const p2 = project({
        x: linePt.x + 4 * lineDir.x,
        y: linePt.y + 4 * lineDir.y,
        z: linePt.z + 4 * lineDir.z,
      });

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const pM0 = project(linePt);
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(pM0.x, pM0.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(`M₀(${linePt.x}, ${linePt.y}, ${linePt.z})`, pM0.x + 6, pM0.y - 4);
    }

    // MODE 3: SPHERE
    if (entityMode === 'sphere') {
      const scI = project(sphereI);
      const rPx = sphereR * scale;

      ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.beginPath();
      ctx.arc(scI.x, scI.y, rPx, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Equator circle in 3D
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let a = 0; a <= 2 * Math.PI; a += 0.1) {
        const pt = {
          x: sphereI.x + sphereR * Math.cos(a),
          y: sphereI.y + sphereR * Math.sin(a),
          z: sphereI.z,
        };
        const sc = project(pt);
        if (a === 0) ctx.moveTo(sc.x, sc.y);
        else ctx.lineTo(sc.x, sc.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // MODE 4: SAMPLE BOX / CUBE
    if (entityMode === 'box') {
      const s = 1.5;
      const boxVerts: Vector3D[] = [
        { x: -s, y: -s, z: 0 },
        { x: s, y: -s, z: 0 },
        { x: s, y: s, z: 0 },
        { x: -s, y: s, z: 0 },
        { x: -s, y: -s, z: 2 * s },
        { x: s, y: -s, z: 2 * s },
        { x: s, y: s, z: 2 * s },
        { x: -s, y: s, z: 2 * s },
      ];

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // top
        [0, 4], [1, 5], [2, 6], [3, 7], // pillars
      ];

      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      for (const [v1, v2] of edges) {
        const sc1 = project(boxVerts[v1]);
        const sc2 = project(boxVerts[v2]);
        ctx.beginPath();
        ctx.moveTo(sc1.x, sc1.y);
        ctx.lineTo(sc2.x, sc2.y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    handleCompute();
  }, [entityMode, ptA, plane, linePt, lineDir, sphereI, sphereR]);

  useEffect(() => {
    setTimeout(draw3D, 30);
  }, [entityMode, ptA, plane, linePt, lineDir, sphereI, sphereR, yaw, pitch, scale, distanceResult]);

  // Mouse 3D rotation dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    setYaw((prev) => prev + dx * 0.01);
    setPitch((prev) => Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, prev - dy * 0.01)));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    setScale((prev) => Math.max(15, Math.min(80, prev - e.deltaY * 0.05)));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `HinhOxyz_${Date.now()}.png`;
    a.click();
  };

  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendToWhiteboard) return;
    onSendToWhiteboard(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Entity Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setEntityMode('pointPlane')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            entityMode === 'pointPlane' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Điểm & Mặt phẳng (Khoảng cách)
        </button>
        <button
          onClick={() => setEntityMode('line')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            entityMode === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Đường thẳng 3D
        </button>
        <button
          onClick={() => setEntityMode('sphere')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            entityMode === 'sphere' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Mặt cầu (S)
        </button>
        <button
          onClick={() => setEntityMode('box')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            entityMode === 'box' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Khối hộp mẫu 3D
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Input coordinates & Equations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {entityMode === 'pointPlane'
                  ? 'Tọa độ Điểm & Mặt phẳng'
                  : entityMode === 'line'
                  ? 'Phương trình Đường thẳng 3D'
                  : entityMode === 'sphere'
                  ? 'Phương trình Mặt cầu'
                  : 'Kích thước khối hộp 3D'}
              </span>

              {entityMode === 'pointPlane' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                  <button
                    onClick={handleReset}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                  >
                    Test: d(A(1,2,3), z=0) = 3
                  </button>
                </div>
              )}
            </div>

            {/* Point & Plane inputs */}
            {entityMode === 'pointPlane' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-2">
                  <span className="font-bold text-indigo-600 block">Tọa độ điểm A(x₀, y₀, z₀):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={ptA.x}
                      onChange={(e) => setPtA({ ...ptA, x: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="x"
                    />
                    <input
                      type="number"
                      value={ptA.y}
                      onChange={(e) => setPtA({ ...ptA, y: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center"
                      placeholder="y"
                    />
                    <input
                      type="number"
                      value={ptA.z}
                      onChange={(e) => setPtA({ ...ptA, z: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1.5 border rounded-lg text-center font-bold"
                      placeholder="z"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-2">
                  <span className="font-bold text-sky-600 block">Mặt phẳng (P): Ax + By + Cz + D = 0:</span>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block text-center">A</span>
                      <input
                        type="number"
                        value={plane.A}
                        onChange={(e) => setPlane({ ...plane, A: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block text-center">B</span>
                      <input
                        type="number"
                        value={plane.B}
                        onChange={(e) => setPlane({ ...plane, B: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block text-center">C</span>
                      <input
                        type="number"
                        value={plane.C}
                        onChange={(e) => setPlane({ ...plane, C: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block text-center">D</span>
                      <input
                        type="number"
                        value={plane.D}
                        onChange={(e) => setPlane({ ...plane, D: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1 border rounded text-center"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans block">
                    Phương trình hiện tại: {plane.A}x + {plane.B}y + {plane.C}z + {plane.D} = 0
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCompute}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tính toán</span>
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

          {/* Metric Results */}
          {entityMode === 'pointPlane' && distanceResult !== null && (
            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-2 font-mono">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block font-sans">
                Khoảng cách từ điểm A đến mặt phẳng (P):
              </span>
              <div className="text-3xl font-black text-indigo-950 dark:text-white">
                d(A, (P)) = {distanceResult.toFixed(4).replace(/\.?0+$/, '')}
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1 pt-1 font-sans">
                <p>Công thức: d = |A·x₀ + B·y₀ + C·z₀ + D| / √(A² + B² + C²)</p>
                <p>
                  Thay số: |{plane.A}·({ptA.x}) + {plane.B}·({ptA.y}) + {plane.C}·({ptA.z}) + {plane.D}| / √({plane.A}² + {plane.B}² + {plane.C}²) = {distanceResult}
                </p>
              </div>
            </div>
          )}

          {/* Camera Presets Card */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Góc nhìn không gian (View Presets):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setViewPreset('default')}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium"
              >
                Mặc định
              </button>
              <button
                onClick={() => setViewPreset('iso')}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium"
              >
                Trục đo (Isometric)
              </button>
              <button
                onClick={() => setViewPreset('oz')}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium"
              >
                Nhìn từ trên (z)
              </button>
              <button
                onClick={() => setViewPreset('ox')}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium"
              >
                Nhìn từ cạnh (x)
              </button>
            </div>
          </div>

        </div>

        {/* Right: Interactive 3D Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Khung nhìn không gian Oxyz (Kéo chuột để xoay 3D, cuộn để phóng to/thu nhỏ)
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
              onWheel={handleWheel}
              className="w-full h-full block"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
