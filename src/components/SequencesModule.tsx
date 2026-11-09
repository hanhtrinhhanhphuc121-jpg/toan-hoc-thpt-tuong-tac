/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Sparkles, CheckCircle2, AlertCircle, Share2, Download } from 'lucide-react';

interface SequencesProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const SequencesModule: React.FC<SequencesProps> = ({ onSendToWhiteboard }) => {
  const [seqType, setSeqType] = useState<'ap' | 'gp' | 'recur'>('ap');

  // AP state: u1 = 3, d = 4 -> u20 = 79, S20 = 820
  const [u1, setU1] = useState<number>(3);
  const [diffD, setDiffD] = useState<number>(4);
  const [ratioQ, setRatioQ] = useState<number>(2);
  const [recurA, setRecurA] = useState<number>(2);
  const [recurB, setRecurB] = useState<number>(1);
  const [targetN, setTargetN] = useState<number>(20);
  const [validationError, setValidationError] = useState<string>('');

  const [terms, setTerms] = useState<{ n: number; un: number; sn: number }[]>([]);
  const [targetUn, setTargetUn] = useState<number | null>(79);
  const [targetSn, setTargetSn] = useState<number | null>(820);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCompute = () => {
    setValidationError('');

    // Check index n is positive integer
    if (!Number.isInteger(targetN) || targetN < 1) {
      setValidationError('Chỉ số n phải là số nguyên dương (n ∈ ℤ⁺, n ≥ 1).');
      return;
    }

    const list: { n: number; un: number; sn: number }[] = [];
    let runningSum = 0;
    const maxN = Math.min(100, Math.max(targetN, 20));

    if (seqType === 'ap') {
      for (let n = 1; n <= maxN; n++) {
        const un = u1 + (n - 1) * diffD;
        runningSum += un;
        list.push({ n, un, sn: runningSum });
      }
      setTargetUn(u1 + (targetN - 1) * diffD);
      setTargetSn((targetN * (2 * u1 + (targetN - 1) * diffD)) / 2);
    } else if (seqType === 'gp') {
      let cur = u1;
      for (let n = 1; n <= maxN; n++) {
        runningSum += cur;
        list.push({ n, un: cur, sn: runningSum });
        cur *= ratioQ;
      }
      const unTarget = u1 * Math.pow(ratioQ, targetN - 1);
      setTargetUn(unTarget);

      // Special case q = 1 check
      if (Math.abs(ratioQ - 1) < 1e-12) {
        setTargetSn(targetN * u1);
      } else {
        setTargetSn(u1 * (1 - Math.pow(ratioQ, targetN)) / (1 - ratioQ));
      }
    } else {
      let cur = u1;
      for (let n = 1; n <= maxN; n++) {
        runningSum += cur;
        list.push({ n, un: cur, sn: runningSum });
        cur = recurA * cur + recurB;
      }
      setTargetUn(list[targetN - 1]?.un ?? null);
      setTargetSn(list[targetN - 1]?.sn ?? null);
    }

    setTerms(list.slice(0, 30));
    drawDiscretePlot(list.slice(0, Math.min(25, maxN)));
  };

