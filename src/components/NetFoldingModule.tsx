/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  Share2,
  Download,
  Printer,
  Maximize2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { project3DTo2D, Point3D } from '../utils/mathEngine';

interface NetFoldingProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type NetSolidType = 'cube' | 'cuboid' | 'pyramid' | 'prism' | 'tetrahedron';

interface FaceDef {
  id: number;
  name: string;
  color: string;
  hingeAxis: 'none' | '+x' | '-x' | '+y' | '-y';
  hingePos: number; // coordinate where hinge occurs
  maxAngleDeg: number;
  vertices2D: { x: number; y: number }[];
}

export const NetFoldingModule: React.FC<NetFoldingProps> = ({ onSendToWhiteboard }) => {
  const [solidType, setSolidType] = useState<NetSolidType>('cube');
  const [foldingProgress, setFoldingProgress] = useState<number>(50); // 0% (flat net) to 100% (closed solid)
  const [showGlueTabs, setShowGlueTabs] = useState<boolean>(true);
  const [showFaceNumbers, setShowFaceNumbers] = useState<boolean>(true);
  const [printMode, setPrintMode] = useState<boolean>(false);

  // 3D Camera Rotation
  const [rotX, setRotX] = useState<number>(30);
  const [rotY, setRotY] = useState<number>(-40);
  const [zoom, setZoom] = useState<number>(80);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load sample presets
  const handleLoadSample = (type: NetSolidType) => {
    setSolidType(type);
    setFoldingProgress(60);
    setPrintMode(false);
  };

  const handleReset = () => {
    setSolidType('cube');
    setFoldingProgress(0);
    setShowGlueTabs(true);
    setShowFaceNumbers(true);
    setPrintMode(false);
    setRotX(30);
    setRotY(-40);
    setZoom(80);
  };

  // 3D faces configuration and dynamic folding transformation
  // Base face (face 1) stays flat on XY plane z=0.
  // Other faces fold along hinges according to foldingProgress / 100.
  const t = foldingProgress / 100;

  // Mouse handlers for 3D dragging
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

  // Draw 2D / 3D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const heightPx = canvas.height;
    ctx.clearRect(0, 0, width, heightPx);

    if (printMode) {
      // Clean white print paper background with calibration grid
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, heightPx);

      // Calibration bar 5cm
      const cmPx = 37.8; // ~96 DPI standard
      const barLen = cmPx * 5;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, heightPx - 45, barLen, 4);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Thước đo chuẩn in ấn: 5 cm (100% tỷ lệ thực)', 40, heightPx - 55);

      // Ticks
      for (let i = 0; i <= 5; i++) {
        ctx.fillRect(40 + i * cmPx, heightPx - 50, 1.5, 12);
        ctx.font = '10px sans-serif';
        ctx.fillText(`${i}cm`, 38 + i * cmPx, heightPx - 25);
      }
    } else {
      // Tech dark background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, heightPx);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#111827');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, heightPx);
    }

    // Colors for faces
    const faceColors = [
      '#3b82f6', // 1: Base (Blue)
      '#10b981', // 2: Green
      '#f59e0b', // 3: Amber
      '#ef4444', // 4: Rose
      '#8b5cf6', // 5: Purple
      '#06b6d4'  // 6: Top / Cyan
    ];

    // Compute Face Vertices in 3D for Cube Net
    // Standard Cross Net for Cube:
    //         [Top: 6] (y = 1 to 2)
    // [Left: 3] [Bottom: 1] [Right: 4]
    //         [Front: 2] (y = -1 to 0)
    //         [Back: 5] (y = -2 to -1)
    const s = 1.0; // unit cube side
    const angleRad = t * (Math.PI / 2); // 0 to 90 degrees fold

    interface RenderFace {
      id: number;
      label: string;
      color: string;
      pts: Point3D[];
      hasGlueTabs?: { p1: Point3D; p2: Point3D }[];
    }

    const renderFaces: RenderFace[] = [];

    if (solidType === 'cube' || solidType === 'cuboid') {
      const a = 1.0;
      const b = 1.0;
      const c = solidType === 'cuboid' ? 1.4 : 1.0;

      // 1: Center base (flat at z=0)
      renderFaces.push({
        id: 1,
        label: 'Mặt đáy (1)',
        color: faceColors[0],
        pts: [
          { x: -a, y: -b, z: 0 },
          { x: a, y: -b, z: 0 },
          { x: a, y: b, z: 0 },
          { x: -a, y: b, z: 0 }
        ]
      });

      // 2: Right face hinged at x = a
      renderFaces.push({
        id: 2,
        label: 'Bên phải (2)',
        color: faceColors[1],
        pts: [
          { x: a, y: -b, z: 0 },
          { x: a + c * Math.cos(angleRad), y: -b, z: c * Math.sin(angleRad) },
          { x: a + c * Math.cos(angleRad), y: b, z: c * Math.sin(angleRad) },
          { x: a, y: b, z: 0 }
        ],
        hasGlueTabs: [
          {
            p1: { x: a + c * Math.cos(angleRad), y: -b, z: c * Math.sin(angleRad) },
            p2: { x: a + c * Math.cos(angleRad), y: b, z: c * Math.sin(angleRad) }
          }
        ]
      });

      // 3: Left face hinged at x = -a
      renderFaces.push({
        id: 3,
        label: 'Bên trái (3)',
        color: faceColors[2],
        pts: [
          { x: -a, y: -b, z: 0 },
          { x: -a, y: b, z: 0 },
          { x: -a - c * Math.cos(angleRad), y: b, z: c * Math.sin(angleRad) },
          { x: -a - c * Math.cos(angleRad), y: -b, z: c * Math.sin(angleRad) }
        ]
      });

      // 4: Front face hinged at y = -b
      renderFaces.push({
        id: 4,
        label: 'Mặt trước (4)',
        color: faceColors[3],
        pts: [
          { x: -a, y: -b, z: 0 },
          { x: a, y: -b, z: 0 },
          { x: a, y: -b - c * Math.cos(angleRad), z: c * Math.sin(angleRad) },
          { x: -a, y: -b - c * Math.cos(angleRad), z: c * Math.sin(angleRad) }
        ],
        hasGlueTabs: [
          {
            p1: { x: a, y: -b - c * Math.cos(angleRad), z: c * Math.sin(angleRad) },
            p2: { x: -a, y: -b - c * Math.cos(angleRad), z: c * Math.sin(angleRad) }
          }
        ]
      });

      // 5: Back face hinged at y = b
      const backP3: Point3D = {
        x: a,
        y: b + c * Math.cos(angleRad),
        z: c * Math.sin(angleRad)
      };
      const backP4: Point3D = {
        x: -a,
        y: b + c * Math.cos(angleRad),
        z: c * Math.sin(angleRad)
      };

      renderFaces.push({
        id: 5,
        label: 'Mặt sau (5)',
        color: faceColors[4],
        pts: [
          { x: -a, y: b, z: 0 },
          { x: a, y: b, z: 0 },
          backP3,
          backP4
        ]
      });

      // 6: Top face attached to Back face top edge (double hinge!)
      // When back face folds by angleRad, top face folds another angleRad relative to it
      const topAngle = 2 * angleRad;
      renderFaces.push({
        id: 6,
        label: 'Mặt nắp (6)',
        color: faceColors[5],
        pts: [
          backP4,
          backP3,
          {
            x: a,
            y: b + c * Math.cos(angleRad) + 2 * b * Math.cos(topAngle),
            z: c * Math.sin(angleRad) + 2 * b * Math.sin(topAngle)
          },
          {
            x: -a,
            y: b + c * Math.cos(angleRad) + 2 * b * Math.cos(topAngle),
            z: c * Math.sin(angleRad) + 2 * b * Math.sin(topAngle)
          }
        ],
        hasGlueTabs: [
          {
            p1: {
              x: a,
              y: b + c * Math.cos(angleRad) + 2 * b * Math.cos(topAngle),
              z: c * Math.sin(angleRad) + 2 * b * Math.sin(topAngle)
            },
            p2: {
              x: -a,
              y: b + c * Math.cos(angleRad) + 2 * b * Math.cos(topAngle),
              z: c * Math.sin(angleRad) + 2 * b * Math.sin(topAngle)
            }
          }
        ]
      });
    } else if (solidType === 'pyramid') {
      // Square pyramid: square base + 4 triangles folding upward
      const a = 1.1;
      const hTri = 1.6;
      const pyrAngle = t * Math.acos(a / (2 * hTri)); // fold up until apex meets

      // Base
      renderFaces.push({
        id: 1,
        label: 'Đáy vuông (1)',
        color: faceColors[0],
        pts: [
          { x: -a, y: -a, z: 0 },
          { x: a, y: -a, z: 0 },
          { x: a, y: a, z: 0 },
          { x: -a, y: a, z: 0 }
        ]
      });

      // 4 Triangle faces
      // Right
      renderFaces.push({
        id: 2,
        label: 'Mặt bên 1',
        color: faceColors[1],
        pts: [
          { x: a, y: -a, z: 0 },
          { x: a + hTri * Math.cos(pyrAngle), y: 0, z: hTri * Math.sin(pyrAngle) },
          { x: a, y: a, z: 0 }
        ]
      });
      // Top
      renderFaces.push({
        id: 3,
        label: 'Mặt bên 2',
        color: faceColors[2],
        pts: [
          { x: a, y: a, z: 0 },
          { x: 0, y: a + hTri * Math.cos(pyrAngle), z: hTri * Math.sin(pyrAngle) },
          { x: -a, y: a, z: 0 }
        ]
      });
      // Left
      renderFaces.push({
        id: 4,
        label: 'Mặt bên 3',
        color: faceColors[3],
        pts: [
          { x: -a, y: a, z: 0 },
          { x: -a - hTri * Math.cos(pyrAngle), y: 0, z: hTri * Math.sin(pyrAngle) },
          { x: -a, y: -a, z: 0 }
        ]
      });
      // Bottom
      renderFaces.push({
        id: 5,
        label: 'Mặt bên 4',
        color: faceColors[4],
        pts: [
          { x: -a, y: -a, z: 0 },
          { x: 0, y: -a - hTri * Math.cos(pyrAngle), z: hTri * Math.sin(pyrAngle) },
          { x: a, y: -a, z: 0 }
        ]
      });
    } else {
      // Triangular prism: 3 rectangular sides + 2 triangular caps
      const w = 1.0;
      const l = 1.4;
      const triH = (w * Math.sqrt(3)) / 2;

      // Base rectangle 1
      renderFaces.push({
        id: 1,
        label: 'Mặt đáy (1)',
        color: faceColors[0],
        pts: [
          { x: -w, y: -l, z: 0 },
          { x: w, y: -l, z: 0 },
          { x: w, y: l, z: 0 },
          { x: -w, y: l, z: 0 }
        ]
      });

      // Side 2 (right)
      const pAngle = t * ((2 * Math.PI) / 3);
      renderFaces.push({
        id: 2,
        label: 'Mặt bên 2',
        color: faceColors[1],
        pts: [
          { x: w, y: -l, z: 0 },
          { x: w + 2 * w * Math.cos(pAngle), y: -l, z: 2 * w * Math.sin(pAngle) },
          { x: w + 2 * w * Math.cos(pAngle), y: l, z: 2 * w * Math.sin(pAngle) },
          { x: w, y: l, z: 0 }
        ]
      });

      // Side 3 (left)
      renderFaces.push({
        id: 3,
        label: 'Mặt bên 3',
        color: faceColors[2],
        pts: [
          { x: -w, y: -l, z: 0 },
          { x: -w, y: l, z: 0 },
          { x: -w - 2 * w * Math.cos(pAngle), y: l, z: 2 * w * Math.sin(pAngle) },
          { x: -w - 2 * w * Math.cos(pAngle), y: -l, z: 2 * w * Math.sin(pAngle) }
        ]
      });

      // Triangle cap top
      const capAngle = t * (Math.PI / 2);
      renderFaces.push({
        id: 4,
        label: 'Đáy tam giác 1',
        color: faceColors[3],
        pts: [
          { x: -w, y: l, z: 0 },
          { x: w, y: l, z: 0 },
          { x: 0, y: l + triH * Math.cos(capAngle), z: triH * Math.sin(capAngle) }
        ]
      });

      // Triangle cap bottom
      renderFaces.push({
        id: 5,
        label: 'Đáy tam giác 2',
        color: faceColors[4],
        pts: [
          { x: -w, y: -l, z: 0 },
          { x: 0, y: -l - triH * Math.cos(capAngle), z: triH * Math.sin(capAngle) },
          { x: w, y: -l, z: 0 }
        ]
      });
    }

    // Camera angles: if printMode, force top-down flat view
    const curRotX = printMode ? 0 : rotX;
    const curRotY = printMode ? 0 : rotY;
    const curZoom = printMode ? 95 : zoom;

    // Render each face
    renderFaces.forEach((face) => {
      const proj = face.pts.map((p) =>
        project3DTo2D(p, curRotX, curRotY, curZoom, width, heightPx)
      );

      ctx.beginPath();
      ctx.moveTo(proj[0].x, proj[0].y);
      for (let i = 1; i < proj.length; i++) {
        ctx.lineTo(proj[i].x, proj[i].y);
      }
      ctx.closePath();

      if (printMode) {
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else {
        ctx.fillStyle = face.color + '44'; // semi transparent
        ctx.fill();
        ctx.strokeStyle = face.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Glue Tabs (Tai dán) if requested
      if (showGlueTabs && face.hasGlueTabs) {
        face.hasGlueTabs.forEach((tab) => {
          const pt1 = project3DTo2D(tab.p1, curRotX, curRotY, curZoom, width, heightPx);
          const pt2 = project3DTo2D(tab.p2, curRotX, curRotY, curZoom, width, heightPx);
          const dx = pt2.x - pt1.x;
          const dy = pt2.y - pt1.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const tabDepth = 18;

            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt1.x + dx * 0.15 + nx * tabDepth, pt1.y + dy * 0.15 + ny * tabDepth);
            ctx.lineTo(pt1.x + dx * 0.85 + nx * tabDepth, pt1.y + dy * 0.85 + ny * tabDepth);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.closePath();

            ctx.fillStyle = printMode ? '#e2e8f0' : 'rgba(245, 158, 11, 0.25)';
            ctx.fill();
            ctx.strokeStyle = printMode ? '#64748b' : '#f59e0b';
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // Face label and number
      if (showFaceNumbers) {
        const cx = proj.reduce((sum, p) => sum + p.x, 0) / proj.length;
        const cy = proj.reduce((sum, p) => sum + p.y, 0) / proj.length;

        ctx.fillStyle = printMode ? '#0f172a' : '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${face.id}`, cx, cy);

        ctx.font = '9px sans-serif';
        ctx.fillText(face.label, cx, cy + 14);
      }
    });

    // Reset text alignment
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // HUD Info
    if (!printMode) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `Khối: ${solidType.toUpperCase()} | Tiến độ gấp: ${foldingProgress}% (${
          foldingProgress === 0
            ? 'Trải phẳng 2D'
            : foldingProgress === 100
            ? 'Khối 3D hoàn chỉnh'
            : 'Đang gấp động'
        })`,
        14,
        24
      );
    }
  }, [solidType, foldingProgress, showGlueTabs, showFaceNumbers, printMode, rotX, rotY, zoom, t]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `trai_hinh_gap_khoi_${solidType}_${foldingProgress}pct.png`;
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
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Trải hình & Gấp hình</h2>
              <p className="text-xs text-slate-400">Trang 19 SANG-CAS · Trải phẳng 2D & mô phỏng gấp 3D</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chặng 4
          </span>
        </div>

        {/* 3 Standard Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadSample('cube')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp mẫu
          </button>
          <button
            onClick={() => {
              // toggle open/close
              setFoldingProgress((p) => (p === 100 ? 0 : 100));
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" />
            {foldingProgress === 100 ? 'Mở phẳng 0%' : 'Gấp kín 100%'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Solid Net Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">Chọn khối trải hình:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'cube', label: 'Hình lập phương (6 mặt)' },
              { id: 'cuboid', label: 'Hộp chữ nhật (6 mặt)' },
              { id: 'pyramid', label: 'Chóp tứ giác (5 mặt)' },
              { id: 'prism', label: 'Lăng trụ đứng (5 mặt)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSolidType(item.id as NetSolidType)}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition border ${
                  solidType === item.id
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Folding Slider */}
        <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-300">
            <span className="font-semibold text-emerald-400">Tiến trình gấp hình:</span>
            <span className="font-mono text-sm font-bold text-amber-300">{foldingProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={foldingProgress}
            onChange={(e) => setFoldingProgress(parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0% (Trải phẳng 2D)</span>
            <span>50% (Đang gấp)</span>
            <span>100% (Khối kín)</span>
          </div>
        </div>

        {/* Crafting & Printing Features */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
          <span className="font-semibold text-slate-300">Tùy chọn tạo phôi thủ công:</span>
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between cursor-pointer text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                Hiện tai dán mép gấp (Glue tabs):
              </span>
              <input
                type="checkbox"
                checked={showGlueTabs}
                onChange={(e) => setShowGlueTabs(e.target.checked)}
                className="accent-amber-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-300">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Đánh số thứ tự các mặt 1..6:
              </span>
              <input
                type="checkbox"
                checked={showFaceNumbers}
                onChange={(e) => setShowFaceNumbers(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-300">
              <span className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                Chế độ phôi in ấn (Nền trắng A4):
              </span>
              <input
                type="checkbox"
                checked={printMode}
                onChange={(e) => {
                  setPrintMode(e.target.checked);
                  if (e.target.checked) setFoldingProgress(0); // auto flatten
                }}
                className="accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Educational Note */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
          <div className="font-semibold text-emerald-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Kiểm thử chuẩn Chặng 4:
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Mạng lưới hình lập phương gồm 6 mặt vuông đánh số 1 đến 6. Khi thanh trượt tiến đến 100%, các mặt bên gập vuông góc 90° quanh mép gấp và khép kín thành khối lập phương 3D hoàn chỉnh.
          </p>
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
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs flex items-center gap-1 transition"
                title="Gửi sang Bảng viết"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3D/2D Visualization Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>
              {printMode
                ? 'Chế độ phôi in ấn: Tỷ lệ 100% chuẩn với thước đo 5cm'
                : 'Kéo chuột để xoay góc nhìn 3D · Kéo thanh trượt để xem quá trình gập'}
            </span>
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

          {/* Quick preset buttons */}
          {!printMode && (
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
                Từ trên (2D)
              </button>
              <button
                onClick={() => {
                  setRotX(30);
                  setRotY(-40);
                }}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
              >
                Phối cảnh 3D
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
