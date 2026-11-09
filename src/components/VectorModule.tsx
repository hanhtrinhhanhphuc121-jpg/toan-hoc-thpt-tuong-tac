/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Play, RotateCcw, Share2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Vector3D,
  vectorAdd,
  vectorSub,
  vectorDot,
  vectorMag,
  vectorCross,
  vectorAngleDeg,
} from '../utils/mathEngine';

interface VectorProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const VectorModule: React.FC<VectorProps> = ({ onSendToWhiteboard }) => {
  const [is3D, setIs3D] = useState<boolean>(true);

  // Vector u and v
  const [u, setU] = useState<Vector3D>({ x: 1, y: 2, z: 3 });
  const [v, setV] = useState<Vector3D>({ x: 4, y: 5, z: 6 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Computations
  const sumVec = vectorAdd(u, v);
  const diffVec = vectorSub(u, v);
  const dotVal = vectorDot(u, v);
  const crossVec = vectorCross(u, v); // (1,2,3) x (4,5,6) = (-3, 6, -3)
  const magU = vectorMag(u);
  const magV = vectorMag(v);

  // Check zero vector
  const isZeroU = magU < 1e-12;
  const isZeroV = magV < 1e-12;
  const hasZeroVector = isZeroU || isZeroV;

  let angleDeg: number | null = null;
  let angleNote = '';
  if (hasZeroVector) {
    angleNote = 'Góc không xác định do tồn tại vectơ không 0⃗ (độ dài bằng 0).';
  } else {
    angleDeg = vectorAngleDeg(u, v);
  }

  // Projection of u on v: proj = (u.v / |v|^2) * v
  const projScalar = magV > 1e-12 ? dotVal / (magV * magV) : 0;
  const projVec: Vector3D = {
    x: projScalar * v.x,
    y: projScalar * v.y,
    z: projScalar * v.z,
  };

  // Draw 2D Vector Canvas (Parallelogram & Projection illustration)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2 - 50;
    const cy = height / 2 + 50;
    const scale = 24;

    // Coordinate Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, cy);
    ctx.lineTo(width - 15, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, height - 15);
    ctx.lineTo(cx, 15);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Ox', width - 25, cy - 6);
    ctx.fillText('Oy', cx + 6, 25);

    const drawVector = (fromX: number, fromY: number, toX: number, toY: number, color: string, label: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const head = 10;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(label, toX + 6, toY - 6);
      ctx.restore();
    };

    const uPx = cx + u.x * scale;
    const uPy = cy - u.y * scale;
    const vPx = cx + v.x * scale;
    const vPy = cy - v.y * scale;
    const sumPx = cx + sumVec.x * scale;
    const sumPy = cy - sumVec.y * scale;
    const projPx = cx + projVec.x * scale;
    const projPy = cy - projVec.y * scale;

    // Parallelogram dashed lines
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(uPx, uPy);
    ctx.lineTo(sumPx, sumPy);
    ctx.lineTo(vPx, vPy);
    ctx.stroke();

    // Projection perpendicular line from tip of u to projection on v
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(uPx, uPy);
    ctx.lineTo(projPx, projPy);
    ctx.stroke();
    ctx.restore();

    // Draw Vector v
    drawVector(cx, cy, vPx, vPy, '#0284c7', `v⃗(${v.x}, ${v.y})`);

    // Draw Vector u
    drawVector(cx, cy, uPx, uPy, '#4f46e5', `u⃗(${u.x}, ${u.y})`);

    // Draw Vector u + v
    drawVector(cx, cy, sumPx, sumPy, '#16a34a', `(u⃗+v⃗)`);

    // Draw Projection point
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(projPx, projPy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`Hình chiếu u⃗ lên v⃗`, projPx + 6, projPy + 14);
  }, [u, v, sumVec, projVec]);

