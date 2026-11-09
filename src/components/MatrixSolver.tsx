/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, RotateCcw, Sparkles, Copy, ClipboardPaste, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { matrixDet, matrixInverse, matrixMul, Fraction } from '../utils/mathEngine';

type MatrixSlot = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface MatrixData {
  rows: number;
  cols: number;
  values: number[][];
}

export const MatrixSolver: React.FC = () => {
  // Slots A to F
  const [activeSlot, setActiveSlot] = useState<MatrixSlot>('A');
  const [secondSlot, setSecondSlot] = useState<MatrixSlot>('B');

  const [matrices, setMatrices] = useState<Record<MatrixSlot, MatrixData>>({
    A: {
      rows: 2,
      cols: 2,
      values: [
        [1, 2],
        [3, 4],
      ], // Test Case 1: det = -2
    },
    B: {
      rows: 2,
      cols: 2,
      values: [
        [1, 2],
        [2, 4],
      ], // Test Case 2: det = 0, non-invertible
    },
    C: {
      rows: 3,
      cols: 3,
      values: [
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ],
    },
    D: {
      rows: 2,
      cols: 3,
      values: [
        [1, 0, 2],
        [-1, 3, 1],
      ],
    },
    E: {
      rows: 3,
      cols: 2,
      values: [
        [3, 1],
        [2, 1],
        [1, 0],
      ],
    },
    F: {
      rows: 2,
      cols: 2,
      values: [
        [1, 0],
        [0, 1],
      ],
    },
  });

  const [scalarK, setScalarK] = useState<number>(2);
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteModalOpen, setPasteModalOpen] = useState<boolean>(false);

  // Results state
  const [detResult, setDetResult] = useState<number | null>(-2);
  const [invResult, setInvResult] = useState<number[][] | null>([
    [-2, 1],
    [1.5, -0.5],
  ]);
  const [transResult, setTransResult] = useState<number[][] | null>([
    [1, 3],
    [2, 4],
  ]);
  const [binaryOpResult, setBinaryOpResult] = useState<{ label: string; matrix: number[][] | null; error?: string }>({
    label: 'A × B',
    matrix: [
      [5, 10],
      [11, 22],
    ],
  });
  const [gaussSteps, setGaussSteps] = useState<string[]>([
    'Bắt đầu ma trận gốc A (2×2)',
    'd2 ← d2 - (3.00)·d1  ⇒  d2 = [0, -2]',
    'Đưa về ma trận bậc thang thành công.',
  ]);
  const [systemConclusion, setSystemConclusion] = useState<string>(
    'Hệ ma trận A có định thức det(A) = -2 ≠ 0. Hệ tuyến tính tương ứng A·X = B có NGHIỆM DUY NHẤT.'
  );

  const curM = matrices[activeSlot];

  // Helper to update current slot matrix
  const updateCurrentMatrix = (updater: (prev: MatrixData) => MatrixData) => {
    setMatrices((prev) => {
      const updated = updater(prev[activeSlot]);
      return { ...prev, [activeSlot]: updated };
    });
  };

  // Change Rows / Cols
  const handleChangeDimension = (newRows: number, newCols: number) => {
    if (newRows < 1 || newRows > 6 || newCols < 1 || newCols > 6) return;
    updateCurrentMatrix((prev) => {
      const nextValues: number[][] = Array.from({ length: newRows }, (_, r) =>
        Array.from({ length: newCols }, (_, c) => {
          if (r < prev.rows && c < prev.cols) return prev.values[r][c];
          return r === c ? 1 : 0;
        })
      );
      return { rows: newRows, cols: newCols, values: nextValues };
    });
  };

  // Handle Paste Data
  const handleApplyPaste = () => {
    try {
      if (!pasteText.trim()) return;
      const lines = pasteText
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const parsed = lines.map((line) =>
        line
          .split(/[\t,;\s]+/)
          .map((v) => parseFloat(v))
          .filter((v) => !isNaN(v))
      );
      if (parsed.length === 0 || parsed[0].length === 0) {
        alert('Dữ liệu dán không đúng định dạng bảng số.');
        return;
      }
      const rCount = Math.min(6, parsed.length);
      const cCount = Math.min(6, parsed[0].length);
      const cleanValues = Array.from({ length: rCount }, (_, r) =>
        Array.from({ length: cCount }, (_, c) => parsed[r][c] || 0)
      );

      setMatrices((prev) => ({
        ...prev,
        [activeSlot]: { rows: rCount, cols: cCount, values: cleanValues },
      }));
      setPasteModalOpen(false);
      setPasteText('');
    } catch {
      alert('Lỗi xử lý dữ liệu dán.');
    }
  };

  // Run Calculations
  const handleCalculateAll = () => {
    const mA = matrices[activeSlot];
    const mB = matrices[secondSlot];

    // 1. Transpose
    const trans = Array.from({ length: mA.cols }, (_, c) =>
      Array.from({ length: mA.rows }, (_, r) => mA.values[r][c])
    );
    setTransResult(trans);

    // 2. Determinant & Inverse (Only for square matrices)
    if (mA.rows === mA.cols) {
      const d = matrixDet(mA.values);
      setDetResult(d);
      if (Math.abs(d) > 1e-12) {
        const inv = matrixInverse(mA.values);
        setInvResult(inv);
        setSystemConclusion(`Hệ có det(${activeSlot}) = ${d.toFixed(2)} ≠ 0: Khả nghịch, hệ A·X = B có NGHIỆM DUY NHẤT.`);
      } else {
        setInvResult(null);
        setSystemConclusion(`det(${activeSlot}) = 0: Ma trận KHÔNG KHẢ NGHỊCH. Hệ phương trình suy biến (VÔ NGHIỆM hoặc VÔ SỐ NGHIỆM).`);
      }
    } else {
      setDetResult(null);
      setInvResult(null);
      setSystemConclusion(`Ma trận không vuông (${mA.rows}×${mA.cols}) nên không có định thức và nghịch đảo hai phía.`);
    }

    // 3. Multiplication: A * B
    if (mA.cols === mB.rows) {
      const prod = matrixMul(mA.values, mB.values);
      setBinaryOpResult({ label: `${activeSlot} × ${secondSlot}`, matrix: prod });
    } else {
      setBinaryOpResult({
        label: `${activeSlot} × ${secondSlot}`,
        matrix: null,
        error: `Không thể nhân: số cột ${activeSlot} (${mA.cols}) ≠ số hàng ${secondSlot} (${mB.rows}).`,
      });
    }

    // 4. Gauss Elimination steps on mA
    const steps: string[] = [];
    const M = mA.values.map((row) => [...row]);
    const numR = M.length;
    const numC = M[0].length;
    steps.push(`Bắt đầu ma trận gốc ${activeSlot} (${numR}×${numC}):`);

    let pivotRow = 0;
    for (let c = 0; c < numC && pivotRow < numR; c++) {
      let maxR = pivotRow;
      for (let r = pivotRow + 1; r < numR; r++) {
        if (Math.abs(M[r][c]) > Math.abs(M[maxR][c])) maxR = r;
      }
      if (Math.abs(M[maxR][c]) < 1e-12) continue;

      if (maxR !== pivotRow) {
        const tmp = M[pivotRow];
        M[pivotRow] = M[maxR];
        M[maxR] = tmp;
        steps.push(`Đổi dòng d${pivotRow + 1} ↔ d${maxR + 1}`);
      }

      for (let r = pivotRow + 1; r < numR; r++) {
        const factor = M[r][c] / M[pivotRow][c];
        if (Math.abs(factor) > 1e-12) {
          for (let colIdx = c; colIdx < numC; colIdx++) {
            M[r][colIdx] -= factor * M[pivotRow][colIdx];
          }
          steps.push(`d${r + 1} ← d${r + 1} - (${factor.toFixed(2)})·d${pivotRow + 1}`);
        }
      }
      pivotRow++;
    }

    steps.push(`Đưa về ma trận bậc thang thành công.`);
    setGaussSteps(steps);
  };

  // Reset current matrix
  const handleResetCurrent = () => {
    updateCurrentMatrix((prev) => ({
      rows: 2,
      cols: 2,
      values: [
        [1, 0],
        [0, 1],
      ],
    }));
    setGaussSteps([]);
    setDetResult(1);
    setInvResult([
      [1, 0],
      [0, 1],
    ]);
  };

  // Sample Loaders
  const handleLoadSample = (sampleType: 'test1' | 'test2' | 'system3x3') => {
    if (sampleType === 'test1') {
      // Test Case 1: [[1, 2], [3, 4]] -> det = -2
      setActiveSlot('A');
      setMatrices((prev) => ({
        ...prev,
        A: {
          rows: 2,
          cols: 2,
          values: [
            [1, 2],
            [3, 4],
          ],
        },
      }));
    } else if (sampleType === 'test2') {
      // Test Case 2: [[1, 2], [2, 4]] -> non-invertible
      setActiveSlot('B');
      setMatrices((prev) => ({
        ...prev,
        B: {
          rows: 2,
          cols: 2,
          values: [
            [1, 2],
            [2, 4],
          ],
        },
      }));
    } else if (sampleType === 'system3x3') {
      setActiveSlot('C');
      setMatrices((prev) => ({
        ...prev,
        C: {
          rows: 3,
          cols: 3,
          values: [
            [1, 2, -1],
            [2, -1, 1],
            [1, 1, 1],
          ],
        },
      }));
    }
    setTimeout(handleCalculateAll, 50);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Ma trận & Hệ phương trình (Lưu trữ các ô A – F)
            </span>
          </div>

          {/* Sample Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
            <button
              onClick={() => handleLoadSample('test1')}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              det([1 2; 3 4]) = -2
            </button>
            <button
              onClick={() => handleLoadSample('test2')}
              className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100"
            >
              [1 2; 2 4] không khả nghịch
            </button>
            <button
              onClick={() => handleLoadSample('system3x3')}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Hệ 3×3 Cramer
            </button>
          </div>
        </div>

        {/* Slot selector A-F */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase mr-1">Chọn ma trận:</span>
            {(['A', 'B', 'C', 'D', 'E', 'F'] as MatrixSlot[]).map((slot) => {
              const isActive = activeSlot === slot;
              const slotData = matrices[slot];
              return (
                <button
                  key={slot}
                  onClick={() => {
                    setActiveSlot(slot);
                    setTimeout(handleCalculateAll, 30);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {slot} ({slotData.rows}×{slotData.cols})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPasteModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Dán dữ liệu dạng bảng từ Excel/bộ nhớ tạm"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán dữ liệu</span>
            </button>
            <button
              onClick={handleResetCurrent}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Dimensions controls */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Số hàng:</span>
            {[1, 2, 3, 4].map((r) => (
              <button
                key={r}
                onClick={() => handleChangeDimension(r, curM.cols)}
                className={`w-7 h-7 rounded border font-bold ${
                  curM.rows === r ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950' : 'border-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span>Số cột:</span>
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                onClick={() => handleChangeDimension(curM.rows, c)}
                className={`w-7 h-7 rounded border font-bold ${
                  curM.cols === c ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950' : 'border-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={handleCalculateAll}
            className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Tính toán ma trận</span>
          </button>
        </div>
      </div>

      {/* Paste Data Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider block">
              Dán dữ liệu vào ma trận {activeSlot}
            </span>
            <p className="text-xs text-slate-500">
              Dán bảng số từ Excel hoặc văn bản cách nhau bởi phím Tab, dấu phẩy hoặc khoảng trắng:
            </p>
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="1   2&#10;3   4"
              className="w-full p-2.5 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyPaste}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Áp dụng dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Grid: Matrix Editor on Left, Computations on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Grid Editor (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Lưới ô nhập ma trận {activeSlot} ({curM.rows}×{curM.cols})
            </span>
            <span className="text-[11px] text-slate-400">Nhập số trực tiếp</span>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="inline-flex flex-col gap-2">
              {curM.values.map((row, r) => (
                <div key={r} className="flex gap-2">
                  {row.map((val, c) => (
                    <input
                      key={c}
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => {
                        const newV = curM.values.map((rw) => [...rw]);
                        newV[r][c] = parseFloat(e.target.value) || 0;
                        updateCurrentMatrix((prev) => ({ ...prev, values: newV }));
                      }}
                      className="w-16 h-12 text-center font-mono font-bold text-base border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Multiply selector with second slot */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Nhân với ma trận:</span>
            <div className="flex items-center gap-1.5">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as MatrixSlot[])
                .filter((s) => s !== activeSlot)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSecondSlot(s);
                      setTimeout(handleCalculateAll, 20);
                    }}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      secondSlot === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border'
                    }`}
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Results & Gauss Steps (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Determinant */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                Định thức det({activeSlot}):
              </span>
              <div className="text-2xl font-black font-mono text-indigo-950 dark:text-white mt-1">
                {detResult !== null ? detResult : 'N/A'}
              </div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block mt-0.5">
                {detResult !== null
                  ? detResult !== 0
                    ? 'Khả nghịch (det ≠ 0)'
                    : 'Suy biến (det = 0)'
                  : 'Chỉ tính cho ma trận vuông'}
              </span>
            </div>

            {/* Inverse A^-1 */}
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 sm:col-span-2">
              <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                Nghịch đảo {activeSlot}⁻¹:
              </span>
              {invResult ? (
                <div className="text-xs font-mono font-bold text-sky-950 dark:text-white mt-1 space-y-0.5">
                  {invResult.map((r, i) => (
                    <div key={i}>[{r.map((v) => v.toFixed(2)).join(', ')}]</div>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-semibold text-rose-600 mt-1 block">
                  Không tồn tại ma trận nghịch đảo (det = 0 hoặc không vuông).
                </span>
              )}
            </div>

          </div>

          {/* Matrix Multiply A * B and Transpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Chuyển vị {activeSlot}ᵀ ({curM.cols}×{curM.rows}):
              </span>
              {transResult && (
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 space-y-0.5">
                  {transResult.map((r, i) => (
                    <div key={i}>[{r.map((v) => v.toFixed(1)).join(', ')}]</div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Tích {binaryOpResult.label}:
              </span>
              {binaryOpResult.matrix ? (
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 space-y-0.5">
                  {binaryOpResult.matrix.map((r, i) => (
                    <div key={i}>[{r.map((v) => v.toFixed(1)).join(', ')}]</div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-rose-500 font-semibold">{binaryOpResult.error}</span>
              )}
            </div>
          </div>

          {/* System Conclusion Card */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider block">
                Kết luận hệ phương trình & Khả nghịch
              </span>
              <p className="text-xs font-medium text-emerald-950 dark:text-emerald-100 font-mono mt-0.5">
                {systemConclusion}
              </p>
            </div>
          </div>

          {/* Gauss Steps */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Biến đổi sơ cấp dòng (Khử Gauss) trên {activeSlot}:
            </span>
            <div className="space-y-1 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto">
              {gaussSteps.map((st, i) => (
                <p key={i}>{st}</p>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
