/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Sparkles,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  MoveRight,
  Crosshair,
  Undo2,
  Redo2,
  Download,
  Plus,
  Copy,
  Trash2,
  Maximize2,
  Grid3X3,
  Image as ImageIcon,
} from 'lucide-react';
import { DrawingElement, DrawingTool, GridPattern, Point, WhiteboardPage } from '../types';

interface WhiteboardProps {
  pages: WhiteboardPage[];
  currentPageIndex: number;
  onUpdatePages: (pages: WhiteboardPage[], newIndex?: number) => void;
  externalImageToInsert?: string | null;
  onClearExternalImage?: () => void;
}

const COLORS = [
  '#0f172a', // Slate black
  '#2563eb', // Royal blue
  '#dc2626', // Crimson red
  '#16a34a', // Emerald green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#ffffff', // White
];

const STROKE_WIDTHS = [2, 4, 6, 10];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  pages,
  currentPageIndex,
  onUpdatePages,
  externalImageToInsert,
  onClearExternalImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [laserPoints, setLaserPoints] = useState<{ x: number; y: number; time: number }[]>([]);

  // History stack for Undo / Redo per page
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);

  // Text insertion modal/prompt
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  const currentPage = pages[currentPageIndex] || pages[0];

  // Insert external image (e.g. from grapher or numberline) if present
  useEffect(() => {
    if (externalImageToInsert && currentPage) {
      const imgElement: DrawingElement = {
        id: `img-${Date.now()}`,
        type: 'pen',
        color: '#000',
        strokeWidth: 1,
        points: [],
        imageData: externalImageToInsert,
        x: 60,
        y: 60,
        width: 480,
        height: 320,
      };
      const updatedElements = [...currentPage.elements, imgElement];
      const newPages = [...pages];
      newPages[currentPageIndex] = { ...currentPage, elements: updatedElements };
      onUpdatePages(newPages);
      if (onClearExternalImage) onClearExternalImage();
    }
  }, [externalImageToInsert, currentPage, pages, currentPageIndex, onUpdatePages, onClearExternalImage]);

  // Handle laser fading animation loop
  useEffect(() => {
    let animId: number;
    const updateLaser = () => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((p) => now - p.time < 800));
      animId = requestAnimationFrame(updateLaser);
    };
    animId = requestAnimationFrame(updateLaser);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Redraw Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw Background
    ctx.clearRect(0, 0, width, height);

    if (currentPage.grid === 'student') {
      // Vietnamese student 4-line notebook pattern (ô ly học sinh)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Major grid (100px) and minor lines (25px)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#e2e8f0';
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath();
        ctx.strokeStyle = x % 100 === 0 ? '#cbd5e1' : '#e2e8f0';
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath();
        ctx.strokeStyle = y % 100 === 0 ? '#cbd5e1' : '#e2e8f0';
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (currentPage.grid === 'grid') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = '#e2e8f0';
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (currentPage.grid === 'dots') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      const step = 30;
      for (let x = step; x < width; x += step) {
        for (let y = step; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Elements
    for (const el of currentPage.elements) {
      if (el.imageData) {
        const img = new Image();
        img.src = el.imageData;
        if (img.complete) {
          ctx.drawImage(img, el.x || 0, el.y || 0, el.width || 300, el.height || 200);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(el.x || 0, el.y || 0, el.width || 300, el.height || 200);
          ctx.setLineDash([]);
        } else {
          img.onload = () => redrawCanvas();
        }
        continue;
      }

      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'pen' && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'line' && el.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        ctx.lineTo(el.points[1].x, el.points[1].y);
        ctx.stroke();
      } else if (el.type === 'arrow' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headlen = 14;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (el.type === 'rect' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else if (el.type === 'circle' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const cx = Math.min(p1.x, p2.x) + rx;
        const cy = Math.min(p1.y, p2.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'triangle' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.beginPath();
        ctx.moveTo((p1.x + p2.x) / 2, Math.min(p1.y, p2.y));
        ctx.lineTo(Math.min(p1.x, p2.x), Math.max(p1.y, p2.y));
        ctx.lineTo(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'axes' && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        // Ox axis
        ctx.beginPath();
        ctx.moveTo(Math.min(p1.x, p2.x), cy);
        ctx.lineTo(Math.max(p1.x, p2.x), cy);
        ctx.stroke();
        // Oy axis
        ctx.beginPath();
        ctx.moveTo(cx, Math.max(p1.y, p2.y));
        ctx.lineTo(cx, Math.min(p1.y, p2.y));
        ctx.stroke();
        // Labels
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillText('x', Math.max(p1.x, p2.x) - 12, cy - 6);
        ctx.fillText('y', cx + 6, Math.min(p1.y, p2.y) + 14);
        ctx.fillText('O', cx - 12, cy + 14);
      } else if ((el.type === 'text' || el.type === 'formula') && el.text && el.points.length > 0) {
        ctx.font = el.type === 'formula' ? 'italic 18px "Plus Jakarta Sans"' : '16px "Plus Jakarta Sans"';
        ctx.fillText(el.text, el.points[0].x, el.points[0].y);
      }
      ctx.restore();
    }

    // 3. Draw live interactive points while drawing
    if (isDrawing && currentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.stroke();
      } else if (activeTool === 'line' && currentPoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
        ctx.stroke();
      } else if (activeTool === 'arrow' && currentPoints.length >= 2) {
        const p1 = currentPoints[0];
        const p2 = currentPoints[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (activeTool === 'rect' && currentPoints.length >= 2) {
        const p1 = currentPoints[0];
        const p2 = currentPoints[1];
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else if (activeTool === 'circle' && currentPoints.length >= 2) {
        const p1 = currentPoints[0];
        const p2 = currentPoints[1];
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const cx = Math.min(p1.x, p2.x) + rx;
        const cy = Math.min(p1.y, p2.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Draw Laser trace
    if (laserPoints.length > 1) {
      const now = Date.now();
      for (let i = 1; i < laserPoints.length; i++) {
        const p0 = laserPoints[i - 1];
        const p1 = laserPoints[i];
        const age = now - p1.time;
        const opacity = Math.max(0, 1 - age / 800);

        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
        ctx.lineWidth = 6 * opacity;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [currentPage, isDrawing, currentPoints, activeTool, currentColor, strokeWidth, laserPoints]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Adjust canvas pixel resolution to container size
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(rect.width, 900);
      canvas.height = Math.max(rect.height, 650);
      redrawCanvas();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Mouse / Touch drawing handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);

    if (activeTool === 'laser') {
      setLaserPoints([{ x: pt.x, y: pt.y, time: Date.now() }]);
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'text' || activeTool === 'formula') {
      setTextInputPos(pt);
      return;
    }

    if (activeTool === 'eraser') {
      // Find element near click and remove it
      const threshold = 15;
      const filtered = currentPage.elements.filter((el) => {
        if (el.imageData) {
          const within =
            pt.x >= (el.x || 0) &&
            pt.x <= (el.x || 0) + (el.width || 0) &&
            pt.y >= (el.y || 0) &&
            pt.y <= (el.y || 0) + (el.height || 0);
          return !within;
        }
        for (const p of el.points) {
          if (Math.hypot(p.x - pt.x, p.y - pt.y) < threshold) {
            return false;
          }
        }
        return true;
      });

      if (filtered.length !== currentPage.elements.length) {
        saveUndoState();
        const newPages = [...pages];
        newPages[currentPageIndex] = { ...currentPage, elements: filtered };
        onUpdatePages(newPages);
      }
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([pt]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);

    if (activeTool === 'laser' && isDrawing) {
      setLaserPoints((prev) => [...prev, { x: pt.x, y: pt.y, time: Date.now() }]);
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen') {
      setCurrentPoints((prev) => [...prev, pt]);
    } else {
      // Shapes use [startPt, endPt]
      setCurrentPoints((prev) => [prev[0], pt]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'laser') {
      return;
    }

    if (currentPoints.length > 0) {
      saveUndoState();
      const newElement: DrawingElement = {
        id: `el-${Date.now()}`,
        type: activeTool,
        color: currentColor,
        strokeWidth,
        points: currentPoints,
      };
      const newPages = [...pages];
      newPages[currentPageIndex] = {
        ...currentPage,
        elements: [...currentPage.elements, newElement],
      };
      onUpdatePages(newPages);
      setCurrentPoints([]);
    }
  };

  const saveUndoState = () => {
    setUndoStack((prev) => [...prev, currentPage.elements]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, currentPage.elements]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...currentPage, elements: previous };
    onUpdatePages(newPages);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, currentPage.elements]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...currentPage, elements: next };
    onUpdatePages(newPages);
  };

  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue('');
      return;
    }
    saveUndoState();
    const newElement: DrawingElement = {
      id: `text-${Date.now()}`,
      type: activeTool === 'formula' ? 'formula' : 'text',
      color: currentColor,
      strokeWidth: 2,
      points: [textInputPos],
      text: textInputValue.trim(),
    };
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      elements: [...currentPage.elements, newElement],
    };
    onUpdatePages(newPages);
    setTextInputPos(null);
    setTextInputValue('');
  };

  // Export current page to PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `BangViet_Trang${currentPageIndex + 1}_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  // Page Management
  const handleAddPage = () => {
    const newPage: WhiteboardPage = {
      id: `page-${Date.now()}`,
      title: `Trang ${pages.length + 1}`,
      grid: 'student',
      elements: [],
    };
    onUpdatePages([...pages, newPage], pages.length);
  };

  const handleDuplicatePage = () => {
    const dup: WhiteboardPage = {
      id: `page-${Date.now()}`,
      title: `${currentPage.title} (Bản sao)`,
      grid: currentPage.grid,
      elements: JSON.parse(JSON.stringify(currentPage.elements)),
    };
    const newPages = [...pages];
    newPages.splice(currentPageIndex + 1, 0, dup);
    onUpdatePages(newPages, currentPageIndex + 1);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) {
      // Clear page if only 1
      const newPages = [{ ...currentPage, elements: [] }];
      onUpdatePages(newPages, 0);
      return;
    }
    const newPages = pages.filter((_, idx) => idx !== currentPageIndex);
    const newIdx = Math.max(0, currentPageIndex - 1);
    onUpdatePages(newPages, newIdx);
  };

  const handleChangeGrid = (grid: GridPattern) => {
    const newPages = [...pages];
    newPages[currentPageIndex] = { ...currentPage, grid };
    onUpdatePages(newPages);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] bg-slate-100 dark:bg-slate-950 overflow-hidden">
      
      {/* LEFT: Page Thumbnails & Tools Toolbar */}
      <div className="w-full lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        
        {/* Page Selector Strip */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Trang ({pages.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddPage}
              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md"
              title="Thêm trang mới"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleDuplicatePage}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              title="Nhân bản trang hiện tại"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeletePage}
              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md"
              title="Xóa trang hiện tại"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-48 lg:max-h-64 border-b border-slate-200 dark:border-slate-800">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => onUpdatePages(pages, idx)}
              className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between ${
                idx === currentPageIndex
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-xs truncate">{p.title}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {p.elements.length} nét
              </span>
            </button>
          ))}
        </div>

        {/* Tools Palette */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Drawing Tools */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Công cụ vẽ & Giảng dạy
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'pen'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                }`}
                title="Bút viết thông minh"
              >
                <Pen className="w-4 h-4" />
                <span className="text-[10px]">Bút</span>
              </button>

              <button
                onClick={() => setActiveTool('laser')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'laser'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                }`}
                title="Con trỏ Laser (vệt sáng biến mất sau 1s)"
              >
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span className="text-[10px]">Laser</span>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'eraser'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                }`}
                title="Tẩy nét vẽ / đối tượng"
              >
                <Eraser className="w-4 h-4" />
                <span className="text-[10px]">Tẩy</span>
              </button>

              <button
                onClick={() => setActiveTool('text')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'text'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                }`}
                title="Chèn văn bản"
              >
                <Type className="w-4 h-4" />
                <span className="text-[10px]">Chữ</span>
              </button>
            </div>
          </div>

          {/* Geometric Shapes */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Hình cơ bản & Hệ trục
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => setActiveTool('line')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'line' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Đoạn thẳng"
              >
                <Minus className="w-4 h-4" />
                <span className="text-[10px]">Đoạn</span>
              </button>
              <button
                onClick={() => setActiveTool('arrow')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'arrow' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Mũi tên / Vectơ"
              >
                <MoveRight className="w-4 h-4" />
                <span className="text-[10px]">Vectơ</span>
              </button>
              <button
                onClick={() => setActiveTool('rect')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'rect' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Hình chữ nhật"
              >
                <Square className="w-4 h-4" />
                <span className="text-[10px]">HCN</span>
              </button>
              <button
                onClick={() => setActiveTool('circle')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Đường tròn / Elip"
              >
                <Circle className="w-4 h-4" />
                <span className="text-[10px]">Tròn</span>
              </button>
              <button
                onClick={() => setActiveTool('triangle')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'triangle' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Tam giác"
              >
                <Triangle className="w-4 h-4" />
                <span className="text-[10px]">Tam giác</span>
              </button>
              <button
                onClick={() => setActiveTool('axes')}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTool === 'axes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Hệ trục tọa độ Oxy"
              >
                <Crosshair className="w-4 h-4" />
                <span className="text-[10px]">Hệ Oxy</span>
              </button>
            </div>
          </div>

          {/* Color & Stroke Width */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Màu mực & Nét vẽ
            </label>
            <div className="flex items-center gap-2 mb-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrentColor(c)}
                  className={`w-6 h-6 rounded-full border border-slate-300 transition-transform ${
                    currentColor === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`flex-1 py-1 text-xs rounded border text-center transition-colors ${
                    strokeWidth === w
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          {/* Grid Background */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Nền bảng viết
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleChangeGrid('student')}
                className={`px-2 py-1.5 rounded text-xs border text-center ${
                  currentPage.grid === 'student' ? 'border-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'
                }`}
              >
                Vở 4 Ô Ly
              </button>
              <button
                onClick={() => handleChangeGrid('grid')}
                className={`px-2 py-1.5 rounded text-xs border text-center ${
                  currentPage.grid === 'grid' ? 'border-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'
                }`}
              >
                Lưới Tọa Độ
              </button>
              <button
                onClick={() => handleChangeGrid('dots')}
                className={`px-2 py-1.5 rounded text-xs border text-center ${
                  currentPage.grid === 'dots' ? 'border-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'
                }`}
              >
                Lưới Chấm Dot
              </button>
              <button
                onClick={() => handleChangeGrid('blank')}
                className={`px-2 py-1.5 rounded text-xs border text-center ${
                  currentPage.grid === 'blank' ? 'border-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'
                }`}
              >
                Nền Trơn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Canvas Interactive Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Floating Canvas Top Bar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            title="Xuất trang đang mở thành hình ảnh PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất PNG</span>
          </button>
        </div>

        {/* Text insertion dialog */}
        {textInputPos && (
          <div
            className="absolute z-30 bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg p-2 shadow-lg"
            style={{ left: Math.min(textInputPos.x, 600), top: Math.min(textInputPos.y, 400) }}
          >
            <input
              type="text"
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="Nhập chữ hoặc công thức..."
              className="text-sm px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-transparent text-slate-900 dark:text-white outline-none w-56"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddText();
                if (e.key === 'Escape') setTextInputPos(null);
              }}
            />
            <div className="flex justify-end gap-1 mt-2">
              <button
                onClick={() => setTextInputPos(null)}
                className="px-2 py-0.5 text-xs text-slate-500"
              >
                Hủy
              </button>
              <button
                onClick={handleAddText}
                className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded font-medium"
              >
                Chèn
              </button>
            </div>
          </div>
        )}

        {/* The Whiteboard Canvas */}
        <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block"
          />
        </div>
      </div>

    </div>
  );
};
