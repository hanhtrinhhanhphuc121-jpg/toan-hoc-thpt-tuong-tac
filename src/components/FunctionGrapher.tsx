/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Share2,
  Sliders,
  Target,
  Sparkles,
} from 'lucide-react';
import { GraphFunction, GraphParameter } from '../types';
import { evaluateMath } from '../utils/mathEngine';

interface GrapherProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
  initialFunctions?: GraphFunction[];
  initialParameters?: GraphParameter[];
}

export const FunctionGrapher: React.FC<GrapherProps> = ({
  onSendToWhiteboard,
  initialFunctions,
  initialParameters,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport coordinates
  const [viewport, setViewport] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -7,
    yMax: 7,
  });

  // Functions list
  const [functions, setFunctions] = useState<GraphFunction[]>(
    initialFunctions || [
      { id: 'f1', expr: 'x^2 - 2*x', color: '#4f46e5', visible: true, name: 'f₁(x)' },
      { id: 'f2', expr: '1/x', color: '#dc2626', visible: true, name: 'f₂(x)' },
    ]
  );

  // Parameters (a, b, c, m)
  const [parameters, setParameters] = useState<GraphParameter[]>(
    initialParameters || [
      { id: 'm', name: 'm', value: 1, min: -5, max: 5, step: 0.1 },
      { id: 'a', name: 'a', value: 2, min: -5, max: 5, step: 0.5 },
    ]
  );

  // Marked points & inspection
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [pinnedPoints, setPinnedPoints] = useState<{ x: number; y: number; label: string; color: string }[]>([]);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Analysis result summary
  const [analysisResult, setAnalysisResult] = useState<string>('');

  // Coordinate transforms
  const toScreenX = (x: number, width: number) => {
    return ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
  };
  const toScreenY = (y: number, height: number) => {
    return height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;
  };
  const toMathX = (px: number, width: number) => {
    return viewport.xMin + (px / width) * (viewport.xMax - viewport.xMin);
  };
  const toMathY = (py: number, height: number) => {
    return viewport.yMax - (py / height) * (viewport.yMax - viewport.yMin);
  };

  // Build current parameters scope
  const getParamScope = useCallback(() => {
    const scope: Record<string, number> = {};
    for (const p of parameters) {
      scope[p.name] = p.value;
    }
    return scope;
  }, [parameters]);

  // Main Render Loop
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scope = getParamScope();

    // 1. Clear background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Grid lines & Axis
    const xRange = viewport.xMax - viewport.xMin;
    const yRange = viewport.yMax - viewport.yMin;

    // Determine grid step
    let rawStepX = Math.pow(10, Math.floor(Math.log10(xRange / 10)));
    if (xRange / rawStepX > 20) rawStepX *= 2;
    if (xRange / rawStepX < 5) rawStepX /= 2;

    const stepX = rawStepX || 1;
    const stepY = stepX;

    // Draw Grid Lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#f1f5f9';

    const startX = Math.floor(viewport.xMin / stepX) * stepX;
    for (let x = startX; x <= viewport.xMax; x += stepX) {
      const sx = toScreenX(x, width);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }

    const startY = Math.floor(viewport.yMin / stepY) * stepY;
    for (let y = startY; y <= viewport.yMax; y += stepY) {
      const sy = toScreenY(y, height);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
    }

    // Draw Coordinate Axes Ox, Oy
    const originX = toScreenX(0, width);
    const originY = toScreenY(0, height);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#64748b';

    // Ox
    if (originY >= 0 && originY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
      // Arrow
      ctx.beginPath();
      ctx.moveTo(width - 8, originY - 4);
      ctx.lineTo(width, originY);
      ctx.lineTo(width - 8, originY + 4);
      ctx.stroke();
    }

    // Oy
    if (originX >= 0 && originX <= width) {
      ctx.beginPath();
      ctx.moveTo(originX, height);
      ctx.lineTo(originX, 0);
      ctx.stroke();
      // Arrow
      ctx.beginPath();
      ctx.moveTo(originX - 4, 8);
      ctx.lineTo(originX, 0);
      ctx.lineTo(originX + 4, 8);
      ctx.stroke();
    }

    // Axis numbers
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let x = startX; x <= viewport.xMax; x += stepX) {
      if (Math.abs(x) < 1e-9) continue;
      const sx = toScreenX(x, width);
      const textY = Math.max(10, Math.min(height - 18, originY + 4));
      ctx.fillText(Number(x.toFixed(3)).toString(), sx, textY);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = startY; y <= viewport.yMax; y += stepY) {
      if (Math.abs(y) < 1e-9) continue;
      const sy = toScreenY(y, height);
      const textX = Math.max(25, Math.min(width - 5, originX - 6));
      ctx.fillText(Number(y.toFixed(3)).toString(), textX, sy);
    }
    // Origin O
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.fillText('O', originX - 6, originY + 12);
    }

    // 3. Draw Functions with Discontinuity Splitting
    for (const fn of functions) {
      if (!fn.visible || !fn.expr.trim()) continue;

      ctx.save();
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      const numPixels = width;
      let pathActive = false;
      let prevMathY = 0;

      for (let px = 0; px <= numPixels; px++) {
        const x = toMathX(px, width);
        let y = NaN;

        try {
          y = evaluateMath(fn.expr, { ...scope, x });
        } catch {
          y = NaN;
        }

        // Check if value is valid number
        if (isNaN(y) || !isFinite(y)) {
          pathActive = false;
          continue;
        }

        const py = toScreenY(y, height);

        // DISCONTINUITY DETECTION (e.g. 1/x at 0):
        // If vertical jump in math coordinates is huge and crosses asymptotes, split line!
        if (pathActive) {
          const dy = Math.abs(y - prevMathY);
          const pyDiff = Math.abs(py - toScreenY(prevMathY, height));
          if (dy > yRange * 0.75 || pyDiff > height * 0.75) {
            // Discontinuity detected! Lift pen!
            pathActive = false;
          }
        }

        if (!pathActive) {
          ctx.moveTo(px, py);
          pathActive = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevMathY = y;
      }

      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Hover Coordinate & Projections
    if (hoverCoord) {
      const sx = toScreenX(hoverCoord.x, width);
      const sy = toScreenY(hoverCoord.y, height);

      ctx.save();
      // Dashed projection lines to Ox, Oy
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;

      // Line to Ox
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, originY);
      ctx.stroke();

      // Line to Oy
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(originX, sy);
      ctx.stroke();

      // Draw point
      ctx.setLineDash([]);
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip box
      const coordText = `(${hoverCoord.x.toFixed(2)}, ${hoverCoord.y.toFixed(2)})`;
      ctx.font = '11px "JetBrains Mono"';
      const textMetrics = ctx.measureText(coordText);
      const boxW = textMetrics.width + 12;
      const boxH = 20;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(sx + 8, sy - 24, boxW, boxH);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(coordText, sx + 14 + textMetrics.width, sy - 14);
      ctx.restore();
    }

    // 5. Draw Pinned Points
    for (const pt of pinnedPoints) {
      const sx = toScreenX(pt.x, width);
      const sy = toScreenY(pt.y, height);

      ctx.save();
      ctx.fillStyle = pt.color || '#ea580c';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px "Plus Jakarta Sans"';
      ctx.fillText(`${pt.label} (${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`, sx + 8, sy - 4);
      ctx.restore();
    }
  }, [viewport, functions, parameters, hoverCoord, pinnedPoints, getParamScope]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawGraph();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setViewport((prev) => {
      const cx = (prev.xMin + prev.xMax) / 2;
      const cy = (prev.yMin + prev.yMax) / 2;
      const halfW = ((prev.xMax - prev.xMin) / 2) * factor;
      const halfH = ((prev.yMax - prev.yMin) / 2) * factor;
      return {
        xMin: cx - halfW,
        xMax: cx + halfW,
        yMin: cy - halfH,
        yMax: cy + halfH,
      };
    });
  };

  const handleResetViewport = () => {
    setViewport({ xMin: -10, xMax: 10, yMin: -7, yMax: 7 });
  };

  // Mouse pan & hover
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = toMathX(e.clientX - rect.left, canvas.width);
    const my = toMathY(e.clientY - rect.top, canvas.height);

    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const scaleX = (viewport.xMax - viewport.xMin) / canvas.width;
      const scaleY = (viewport.yMax - viewport.yMin) / canvas.height;

      setViewport((prev) => ({
        xMin: prev.xMin - dx * scaleX,
        xMax: prev.xMax - dx * scaleX,
        yMin: prev.yMin + dy * scaleY,
        yMax: prev.yMax + dy * scaleY,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else {
      setHoverCoord({ x: mx, y: my });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = toMathX(e.clientX - rect.left, canvas.width);

    // Snap to first visible function
    const activeFn = functions.find((f) => f.visible && f.expr.trim());
    if (activeFn) {
      try {
        const my = evaluateMath(activeFn.expr, { ...getParamScope(), x: mx });
        if (!isNaN(my) && isFinite(my)) {
          setPinnedPoints((prev) => [
            ...prev,
            { x: mx, y: my, label: `M${prev.length + 1}`, color: activeFn.color },
          ]);
        }
      } catch {
        // ignore
      }
    }
  };

  // Find Extrema & Roots numerically in viewport
  const handleFindSpecialPoints = (type: 'roots' | 'extrema' | 'intersections') => {
    const activeFn = functions.find((f) => f.visible && f.expr.trim());
    if (!activeFn) return;
    const scope = getParamScope();
    const evalAt = (x: number) => evaluateMath(activeFn.expr, { ...scope, x });

    const newPoints: { x: number; y: number; label: string; color: string }[] = [];
    const steps = 400;
    const dx = (viewport.xMax - viewport.xMin) / steps;

    if (type === 'roots') {
      for (let i = 0; i < steps; i++) {
        const x1 = viewport.xMin + i * dx;
        const x2 = x1 + dx;
        try {
          const y1 = evalAt(x1);
          const y2 = evalAt(x2);
          if (y1 * y2 <= 0 && Math.abs(y2 - y1) < 10) {
            // Root found near here
            const rootX = (x1 + x2) / 2;
            newPoints.push({ x: rootX, y: 0, label: 'Nghiệm', color: '#16a34a' });
          }
        } catch {}
      }
      setAnalysisResult(`Tìm thấy ${newPoints.length} giao điểm với trục hoành Ox.`);
    } else if (type === 'extrema') {
      for (let i = 1; i < steps - 1; i++) {
        const xPrev = viewport.xMin + (i - 1) * dx;
        const xMid = viewport.xMin + i * dx;
        const xNext = viewport.xMin + (i + 1) * dx;
        try {
          const yPrev = evalAt(xPrev);
          const yMid = evalAt(xMid);
          const yNext = evalAt(xNext);
          if (yMid > yPrev && yMid > yNext) {
            newPoints.push({ x: xMid, y: yMid, label: 'Cực đại', color: '#ea580c' });
          } else if (yMid < yPrev && yMid < yNext) {
            newPoints.push({ x: xMid, y: yMid, label: 'Cực tiểu', color: '#0284c7' });
          }
        } catch {}
      }
      setAnalysisResult(`Tìm thấy ${newPoints.length} điểm cực trị cục bộ trong khung nhìn.`);
    }

    setPinnedPoints(newPoints);
  };

  // Send snapshot to Whiteboard
  const handleSendToWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    if (onSendToWhiteboard) {
      onSendToWhiteboard(imgData);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] bg-slate-100 dark:bg-slate-950 overflow-hidden">
      
      {/* LEFT PANEL: Functions & Parameters (w-80) */}
      <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col overflow-y-auto space-y-5 shrink-0">
        
        {/* Functions Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Danh sách hàm số ({functions.length})
            </span>
            <button
              onClick={() => {
                const nextId = `f${functions.length + 1}`;
                setFunctions((prev) => [
                  ...prev,
                  { id: nextId, expr: 'sin(x)', color: '#16a34a', visible: true, name: `f_${functions.length + 1}(x)` },
                ]);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm hàm
            </button>
          </div>

          <div className="space-y-2">
            {functions.map((fn, idx) => (
              <div
                key={fn.id}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-2"
              >
                <input
                  type="color"
                  value={fn.color}
                  onChange={(e) => {
                    const newFns = [...functions];
                    newFns[idx].color = e.target.value;
                    setFunctions(newFns);
                  }}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  title="Đổi màu"
                />

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block font-mono">
                    y = {fn.name}:
                  </span>
                  <input
                    type="text"
                    value={fn.expr}
                    onChange={(e) => {
                      const newFns = [...functions];
                      newFns[idx].expr = e.target.value;
                      setFunctions(newFns);
                    }}
                    placeholder="ví dụ: 1/x hoặc x^2 - 2*x"
                    className="w-full bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    const newFns = [...functions];
                    newFns[idx].visible = !newFns[idx].visible;
                    setFunctions(newFns);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  title={fn.visible ? 'Ẩn đường' : 'Hiện đường'}
                >
                  {fn.visible ? <Eye className="w-4 h-4 text-indigo-600" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {functions.length > 1 && (
                  <button
                    onClick={() => setFunctions(functions.filter((_, i) => i !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Xóa hàm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Parameter Sliders */}
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Thanh trượt tham số ({parameters.length})
          </span>

          <div className="space-y-3">
            {parameters.map((p, idx) => (
              <div key={p.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{p.value}</span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={p.value}
                  onChange={(e) => {
                    const newParams = [...parameters];
                    newParams[idx].value = parseFloat(e.target.value);
                    setParameters(newParams);
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Analysis & Roots Finder Tools */}
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
            Khảo sát nhanh trên khung nhìn
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleFindSpecialPoints('roots')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Tìm Nghiệm (f=0)
            </button>
            <button
              onClick={() => handleFindSpecialPoints('extrema')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Tìm Cực trị
            </button>
          </div>
          {pinnedPoints.length > 0 && (
            <button
              onClick={() => {
                setPinnedPoints([]);
                setAnalysisResult('');
              }}
              className="w-full mt-2 text-xs text-rose-500 hover:underline text-center block"
            >
              Xóa các điểm đánh dấu ({pinnedPoints.length})
            </button>
          )}
          {analysisResult && (
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              {analysisResult}
            </p>
          )}
        </div>

        {/* Send to Whiteboard Action */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <button
            onClick={handleSendToWhiteboard}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            title="Chụp ảnh đồ thị hiện tại và chèn vào Bảng viết"
          >
            <Share2 className="w-4 h-4" />
            <span>Gửi sang Bảng viết</span>
          </button>
        </div>

      </div>

      {/* RIGHT CANVAS: Graph Viewport */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetViewport}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Đặt lại khung nhìn gốc (1:1)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Range Info Box */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
          x ∈ [{viewport.xMin.toFixed(1)}, {viewport.xMax.toFixed(1)}] · y ∈ [{viewport.yMin.toFixed(1)}, {viewport.yMax.toFixed(1)}]
        </div>

        {/* The Graph Canvas */}
        <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            className="w-full h-full block"
          />
        </div>
      </div>

    </div>
  );
};
