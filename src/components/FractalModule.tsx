/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  Share2,
  Download,
  Info,
  Maximize2,
  Table,
  Zap
} from 'lucide-react';
import { project3DTo2D, Point3D } from '../utils/mathEngine';

interface FractalProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type FractalType = 'sierpinski_triangle' | 'koch_snowflake' | 'sierpinski_carpet' | 'menger_sponge';

export const FractalModule: React.FC<FractalProps> = ({ onSendToWhiteboard }) => {
  const [fractalType, setFractalType] = useState<FractalType>('sierpinski_triangle');
  const [depth, setDepth] = useState<number>(2); // Default level 2 for standard test case
  const [colorTheme, setColorTheme] = useState<'neon' | 'amber' | 'rainbow' | 'blue'>('neon');

  // 3D camera (used for Menger sponge)
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(90);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Standard sample loader
  const handleLoadSample = (type: FractalType, lvl: number = 2) => {
    setFractalType(type);
    setDepth(lvl);
    setColorTheme('neon');
  };

  const handleReset = () => {
    setFractalType('sierpinski_triangle');
    setDepth(2);
    setColorTheme('neon');
    setRotX(25);
    setRotY(-35);
    setZoom(90);
  };

  // Theoretical stats calculation
  const stats = useMemo(() => {
    const rows = [];
    const maxRows = fractalType === 'menger_sponge' ? 3 : 5;

    let dimFormula = '';
    let dimValue = 0;

    if (fractalType === 'sierpinski_triangle') {
      dimFormula = 'D = \\frac{\\ln 3}{\\ln 2} \\approx 1.5850';
      dimValue = Math.log(3) / Math.log(2);

      for (let k = 0; k <= maxRows; k++) {
        const count = Math.pow(3, k);
        const areaFrac = `${Math.pow(3, k)}/${Math.pow(4, k)}`;
        const areaDec = Math.pow(3 / 4, k);
        rows.push({
          level: k,
          count,
          size: `(1/2)^${k}`,
          metricName: 'Diện tích S/S₀',
          metricVal: `${areaFrac} (${areaDec.toFixed(4)})`
        });
      }
    } else if (fractalType === 'koch_snowflake') {
      dimFormula = 'D = \\frac{\\ln 4}{\\ln 3} \\approx 1.2619';
      dimValue = Math.log(4) / Math.log(3);

      for (let k = 0; k <= maxRows; k++) {
        const count = 3 * Math.pow(4, k);
        const perim = Math.pow(4 / 3, k);
        // Area S = S0 * (1 + 1/3 * sum_{i=1}^k (4/9)^i)
        let areaSum = 0;
        for (let i = 1; i <= k; i++) areaSum += Math.pow(4 / 9, i);
        const areaTotal = 1 + (1 / 3) * areaSum;

        rows.push({
          level: k,
          count,
          size: `(1/3)^${k}`,
          metricName: 'Chu vi P / Diện tích S',
          metricVal: `P=${perim.toFixed(3)}P₀ | S=${areaTotal.toFixed(3)}S₀`
        });
      }
    } else if (fractalType === 'sierpinski_carpet') {
      dimFormula = 'D = \\frac{\\ln 8}{\\ln 3} \\approx 1.8928';
      dimValue = Math.log(8) / Math.log(3);

      for (let k = 0; k <= maxRows; k++) {
        const count = Math.pow(8, k);
        const areaDec = Math.pow(8 / 9, k);
        rows.push({
          level: k,
          count,
          size: `(1/3)^${k}`,
          metricName: 'Diện tích S/S₀',
          metricVal: `${Math.pow(8, k)}/${Math.pow(9, k)} (${areaDec.toFixed(4)})`
        });
      }
    } else {
      dimFormula = 'D = \\frac{\\ln 20}{\\ln 3} \\approx 2.7268';
      dimValue = Math.log(20) / Math.log(3);

      for (let k = 0; k <= 3; k++) {
        const count = Math.pow(20, k);
        const vol = Math.pow(20 / 27, k);
        rows.push({
          level: k,
          count,
          size: `(1/3)^${k}`,
          metricName: 'Thể tích V/V₀',
          metricVal: `${Math.pow(20, k)}/${Math.pow(27, k)} (${vol.toFixed(4)})`
        });
      }
    }

    return { dimFormula, dimValue, rows };
  }, [fractalType]);

  // Mouse drag handlers for 3D
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

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const heightPx = canvas.height;
    ctx.clearRect(0, 0, width, heightPx);

    // Dark high-tech theme background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, heightPx);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, heightPx);

    // Color palette getter
    const getStrokeFill = (k: number) => {
      if (colorTheme === 'neon') {
        const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e', '#fbbf24', '#34d399'];
        return colors[k % colors.length];
      } else if (colorTheme === 'amber') {
        return '#f59e0b';
      } else if (colorTheme === 'rainbow') {
        const hue = (k * 65) % 360;
        return `hsl(${hue}, 85%, 60%)`;
      }
      return '#60a5fa';
    };

    // 1. SIERPINSKI TRIANGLE
    if (fractalType === 'sierpinski_triangle') {
      const pad = 40;
      const side = Math.min(width - 2 * pad, (heightPx - 2 * pad) * (2 / Math.sqrt(3)));
      const triH = (side * Math.sqrt(3)) / 2;
      const topX = width / 2;
      const topY = (heightPx - triH) / 2 + 10;
      const leftX = topX - side / 2;
      const leftY = topY + triH;
      const rightX = topX + side / 2;
      const rightY = topY + triH;

      interface Tri {
        ax: number;
        ay: number;
        bx: number;
        by: number;
        cx: number;
        cy: number;
      }

      let triangles: Tri[] = [{ ax: topX, ay: topY, bx: leftX, by: leftY, cx: rightX, cy: rightY }];

      for (let lvl = 0; lvl < depth; lvl++) {
        const nextTris: Tri[] = [];
        for (const t of triangles) {
          // Midpoints
          const mAB = { x: (t.ax + t.bx) / 2, y: (t.ay + t.by) / 2 };
          const mBC = { x: (t.bx + t.cx) / 2, y: (t.by + t.cy) / 2 };
          const mCA = { x: (t.cx + t.ax) / 2, y: (t.cy + t.ay) / 2 };

          nextTris.push({ ax: t.ax, ay: t.ay, bx: mAB.x, by: mAB.y, cx: mCA.x, cy: mCA.y });
          nextTris.push({ ax: mAB.x, ay: mAB.y, bx: t.bx, by: t.by, cx: mBC.x, cy: mBC.y });
          nextTris.push({ ax: mCA.x, ay: mCA.y, bx: mBC.x, by: mBC.y, cx: t.cx, cy: t.cy });
        }
        triangles = nextTris;
      }

      // Draw all triangles
      ctx.lineWidth = depth > 3 ? 0.8 : 1.5;
      triangles.forEach((t, idx) => {
        ctx.beginPath();
        ctx.moveTo(t.ax, t.ay);
        ctx.lineTo(t.bx, t.by);
        ctx.lineTo(t.cx, t.cy);
        ctx.closePath();

        const color = getStrokeFill(idx);
        ctx.fillStyle = color + '55'; // semi-transparent
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
      });
    }

    // 2. KOCH SNOWFLAKE
    else if (fractalType === 'koch_snowflake') {
      const center = { x: width / 2, y: heightPx / 2 + 10 };
      const R = Math.min(width, heightPx) * 0.38;

      // 3 initial vertices of equilateral triangle
      const pts = [
        { x: center.x, y: center.y - R },
        { x: center.x + R * Math.cos(Math.PI / 6), y: center.y + R * Math.sin(Math.PI / 6) },
        { x: center.x - R * Math.cos(Math.PI / 6), y: center.y + R * Math.sin(Math.PI / 6) }
      ];

      type Segment = { p1: { x: number; y: number }; p2: { x: number; y: number } };
      let segments: Segment[] = [
        { p1: pts[0], p2: pts[1] },
        { p1: pts[1], p2: pts[2] },
        { p1: pts[2], p2: pts[0] }
      ];

      for (let lvl = 0; lvl < depth; lvl++) {
        const nextSegs: Segment[] = [];
        for (const seg of segments) {
          const dx = seg.p2.x - seg.p1.x;
          const dy = seg.p2.y - seg.p1.y;

          const pA = seg.p1;
          const pB = { x: seg.p1.x + dx / 3, y: seg.p1.y + dy / 3 };
          const pD = { x: seg.p1.x + (2 * dx) / 3, y: seg.p1.y + (2 * dy) / 3 };
          const pE = seg.p2;

          // Apex pC rotated 60 deg outward
          // (dx/3, dy/3) rotated by -pi/3
          const midX = dx / 3;
          const midY = dy / 3;
          const rotX = midX * Math.cos(-Math.PI / 3) - midY * Math.sin(-Math.PI / 3);
          const rotY = midX * Math.sin(-Math.PI / 3) + midY * Math.cos(-Math.PI / 3);
          const pC = { x: pB.x + rotX, y: pB.y + rotY };

          nextSegs.push({ p1: pA, p2: pB });
          nextSegs.push({ p1: pB, p2: pC });
          nextSegs.push({ p1: pC, p2: pD });
          nextSegs.push({ p1: pD, p2: pE });
        }
        segments = nextSegs;
      }

      ctx.beginPath();
      ctx.moveTo(segments[0].p1.x, segments[0].p1.y);
      for (const seg of segments) {
        ctx.lineTo(seg.p2.x, seg.p2.y);
      }
      ctx.closePath();

      const mainColor = getStrokeFill(0);
      ctx.fillStyle = mainColor + '33';
      ctx.fill();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = depth > 3 ? 1 : 1.8;
      ctx.stroke();
    }

    // 3. SIERPINSKI CARPET
    else if (fractalType === 'sierpinski_carpet') {
      const size = Math.min(width, heightPx) * 0.75;
      const startX = (width - size) / 2;
      const startY = (heightPx - size) / 2;

      // Draw base filled square
      ctx.fillStyle = getStrokeFill(0) + '99';
      ctx.fillRect(startX, startY, size, size);

      // Recursive function to carve out middle squares
      const carveSquare = (x: number, y: number, s: number, lvl: number) => {
        if (lvl > depth) return;
        const sub = s / 3;
        // middle square
        ctx.fillStyle = '#090d16'; // background cut
        ctx.fillRect(x + sub, y + sub, sub, sub);
        ctx.strokeStyle = getStrokeFill(lvl);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + sub, y + sub, sub, sub);

        if (lvl < depth) {
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if (i === 1 && j === 1) continue; // skip hole
              carveSquare(x + i * sub, y + j * sub, sub, lvl + 1);
            }
          }
        }
      };

      if (depth > 0) {
        carveSquare(startX, startY, size, 1);
      }
    }

    // 4. MENGER SPONGE 3D
    else {
      // 3D rendering of cubes
      const lvl = Math.min(2, depth); // capped at level 2 for 60fps canvas performance
      const cubeSize = 2.4;

      const subCubes: Point3D[] = [];

      const buildMenger = (cx: number, cy: number, cz: number, s: number, curLvl: number) => {
        if (curLvl === lvl) {
          subCubes.push({ x: cx, y: cy, z: cz });
          return;
        }
        const nextS = s / 3;
        for (let ix = -1; ix <= 1; ix++) {
          for (let iy = -1; iy <= 1; iy++) {
            for (let iz = -1; iz <= 1; iz++) {
              // Condition to be in Menger sponge: at most one index is 0
              const zeros = (ix === 0 ? 1 : 0) + (iy === 0 ? 1 : 0) + (iz === 0 ? 1 : 0);
              if (zeros < 2) {
                buildMenger(cx + ix * nextS, cy + iy * nextS, cz + iz * nextS, nextS, curLvl + 1);
              }
            }
          }
        }
      };

      buildMenger(0, 0, 0, cubeSize, 0);

      // Render each subcube
      const subS = cubeSize / Math.pow(3, lvl) / 2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;

      subCubes.forEach((c) => {
        // Draw 3 visible faces or simple bounding box
        const pO = project3DTo2D(c, rotX, rotY, zoom, width, heightPx);
        const pX = project3DTo2D({ x: c.x + subS, y: c.y, z: c.z }, rotX, rotY, zoom, width, heightPx);
        const rPx = Math.max(2, Math.hypot(pX.x - pO.x, pX.y - pO.y));

        ctx.fillStyle = 'rgba(129, 140, 248, 0.25)';
        ctx.fillRect(pO.x - rPx, pO.y - rPx, rPx * 2, rPx * 2);
        ctx.strokeRect(pO.x - rPx, pO.y - rPx, rPx * 2, rPx * 2);
      });
    }

    // Canvas HUD
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `Fractal: ${fractalType.replace('_', ' ').toUpperCase()} | Cấp lặp: n = ${depth}`,
      16,
      24
    );
  }, [fractalType, depth, colorTheme, rotX, rotY, zoom]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractal_${fractalType}_level_${depth}.png`;
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Fractal 2D–3D</h2>
              <p className="text-xs text-slate-400">Trang 17 SANG-CAS · Cấu trúc tự đồng dạng & số chiều</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chặng 4
          </span>
        </div>

        {/* 3 Standard Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadSample('sierpinski_triangle', 2)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp mẫu (n=2)
          </button>
          <button
            onClick={() => {
              setDepth((d) => (d < 5 ? d + 1 : 0));
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" />
            Tăng cấp lặp
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Fractal Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">Chọn mô hình Fractal:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'sierpinski_triangle', label: 'Tam giác Sierpinski' },
              { id: 'koch_snowflake', label: 'Bông tuyết Koch' },
              { id: 'sierpinski_carpet', label: 'Thảm Sierpinski' },
              { id: 'menger_sponge', label: 'Bọt biển Menger 3D' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleLoadSample(item.id as FractalType, depth > 3 && item.id === 'menger_sponge' ? 2 : depth)}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition border ${
                  fractalType === item.id
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Depth / Iteration Level Slider */}
        <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-300">
            <span className="font-semibold text-cyan-400">Cấp lặp (Iteration depth n):</span>
            <span className="font-mono text-sm font-bold text-amber-300">n = {depth}</span>
          </div>
          <input
            type="range"
            min="0"
            max={fractalType === 'menger_sponge' ? 3 : 5}
            step="1"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Cấp 0 (Gốc)</span>
            <span>Cấp 2 (Mẫu chuẩn)</span>
            <span>Cấp {fractalType === 'menger_sponge' ? 3 : 5}</span>
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Bảng màu hiển thị:</span>
          <div className="flex gap-1.5">
            {[
              { id: 'neon', label: 'Neon' },
              { id: 'amber', label: 'Hổ phách' },
              { id: 'rainbow', label: 'Cầu vồng' },
              { id: 'blue', label: 'Xanh lam' }
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => setColorTheme(th.id as any)}
                className={`px-2 py-1 rounded text-[11px] border ${
                  colorTheme === th.id
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theoretical Stats Card */}
        <div className="bg-slate-950/80 border border-indigo-500/30 p-3 rounded-xl space-y-2 text-xs">
          <div className="font-semibold text-indigo-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Số chiều Hausdorff:
            </span>
            <span className="font-mono text-amber-300 font-bold">
              D ≈ {stats.dimValue.toFixed(4)}
            </span>
          </div>
          <div className="p-1.5 bg-slate-900 rounded font-mono text-cyan-300 text-[11px] text-center border border-slate-800">
            {stats.dimFormula}
          </div>

          {/* Test Case Verification Badge */}
          {fractalType === 'sierpinski_triangle' && depth === 2 && (
            <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
              ✓ Kiểm thử chuẩn: Tam giác Sierpinski cấp 2 có N = 3² = 9 tam giác nhỏ, diện tích còn lại S = (3/4)² = 9/16 = 0.5625.
            </div>
          )}

          {/* Table of Progression */}
          <div className="pt-1">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1">
              <Table className="w-3 h-3 text-slate-400" />
              Bảng biến thiên qua các cấp:
            </div>
            <div className="max-h-32 overflow-y-auto border border-slate-800 rounded">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-800/80 text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-1 text-center">Cấp</th>
                    <th className="p-1">Số phần tử N</th>
                    <th className="p-1 text-right">{stats.rows[0]?.metricName}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {stats.rows.map((row) => (
                    <tr
                      key={row.level}
                      className={row.level === depth ? 'bg-indigo-950/60 text-cyan-300 font-bold' : ''}
                    >
                      <td className="p-1 text-center">n = {row.level}</td>
                      <td className="p-1">{row.count.toLocaleString()}</td>
                      <td className="p-1 text-right">{row.metricVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">Xuất học liệu / Bảng viết:</span>
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

      {/* Visualization Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>
              {fractalType === 'menger_sponge'
                ? 'Kéo chuột để xoay khối Menger Sponge 3D'
                : 'Quan sát các thế hệ phân nhánh tự đồng dạng'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>Cấp n = {depth}</span>
            <span>Số phần tử: {stats.rows[depth]?.count.toLocaleString()}</span>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center p-2 min-h-[480px]">
          <canvas
            ref={canvasRef}
            width={720}
            height={520}
            onMouseDown={fractalType === 'menger_sponge' ? handleMouseDown : undefined}
            onMouseMove={fractalType === 'menger_sponge' ? handleMouseMove : undefined}
            onMouseUp={fractalType === 'menger_sponge' ? handleMouseUp : undefined}
            onMouseLeave={fractalType === 'menger_sponge' ? handleMouseUp : undefined}
            className={`w-full h-full max-w-[720px] max-h-[520px] rounded-xl border border-slate-800 ${
              fractalType === 'menger_sponge' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
};
