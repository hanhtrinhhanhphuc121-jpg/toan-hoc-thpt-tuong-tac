/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ModuleId, WhiteboardPage, AppSessionData } from './types';
import { Header, MODULES } from './components/Header';
import { Whiteboard } from './components/Whiteboard';
import { ScientificCalculator } from './components/ScientificCalculator';
import { FunctionGrapher } from './components/FunctionGrapher';
import { TableOfValues } from './components/TableOfValues';
import { EquationSolver } from './components/EquationSolver';
import { InequalitySolver } from './components/InequalitySolver';
import { NumberLineSets } from './components/NumberLineSets';
import { MatrixSolver } from './components/MatrixSolver';
import { FunctionAnalysis } from './components/FunctionAnalysis';
import { CalculusModule } from './components/CalculusModule';
import { TrigonometryModule } from './components/TrigonometryModule';
import { SequencesModule } from './components/SequencesModule';
import { ComplexNumbersModule } from './components/ComplexNumbersModule';
import { VectorModule } from './components/VectorModule';
import { NumberTheoryModule } from './components/NumberTheoryModule';
import { CombinatoricsModule } from './components/CombinatoricsModule';
import { StatisticsModule } from './components/StatisticsModule';
import { DistributionsModule } from './components/DistributionsModule';
import { GeometryOxyModule } from './components/GeometryOxyModule';
import { GeometryOxyzModule } from './components/GeometryOxyzModule';
import { IntersectionsTransformsModule } from './components/IntersectionsTransformsModule';
import { AreaVolumeModule } from './components/AreaVolumeModule';
import { Solid3DModule } from './components/Solid3DModule';
import { CrossSectionModule } from './components/CrossSectionModule';
import { NetFoldingModule } from './components/NetFoldingModule';
import { FractalModule } from './components/FractalModule';
import { InvariantsModule } from './components/InvariantsModule';
import { PresentationMode } from './components/PresentationMode';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('whiteboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isPresentation, setIsPresentation] = useState<boolean>(false);

  // Cross-module data transfer
  const [imageForWhiteboard, setImageForWhiteboard] = useState<string | null>(null);
  const [numberLineSetA, setNumberLineSetA] = useState<string>('(-inf, 1] U [2, +inf)');

  // Whiteboard Pages State
  const [whiteboardPages, setWhiteboardPages] = useState<WhiteboardPage[]>([
    {
      id: 'page-1',
      title: 'Trang 1: Bài giảng THPT',
      grid: 'student',
      elements: [],
    },
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Workflow 1: Send Graph / Diagram image to Whiteboard
  const handleSendGraphToWhiteboard = (imgDataUrl: string) => {
    setImageForWhiteboard(imgDataUrl);
    setActiveModule('whiteboard');
  };

  // Workflow 2: Transfer Inequality Solution to Number Line
  const handleTransferToNumberLine = (intervalStr: string) => {
    setNumberLineSetA(intervalStr);
    setActiveModule('numberline');
  };

  // Workflow 5: Export / Import JSON Session (Backwards-compatible)
  const handleExportSession = () => {
    const sessionData: AppSessionData = {
      version: '4.0.0',
      timestamp: new Date().toISOString(),
      activeModule,
      whiteboard: {
        pages: whiteboardPages,
        currentPageIndex,
      },
      calculator: {
        history: [],
        variables: {},
        angleUnit: 'rad',
      },
      grapher: {
        functions: [],
        parameters: [],
        viewport: { xMin: -10, xMax: 10, yMin: -7, yMax: 7 },
      },
      equation: {
        type: 'poly',
        degree: 2,
        coeffs: [1, -3, 2],
      },
      inequality: {
        type: '1d',
        ineqStr: 'x^2 - 3x + 2 >= 0',
      },
      numberline: {
        setA: numberLineSetA,
        setB: '[0, 5)',
        operation: 'intersection',
      },
      combinatorics: {
        tab: 'counting',
        n: 10,
        k: 3,
        bayesPA: 0.4,
        bayesPBgivenA: 0.8,
        bayesPBgivenNotA: 0.2,
      },
      statistics: {
        mode: 'raw',
        rawDataText: '3, 5, 7, 8, 9, 11, 12, 12',
      },
      distributions: {
        distType: 'normal',
        normalMu: 0,
        normalSigma: 1,
        binN: 10,
        binP: 0.5,
        poisLambda: 2,
      },
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ToanHocTHPT_Chang4_Session_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSession = (data: any) => {
    if (!data || typeof data !== 'object') {
      alert('Tệp dữ liệu JSON không đúng định dạng phiên làm việc.');
      return;
    }
    // Backward compatibility: gracefully handle Chặng 1, Chặng 2, Chặng 3, or Chặng 4 sessions
    if (data.activeModule) {
      setActiveModule(data.activeModule);
    }
    if (Array.isArray(data.whiteboard?.pages) && data.whiteboard.pages.length > 0) {
      setWhiteboardPages(data.whiteboard.pages);
      setCurrentPageIndex(
        typeof data.whiteboard.currentPageIndex === 'number' && data.whiteboard.currentPageIndex < data.whiteboard.pages.length
          ? data.whiteboard.currentPageIndex
          : 0
      );
    }
    if (data.numberline?.setA) {
      setNumberLineSetA(data.numberline.setA);
    }
  };

  const activeModInfo = MODULES.find((m) => m.id === activeModule);

  // Render current module view (27 modules)
  const renderModule = () => {
    switch (activeModule) {
      case 'whiteboard':
        return (
          <Whiteboard
            pages={whiteboardPages}
            currentPageIndex={currentPageIndex}
            onUpdatePages={(newPages, newIdx) => {
              setWhiteboardPages(newPages);
              if (newIdx !== undefined) setCurrentPageIndex(newIdx);
            }}
            externalImageToInsert={imageForWhiteboard}
            onClearExternalImage={() => setImageForWhiteboard(null)}
          />
        );
      case 'calculator':
        return <ScientificCalculator />;
      case 'grapher':
        return <FunctionGrapher onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'table':
        return <TableOfValues />;
      case 'equation':
        return <EquationSolver />;
      case 'inequality':
        return <InequalitySolver onOpenInNumberLine={handleTransferToNumberLine} />;
      case 'numberline':
        return (
          <NumberLineSets
            initialSetA={numberLineSetA}
            onSendToWhiteboard={handleSendGraphToWhiteboard}
          />
        );
      case 'matrix':
        return <MatrixSolver />;
      case 'analysis':
        return <FunctionAnalysis onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'calculus':
        return <CalculusModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'trigonometry':
        return <TrigonometryModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'sequences':
        return <SequencesModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'complex':
        return <ComplexNumbersModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'vectors':
        return <VectorModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'numbertheory':
        return <NumberTheoryModule />;
      case 'combinatorics':
        return <CombinatoricsModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'statistics':
        return <StatisticsModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'distributions':
        return <DistributionsModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      // Chặng 4 modules (9 modules)
      case 'oxy':
        return <GeometryOxyModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'oxyz':
        return <GeometryOxyzModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'transforms':
        return <IntersectionsTransformsModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'solids_rev':
        return <AreaVolumeModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'solid3d':
        return <Solid3DModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'cross_section':
        return <CrossSectionModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'net_folding':
        return <NetFoldingModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'fractal':
        return <FractalModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      case 'invariants':
        return <InvariantsModule onSendToWhiteboard={handleSendGraphToWhiteboard} />;
      default:
        return (
          <Whiteboard
            pages={whiteboardPages}
            currentPageIndex={currentPageIndex}
            onUpdatePages={setWhiteboardPages}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Global Header */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onExportSession={handleExportSession}
        onImportSession={handleImportSession}
        onTogglePresentation={() => setIsPresentation((prev) => !prev)}
        isPresentation={isPresentation}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto overflow-hidden">
        {renderModule()}
      </main>

      {/* Fullscreen Presentation Mode Overlay */}
      <PresentationMode
        isOpen={isPresentation}
        onClose={() => setIsPresentation(false)}
        title={activeModInfo?.name || 'TOÁN HỌC THPT TƯƠNG TÁC'}
      >
        {renderModule()}
      </PresentationMode>

    </div>
  );
}