  // Export PNG & Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vecto_${Date.now()}.png`;
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
            Hình học Vectơ 2D / 3D, Tích có hướng & Hình chiếu
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIs3D(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !is3D ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              Mặt phẳng 2D
            </button>
            <button
              onClick={() => setIs3D(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                is3D ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              Không gian 3D
            </button>

            <button
              onClick={() => {
                setIs3D(true);
                setU({ x: 1, y: 2, z: 3 });
                setV({ x: 4, y: 5, z: 6 });
              }}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100 ml-1"
            >
              Test: (1,2,3) × (4,5,6)
            </button>
            <button
              onClick={() => {
                setU({ x: 0, y: 0, z: 0 });
                setV({ x: 4, y: 5, z: 6 });
              }}
              className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium"
            >
              Vectơ không (Góc không xác định)
            </button>
            <button
              onClick={() => {
                setU({ x: 1, y: 2, z: 3 });
                setV({ x: 4, y: 5, z: 6 });
                setIs3D(true);
              }}
              className="p-1.5 border rounded-lg text-slate-500 hover:bg-slate-100"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
              Tọa độ vectơ u⃗ = ({is3D ? 'x, y, z' : 'x, y'}):
            </span>
            <div className="flex items-center gap-2 font-mono text-sm">
              <input
                type="number"
                step="any"
                value={u.x}
                onChange={(e) => setU({ ...u, x: parseFloat(e.target.value) || 0 })}
                className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                placeholder="x"
              />
              <input
                type="number"
                step="any"
                value={u.y}
                onChange={(e) => setU({ ...u, y: parseFloat(e.target.value) || 0 })}
                className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                placeholder="y"
              />
              {is3D && (
                <input
                  type="number"
                  step="any"
                  value={u.z}
                  onChange={(e) => setU({ ...u, z: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                  placeholder="z"
                />
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/20 dark:bg-sky-950/20 space-y-2">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
              Tọa độ vectơ v⃗ = ({is3D ? 'x, y, z' : 'x, y'}):
            </span>
            <div className="flex items-center gap-2 font-mono text-sm">
              <input
                type="number"
                step="any"
                value={v.x}
                onChange={(e) => setV({ ...v, x: parseFloat(e.target.value) || 0 })}
                className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                placeholder="x"
              />
              <input
                type="number"
                step="any"
                value={v.y}
                onChange={(e) => setV({ ...v, y: parseFloat(e.target.value) || 0 })}
                className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                placeholder="y"
              />
              {is3D && (
                <input
                  type="number"
                  step="any"
                  value={v.z}
                  onChange={(e) => setV({ ...v, z: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
                  placeholder="z"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Results on Left (6 cols) */}
        <div className="lg:col-span-6 space-y-3 font-mono text-xs">
          
          {/* 3D Cross Product */}
          {is3D && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
              <span className="text-indigo-800 dark:text-indigo-300 block font-bold text-[11px] uppercase tracking-wider">
                Tích có hướng [u⃗, v⃗] = u⃗ × v⃗:
              </span>
              <div className="text-xl font-black text-indigo-950 dark:text-white mt-1">
                [u⃗, v⃗] = ({crossVec.x}, {crossVec.y}, {crossVec.z})
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 block">
                Công thức: (y₁z₂ - z₁y₂, z₁x₂ - x₁z₂, x₁y₂ - y₁x₂) = ({u.y}·{v.z} - {u.z}·{v.y}, {u.z}·{v.x} - {u.x}·{v.z}, {u.x}·{v.y} - {u.y}·{v.x})
              </span>
            </div>
          )}

          {/* Dot Product */}
          <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 space-y-1">
            <span className="text-slate-400 block font-bold text-[10px] uppercase">
              Tích vô hướng u⃗ · v⃗ = x₁x₂ + y₁y₂{is3D ? ' + z₁z₂' : ''}:
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              = ({u.x})·({v.x}) + ({u.y})·({v.y}){is3D ? ` + (${u.z})·(${v.z})` : ''} = {dotVal}
            </div>
          </div>

          {/* Angle condition & Angle value */}
          <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 space-y-1">
            <span className="text-slate-400 block font-bold text-[10px] uppercase">
              Góc giữa hai vectơ (u⃗, v⃗):
            </span>
            {hasZeroVector ? (
              <div className="flex items-center gap-2 text-rose-600 font-bold text-xs mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{angleNote}</span>
              </div>
            ) : (
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                cos(u⃗, v⃗) = {Math.max(-1, Math.min(1, dotVal / (magU * magV))).toFixed(4)}  ⇒  (u⃗, v⃗) = {angleDeg?.toFixed(2)}°
              </div>
            )}
          </div>

          {/* Magnitudes */}
          <div className="grid grid-cols-2 gap-3 text-slate-800 dark:text-slate-200">
            <div className="p-3 rounded-xl border bg-white dark:bg-slate-900">
              <span className="text-slate-400 block font-bold text-[10px]">Độ dài |u⃗|:</span>
              <span className="font-bold text-sm">
                √({u.x*u.x + u.y*u.y + (is3D ? u.z*u.z : 0)}) ≈ {magU.toFixed(3)}
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-white dark:bg-slate-900">
              <span className="text-slate-400 block font-bold text-[10px]">Độ dài |v⃗|:</span>
              <span className="font-bold text-sm">
                √({v.x*v.x + v.y*v.y + (is3D ? v.z*v.z : 0)}) ≈ {magV.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Projection vector */}
          <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 space-y-0.5">
            <span className="text-slate-400 block font-bold text-[10px] uppercase">
              Hình chiếu vuông góc của u⃗ lên v⃗ (Vector Projection):
            </span>
            <div className="font-bold text-sm text-amber-600 dark:text-amber-400">
              proj_v⃗(u⃗) = ({projVec.x.toFixed(2)}, {projVec.y.toFixed(2)}{is3D ? `, ${projVec.z.toFixed(2)}` : ''})
            </div>
          </div>

          {/* Sum & Diff */}
          <div className="grid grid-cols-2 gap-3 text-slate-800 dark:text-slate-200">
            <div className="p-3 rounded-xl border bg-white dark:bg-slate-900">
              <span className="text-slate-400 block font-bold text-[10px]">Tổng u⃗ + v⃗:</span>
              <span className="font-bold text-sm">({sumVec.x}, {sumVec.y}{is3D ? `, ${sumVec.z}` : ''})</span>
            </div>
            <div className="p-3 rounded-xl border bg-white dark:bg-slate-900">
              <span className="text-slate-400 block font-bold text-[10px]">Hiệu u⃗ - v⃗:</span>
              <span className="font-bold text-sm">({diffVec.x}, {diffVec.y}{is3D ? `, ${diffVec.z}` : ''})</span>
            </div>
          </div>
        </div>

        {/* RIGHT: 2D Canvas Illustration with Parallelogram & Projection (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Minh họa hình học (Phép cộng & Hình chiếu)
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

          <div className="flex-1 min-h-[350px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} width={430} height={350} className="block" />
          </div>
        </div>

      </div>

    </div>
  );
};
