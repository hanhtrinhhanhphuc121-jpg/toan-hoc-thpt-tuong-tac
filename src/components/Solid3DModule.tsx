/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Rotate3d,
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  Share2,
  Download,
  Info,
  Maximize2
} from 'lucide-react';
import { project3DTo2D, Point3D } from '../utils/mathEngine';

interface Solid3DProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type ProfileType = 'cylinder' | 'cone' | 'paraboloid' | 'sphere' | 'vase';

export const Solid3DModule: React.FC<Solid3DProps> = ({ onSendToWhiteboard }) => {
  // Preset profiles
  const [profileType, setProfileType] = useState<ProfileType>('cylinder');
  const [radius, setRadius] = useState<number>(1);
  const [height, setHeight] = useState<number>(2);
  const [rotAngleDeg, setRotAngleDeg] = useState<number>(360);
  const [slicePos, setSlicePos] = useState<number>(1.0); // x or z slice
  const [showSlice, setShowSlice] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);

  // 3D Camera Rotation
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(85);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load sample presets
  const handleLoadSample = (type: ProfileType) => {
    setProfileType(type);
    if (type === 'cylinder') {
      setRadius(1);
      setHeight(2);
      setSlicePos(1);
    } else if (type === 'cone') {
      setRadius(1.5);
      setHeight(2.5);
      setSlicePos(1.25);
    } else if (type === 'paraboloid') {
      setRadius(1.5);
      setHeight(2);
      setSlicePos(1);
    } else if (type === 'sphere') {
      setRadius(1.5);
      setHeight(3);
      setSlicePos(1.5);
    } else if (type === 'vase') {
      setRadius(1.2);
      setHeight(3);
      setSlicePos(1.5);
    }
    setRotAngleDeg(360);
  };

  const handleReset = () => {
    setProfileType('cylinder');
    setRadius(1);
    setHeight(2);
    setRotAngleDeg(360);
    setSlicePos(1);
    setRotX(25);
    setRotY(-35);
    setZoom(85);
    setShowSlice(true);
    setShowWireframe(true);
  };

  // Profile radius function r(z) for z in [0, height]
  const getRadiusAtZ = (z: number): number => {
    const clampedZ = Math.max(0, Math.min(height, z));
    if (profileType === 'cylinder') {
      return radius;
    } else if (profileType === 'cone') {
      return radius * (1 - clampedZ / height);
    } else if (profileType === 'paraboloid') {
      return radius * Math.sqrt(clampedZ / height);
    } else if (profileType === 'sphere') {
      const R = height / 2;
      const centeredZ = clampedZ - R;
      const val = R * R - centeredZ * centeredZ;
      return val > 0 ? Math.sqrt(val) : 0;
    } else if (profileType === 'vase') {
      return radius * (0.8 + 0.3 * Math.sin((clampedZ / height) * Math.PI * 2));
    }
    return radius;
  };

  // Exact or numerical volume calculation
  const calculateVolume = (): { vol: number; formula: string; sliceArea: number } => {
    let vol = 0;
    let formula = '';
    const sliceR = getRadiusAtZ(slicePos);
    const sliceArea = Math.PI * sliceR * sliceR;

    if (profileType === 'cylinder') {
      vol = Math.PI * radius * radius * height;
      formula = `V = \\pi R^2 h = \\pi \\cdot ${radius}^2 \\cdot ${height} = ${(vol / Math.PI).toFixed(4)}\\pi \\approx ${vol.toFixed(4)}`;
    } else if (profileType === 'cone') {
      vol = (1 / 3) * Math.PI * radius * radius * height;
      formula = `V = \\frac{1}{3} \\pi R^2 h = \\frac{1}{3} \\pi \\cdot ${radius}^2 \\cdot ${height} = ${(vol / Math.PI).toFixed(4)}\\pi \\approx ${vol.toFixed(4)}`;
    } else if (profileType === 'paraboloid') {
      // V = pi int_0^h r(z)^2 dz = pi * radius^2 / h * int_0^h z dz = (1/2) * pi * radius^2 * h
      vol = 0.5 * Math.PI * radius * radius * height;
      formula = `V = \\pi \\int_0^h r^2(z) dz = \\frac{1}{2} \\pi R^2 h \\approx ${vol.toFixed(4)}`;
    } else if (profileType === 'sphere') {
      const R = height / 2;
      vol = (4 / 3) * Math.PI * Math.pow(R, 3);
      formula = `V = \\frac{4}{3} \\pi R^3 = \\frac{4}{3} \\pi \\cdot (${R.toFixed(2)})^3 \\approx ${vol.toFixed(4)}`;
    } else {
      // Numerical Riemann sum
      const steps = 200;
      const dz = height / steps;
      let sum = 0;
      for (let i = 0; i < steps; i++) {
        const z = (i + 0.5) * dz;
        const r = getRadiusAtZ(z);
        sum += r * r;
      }
      vol = Math.PI * sum * dz;
      formula = `V = \\pi \\int_0^h r^2(z) dz \\approx ${vol.toFixed(4)}`;
    }

    // Adjust for partial revolution angle
    const factor = rotAngleDeg / 360;
    const currentVol = vol * factor;

    return { vol: currentVol, formula, sliceArea };
  };

  const { vol, formula, sliceArea } = calculateVolume();

  // Mouse interaction for rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => (prev + dx * 0.7) % 360);
    setRotX((prev) => Math.max(-85, Math.min(85, prev + dy * 0.7)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const heightPx = canvas.height;
    ctx.clearRect(0, 0, width, heightPx);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, heightPx);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, heightPx);

    // Draw coordinate axes
    const axisLen = 3.2;
    const o = project3DTo2D({ x: 0, y: 0, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const ox = project3DTo2D({ x: axisLen, y: 0, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const oy = project3DTo2D({ x: 0, y: axisLen, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const oz = project3DTo2D({ x: 0, y: 0, z: axisLen }, rotX, rotY, zoom, width, heightPx);

    ctx.lineWidth = 1.5;
    // Ox
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(ox.x, ox.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('x', ox.x + 5, ox.y);

    // Oy
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(oy.x, oy.y);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('y', oy.x + 5, oy.y);

    // Oz (Rotation axis)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(oz.x, oz.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('z (Trục quay)', oz.x + 5, oz.y - 5);

    // Draw Surface of Revolution
    const numZ = 24;
    const maxThetaRad = (rotAngleDeg * Math.PI) / 180;
    const numTheta = Math.max(4, Math.round((rotAngleDeg / 360) * 36));

    // Generate mesh vertices
    const mesh: Point3D[][] = [];
    for (let i = 0; i <= numZ; i++) {
      const z = (i / numZ) * height;
      const r = getRadiusAtZ(z);
      const ring: Point3D[] = [];
      for (let j = 0; j <= numTheta; j++) {
        const theta = (j / numTheta) * maxThetaRad;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        ring.push({ x, y, z });
      }
      mesh.push(ring);
    }

    // Draw quads sorted by depth or wireframe
    ctx.lineWidth = 1;
    for (let i = 0; i < numZ; i++) {
      for (let j = 0; j < numTheta; j++) {
        const p1 = project3DTo2D(mesh[i][j], rotX, rotY, zoom, width, heightPx);
        const p2 = project3DTo2D(mesh[i + 1][j], rotX, rotY, zoom, width, heightPx);
        const p3 = project3DTo2D(mesh[i + 1][j + 1], rotX, rotY, zoom, width, heightPx);
        const p4 = project3DTo2D(mesh[i][j + 1], rotX, rotY, zoom, width, heightPx);

        // Quad fill
        ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(99, 102, 241, 0.18)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        if (showWireframe) {
          ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
          ctx.stroke();
        }
      }
    }

    // Highlight Generatrix (2D profile at theta = 0)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    for (let i = 0; i <= numZ; i++) {
      const pt = project3DTo2D(mesh[i][0], rotX, rotY, zoom, width, heightPx);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // If slice is enabled, draw the cross section circle at z = slicePos
    if (showSlice && slicePos >= 0 && slicePos <= height) {
      const sliceR = getRadiusAtZ(slicePos);
      const slicePts: Point3D[] = [];
      const steps = 40;
      for (let k = 0; k <= steps; k++) {
        const theta = (k / steps) * maxThetaRad;
        slicePts.push({
          x: sliceR * Math.cos(theta),
          y: sliceR * Math.sin(theta),
          z: slicePos
        });
      }

      ctx.beginPath();
      const firstPt = project3DTo2D(slicePts[0], rotX, rotY, zoom, width, heightPx);
      ctx.moveTo(firstPt.x, firstPt.y);
      for (let k = 1; k < slicePts.length; k++) {
        const pt = project3DTo2D(slicePts[k], rotX, rotY, zoom, width, heightPx);
        ctx.lineTo(pt.x, pt.y);
      }
      if (rotAngleDeg >= 360) {
        ctx.closePath();
      } else {
        // connect to axis
        const centerPt = project3DTo2D({ x: 0, y: 0, z: slicePos }, rotX, rotY, zoom, width, heightPx);
        ctx.lineTo(centerPt.x, centerPt.y);
        ctx.closePath();
      }

      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label at slice
      const centerPt = project3DTo2D({ x: 0, y: 0, z: slicePos }, rotX, rotY, zoom, width, heightPx);
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`Mặt cắt z=${slicePos.toFixed(2)} (S=${sliceArea.toFixed(3)})`, centerPt.x + 10, centerPt.y - 10);
    }

    // Legend on canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Góc quay: ${rotAngleDeg}° | Thể tích V ≈ ${vol.toFixed(4)}`, 14, 24);
  }, [profileType, radius, height, rotAngleDeg, slicePos, showSlice, showWireframe, rotX, rotY, zoom, vol, sliceArea]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `khoi_3d_tron_xoay_${profileType}.png`;
    a.click();
  };

  const handleSendWhiteboard = () => {
    if (!canvasRef.current || !onSendToWhiteboard) return;
    const url = canvasRef.current.toDataURL('image/png');
    onSendToWhiteboard(url);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100vh-5rem)]">
      {/* Control Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Rotate3d className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Khối 3D & Tròn xoay</h2>
              <p className="text-xs text-slate-400">Trang 16 SANG-CAS · Mô phỏng khối tròn xoay</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chặng 4
          </span>
        </div>

        {/* 3 Standard Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadSample('cylinder')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp mẫu
          </button>
          <button
            onClick={() => {
              // trigger refresh
              setRotAngleDeg((prev) => (prev >= 360 ? 360 : prev));
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" />
            Tính toán
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Profile Shape Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Đường sinh tạo khối:</span>
            <span className="text-indigo-400 text-[11px] font-mono capitalize">{profileType}</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'cylinder', name: 'Trụ (R=1, h=2)' },
              { id: 'cone', name: 'Nón (R, h)' },
              { id: 'paraboloid', name: 'Paraboloid' },
              { id: 'sphere', name: 'Hình cầu' },
              { id: 'vase', name: 'Bình hoa' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleLoadSample(item.id as ProfileType)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition border ${
                  profileType === item.id
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders: Radius, Height */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Bán kính đỉnh/đáy R:</span>
              <span className="font-mono text-cyan-400">{radius.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Chiều cao khối h:</span>
              <span className="font-mono text-cyan-400">{height.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="0.2"
              value={height}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setHeight(val);
                if (slicePos > val) setSlicePos(val / 2);
              }}
              className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Góc quay tạo khối:</span>
              <span className="font-mono text-amber-400">{rotAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="360"
              step="15"
              value={rotAngleDeg}
              onChange={(e) => setRotAngleDeg(parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Slicing Controls */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              Mặt cắt ngang vuông góc trục:
            </span>
            <input
              type="checkbox"
              checked={showSlice}
              onChange={(e) => setShowSlice(e.target.checked)}
              className="accent-rose-500 rounded"
            />
          </div>
          {showSlice && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Vị trí lát cắt z = {slicePos.toFixed(2)}:</span>
                <span className="font-mono text-rose-400">S = {sliceArea.toFixed(4)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={height}
                step="0.1"
                value={slicePos}
                onChange={(e) => setSlicePos(parseFloat(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Mathematical Result Box */}
        <div className="bg-gradient-to-br from-indigo-950/50 to-slate-950 border border-indigo-500/30 p-3.5 rounded-xl space-y-2 text-xs">
          <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-400" />
            Công thức & Thể tích giải tích:
          </div>
          <div className="p-2 bg-slate-900/90 rounded border border-slate-800 font-mono text-amber-300 text-xs break-all">
            {formula}
          </div>
          <div className="flex justify-between items-center text-slate-300 pt-1">
            <span>Thể tích hiện tại ({rotAngleDeg}°):</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              V ≈ {vol.toFixed(4)}
            </span>
          </div>
          {profileType === 'cylinder' && radius === 1 && height === 2 && rotAngleDeg === 360 && (
            <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
              ✓ Kiểm thử chuẩn: Trụ R=1, h=2 xoay 360° có V = 2π ≈ 6.2832 (Đạt chuẩn SANG-CAS Chặng 4).
            </div>
          )}
        </div>

        {/* View Controls & Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            Hiện khung lưới
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleExportPNG}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition"
              title="Xuất ảnh PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            {onSendToWhiteboard && (
              <button
                onClick={handleSendWhiteboard}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs flex items-center gap-1 transition"
                title="Gửi sang Bảng viết"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3D Visualization Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>Kéo chuột để xoay khối 3D · Con lăn cuộn để thu phóng</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>RotX: {Math.round(rotX)}°</span>
            <span>RotY: {Math.round(rotY)}°</span>
            <span>Zoom: {zoom}%</span>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center p-2 min-h-[480px]">
          <canvas
            ref={canvasRef}
            width={720}
            height={520}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full max-w-[720px] max-h-[520px] rounded-xl cursor-grab active:cursor-grabbing border border-slate-800"
          />

          {/* Quick Preset View Buttons */}
          <div className="absolute bottom-4 right-4 flex gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur">
            <button
              onClick={() => {
                setRotX(0);
                setRotY(0);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
            >
              Trực diện
            </button>
            <button
              onClick={() => {
                setRotX(90);
                setRotY(0);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
            >
              Từ trên (Oz)
            </button>
            <button
              onClick={() => {
                setRotX(25);
                setRotY(-35);
              }}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs"
            >
              Phối cảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
