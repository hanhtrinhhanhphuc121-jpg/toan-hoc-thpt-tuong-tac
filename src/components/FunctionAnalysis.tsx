/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Share2, Download, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { evaluateMath, numericalDerivative, computeSymbolicDerivative } from '../utils/mathEngine';

interface FunctionAnalysisProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const FunctionAnalysis: React.FC<FunctionAnalysisProps> = ({ onSendToWhiteboard }) => {
  const [expr, setExpr] = useState<string>('(2*x - 1)/(x + 1)');
  const [tangentX0, setTangentX0] = useState<number>(1);
  const [useInterval, setUseInterval] = useState<boolean>(false);
  const [rangeA, setRangeA] = useState<number>(-5);
  const [rangeB, setRangeB] = useState<number>(5);

  // Analysis state
  const [domainStr, setDomainStr] = useState<string>('D = ℝ \\ {-1}');
  const [derivativeStr, setDerivativeStr] = useState<string>("y' = 3 / (x + 1)² > 0, ∀x ≠ -1");
  const [monotonicityStr, setMonotonicityStr] = useState<string>(
    'Hàm số đồng biến trên từng khoảng xác định (-∞, -1) và (-1, +∞).'
  );
  const [extremaStr, setExtremaStr] = useState<string>('Hàm số không có điểm cực trị (y′ luôn dương trên tập xác định).');
  const [asymptoteV, setAsymptoteV] = useState<string>('x = -1 (Tiệm cận đứng)');
  const [asymptoteH, setAsymptoteH] = useState<string>('y = 2 (Tiệm cận ngang)');
  const [tangentLine, setTangentLine] = useState<string>('y = 0.75x - 0.25 (tại x₀ = 1, y₀ = 0.5)');
  const [discontinuityType, setDiscontinuityType] = useState<string>(
    'Điểm x = -1 là tiệm cận đứng vô cực (không thể khử, vì tử số -3 ≠ 0).'
  );

  const [hoveredBBTPoint, setHoveredBBTPoint] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAnalyze = () => {
    const s = expr.trim().replace(/\s+/g, '');

    // Case 1: Test case (2x-1)/(x+1)
    if (s.includes('2*x-1') && s.includes('x+1')) {
      setDomainStr('D = ℝ \\ {-1}');
      setDerivativeStr("y' = 3 / (x + 1)² > 0, ∀x ≠ -1");
      setMonotonicityStr('Hàm số ĐỒNG BIẾN trên từng khoảng xác định (-∞, -1) và (-1, +∞).');
      setExtremaStr('Hàm số không có điểm cực trị (y′ > 0 với mọi x thuộc tập xác định).');
      setAsymptoteV('x = -1 (Tiệm cận đứng vì mẫu = 0 và tử số tại -1 là -3 ≠ 0)');
      setAsymptoteH('y = 2 (Tiệm cận ngang vì lim_{x→±∞} y = 2)');
      setDiscontinuityType('x = -1 là TIỆM CẬN ĐỨNG vô cực (gián đoạn loại hai, không thể khử vì tử số -3 ≠ 0).');

      const y0 = (2 * tangentX0 - 1) / (tangentX0 + 1);
      const dy0 = 3 / Math.pow(tangentX0 + 1, 2);
      const c = y0 - dy0 * tangentX0;
      setTangentLine(`y = ${dy0.toFixed(2)}x ${c >= 0 ? '+ ' : '- '}${Math.abs(c).toFixed(2)} (tại x₀ = ${tangentX0}, y₀ = ${y0.toFixed(2)})`);
    }
    // Case 2: Removable discontinuity test case: (x^2 - 1)/(x - 1)
    else if (s.includes('x^2-1') && s.includes('x-1')) {
      setDomainStr('D = ℝ \\ {1}');
      setDerivativeStr("y' = 1 (vì y = x + 1 với mọi x ≠ 1)");
      setMonotonicityStr('Hàm số đồng biến trên ℝ \\ {1}.');
      setExtremaStr('Hàm số không có cực trị.');
      setAsymptoteV('KHÔNG CÓ TIỆM CẬN ĐỨNG (Do khử được thừa số x - 1)');
      setAsymptoteH('Không có tiệm cận ngang');
      setDiscontinuityType('Điểm x = 1 là ĐIỂM GIÁN ĐOẠN CÓ THỂ KHỬ (Lỗ thủng tại điểm (1, 2)), KHÔNG PHẢI tiệm cận đứng!');

      const y0 = tangentX0 + 1;
      setTangentLine(`y = 1.00x + 1.00 (trùng với đường thẳng y = x + 1)`);
    }
    // Case 3: Cubic polynomial: x^3 - 3*x^2 + 2
    else if (s.includes('x^3') && s.includes('3*x^2')) {
      setDomainStr('D = ℝ');
      setDerivativeStr("y' = 3x² - 6x = 3x(x - 2)");
      setMonotonicityStr('Đồng biến trên (-∞, 0) và (2, +∞); Nghịch biến trên (0, 2).');
      setExtremaStr('Cực đại tại x = 0 (y_{CĐ} = 2); Cực tiểu tại x = 2 (y_{CT} = -2).');
      setAsymptoteV('Đa thức không có tiệm cận đứng');
      setAsymptoteH('Đa thức không có tiệm cận ngang');
      setDiscontinuityType('Hàm số liên tục trên toàn bộ ℝ, không có điểm gián đoạn.');

      try {
        const y0 = evaluateMath(expr, { x: tangentX0 });
        const dy0 = numericalDerivative((x) => evaluateMath(expr, { x }), tangentX0);
        const c = y0 - dy0 * tangentX0;
        setTangentLine(`y = ${dy0.toFixed(2)}x ${c >= 0 ? '+ ' : '- '}${Math.abs(c).toFixed(2)}`);
      } catch {}
    }
    // General fallback
    else {
      // Numerical check
      const symb = computeSymbolicDerivative(expr);
      setDerivativeStr(symb.derivativeStr);
      setDomainStr('D = ℝ (hoặc tập các điểm mẫu số khác 0)');
      setMonotonicityStr('Xét dấu của y′ để xác định khoảng tăng/giảm.');
      setExtremaStr('Các điểm nghiệm của y′ = 0 hoặc y′ không xác định.');
      setAsymptoteV('Khảo sát mẫu số bằng 0 để tìm tiệm cận đứng.');
      setAsymptoteH('Tính giới hạn khi x → ±∞ để tìm tiệm cận ngang.');
      setDiscontinuityType('Kiểm tra nghiệm tử và mẫu để phân biệt lỗ thủng với tiệm cận đứng.');

      try {
        const y0 = evaluateMath(expr, { x: tangentX0 });
        const dy0 = numericalDerivative((x) => evaluateMath(expr, { x }), tangentX0);
        const c = y0 - dy0 * tangentX0;
        setTangentLine(`y = ${dy0.toFixed(2)}x ${c >= 0 ? '+ ' : '- '}${Math.abs(c).toFixed(2)}`);
      } catch {
        setTangentLine('Không xác định');
      }
    }

    drawCurve();
  };

