/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Download, RotateCcw } from 'lucide-react';
import { evaluateMath, Fraction } from '../utils/mathEngine';

interface TableRowData {
  index: number;
  x: number;
  xDisplay: string;
  fx: number | null;
  fxDisplay: string;
  fxExact?: string;
  gx: number | null;
  gxDisplay: string;
  gxExact?: string;
  isErrorF: boolean;
  isErrorG: boolean;
}

export const TableOfValues: React.FC = () => {
  const [funcF, setFuncF] = useState<string>('x^2 - 2*x');
  const [funcG, setFuncG] = useState<string>('x - 1');
  const [startInput, setStartInput] = useState<string>('0');
  const [endInput, setEndInput] = useState<string>('3');
  const [stepInput, setStepInput] = useState<string>('1/2');

  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const miniCanvasRef = useRef<HTMLCanvasElement>(null);

  // Compute table
  const handleGenerateTable = () => {
    try {
      setErrorMessage('');
      const start = evaluateMath(startInput);
      const end = evaluateMath(endInput);
      const step = evaluateMath(stepInput);

      if (step <= 0) {
        setErrorMessage('Bước nhảy (Step) phải lớn hơn 0');
        return;
      }

      if (start > end) {
        setErrorMessage('Cận đầu (Start) phải nhỏ hơn hoặc bằng Cận cuối (End)');
        return;
      }

      const count = Math.min(200, Math.floor((end - start) / step) + 1);
      const rows: TableRowData[] = [];

      for (let i = 0; i < count; i++) {
        const x = start + i * step;
        
        // Exact fraction for x if possible
        const fracX = Fraction.fromNumber(x);
        const xDisp = Math.abs(x - fracX.toNumber()) < 1e-5 ? fracX.toString() : x.toFixed(4);

        // Evaluate f(x)
        let fx: number | null = null;
        let fxDisp = '';
        let fxExact = '';
        let isErrF = false;

        try {
          fx = evaluateMath(funcF, { x });
          if (isNaN(fx) || !isFinite(fx)) {
            isErrF = true;
            fxDisp = 'Không xác định';
          } else {
            const fracF = Fraction.fromNumber(fx);
            if (fracF.d !== 1 && fracF.d <= 5000 && Math.abs(fx - fracF.toNumber()) < 1e-5) {
              fxExact = fracF.toString();
            }
            fxDisp = Number.isInteger(fx) ? fx.toString() : fx.toFixed(4);
          }
        } catch {
          isErrF = true;
          fxDisp = 'Lỗi phép tính';
        }

        // Evaluate g(x)
        let gx: number | null = null;
        let gxDisp = '';
        let gxExact = '';
        let isErrG = false;

        if (funcG.trim()) {
          try {
            gx = evaluateMath(funcG, { x });
            if (isNaN(gx) || !isFinite(gx)) {
              isErrG = true;
              gxDisp = 'Không xác định';
            } else {
              const fracG = Fraction.fromNumber(gx);
              if (fracG.d !== 1 && fracG.d <= 5000 && Math.abs(gx - fracG.toNumber()) < 1e-5) {
                gxExact = fracG.toString();
              }
              gxDisp = Number.isInteger(gx) ? gx.toString() : gx.toFixed(4);
            }
          } catch {
            isErrG = true;
            gxDisp = 'Lỗi phép tính';
          }
        }

        rows.push({
          index: i + 1,
          x,
          xDisplay: xDisp,
          fx,
          fxDisplay: fxDisp,
          fxExact,
          gx,
          gxDisplay: gxDisp,
          gxExact,
          isErrorF: isErrF,
          isErrorG: isErrG,
        });
      }

      setTableData(rows);
      setSelectedIndex(0);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi tham số đầu vào');
    }
  };

  useEffect(() => {
    handleGenerateTable();
  }, []);

  // Draw Synchronized Mini Graph
  useEffect(() => {
    const canvas = miniCanvasRef.current;
    if (!canvas || tableData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Find min and max for scaling
    const validPointsF = tableData.filter((r) => r.fx !== null && !r.isErrorF);
    const validPointsG = tableData.filter((r) => r.gx !== null && !r.isErrorG);

    const allX = tableData.map((r) => r.x);
    const allY = [
      ...validPointsF.map((r) => r.fx as number),
      ...validPointsG.map((r) => r.gx as number),
    ];

    if (allX.length === 0 || allY.length === 0) return;

    const minX = Math.min(...allX) - 0.5;
    const maxX = Math.max(...allX) + 0.5;
    const minY = Math.min(...allY, 0) - 1;
    const maxY = Math.max(...allY, 0) + 1;

    const toX = (x: number) => ((x - minX) / (maxX - minX)) * (width - 40) + 25;
    const toY = (y: number) => height - 25 - ((y - minY) / (maxY - minY)) * (height - 50);

    // Draw Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    const originY = toY(0);
    const originX = toX(0);

    // Horizontal axis Ox
    ctx.beginPath();
    ctx.moveTo(10, originY);
    ctx.lineTo(width - 10, originY);
    ctx.stroke();

    // Curve f(x)
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (const r of validPointsF) {
      const sx = toX(r.x);
      const sy = toY(r.fx!);
      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // Curve g(x) if present
    if (funcG.trim() && validPointsG.length > 0) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      let startedG = false;
      for (const r of validPointsG) {
        const sx = toX(r.x);
        const sy = toY(r.gx!);
        if (!startedG) {
          ctx.moveTo(sx, sy);
          startedG = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw all data points lightly
    for (const r of validPointsF) {
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(toX(r.x), toY(r.fx!), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight Selected Row Point(s)
    if (selectedIndex !== null && tableData[selectedIndex]) {
      const row = tableData[selectedIndex];

      if (row.fx !== null && !row.isErrorF) {
        const sx = toX(row.x);
        const sy = toY(row.fx);

        // Projection lines
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, originY);
        ctx.stroke();
        ctx.restore();

        // Big Highlighted Point
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 11px "JetBrains Mono"';
        ctx.fillText(`f(${row.xDisplay}) = ${row.fxExact || row.fxDisplay}`, sx + 8, sy - 6);
      }

      if (row.gx !== null && !row.isErrorG) {
        const sx = toX(row.x);
        const sy = toY(row.gx);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#7f1d1d';
        ctx.font = 'bold 11px "JetBrains Mono"';
        ctx.fillText(`g(${row.xDisplay}) = ${row.gxExact || row.gxDisplay}`, sx + 8, sy + 14);
      }
    }
  }, [tableData, selectedIndex, funcG]);

  // Sample Presets
  const handleLoadSample = (sampleType: 'testCase' | 'rational' | 'trig') => {
    if (sampleType === 'testCase') {
      setFuncF('x^2 - 2*x');
      setFuncG('');
      setStartInput('0');
      setEndInput('3');
      setStepInput('1/2');
    } else if (sampleType === 'rational') {
      setFuncF('(2*x - 1)/(x + 1)');
      setFuncG('2');
      setStartInput('-3');
      setEndInput('3');
      setStepInput('0.5');
    } else if (sampleType === 'trig') {
      setFuncF('sin(x)');
      setFuncG('cos(x)');
      setStartInput('0');
      setEndInput('pi');
      setStepInput('pi/6');
    }
    setTimeout(handleGenerateTable, 50);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng giá trị hàm số (Casio Table Mode)
            </span>
          </div>

          {/* Sample buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
            <button
              onClick={() => handleLoadSample('testCase')}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              f(x) = x² - 2x (bước 1/2)
            </button>
            <button
              onClick={() => handleLoadSample('rational')}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              Phân thức (2x-1)/(x+1)
            </button>
            <button
              onClick={() => handleLoadSample('trig')}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              Lượng giác (bước π/6)
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Hàm f(x)
            </label>
            <input
              type="text"
              value={funcF}
              onChange={(e) => setFuncF(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-600"
              placeholder="ví dụ: x^2 - 2*x"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Hàm g(x) (tùy chọn)
            </label>
            <input
              type="text"
              value={funcG}
              onChange={(e) => setFuncG(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-600"
              placeholder="ví dụ: x - 1"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Cận đầu (Start)
            </label>
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Cận cuối (End)
            </label>
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Bước nhảy (Step)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                placeholder="1/2, 0.5..."
              />
              <button
                onClick={handleGenerateTable}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shrink-0 flex items-center gap-1 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tính</span>
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
        )}
      </div>

      {/* Main Content: Table on Left (7 cols), Synchronized Mini-Graph on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table View (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Bảng kết quả ({tableData.length} giá trị)
            </span>
            <span className="text-xs text-slate-400">
              Nhấp vào dòng để làm nổi điểm trên đồ thị
            </span>
          </div>

          <div className="flex-1 overflow-x-auto max-h-[460px] border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 font-mono">x</th>
                  <th className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">f(x)</th>
                  {funcG.trim() && (
                    <th className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">g(x)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {tableData.map((row, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <tr
                      key={row.index}
                      onClick={() => setSelectedIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-900 dark:text-indigo-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">{row.index}</td>
                      <td className="py-2 px-3 font-mono font-medium">{row.xDisplay}</td>
                      
                      {/* f(x) column */}
                      <td className="py-2 px-3 font-mono">
                        {row.isErrorF ? (
                          <span className="text-rose-500 font-semibold">{row.fxDisplay}</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>{row.fxDisplay}</span>
                            {row.fxExact && (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                [{row.fxExact}]
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* g(x) column */}
                      {funcG.trim() && (
                        <td className="py-2 px-3 font-mono">
                          {row.isErrorG ? (
                            <span className="text-rose-500 font-semibold">{row.gxDisplay}</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{row.gxDisplay}</span>
                              {row.gxExact && (
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                                  [{row.gxExact}]
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Synchronized Graph (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Minh họa hình học đồng bộ
            </span>
            {selectedIndex !== null && tableData[selectedIndex] && (
              <span className="text-xs font-mono font-bold text-indigo-600">
                x = {tableData[selectedIndex].xDisplay}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[360px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
            <canvas
              ref={miniCanvasRef}
              width={420}
              height={360}
              className="w-full h-full block"
            />
          </div>

          {selectedIndex !== null && tableData[selectedIndex] && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Chi tiết giá trị tại x = {tableData[selectedIndex].xDisplay}:
              </div>
              <div className="font-mono text-indigo-600 dark:text-indigo-400">
                f({tableData[selectedIndex].xDisplay}) = {tableData[selectedIndex].fxExact || tableData[selectedIndex].fxDisplay}
              </div>
              {funcG.trim() && (
                <div className="font-mono text-rose-600 dark:text-rose-400">
                  g({tableData[selectedIndex].xDisplay}) = {tableData[selectedIndex].gxExact || tableData[selectedIndex].gxDisplay}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
