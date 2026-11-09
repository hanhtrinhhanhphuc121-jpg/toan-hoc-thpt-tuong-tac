/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Share2, Download, Atom, Sparkles } from 'lucide-react';

interface ComplexProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

export const ComplexNumbersModule: React.FC<ComplexProps> = ({ onSendToWhiteboard }) => {
  // z1 = a1 + b1 i, z2 = a2 + b2 i, root order n
  const [a1, setA1] = useState<number>(1);
  const [b1, setB1] = useState<number>(1); // z1 = 1 + i
  const [a2, setA2] = useState<number>(1);
  const [b2, setB2] = useState<number>(-1); // z2 = 1 - i
  const [rootN, setRootN] = useState<number>(2); // nth roots

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Four arithmetic operations
  const sumReal = a1 + a2;
  const sumImag = b1 + b2;

  const diffReal = a1 - a2;
  const diffImag = b1 - b2;

  // Product: (a1 a2 - b1 b2) + (a1 b2 + a2 b1)i
  // (1+i)(1-i) = (1 - (-1)) + (-1 + 1)i = 2 + 0i = 2
  const prodReal = a1 * a2 - b1 * b2;
  const prodImag = a1 * b2 + a2 * b1;

  // Quotient: z1 / z2
  const denom2 = a2 * a2 + b2 * b2;
  const quotReal = denom2 > 1e-12 ? (a1 * a2 + b1 * b2) / denom2 : NaN;
  const quotImag = denom2 > 1e-12 ? (b1 * a2 - a1 * b2) / denom2 : NaN;

  // Modulus & Argument of z1
  const mod1 = Math.sqrt(a1 * a1 + b1 * b1);
  let arg1 = Math.atan2(b1, a1);
  if (arg1 < 0) arg1 += 2 * Math.PI;
  const arg1Deg = (arg1 * 180) / Math.PI;

  // De Moivre nth roots of z1: w_k = r^(1/n) * (cos((phi + 2k*pi)/n) + i sin((phi + 2k*pi)/n))
  const roots: { k: number; real: number; imag: number; label: string }[] = [];
  if (mod1 > 1e-12 && rootN > 0) {
    const rRoot = Math.pow(mod1, 1 / rootN);
    for (let k = 0; k < rootN; k++) {
      const angleK = (arg1 + 2 * Math.PI * k) / rootN;
      const re = rRoot * Math.cos(angleK);
      const im = rRoot * Math.sin(angleK);

      let label = `w_${k}`;
      // Special identification for sqrt(-1): i and -i
      if (Math.abs(a1 - (-1)) < 1e-6 && Math.abs(b1) < 1e-6 && rootN === 2) {
        label = k === 0 ? 'w₀ = i' : 'w₁ = -i';
      }

      roots.push({
        k,
        real: Math.abs(re) < 1e-10 ? 0 : re,
        imag: Math.abs(im) < 1e-10 ? 0 : im,
        label,
      });
    }
  }

  // Draw Argand Complex Plane
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const scale = 55;

    // Grid & Axes
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Re & Im Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, cy);
    ctx.lineTo(width - 15, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, height - 15);
    ctx.lineTo(cx, 15);
    ctx.stroke();

    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Re (Thực)', width - 65, cy - 8);
    ctx.fillText('Im (Ảo)', cx + 8, 24);

    const toScreen = (re: number, im: number) => ({
      x: cx + re * scale,
      y: cy - im * scale,
    });

    // Draw Vector z1
    const p1 = toScreen(a1, b1);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`z₁ (${a1}, ${b1}i)`, p1.x + 8, p1.y - 4);

    // Draw Vector z2
    const p2 = toScreen(a2, b2);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`z₂ (${a2}, ${b2}i)`, p2.x + 8, p2.y + 14);

    // Draw Vector Product z1 * z2
    const pProd = toScreen(prodReal, prodImag);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pProd.x, pProd.y);
    ctx.stroke();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(pProd.x, pProd.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`z₁·z₂ = ${prodReal}${prodImag !== 0 ? (prodImag > 0 ? ` + ${prodImag}i` : ` - ${Math.abs(prodImag)}i`) : ''}`, pProd.x + 8, pProd.y - 6);

    // Draw Circle of roots and polygon
    if (roots.length > 0) {
      const rPixel = Math.pow(mod1, 1 / rootN) * scale;
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rPixel, 0, Math.PI * 2);
      ctx.stroke();

      // Connect roots polygon
      if (roots.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < roots.length; i++) {
          const pr = toScreen(roots[i].real, roots[i].imag);
          if (i === 0) ctx.moveTo(pr.x, pr.y);
          else ctx.lineTo(pr.x, pr.y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      // Draw each root point
      for (const rt of roots) {
        const pr = toScreen(rt.real, rt.imag);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#c2410c';
        ctx.font = 'bold 10px "JetBrains Mono"';
        ctx.fillText(rt.label, pr.x + 6, pr.y - 4);
      }
    }
  }, [a1, b1, a2, b2, prodReal, prodImag, roots, mod1, rootN]);

  // Export PNG & Send to Whiteboard
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `SoPhuc_Argand_${Date.now()}.png`;
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
            Đại số số phức, Căn bậc n (De Moivre) & Mặt phẳng Argand
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
            <button
              onClick={() => {
                setA1(1);
                setB1(1);
                setA2(1);
                setB2(-1);
                setRootN(2);
              }}
              className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
            >
              Test 1: (1 + i)(1 - i) = 2
            </button>
            <button
              onClick={() => {
                setA1(-1);
                setB1(0);
                setRootN(2);
              }}
              className="text-xs px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100"
            >
              Test 2: Căn bậc 2 của -1 (i, -i)
            </button>
            <button
              onClick={() => {
                setA1(1);
                setB1(1);
                setA2(1);
                setB2(-1);
                setRootN(2);
              }}
              className="p-1.5 border rounded-lg text-slate-500 hover:bg-slate-100"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
              Số phức z₁ = a₁ + b₁ i:
            </span>
            <div className="flex items-center gap-2 font-mono text-sm">
              <input
                type="number"
                step="any"
                value={a1}
                onChange={(e) => setA1(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
              />
              <span>+</span>
              <input
                type="number"
                step="any"
                value={b1}
                onChange={(e) => setB1(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
              />
              <span>i</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/20 dark:bg-sky-950/20 space-y-2">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
              Số phức z₂ = a₂ + b₂ i:
            </span>
            <div className="flex items-center gap-2 font-mono text-sm">
              <input
                type="number"
                step="any"
                value={a2}
                onChange={(e) => setA2(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
              />
              <span>+</span>
              <input
                type="number"
                step="any"
                value={b2}
                onChange={(e) => setB2(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
              />
              <span>i</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20 space-y-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Tìm các căn bậc n của z₁:
            </span>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span>Bậc n =</span>
              <input
                type="number"
                min="1"
                max="8"
                value={rootN}
                onChange={(e) => setRootN(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-center font-bold border rounded bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Operations Details (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Bốn phép toán đại số cơ bản
            </span>

            {/* Product */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
              <span className="text-emerald-800 dark:text-emerald-300 block font-bold text-[11px] uppercase tracking-wider">
                Tích z₁ · z₂ = (a₁a₂ - b₁b₂) + (a₁b₂ + a₂b₁)i:
              </span>
              <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                = {prodReal} {prodImag !== 0 ? (prodImag > 0 ? `+ ${prodImag}i` : `- ${Math.abs(prodImag)}i`) : ''}
              </div>
            </div>

            {/* Sum, Diff, Quotient */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block font-bold text-[10px]">Tổng z₁+z₂:</span>
                <span className="font-bold text-sm">{sumReal} + {sumImag}i</span>
              </div>
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block font-bold text-[10px]">Hiệu z₁-z₂:</span>
                <span className="font-bold text-sm">{diffReal} + {diffImag}i</span>
              </div>
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block font-bold text-[10px]">Thương z₁/z₂:</span>
                <span className="font-bold text-sm">
                  {isNaN(quotReal) ? 'Không xác định' : `${quotReal.toFixed(2)} + ${quotImag.toFixed(2)}i`}
                </span>
              </div>
            </div>

            {/* Conjugate & Modulus */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block font-bold text-[10px]">Số phức liên hợp z̄₁:</span>
                <span className="font-bold text-sm">{a1} - {b1}i</span>
              </div>
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block font-bold text-[10px]">Mô-đun |z₁| = √(a² + b²):</span>
                <span className="font-bold text-sm">{mod1.toFixed(4)}</span>
              </div>
            </div>

            {/* Three Forms */}
            <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-950 space-y-1.5">
              <span className="text-slate-500 font-bold text-[10px] uppercase block tracking-wider">
                Ba dạng biểu diễn của số phức z₁:
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                • Dạng đại số: z₁ = {a1} + {b1}i
              </div>
              <div className="font-bold text-indigo-600 dark:text-indigo-400">
                • Dạng lượng giác: z₁ = {mod1.toFixed(2)} · (cos {arg1Deg.toFixed(1)}° + i sin {arg1Deg.toFixed(1)}°)
              </div>
              <div className="font-bold text-sky-600 dark:text-sky-400">
                • Dạng mũ: z₁ = {mod1.toFixed(2)} · e^({(arg1 / Math.PI).toFixed(2)}π i)
              </div>
            </div>

            {/* De Moivre Roots */}
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20 space-y-1.5">
              <span className="text-amber-800 dark:text-amber-300 font-bold text-[10px] uppercase block tracking-wider">
                {roots.length} căn bậc {rootN} phân biệt của z₁ (Công thức Moivre):
              </span>
              <div className="space-y-1">
                {roots.map((rt) => (
                  <div key={rt.k} className="text-xs text-amber-950 dark:text-amber-100 font-bold">
                    {rt.label}: {rt.real.toFixed(4)} {rt.imag !== 0 ? (rt.imag > 0 ? `+ ${rt.imag.toFixed(4)}i` : `- ${Math.abs(rt.imag).toFixed(4)}i`) : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Argand Complex Plane Canvas (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Mặt phẳng phức Argand (O, Re, Im)
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
            <canvas ref={canvasRef} width={420} height={350} className="block" />
          </div>
        </div>

      </div>

    </div>
  );
};
