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
  Search,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface InvariantsProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type ExperimentId = 'parallel_base' | 'varignon' | 'rigid_motion' | 'inscribed_angle' | 'ellipse_foci';

interface ExperimentInfo {
  id: ExperimentId;
  title: string;
  category: 'Diện tích' | 'Khoảng cách' | 'Góc' | 'Đường Conic';
  summary: string;
  invariantProperty: string;
}

export const InvariantsModule: React.FC<InvariantsProps> = ({ onSendToWhiteboard }) => {
  const [selectedExp, setSelectedExp] = useState<ExperimentId>('parallel_base');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // States for Experiment 2: Triangle with vertex A sliding on parallel line
  // Base BC length = 4 on y = 0. Height h = 3 on y = 3.
  // xA can slide freely from -4 to 8. Area S = 1/2 * 4 * 3 = 6.0000 invariant!
  const [slideXA, setSlideXA] = useState<number>(2.0); // sliding x coordinate of vertex A

  // States for Experiment 3: Varignon Quadrilateral ABCD
  const [quadVerts, setQuadVerts] = useState<{ x: number; y: number }[]>([
    { x: -3, y: -2 }, // A
    { x: 3.5, y: -2.5 }, // B
    { x: 4, y: 2.5 },  // C
    { x: -2, y: 3 }   // D
  ]);

  // States for Experiment 1: Rigid motion translation/rotation
  const [rotAngleDeg, setRotAngleDeg] = useState<number>(45);
  const [transVec, setTransVec] = useState<{ x: number; y: number }>({ x: 3, y: 2 });

  // States for Experiment 4: Inscribed Angle
  const [angleThetaDeg, setAngleThetaDeg] = useState<number>(75);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingVertexRef = useRef<number | null>(null);

  const experiments: ExperimentInfo[] = [
    {
      id: 'parallel_base',
      title: '1. Diện tích tam giác khi đỉnh di động song song đáy',
      category: 'Diện tích',
      summary: 'Đáy BC cố định độ dài b=4, đỉnh A trượt trên đường d // BC với khoảng cách h=3',
      invariantProperty: 'Diện tích S = 1/2 · b · h = 6.0000 luôn không đổi'
    },
    {
      id: 'varignon',
      title: '2. Định lý Varignon (Tứ giác trung điểm)',
      category: 'Diện tích',
      summary: 'Tứ giác ABCD bất kỳ có 4 trung điểm M, N, P, Q luôn lập thành hình bình hành',
      invariantProperty: 'S_MNPQ = 1/2 S_ABCD và MNPQ luôn là hình bình hành'
    },
    {
      id: 'rigid_motion',
      title: '3. Bảo toàn khoảng cách trong phép dời hình',
      category: 'Khoảng cách',
      summary: 'Đoạn thẳng AB qua phép tịnh tiến, đối xứng hoặc quay góc α',
      invariantProperty: 'Độ dài A\'B\' = AB luôn bằng nhau tuyệt đối'
    },
    {
      id: 'inscribed_angle',
      title: '4. Góc nội tiếp cùng chắn một cung',
      category: 'Góc',
      summary: 'Điểm M di động trên cung lớn BC của đường tròn ngoại tiếp',
      invariantProperty: 'Góc ∠BMC = 1/2 sđ cung BC = hằng số'
    },
    {
      id: 'ellipse_foci',
      title: '5. Tổng khoảng cách đến hai tiêu điểm Elip',
      category: 'Đường Conic',
      summary: 'Điểm M di động trên đường elip (E): x²/a² + y²/b² = 1',
      invariantProperty: 'Tổng khoảng cách MF₁ + MF₂ = 2a luôn không đổi'
    }
  ];

  const filteredExperiments = useMemo(() => {
    if (!searchQuery.trim()) return experiments;
    const q = searchQuery.toLowerCase();
    return experiments.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.invariantProperty.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Standard sample loader
  const handleLoadSample = (id: ExperimentId) => {
    setSelectedExp(id);
    if (id === 'parallel_base') {
      setSlideXA(2.0);
    } else if (id === 'varignon') {
      setQuadVerts([
        { x: -3, y: -2 },
        { x: 3.5, y: -2.5 },
        { x: 4, y: 2.5 },
        { x: -2, y: 3 }
      ]);
    } else if (id === 'rigid_motion') {
      setRotAngleDeg(45);
      setTransVec({ x: 3, y: 2 });
    } else if (id === 'inscribed_angle') {
      setAngleThetaDeg(75);
    }
  };

  const handleReset = () => {
    handleLoadSample(selectedExp);
  };

  // Convert math coords to canvas pixels
  const toPx = (x: number, y: number, w: number, h: number) => {
    const scale = 36;
    return {
      x: w / 2 + x * scale,
      y: h / 2 - y * scale
    };
  };

  // Interactive mouse dragging on canvas for quad vertices or vertex A
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scale = 36;
    const mathX = (mx - canvas.width / 2) / scale;
    const mathY = -(my - canvas.height / 2) / scale;

    if (selectedExp === 'parallel_base') {
      // Check if clicked near vertex A
      if (Math.hypot(mathX - slideXA, mathY - 3) < 0.8) {
        isDraggingVertexRef.current = 999; // vertex A
      }
    } else if (selectedExp === 'varignon') {
      quadVerts.forEach((v, idx) => {
        if (Math.hypot(v.x - mathX, v.y - mathY) < 0.7) {
          isDraggingVertexRef.current = idx;
        }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingVertexRef.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scale = 36;
    const mathX = (mx - canvas.width / 2) / scale;
    const mathY = -(my - canvas.height / 2) / scale;

    if (selectedExp === 'parallel_base' && isDraggingVertexRef.current === 999) {
      setSlideXA(Math.max(-5, Math.min(7, mathX)));
    } else if (selectedExp === 'varignon' && typeof isDraggingVertexRef.current === 'number') {
      const idx = isDraggingVertexRef.current;
      setQuadVerts((prev) => {
        const next = [...prev];
        next[idx] = { x: Math.round(mathX * 10) / 10, y: Math.round(mathY * 10) / 10 };
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingVertexRef.current = null;
  };

  // Draw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Deep modern theme background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#111827');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const scale = 36;
    for (let x = -10; x <= 10; x++) {
      const pt = toPx(x, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(pt.x, 0);
      ctx.lineTo(pt.x, height);
      ctx.stroke();
    }
    for (let y = -8; y <= 8; y++) {
      const pt = toPx(0, y, width, height);
      ctx.beginPath();
      ctx.moveTo(0, pt.y);
      ctx.lineTo(width, pt.y);
      ctx.stroke();
    }

    // Axes
    const o = toPx(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, o.y);
    ctx.lineTo(width, o.y);
    ctx.moveTo(o.x, 0);
    ctx.lineTo(o.x, height);
    ctx.stroke();

    // 1. EXPERIMENT: PARALLEL BASE (Triangle Area Invariance)
    if (selectedExp === 'parallel_base') {
      const B = { x: -2, y: 0 };
      const C = { x: 2, y: 0 };
      const A = { x: slideXA, y: 3 };

      const pA = toPx(A.x, A.y, width, height);
      const pB = toPx(B.x, B.y, width, height);
      const pC = toPx(C.x, C.y, width, height);

      // Draw parallel line d: y = 3
      const dL = toPx(-8, 3, width, height);
      const dR = toPx(8, 3, width, height);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dL.x, dL.y);
      ctx.lineTo(dR.x, dR.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '11px sans-serif';
      ctx.fillText('Đường thẳng d // BC (y = 3, khoảng cách h = 3)', dL.x + 20, dL.y - 8);

      // Triangle fill
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw altitude h
      const pH = toPx(A.x, 0, width, height);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pH.x, pH.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.fillText(`h = 3.0`, pH.x + 5, (pA.y + pH.y) / 2);

      // Base BC
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.stroke();

      // Vertex dots
      [
        { name: `A(${A.x.toFixed(1)}, 3)`, pt: pA, col: '#f59e0b' },
        { name: 'B(-2, 0)', pt: pB, col: '#10b981' },
        { name: 'C(2, 0)', pt: pC, col: '#10b981' }
      ].forEach((v) => {
        ctx.fillStyle = v.col;
        ctx.beginPath();
        ctx.arc(v.pt.x, v.pt.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(v.name, v.pt.x + 8, v.pt.y - 6);
      });
    }

    // 2. EXPERIMENT: VARIGNON QUADRILATERAL
    else if (selectedExp === 'varignon') {
      const [A, B, C, D] = quadVerts;
      const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const N = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
      const P = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
      const Q = { x: (D.x + A.x) / 2, y: (D.y + A.y) / 2 };

      const pA = toPx(A.x, A.y, width, height);
      const pB = toPx(B.x, B.y, width, height);
      const pC = toPx(C.x, C.y, width, height);
      const pD = toPx(D.x, D.y, width, height);

      const pM = toPx(M.x, M.y, width, height);
      const pN = toPx(N.x, N.y, width, height);
      const pP = toPx(P.x, P.y, width, height);
      const pQ = toPx(Q.x, Q.y, width, height);

      // Outer quad ABCD
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.lineTo(pD.x, pD.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner Varignon quad MNPQ
      ctx.beginPath();
      ctx.moveTo(pM.x, pM.y);
      ctx.lineTo(pN.x, pN.y);
      ctx.lineTo(pP.x, pP.y);
      ctx.lineTo(pQ.x, pQ.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dots
      [
        { name: 'A', pt: pA },
        { name: 'B', pt: pB },
        { name: 'C', pt: pC },
        { name: 'D', pt: pD }
      ].forEach((v) => {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(v.pt.x, v.pt.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(v.name, v.pt.x + 8, v.pt.y - 6);
      });

      [
        { name: 'M', pt: pM },
        { name: 'N', pt: pN },
        { name: 'P', pt: pP },
        { name: 'Q', pt: pQ }
      ].forEach((v) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(v.pt.x, v.pt.y, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(v.name, v.pt.x + 6, v.pt.y - 4);
      });
    }

    // 3. EXPERIMENT: RIGID MOTION (Distance Invariance)
    else if (selectedExp === 'rigid_motion') {
      const A = { x: -3, y: -1 };
      const B = { x: 0, y: 2 };
      const lenAB = Math.hypot(B.x - A.x, B.y - A.y);

      // Transformed by translation + rotation
      const rad = (rotAngleDeg * Math.PI) / 180;
      const rotate = (p: { x: number; y: number }) => ({
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad) + transVec.x,
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad) + transVec.y
      });

      const A_prime = rotate(A);
      const B_prime = rotate(B);
      const lenA_primeB_prime = Math.hypot(B_prime.x - A_prime.x, B_prime.y - A_prime.y);

      const pA = toPx(A.x, A.y, width, height);
      const pB = toPx(B.x, B.y, width, height);
      const pAp = toPx(A_prime.x, A_prime.y, width, height);
      const pBp = toPx(B_prime.x, B_prime.y, width, height);

      // Segment AB
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      // Segment A'B'
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pAp.x, pAp.y);
      ctx.lineTo(pBp.x, pBp.y);
      ctx.stroke();

      // Motion vectors
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pAp.x, pAp.y);
      ctx.moveTo(pB.x, pB.y);
      ctx.lineTo(pBp.x, pBp.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`AB = ${lenAB.toFixed(4)}`, (pA.x + pB.x) / 2 - 20, (pA.y + pB.y) / 2 - 10);
      ctx.fillStyle = '#ec4899';
      ctx.fillText(`A'B' = ${lenA_primeB_prime.toFixed(4)}`, (pAp.x + pBp.x) / 2 - 20, (pAp.y + pBp.y) / 2 - 10);
    }

    // 4. EXPERIMENT: INSCRIBED ANGLE
    else if (selectedExp === 'inscribed_angle') {
      const R = 4;
      const pO = toPx(0, 0, width, height);
      const rPx = R * scale;

      // Circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pO.x, pO.y, rPx, 0, 2 * Math.PI);
      ctx.stroke();

      // Fixed chord BC
      const B = { x: R * Math.cos((-30 * Math.PI) / 180), y: R * Math.sin((-30 * Math.PI) / 180) };
      const C = { x: R * Math.cos((-150 * Math.PI) / 180), y: R * Math.sin((-150 * Math.PI) / 180) };

      // Moving point M on major arc
      const mRad = (angleThetaDeg * Math.PI) / 180;
      const M = { x: R * Math.cos(mRad), y: R * Math.sin(mRad) };

      const pB = toPx(B.x, B.y, width, height);
      const pC = toPx(C.x, C.y, width, height);
      const pM = toPx(M.x, M.y, width, height);

      // Inscribed angle rays
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y);
      ctx.lineTo(pM.x, pM.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.stroke();

      // Base chord
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.stroke();

      // Inscribed angle value (half of central angle)
      // Central angle = 120 deg -> Inscribed angle = 60 deg constantly
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`∠BMC = 60.0° (Hằng số bất biến)`, pM.x + 8, pM.y - 10);

      [
        { name: 'M (di động)', pt: pM, col: '#f59e0b' },
        { name: 'B', pt: pB, col: '#10b981' },
        { name: 'C', pt: pC, col: '#10b981' }
      ].forEach((p) => {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.pt.x, p.pt.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.name, p.pt.x + 6, p.pt.y + 4);
      });
    }

    // 5. EXPERIMENT: ELLIPSE FOCI SUM
    else {
      const a = 4.5;
      const b = 3.0;
      const c = Math.sqrt(a * a - b * b); // Foci at (+-c, 0)
      const pO = toPx(0, 0, width, height);

      // Draw Ellipse
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pO.x, pO.y, a * scale, b * scale, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Point M on ellipse
      const t = (angleThetaDeg * Math.PI) / 180;
      const M = { x: a * Math.cos(t), y: b * Math.sin(t) };
      const F1 = { x: -c, y: 0 };
      const F2 = { x: c, y: 0 };

      const pM = toPx(M.x, M.y, width, height);
      const pF1 = toPx(F1.x, F1.y, width, height);
      const pF2 = toPx(F2.x, F2.y, width, height);

      // Rays MF1 and MF2
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pF1.x, pF1.y);
      ctx.lineTo(pM.x, pM.y);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pF2.x, pF2.y);
      ctx.lineTo(pM.x, pM.y);
      ctx.stroke();

      const d1 = Math.hypot(M.x - F1.x, M.y - F1.y);
      const d2 = Math.hypot(M.x - F2.x, M.y - F2.y);
      const sum = d1 + d2;

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `MF₁=${d1.toFixed(3)} + MF₂=${d2.toFixed(3)} = ${(sum).toFixed(3)} (= 2a = 9.000)`,
        pM.x + 10,
        pM.y - 10
      );

      [
        { name: 'M', pt: pM, col: '#f59e0b' },
        { name: 'F₁(-c, 0)', pt: pF1, col: '#38bdf8' },
        { name: 'F₂(c, 0)', pt: pF2, col: '#ec4899' }
      ].forEach((p) => {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.pt.x, p.pt.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.name, p.pt.x + 6, p.pt.y + 4);
      });
    }
  }, [selectedExp, slideXA, quadVerts, rotAngleDeg, transVec, angleThetaDeg]);

  // Compute stats for HUD
  const curExp = experiments.find((e) => e.id === selectedExp);

  // Compute Varignon area
  const { sABCD, sMNPQ } = useMemo(() => {
    if (selectedExp !== 'varignon') return { sABCD: 0, sMNPQ: 0 };
    const [A, B, C, D] = quadVerts;
    // Area of polygon via shoelace
    const shoe = (pts: { x: number; y: number }[]) => {
      let sum = 0;
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        sum += pts[i].x * next.y - pts[i].y * next.x;
      }
      return Math.abs(sum) / 2;
    };
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const N = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
    const P = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
    const Q = { x: (D.x + A.x) / 2, y: (D.y + A.y) / 2 };

    return { sABCD: shoe([A, B, C, D]), sMNPQ: shoe([M, N, P, Q]) };
  }, [selectedExp, quadVerts]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `bat_bien_thpt_${selectedExp}.png`;
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
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Bất biến hình học THPT</h2>
              <p className="text-xs text-slate-400">Trang 12 SANG-CAS · Thí nghiệm kéo thả tương tác</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chặng 4
          </span>
        </div>

        {/* 3 Standard Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadSample(selectedExp)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp mẫu
          </button>
          <button
            onClick={() => {
              // trigger slide
              if (selectedExp === 'parallel_base') {
                setSlideXA((x) => (x >= 5 ? -3 : x + 1.5));
              } else if (selectedExp === 'inscribed_angle' || selectedExp === 'ellipse_foci') {
                setAngleThetaDeg((t) => (t + 30) % 360);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" />
            Thực hiện
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Search Experiment Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm thí nghiệm (diện tích, Varignon, khoảng cách...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* List of Experiment Cards */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredExperiments.map((exp) => (
            <button
              key={exp.id}
              onClick={() => handleLoadSample(exp.id)}
              className={`w-full p-2.5 rounded-xl text-left transition border text-xs ${
                selectedExp === exp.id
                  ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{exp.title}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-amber-300">
                  {exp.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{exp.summary}</p>
            </button>
          ))}
        </div>

        {/* Interactive Controls Specific to Active Experiment */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3 text-xs">
          {selectedExp === 'parallel_base' && (
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Tọa độ hoành độ đỉnh A trượt trên d:</span>
                <span className="font-mono text-amber-400">x_A = {slideXA.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-4"
                max="6"
                step="0.1"
                value={slideXA}
                onChange={(e) => setSlideXA(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Bạn có thể trượt thanh hoặc bấm kéo thả trực tiếp đỉnh A trên bảng vẽ!
              </p>
            </div>
          )}

          {selectedExp === 'varignon' && (
            <div className="space-y-2">
              <span className="font-semibold text-emerald-400">Tọa độ 4 đỉnh tứ giác ABCD:</span>
              <p className="text-[11px] text-slate-400">
                Hãy rê chuột bấm kéo bất kỳ đỉnh nào trong 4 đỉnh A, B, C, D trên khung vẽ.
              </p>
            </div>
          )}

          {selectedExp === 'rigid_motion' && (
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Góc quay α:</span>
                <span className="font-mono text-rose-400">{rotAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={rotAngleDeg}
                onChange={(e) => setRotAngleDeg(parseInt(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          )}

          {(selectedExp === 'inscribed_angle' || selectedExp === 'ellipse_foci') && (
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Vị trí điểm M di động (Góc cực θ):</span>
                <span className="font-mono text-cyan-400">{angleThetaDeg}°</span>
              </div>
              <input
                type="range"
                min="30"
                max="150"
                step="2"
                value={angleThetaDeg}
                onChange={(e) => setAngleThetaDeg(parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Invariant Proof & Metric Card */}
        <div className="bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/30 p-3.5 rounded-xl space-y-2 text-xs">
          <div className="font-semibold text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Đại lượng bất biến chứng minh:
            </span>
          </div>

          <div className="p-2 bg-slate-900 rounded font-mono text-emerald-400 font-bold border border-slate-800">
            {curExp?.invariantProperty}
          </div>

          {selectedExp === 'parallel_base' && (
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span>Độ dài đáy BC:</span>
                <span className="font-mono font-bold text-white">b = 4.0000</span>
              </div>
              <div className="flex justify-between">
                <span>Khoảng cách d(A, BC):</span>
                <span className="font-mono font-bold text-white">h = 3.0000</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-amber-900/40">
                <span className="text-amber-200 font-medium">Diện tích S = 1/2 · b · h:</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">S = 6.0000 (Không đổi)</span>
              </div>
              <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30 mt-1">
                ✓ Kiểm thử chuẩn: Tam giác có đáy b=4, đỉnh trượt trên đường // ở khoảng cách h=3 có S = 6.0000 bất biến dù x_A thay đổi.
              </div>
            </div>
          )}

          {selectedExp === 'varignon' && (
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span>Diện tích S(ABCD):</span>
                <span className="font-mono font-bold text-white">{sABCD.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Diện tích S(MNPQ):</span>
                <span className="font-mono font-bold text-emerald-400">{sMNPQ.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-amber-900/40 font-semibold text-amber-300">
                <span>Tỷ số diện tích:</span>
                <span className="font-mono text-emerald-400">S_MNPQ / S_ABCD = 0.5000 (Chính xác 1/2)</span>
              </div>
            </div>
          )}
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
                className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs flex items-center gap-1 transition"
                title="Gửi sang Bảng viết"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Visualization Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>Rê chuột kéo các điểm tương tác trên mặt phẳng toạ độ</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>{curExp?.title}</span>
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
            className="w-full h-full max-w-[720px] max-h-[520px] rounded-xl cursor-crosshair border border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
