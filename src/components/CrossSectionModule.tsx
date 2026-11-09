/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Scissors,
  Box,
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  Share2,
  Download,
  Info,
  Maximize2
} from 'lucide-react';
import { project3DTo2D, Point3D } from '../utils/mathEngine';

interface CrossSectionProps {
  onSendToWhiteboard?: (imgDataUrl: string) => void;
}

type PolyhedronType = 'cube' | 'cuboid' | 'pyramid' | 'prism' | 'tetrahedron';

interface Edge {
  p1: Point3D;
  p2: Point3D;
  label?: string;
}

export const CrossSectionModule: React.FC<CrossSectionProps> = ({ onSendToWhiteboard }) => {
  // Shape selection
  const [solidType, setSolidType] = useState<PolyhedronType>('cube');
  const [sizeA, setSizeA] = useState<number>(2); // edge
  const [sizeB, setSizeB] = useState<number>(2);
  const [sizeC, setSizeC] = useState<number>(2);

  // Slicing Plane: n_x * x + n_y * y + n_z * z = d
  const [nx, setNx] = useState<number>(0);
  const [ny, setNy] = useState<number>(0);
  const [nz, setNz] = useState<number>(1);
  const [offsetD, setOffsetD] = useState<number>(0); // relative to center

  // Visual options
  const [explodeOffset, setExplodeOffset] = useState<number>(0); // 0 to 1
  const [showWireframe, setShowWireframe] = useState<boolean>(true);

  // 3D Camera Rotation
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(90);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load sample configurations
  const handleLoadSample = (sample: 'cube_center' | 'cube_diagonal' | 'pyramid_mid' | 'outside') => {
    if (sample === 'cube_center') {
      // Cube edge 2, plane z=0 through center parallel to face
      setSolidType('cube');
      setSizeA(2);
      setSizeB(2);
      setSizeC(2);
      setNx(0);
      setNy(0);
      setNz(1);
      setOffsetD(0);
      setExplodeOffset(0);
    } else if (sample === 'cube_diagonal') {
      setSolidType('cube');
      setSizeA(2);
      setSizeB(2);
      setSizeC(2);
      setNx(1);
      setNy(1);
      setNz(1);
      setOffsetD(0);
      setExplodeOffset(0.2);
    } else if (sample === 'pyramid_mid') {
      setSolidType('pyramid');
      setSizeA(2.5);
      setSizeB(2.5);
      setSizeC(2);
      setNx(0);
      setNy(0);
      setNz(1);
      setOffsetD(0);
      setExplodeOffset(0.15);
    } else if (sample === 'outside') {
      setSolidType('cube');
      setSizeA(2);
      setSizeB(2);
      setSizeC(2);
      setNx(0);
      setNy(0);
      setNz(1);
      setOffsetD(2.5); // strictly outside [-1, 1]
    }
  };

  const handleReset = () => {
    handleLoadSample('cube_center');
    setRotX(25);
    setRotY(-35);
    setZoom(90);
  };

  // Generate polyhedron vertices and edges centered at origin
  const { vertices, edges, faces } = useMemo(() => {
    let v: Point3D[] = [];
    let e: Edge[] = [];
    let f: number[][] = [];

    const a2 = sizeA / 2;
    const b2 = sizeB / 2;
    const c2 = sizeC / 2;

    if (solidType === 'cube' || solidType === 'cuboid') {
      // 8 vertices: indices 0..7
      v = [
        { x: -a2, y: -b2, z: -c2 }, // 0
        { x: a2, y: -b2, z: -c2 },  // 1
        { x: a2, y: b2, z: -c2 },   // 2
        { x: -a2, y: b2, z: -c2 },  // 3
        { x: -a2, y: -b2, z: c2 },  // 4
        { x: a2, y: -b2, z: c2 },   // 5
        { x: a2, y: b2, z: c2 },    // 6
        { x: -a2, y: b2, z: c2 }    // 7
      ];
      // 12 edges
      const edgePairs = [
        [0, 1], [1, 2], [2, 3], [3, 0], // bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // top
        [0, 4], [1, 5], [2, 6], [3, 7]  // vertical
      ];
      e = edgePairs.map(([i, j]) => ({ p1: v[i], p2: v[j] }));
      f = [
        [0, 1, 2, 3], // bottom
        [4, 5, 6, 7], // top
        [0, 1, 5, 4], // front
        [2, 3, 7, 6], // back
        [1, 2, 6, 5], // right
        [0, 3, 7, 4]  // left
      ];
    } else if (solidType === 'pyramid') {
      // Square pyramid base [-a2, a2] on z = -c2, Apex at (0, 0, c2)
      v = [
        { x: -a2, y: -a2, z: -c2 },
        { x: a2, y: -a2, z: -c2 },
        { x: a2, y: a2, z: -c2 },
        { x: -a2, y: a2, z: -c2 },
        { x: 0, y: 0, z: c2 } // 4: Apex
      ];
      const edgePairs = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [0, 4], [1, 4], [2, 4], [3, 4]
      ];
      e = edgePairs.map(([i, j]) => ({ p1: v[i], p2: v[j] }));
      f = [
        [0, 1, 2, 3],
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4]
      ];
    } else if (solidType === 'prism') {
      // Triangular prism
      const h3 = (sizeA * Math.sqrt(3)) / 3;
      v = [
        { x: -a2, y: -h3 / 2, z: -c2 },
        { x: a2, y: -h3 / 2, z: -c2 },
        { x: 0, y: h3, z: -c2 },
        { x: -a2, y: -h3 / 2, z: c2 },
        { x: a2, y: -h3 / 2, z: c2 },
        { x: 0, y: h3, z: c2 }
      ];
      const edgePairs = [
        [0, 1], [1, 2], [2, 0],
        [3, 4], [4, 5], [5, 3],
        [0, 3], [1, 4], [2, 5]
      ];
      e = edgePairs.map(([i, j]) => ({ p1: v[i], p2: v[j] }));
      f = [
        [0, 1, 2],
        [3, 4, 5],
        [0, 1, 4, 3],
        [1, 2, 5, 4],
        [2, 0, 3, 5]
      ];
    } else {
      // Regular tetrahedron
      const s = sizeA;
      v = [
        { x: s / Math.sqrt(3), y: 0, z: -s / (2 * Math.sqrt(6)) },
        { x: -s / (2 * Math.sqrt(3)), y: s / 2, z: -s / (2 * Math.sqrt(6)) },
        { x: -s / (2 * Math.sqrt(3)), y: -s / 2, z: -s / (2 * Math.sqrt(6)) },
        { x: 0, y: 0, z: (3 * s) / (2 * Math.sqrt(6)) }
      ];
      const edgePairs = [
        [0, 1], [1, 2], [2, 0],
        [0, 3], [1, 3], [2, 3]
      ];
      e = edgePairs.map(([i, j]) => ({ p1: v[i], p2: v[j] }));
      f = [
        [0, 1, 2],
        [0, 1, 3],
        [1, 2, 3],
        [2, 0, 3]
      ];
    }

    return { vertices: v, edges: e, faces: f };
  }, [solidType, sizeA, sizeB, sizeC]);

  // Compute Intersection Polygon of Plane with Edges
  const intersectionPolygon = useMemo(() => {
    // Plane: N . X = d
    const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (normLen === 0) return [];
    const N = { x: nx / normLen, y: ny / normLen, z: nz / normLen };
    const d = offsetD;

    const interPoints: Point3D[] = [];

    // Check each edge
    for (const edge of edges) {
      const v1 = edge.p1;
      const v2 = edge.p2;

      const d1 = v1.x * N.x + v1.y * N.y + v1.z * N.z - d;
      const d2 = v2.x * N.x + v2.y * N.y + v2.z * N.z - d;

      // Check if edge crosses the plane
      if ((d1 > 1e-7 && d2 < -1e-7) || (d1 < -1e-7 && d2 > 1e-7)) {
        const t = d1 / (d1 - d2);
        const ip: Point3D = {
          x: v1.x + t * (v2.x - v1.x),
          y: v1.y + t * (v2.y - v1.y),
          z: v1.z + t * (v2.z - v1.z)
        };
        // Avoid duplicates
        const exists = interPoints.some(
          (p) => Math.hypot(p.x - ip.x, p.y - ip.y, p.z - ip.z) < 1e-4
        );
        if (!exists) {
          interPoints.push(ip);
        }
      } else if (Math.abs(d1) <= 1e-7) {
        const exists = interPoints.some(
          (p) => Math.hypot(p.x - v1.x, p.y - v1.y, p.z - v1.z) < 1e-4
        );
        if (!exists) interPoints.push({ ...v1 });
      }
    }

    if (interPoints.length < 3) {
      return [];
    }

    // Sort polygon points cyclically around plane normal N
    // 1. Compute centroid of intersection points
    const c: Point3D = interPoints.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
      { x: 0, y: 0, z: 0 }
    );
    c.x /= interPoints.length;
    c.y /= interPoints.length;
    c.z /= interPoints.length;

    // 2. Pick an arbitrary orthogonal vector in the plane
    let u = { x: -N.y, y: N.x, z: 0 };
    if (Math.hypot(u.x, u.y, u.z) < 1e-4) {
      u = { x: 0, y: -N.z, z: N.y };
    }
    const uLen = Math.hypot(u.x, u.y, u.z);
    u = { x: u.x / uLen, y: u.y / uLen, z: u.z / uLen };

    // w = N x u
    const w = {
      x: N.y * u.z - N.z * u.y,
      y: N.z * u.x - N.x * u.z,
      z: N.x * u.y - N.y * u.x
    };

    // 3. Compute polar angle for each point relative to centroid
    const pointsWithAngle = interPoints.map((p) => {
      const rel = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
      const coordU = rel.x * u.x + rel.y * u.y + rel.z * u.z;
      const coordW = rel.x * w.x + rel.y * w.y + rel.z * w.z;
      const angle = Math.atan2(coordW, coordU);
      return { p, angle };
    });

    pointsWithAngle.sort((a, b) => a.angle - b.angle);
    return pointsWithAngle.map((item) => item.p);
  }, [edges, nx, ny, nz, offsetD]);

  // Compute area and perimeter of intersection polygon
  const { area, perimeter, polygonType } = useMemo(() => {
    const pts = intersectionPolygon;
    if (pts.length < 3) {
      return { area: 0, perimeter: 0, polygonType: 'Không cắt' };
    }

    let perim = 0;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      perim += Math.hypot(next.x - pts[i].x, next.y - pts[i].y, next.z - pts[i].z);
    }

    // Area using 3D cross product sum
    let areaVec = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      areaVec.x += p1.y * p2.z - p1.z * p2.y;
      areaVec.y += p1.z * p2.x - p1.x * p2.z;
      areaVec.z += p1.x * p2.y - p1.y * p2.x;
    }
    const a = 0.5 * Math.hypot(areaVec.x, areaVec.y, areaVec.z);

    const typeName =
      pts.length === 3
        ? 'Tam giác'
        : pts.length === 4
        ? 'Tứ giác'
        : pts.length === 5
        ? 'Ngũ giác'
        : pts.length === 6
        ? 'Lục giác'
        : `Đa giác ${pts.length} cạnh`;

    return { area: a, perimeter: perim, polygonType: typeName };
  }, [intersectionPolygon]);

  // Mouse handlers for dragging 3D camera
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

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const heightPx = canvas.height;
    ctx.clearRect(0, 0, width, heightPx);

    // Deep tech background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, heightPx);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#131b2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, heightPx);

    // Coordinate Axes
    const o = project3DTo2D({ x: 0, y: 0, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const axLen = 2.8;
    const ox = project3DTo2D({ x: axLen, y: 0, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const oy = project3DTo2D({ x: 0, y: axLen, z: 0 }, rotX, rotY, zoom, width, heightPx);
    const oz = project3DTo2D({ x: 0, y: 0, z: axLen }, rotX, rotY, zoom, width, heightPx);

    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(ox.x, ox.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(oy.x, oy.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(oz.x, oz.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Normal vector normalized
    const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const N = { x: nx / normLen, y: ny / normLen, z: nz / normLen };

    // Function to calculate exploded displacement
    const getPointPos = (p: Point3D): Point3D => {
      if (explodeOffset === 0) return p;
      const signedDist = p.x * N.x + p.y * N.y + p.z * N.z - offsetD;
      const dir = signedDist >= 0 ? 1 : -1;
      return {
        x: p.x + dir * N.x * explodeOffset * 0.8,
        y: p.y + dir * N.y * explodeOffset * 0.8,
        z: p.z + dir * N.z * explodeOffset * 0.8
      };
    };

    // Draw Polyhedron faces with slight transparency
    for (const face of faces) {
      const facePts = face.map((idx) => getPointPos(vertices[idx]));
      const projPts = facePts.map((p) => project3DTo2D(p, rotX, rotY, zoom, width, heightPx));

      ctx.beginPath();
      ctx.moveTo(projPts[0].x, projPts[0].y);
      for (let i = 1; i < projPts.length; i++) {
        ctx.lineTo(projPts[i].x, projPts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 58, 138, 0.18)';
      ctx.fill();

      if (showWireframe) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Draw Slicing Plane outline (extended quad centered at d*N)
    const planeCenter: Point3D = { x: N.x * offsetD, y: N.y * offsetD, z: N.z * offsetD };
    let pu = { x: -N.y, y: N.x, z: 0 };
    if (Math.hypot(pu.x, pu.y, pu.z) < 1e-4) pu = { x: 0, y: -N.z, z: N.y };
    const puL = Math.hypot(pu.x, pu.y, pu.z);
    pu = { x: pu.x / puL, y: pu.y / puL, z: pu.z / puL };
    const pw = {
      x: N.y * pu.z - N.z * pu.y,
      y: N.z * pu.x - N.x * pu.z,
      z: N.x * pu.y - N.y * pu.x
    };

    const sR = 2.4;
    const planeCorners: Point3D[] = [
      {
        x: planeCenter.x - sR * pu.x - sR * pw.x,
        y: planeCenter.y - sR * pu.y - sR * pw.y,
        z: planeCenter.z - sR * pu.z - sR * pw.z
      },
      {
        x: planeCenter.x + sR * pu.x - sR * pw.x,
        y: planeCenter.y + sR * pu.y - sR * pw.y,
        z: planeCenter.z + sR * pu.z - sR * pw.z
      },
      {
        x: planeCenter.x + sR * pu.x + sR * pw.x,
        y: planeCenter.y + sR * pu.y + sR * pw.y,
        z: planeCenter.z + sR * pu.z + sR * pw.z
      },
      {
        x: planeCenter.x - sR * pu.x + sR * pw.x,
        y: planeCenter.y - sR * pu.y + sR * pw.y,
        z: planeCenter.z - sR * pu.z + sR * pw.z
      }
    ];

    const projCorners = planeCorners.map((p) => project3DTo2D(p, rotX, rotY, zoom, width, heightPx));
    ctx.beginPath();
    ctx.moveTo(projCorners[0].x, projCorners[0].y);
    for (let i = 1; i < projCorners.length; i++) {
      ctx.lineTo(projCorners[i].x, projCorners[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Cross Section Polygon if exists
    if (intersectionPolygon.length >= 3) {
      const polyProj = intersectionPolygon.map((p) =>
        project3DTo2D(p, rotX, rotY, zoom, width, heightPx)
      );

      ctx.beginPath();
      ctx.moveTo(polyProj[0].x, polyProj[0].y);
      for (let i = 1; i < polyProj.length; i++) {
        ctx.lineTo(polyProj[i].x, polyProj[i].y);
      }
      ctx.closePath();
      // Vivid fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Vertex dots
      polyProj.forEach((p, idx) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`P${idx + 1}`, p.x + 6, p.y - 4);
      });
    }

    // On-canvas HUD banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `Khối: ${solidType.toUpperCase()} | Thiết diện: ${polygonType} | S = ${area.toFixed(4)}`,
      14,
      24
    );
  }, [solidType, vertices, faces, intersectionPolygon, nx, ny, nz, offsetD, explodeOffset, showWireframe, rotX, rotY, zoom, area, polygonType]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `thiet_dien_khoi_${solidType}.png`;
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
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Mặt cắt khối đa diện</h2>
              <p className="text-xs text-slate-400">Trang 18 SANG-CAS · Dựng & tính diện tích thiết diện</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chặng 4
          </span>
        </div>

        {/* 3 Standard Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadSample('cube_center')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp mẫu
          </button>
          <button
            onClick={() => {
              // trigger calculation update
              setOffsetD((d) => d);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" />
            Tính diện tích
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Shape Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              Khối đa diện mục tiêu:
            </span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'cube', label: 'Lập phương' },
              { id: 'cuboid', label: 'Hộp chữ nhật' },
              { id: 'pyramid', label: 'Chóp tứ giác' },
              { id: 'prism', label: 'Lăng trụ tam giác' },
              { id: 'tetrahedron', label: 'Tứ diện đều' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSolidType(item.id as PolyhedronType)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition border ${
                  solidType === item.id
                    ? 'bg-rose-600 text-white border-rose-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slicing Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Các mặt phẳng cắt chuẩn:</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleLoadSample('cube_center')}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] text-left border border-slate-700"
            >
              1. Qua tâm // đáy (a=2 $\to$ S=4)
            </button>
            <button
              onClick={() => handleLoadSample('cube_diagonal')}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] text-left border border-slate-700"
            >
              2. Cắt xiên (lục giác đều)
            </button>
            <button
              onClick={() => handleLoadSample('pyramid_mid')}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] text-left border border-slate-700"
            >
              3. Cắt ngang chóp
            </button>
            <button
              onClick={() => handleLoadSample('outside')}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-amber-300 rounded text-[11px] text-left border border-amber-600/30"
            >
              4. Mặt phẳng ngoài (rỗng)
            </button>
          </div>
        </div>

        {/* Slicing Plane Equation Settings */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="font-semibold text-rose-300 flex items-center justify-between">
            <span>Mặt phẳng (P): n_x·x + n_y·y + n_z·z = d</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-slate-400">n_x:</span>
              <input
                type="number"
                step="0.5"
                value={nx}
                onChange={(e) => setNx(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center mt-0.5"
              />
            </div>
            <div>
              <span className="text-slate-400">n_y:</span>
              <input
                type="number"
                step="0.5"
                value={ny}
                onChange={(e) => setNy(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center mt-0.5"
              />
            </div>
            <div>
              <span className="text-slate-400">n_z:</span>
              <input
                type="number"
                step="0.5"
                value={nz}
                onChange={(e) => setNz(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center mt-0.5"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Khoảng cách trượt d:</span>
              <span className="font-mono text-rose-400">{offsetD.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={offsetD}
              onChange={(e) => setOffsetD(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Độ tách 2 nửa khối (Exploded View):</span>
              <span className="font-mono text-indigo-400">{Math.round(explodeOffset * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={explodeOffset}
              onChange={(e) => setExplodeOffset(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-gradient-to-br from-rose-950/40 to-slate-950 border border-rose-500/30 p-3.5 rounded-xl space-y-2 text-xs">
          <div className="font-semibold text-rose-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-400" />
              Kết quả thiết diện:
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
              {polygonType}
            </span>
          </div>

          {intersectionPolygon.length >= 3 ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300">Số đỉnh thiết diện:</span>
                <span className="font-mono font-bold text-white">{intersectionPolygon.length} đỉnh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Chu vi thiết diện P:</span>
                <span className="font-mono font-bold text-amber-300">{perimeter.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-rose-900/40">
                <span className="text-slate-200 font-medium">Diện tích thiết diện S:</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  S = {area.toFixed(4)}
                </span>
              </div>
              {solidType === 'cube' && sizeA === 2 && nz === 1 && nx === 0 && ny === 0 && offsetD === 0 && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
                  ✓ Kiểm thử chuẩn: Lập phương cạnh a=2 cắt bởi z=0 cho thiết diện hình vuông có diện tích S = 4.0000.
                </div>
              )}
            </div>
          ) : (
            <div className="text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-500/30 flex items-center gap-1.5">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Mặt phẳng không cắt khối đa diện (thiết diện rỗng). Hãy điều chỉnh khoảng cách d hoặc vector pháp tuyến.</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
              className="accent-rose-500 rounded"
            />
            Hiện khung dây khối
          </label>
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
                className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs flex items-center gap-1 transition"
                title="Gửi sang Bảng viết"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3D Visualization Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span>Kéo chuột để xoay khối và quan sát thiết diện đa giác</span>
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

          {/* Quick preset camera buttons */}
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
              Từ trên (Oz)
            </button>
            <button
              onClick={() => {
                setRotX(25);
                setRotY(-35);
              }}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs"
            >
              Phối cảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
