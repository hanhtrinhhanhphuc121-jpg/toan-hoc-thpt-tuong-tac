/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Top Bar for Presentation Mode */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-sm font-bold tracking-tight uppercase">
            Chế độ trình chiếu giảng dạy (Toàn màn hình) · {title}
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-sm"
          title="Thoát chế độ trình chiếu (Esc)"
        >
          <X className="w-4 h-4" />
          <span>Thoát trình chiếu</span>
        </button>
      </div>

      {/* Fullscreen Body */}
      <div className="flex-1 w-full h-[calc(100vh-50px)] overflow-hidden">
        {children}
      </div>
    </div>
  );
};