  const drawDiscretePlot = (data: { n: number; un: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxN = data[data.length - 1].n;
    const allUn = data.map((d) => d.un);
    const minUn = Math.min(0, ...allUn);
    const maxUn = Math.max(...allUn);

    const toX = (n: number) => 45 + ((n - 1) / (maxN - 1 || 1)) * (width - 75);
    const toY = (un: number) => height - 35 - ((un - minUn) / (maxUn - minUn || 1)) * (height - 70);

    // Axes
    const originY = toY(0);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, originY);
    ctx.lineTo(width - 15, originY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(45, height - 10);
    ctx.lineTo(45, 15);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('n', width - 20, originY - 6);
    ctx.fillText('u_n', 50, 22);

    // Discrete points & vertical drop stems
    for (const d of data) {
      const sx = toX(d.n);
      const sy = toY(d.un);

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(sx, originY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = d.n === targetN ? '#ea580c' : '#4f46e5';
      ctx.beginPath();
      ctx.arc(sx, sy, d.n === targetN ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  useEffect(() => {
    handleCompute();
  }, [seqType, u1, diffD, ratioQ, recurA, recurB, targetN]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Dãy số: Cấp số cộng, Cấp số nhân & Dãy truy hồi
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
            <button
              onClick={() => {
                setSeqType('ap');
                setU1(3);
                setDiffD(4);
                setTargetN(20);
              }}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              Test Case: u₁ = 3, d = 4 (u₂₀, S₂₀)
            </button>
            <button
              onClick={() => {
                setSeqType('gp');
                setU1(5);
                setRatioQ(1);
                setTargetN(10);
              }}
              className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium"
            >
              CSN với công bội q = 1
            </button>
            <button
              onClick={() => {
                setU1(3);
                setDiffD(4);
                setTargetN(20);
                setSeqType('ap');
              }}
              className="p-1.5 border rounded-lg text-slate-500 hover:bg-slate-100"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSeqType('ap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              seqType === 'ap' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
            }`}
          >
            Cấp số cộng (u_n = u₁ + (n-1)d)
          </button>
          <button
            onClick={() => setSeqType('gp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              seqType === 'gp' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
            }`}
          >
            Cấp số nhân (u_n = u₁ · qⁿ⁻¹)
          </button>
          <button
            onClick={() => setSeqType('recur')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              seqType === 'recur' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
            }`}
          >
            Dãy truy hồi (u_(n+1) = a·u_n + b)
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Số hạng đầu u₁
            </label>
            <input
              type="number"
              step="any"
              value={u1}
              onChange={(e) => setU1(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
            />
          </div>

          {seqType === 'ap' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Công sai d
              </label>
              <input
                type="number"
                step="any"
                value={diffD}
                onChange={(e) => setDiffD(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
              />
            </div>
          )}

          {seqType === 'gp' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Công bội q (hỗ trợ q = 1)
              </label>
              <input
                type="number"
                step="any"
                value={ratioQ}
                onChange={(e) => setRatioQ(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
              />
            </div>
          )}

          {seqType === 'recur' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Hệ số a, b (u_(n+1) = a·u_n + b)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={recurA}
                  onChange={(e) => setRecurA(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 text-xs font-mono border rounded text-center"
                  placeholder="a"
                />
                <input
                  type="number"
                  value={recurB}
                  onChange={(e) => setRecurB(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 text-xs font-mono border rounded text-center"
                  placeholder="b"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Chỉ số n (n ∈ ℤ⁺)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={targetN}
              onChange={(e) => setTargetN(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-lg font-bold text-center bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCompute}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Tính số hạng & Vẽ điểm
            </button>
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Target results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
            Số hạng thứ u_{targetN}:
          </span>
          <div className="text-3xl font-black font-mono text-indigo-950 dark:text-white mt-1">
            u_{targetN} = {targetUn}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
            Tổng {targetN} số hạng đầu S_{targetN}:
          </span>
          <div className="text-3xl font-black font-mono text-emerald-950 dark:text-white mt-1">
            S_{targetN} = {targetSn}
          </div>
        </div>
      </div>

      {/* Two Columns: Table on Left, Discrete Plot on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Bảng các số hạng đầu (n = 1 → {terms.length})
          </span>
          <div className="flex-1 overflow-y-auto max-h-72 border rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-2 px-3 text-center">n</th>
                  <th className="py-2 px-3 font-mono">u_n</th>
                  <th className="py-2 px-3 font-mono">S_n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {terms.map((t) => (
                  <tr
                    key={t.n}
                    className={t.n === targetN ? 'bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600' : ''}
                  >
                    <td className="py-1.5 px-3 text-center">{t.n}</td>
                    <td className="py-1.5 px-3">{t.un}</td>
                    <td className="py-1.5 px-3 text-slate-500">{t.sn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discrete Plot Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Biểu đồ các điểm rời rạc (n, u_n)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const a = document.createElement('a');
                  a.href = canvas.toDataURL('image/png');
                  a.download = `DaySo_${Date.now()}.png`;
                  a.click();
                }}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                title="Xuất ảnh PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas || !onSendToWhiteboard) return;
                  onSendToWhiteboard(canvas.toDataURL('image/png'));
                }}
                className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> Gửi bảng
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <canvas ref={canvasRef} width={500} height={300} className="w-full h-full block" />
          </div>
        </div>

      </div>

    </div>
  );
};
