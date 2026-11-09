/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModuleId =
  | 'whiteboard'
  | 'calculator'
  | 'grapher'
  | 'table'
  | 'equation'
  | 'inequality'
  | 'numberline'
  | 'matrix'
  | 'analysis'
  | 'calculus'
  | 'trigonometry'
  | 'sequences'
  | 'complex'
  | 'vectors'
  | 'numbertheory'
  | 'combinatorics'
  | 'statistics'
  | 'distributions'
  | 'oxy'
  | 'oxyz'
  | 'transforms'
  | 'solids_rev'
  | 'solid3d'
  | 'cross_section'
  | 'net_folding'
  | 'fractal'
  | 'invariants';

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  stage: 1 | 2 | 3 | 4;
  description: string;
  category:
    | 'Cơ bản'
    | 'Đại số & Giải tích'
    | 'Hình học & Vectơ'
    | 'Số học & Khác'
    | 'Xác suất & Thống kê'
    | 'Hình học không gian & 3D'
    | 'Mô phỏng & Chuyên đề';
  iconName: string;
}

// Whiteboard Types
export type DrawingTool = 'pen' | 'laser' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'axes' | 'text' | 'formula';
export type GridPattern = 'student' | 'grid' | 'dots' | 'blank';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: DrawingTool;
  color: string;
  strokeWidth: number;
  points: Point[];
  text?: string;
  imageData?: string; // For pasted / inserted graphs
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface WhiteboardPage {
  id: string;
  title: string;
  grid: GridPattern;
  elements: DrawingElement[];
}

// Grapher Types
export interface GraphFunction {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
  name: string; // e.g. f_1(x)
}

export interface GraphParameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

// Session State for Export / Import JSON
export interface AppSessionData {
  version: string;
  timestamp: string;
  activeModule: ModuleId;
  whiteboard: {
    pages: WhiteboardPage[];
    currentPageIndex: number;
  };
  calculator: {
    history: { expr: string; result: string; exact?: string }[];
    variables: Record<string, number>;
    angleUnit: 'deg' | 'rad';
  };
  grapher: {
    functions: GraphFunction[];
    parameters: GraphParameter[];
    viewport: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
  equation: {
    type: 'poly' | 'system' | 'root';
    degree: number;
    coeffs: number[];
  };
  inequality: {
    type: '1d' | '2d' | 'lp';
    ineqStr: string;
  };
  numberline: {
    setA: string;
    setB: string;
    operation: 'intersection' | 'union' | 'diffAB' | 'diffBA' | 'compA';
  };
  // Optional Chặng 3 states
  combinatorics?: {
    tab: 'counting' | 'binomial' | 'bayes';
    n: number;
    k: number;
    bayesPA: number;
    bayesPBgivenA: number;
    bayesPBgivenNotA: number;
  };
  statistics?: {
    mode: 'raw' | 'freq' | 'grouped' | 'bivariate';
    rawDataText: string;
  };
  distributions?: {
    distType: 'normal' | 'binomial' | 'poisson';
    normalMu: number;
    normalSigma: number;
    binN: number;
    binP: number;
    poisLambda: number;
  };
}