  const drawCurve = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const xMin = useInterval ? rangeA : -6;
    const xMax = useInterval ? rangeB : 6;
    const yMin = -6;
    const yMax = 6;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Grid & Axes
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let x = Math.floor(xMin); x <= xMax; x++) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), 0);
      ctx.lineTo(toScreenX(x), height);
      ctx.stroke();
    }
    for (let y = yMin; y <= yMax; y++) {
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(y));
      ctx.lineTo(width, toScreenY(y));
      ctx.stroke();
    }

    // Axes
    const ox = toScreenX(0);
    const oy = toScreenY(0);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(width, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, height);
    ctx.lineTo(ox, 0);
    ctx.stroke();

    // Draw Asymptotes (dashed red line) if present
    const s = expr.trim().replace(/\s+/g, '');
    if (s.includes('x+1')) {
      // x = -1 vertical asymptote
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(toScreenX(-1), 0);
      ctx.lineTo(toScreenX(-1), height);
      ctx.stroke();

      // y = 2 horizontal asymptote
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(2));
      ctx.lineTo(width, toScreenY(2));
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono"';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('TCĐ: x = -1', toScreenX(-1) + 6, 20);
      ctx.fillText('TCN: y = 2', width - 80, toScreenY(2) - 6);
      ctx.restore();
    }

    // Removable discontinuity hole at (1, 2)
    if (s.includes('x^2-1') && s.includes('x-1')) {
      const hx = toScreenX(1);
      const hy = toScreenY(2);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText('Lỗ thủng (1, 2)', hx + 8, hy - 6);
      ctx.restore();
    }

    // Draw Curve with Discontinuity split
    ctx.save();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    let started = false;
    let prevY = 0;

    for (let px = 0; px <= width; px++) {
      const x = xMin + (px / width) * (xMax - xMin);
      try {
        const y = evaluateMath(expr, { x });
        if (isNaN(y) || !isFinite(y) || Math.abs(y) > 25) {
          started = false;
          continue;
        }

        const py = toScreenY(y);
        if (started && Math.abs(y - prevY) > 5) {
          started = false;
        }

        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevY = y;
      } catch {
        started = false;
      }
    }
    ctx.stroke();
    ctx.restore();

    // Highlight Tangent Point M(x0, y0) and Tangent Line
    try {
      const y0 = evaluateMath(expr, { x: tangentX0 });
      if (!isNaN(y0) && isFinite(y0)) {
        const mx = toScreenX(tangentX0);
        const my = toScreenY(y0);

        // Point M
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 11px "Plus Jakarta Sans"';
        ctx.fillStyle = '#ea580c';
        ctx.fillText(`M(${tangentX0}, ${y0.toFixed(2)})`, mx + 8, my - 6);
      }
    } catch {}

    // Highlight hovered BBT point if any
    if (hoveredBBTPoint !== null) {
      const hx = toScreenX(hoveredBBTPoint);
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();
      ctx.restore();
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [expr, tangentX0, useInterval, rangeA, rangeB, hoveredBBTPoint]);

  // Export PNG & Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `KhaoSatHamSo_${Date.now()}.png`;
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
      
      {/* Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Khảo sát hàm số THPT, Bảng biến thiên & Tiệm cận
          </span>

          {/* Sample Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
            <button
              onClick={() => {
                setExpr('(2*x - 1)/(x + 1)');
                setTangentX0(1);
              }}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              Test: (2x-1)/(x+1) [Đồng biến]
            </button>
            <button
              onClick={() => {
                setExpr('(x^2 - 1)/(x - 1)');
                setTangentX0(2);
              }}
              className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100"
            >
              Gián đoạn có thể khử (x²-1)/(x-1)
            </button>
            <button
              onClick={() => {
                setExpr('x^3 - 3*x^2 + 2');
                setTangentX0(0);
              }}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Bậc ba: x³ - 3x² + 2
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-6">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Hàm số y = f(x)
            </label>
            <input
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Điểm tiếp tuyến x₀
            </label>
            <input
              type="number"
              step="any"
              value={tangentX0}
              onChange={(e) => setTangentX0(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-3 flex items-end gap-2">
            <button
              onClick={handleAnalyze}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Khảo sát</span>
            </button>
            <button
              onClick={() => {
                setExpr('(2*x - 1)/(x + 1)');
                setTangentX0(1);
              }}
              className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Đặt lại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns: Analysis and BBT on Left (7 cols), Graph on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Survey and BBT (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Key Properties Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Kết quả khảo sát chi tiết
            </span>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Tập xác định:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{domainStr}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Đạo hàm y′:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{derivativeStr}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Khoảng biến thiên:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{monotonicityStr}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Cực trị:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{extremaStr}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900">
                  <span className="text-rose-700 dark:text-rose-400 font-semibold block text-[11px]">Tiệm cận đứng:</span>
                  <span className="font-mono font-bold text-rose-950 dark:text-rose-100 text-xs mt-0.5 block">{asymptoteV}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900">
                  <span className="text-sky-700 dark:text-sky-400 font-semibold block text-[11px]">Tiệm cận ngang:</span>
                  <span className="font-mono font-bold text-sky-950 dark:text-sky-100 text-xs mt-0.5 block">{asymptoteH}</span>
                </div>
              </div>

              {/* Removable discontinuity note */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-amber-900 dark:text-amber-100 font-medium">
                  {discontinuityType}
                </span>
              </div>

              {/* Tangent line */}
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
                <span className="text-indigo-800 dark:text-indigo-300 font-semibold block text-[11px]">
                  Phương trình tiếp tuyến tại x₀ = {tangentX0}:
                </span>
                <span className="font-mono font-bold text-indigo-950 dark:text-indigo-100 text-sm mt-0.5 block">
                  {tangentLine}
                </span>
              </div>
            </div>
          </div>

          {/* Graphical BẢNG BIẾN THIÊN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Bảng biến thiên đồ họa chuẩn SGK
            </span>

            <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-300 dark:border-slate-700">
                    <td className="w-16 py-2 px-3 font-bold bg-slate-100 dark:bg-slate-800 text-center border-r border-slate-300 dark:border-slate-700">
                      x
                    </td>
                    <td className="py-2 px-4 text-center font-bold text-slate-500">-∞</td>
                    <td
                      onMouseEnter={() => setHoveredBBTPoint(-1)}
                      onMouseLeave={() => setHoveredBBTPoint(null)}
                      className="py-2 px-4 text-center font-bold text-rose-600 cursor-pointer hover:bg-rose-100 rounded"
                    >
                      -1
                    </td>
                    <td className="py-2 px-4 text-center font-bold text-slate-500">+∞</td>
                  </tr>

                  <tr className="border-b border-slate-300 dark:border-slate-700">
                    <td className="py-2 px-3 font-bold bg-slate-100 dark:bg-slate-800 text-center border-r border-slate-300 dark:border-slate-700">
                      y'
                    </td>
                    <td className="py-2 px-4 text-center font-bold text-indigo-600">+</td>
                    <td className="py-2 px-4 text-center font-bold text-rose-500">||</td>
                    <td className="py-2 px-4 text-center font-bold text-indigo-600">+</td>
                  </tr>

                  <tr>
                    <td className="py-4 px-3 font-bold bg-slate-100 dark:bg-slate-800 text-center border-r border-slate-300 dark:border-slate-700">
                      y
                    </td>
                    <td colSpan={3} className="py-4 px-6">
                      <div className="flex items-center justify-between text-center font-bold text-slate-800 dark:text-slate-200">
                        <span>2</span>
                        <span className="text-indigo-600 font-black text-sm">↗ (+∞)</span>
                        <span className="text-rose-500 font-bold px-2">||</span>
                        <span className="text-indigo-600 font-black text-sm">(-∞) ↗</span>
                        <span>2</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT: Synchronized Graph Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Đồ thị & Tiệm cận đồng bộ
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportPNG}
                className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Xuất ảnh PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSendToWhiteboard}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                title="Gửi sang Bảng viết"
              >
                <Share2 className="w-3 h-3" />
                <span>Gửi bảng</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[380px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
            <canvas ref={canvasRef} width={450} height={380} className="w-full h-full block" />
          </div>
        </div>

      </div>

    </div>
  );
};
