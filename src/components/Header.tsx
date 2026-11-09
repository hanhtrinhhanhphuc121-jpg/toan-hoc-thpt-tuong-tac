/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Layers,
  Calculator,
  LineChart,
  Table as TableIcon,
  GitCommit,
  Scale,
  Split,
  Grid,
  TrendingUp,
  Sigma,
  Compass,
  ListOrdered,
  Atom,
  Navigation,
  Hash,
  Boxes,
  BarChart2,
  Activity,
  Rotate3d,
  Scissors,
  Sparkles,
  GraduationCap,
  User,
  BookOpen,
  X,
  Download,
  Upload,
  Sun,
  Moon,
  Tv,
} from 'lucide-react';
import { ModuleId, ModuleInfo } from '../types';

export const MODULES: ModuleInfo[] = [
  // Chặng 1 - 7 phân hệ cốt lõi
  { id: 'whiteboard', name: 'Bảng viết', stage: 1, description: 'Bảng viết đa trang, bút, laser, hình học, chèn đồ thị', category: 'Cơ bản', iconName: 'Layers' },
  { id: 'calculator', name: 'Máy tính CAS', stage: 1, description: 'Máy tính khoa học, phân số chính xác, biến nhớ, lịch sử', category: 'Cơ bản', iconName: 'Calculator' },
  { id: 'grapher', name: 'Đồ thị', stage: 1, description: 'Vẽ nhiều hàm, tham số động, tách gián đoạn, gửi bảng viết', category: 'Đại số & Giải tích', iconName: 'LineChart' },
  { id: 'table', name: 'Bảng giá trị', stage: 1, description: 'Bảng giá trị f(x), g(x), bước phân số, đồng bộ điểm đồ thị', category: 'Đại số & Giải tích', iconName: 'Table' },
  { id: 'equation', name: 'Phương trình', stage: 1, description: 'Giải đa thức bậc 1–4, hệ 2–4 ẩn, phương trình f(x)=0 trên [a,b]', category: 'Đại số & Giải tích', iconName: 'GitCommit' },
  { id: 'inequality', name: 'Bất phương trình', stage: 1, description: 'Bất phương trình 1 ẩn, miền nghiệm 2 ẩn, quy hoạch tuyến tính', category: 'Đại số & Giải tích', iconName: 'Scale' },
  { id: 'numberline', name: 'Trục số & Tập hợp', stage: 1, description: 'Giao, hợp, hiệu, phần bù trên trục số đồng mốc & sơ đồ Venn', category: 'Đại số & Giải tích', iconName: 'Split' },

  // Chặng 2 - 8 phân hệ chuyên sâu
  { id: 'matrix', name: 'Ma trận', stage: 2, description: 'Định thức, nghịch đảo, nhân ma trận, khử Gauss từng bước', category: 'Đại số & Giải tích', iconName: 'Grid' },
  { id: 'analysis', name: 'Khảo sát hàm số', stage: 2, description: 'Tập xác định, đạo hàm, bảng biến thiên, tiệm cận, tiếp tuyến', category: 'Đại số & Giải tích', iconName: 'TrendingUp' },
  { id: 'calculus', name: 'Giải tích', stage: 2, description: 'Đạo hàm cấp cao, nguyên hàm, tích phân diện tích tô màu, giới hạn', category: 'Đại số & Giải tích', iconName: 'Sigma' },
  { id: 'trigonometry', name: 'Lượng giác', stage: 2, description: 'Đường tròn đơn vị kéo thả, giá trị lượng giác, nghiệm tuần hoàn', category: 'Đại số & Giải tích', iconName: 'Compass' },
  { id: 'sequences', name: 'Dãy số', stage: 2, description: 'Cấp số cộng, cấp số nhân, dãy truy hồi, biểu đồ điểm rời rạc', category: 'Đại số & Giải tích', iconName: 'ListOrdered' },
  { id: 'complex', name: 'Số phức', stage: 2, description: 'Đại số, lượng giác, lũy thừa, căn bậc n, mặt phẳng Argand', category: 'Đại số & Giải tích', iconName: 'Atom' },
  { id: 'vectors', name: 'Vectơ 2D/3D', stage: 2, description: 'Tọa độ, độ dài, góc, tích vô hướng, tích có hướng 3D', category: 'Hình học & Vectơ', iconName: 'Navigation' },
  { id: 'numbertheory', name: 'Số học', stage: 2, description: 'Hồ sơ số, thừa số nguyên tố, ước số, ƯCLN-BCNN, đồng dư', category: 'Số học & Khác', iconName: 'Hash' },

  // Chặng 3 - 3 phân hệ Xác suất & Thống kê THPT
  { id: 'combinatorics', name: 'Tổ hợp & XS', stage: 3, description: 'Hoán vị, chỉnh hợp, tổ hợp, Nhị thức Newton, Bayes & sơ đồ cây', category: 'Xác suất & Thống kê', iconName: 'Boxes' },
  { id: 'statistics', name: 'Thống kê', stage: 3, description: 'Dữ liệu thô, bảng tần số, mẫu ghép nhóm, tương quan Pearson, Box Plot', category: 'Xác suất & Thống kê', iconName: 'BarChart2' },
  { id: 'distributions', name: 'Phân phối XS', stage: 3, description: 'Phân phối Chuẩn Gauss N(μ,σ²), Nhị thức B(n,p), Poisson Pois(λ)', category: 'Xác suất & Thống kê', iconName: 'Activity' },

  // Chặng 4 - 9 phân hệ Hình học không gian, 3D & Mô phỏng chuyên đề (27 phân hệ hoàn chỉnh)
  { id: 'oxy', name: 'Hình Oxy', stage: 4, description: 'Tam giác, đường tròn, conic, tâm nội/ngoại/trọng/trực tâm, thẳng hàng', category: 'Hình học & Vectơ', iconName: 'Compass' },
  { id: 'oxyz', name: 'Hình Oxyz', stage: 4, description: 'Điểm, vectơ, mặt phẳng, mặt cầu, góc nhìn trực giao/phối cảnh 3D', category: 'Hình học không gian & 3D', iconName: 'Navigation' },
  { id: 'transforms', name: 'Giao & Biến hình', stage: 4, description: 'Giao d và (P), giao hai mặt phẳng, hình chiếu, tịnh tiến/đối xứng', category: 'Hình học không gian & 3D', iconName: 'Split' },
  { id: 'solids_rev', name: 'Diện tích–Thể tích', stage: 4, description: 'Diện tích giữa 2 đường cong, thể tích tròn xoay quanh Ox/Oy 3D', category: 'Hình học không gian & 3D', iconName: 'Layers' },
  { id: 'solid3d', name: 'Khối 3D', stage: 4, description: 'Đường sinh tạo khối trụ, nón, cầu; góc quay 0–360°, mặt cắt ngang', category: 'Hình học không gian & 3D', iconName: 'Rotate3d' },
  { id: 'cross_section', name: 'Mặt cắt khối', stage: 4, description: 'Thiết diện lập phương, chóp, lăng trụ; đa giác giao, tính diện tích', category: 'Hình học không gian & 3D', iconName: 'Scissors' },
  { id: 'net_folding', name: 'Trải & Gấp hình', stage: 4, description: 'Trải phẳng 2D sang khối 3D kín 0–100%, tai dán mép, thước in ấn 5cm', category: 'Mô phỏng & Chuyên đề', iconName: 'Layers' },
  { id: 'fractal', name: 'Fractal 2D–3D', stage: 4, description: 'Tam giác Sierpinski, Bông tuyết Koch, Menger Sponge, số chiều fractal', category: 'Mô phỏng & Chuyên đề', iconName: 'Sparkles' },
  { id: 'invariants', name: 'Bất biến THPT', stage: 4, description: 'Thí nghiệm dời hình, diện tích đỉnh di động // đáy, định lý Varignon', category: 'Mô phỏng & Chuyên đề', iconName: 'Scale' },
];

const ICONS: Record<string, React.ElementType> = {
  Layers,
  Calculator,
  LineChart,
  Table: TableIcon,
  GitCommit,
  Scale,
  Split,
  Grid,
  TrendingUp,
  Sigma,
  Compass,
  ListOrdered,
  Atom,
  Navigation,
  Hash,
  Boxes,
  BarChart2,
  Activity,
  Rotate3d,
  Scissors,
  Sparkles,
};

interface HeaderProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onExportSession: () => void;
  onImportSession: (data: any) => void;
  onTogglePresentation: () => void;
  isPresentation: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  isDarkMode,
  onToggleTheme,
  onExportSession,
  onImportSession,
  onTogglePresentation,
  isPresentation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthorModal, setShowAuthorModal] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportSession(json);
      } catch (err) {
        alert('Tệp JSON không hợp lệ hoặc bị lỗi cấu trúc.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeInfo = MODULES.find((m) => m.id === activeModule);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          
          {/* Zone 1: Brand Wordmark & Developer Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center text-white shadow-md font-bold text-lg border border-indigo-400/30">
              ∑
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  TOÁN HỌC THPT TƯƠNG TÁC
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                  27 phân hệ
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Trầm Cao Bách</span>
                <span>·</span>
                <span className="text-slate-600 dark:text-slate-300">Lớp 10.5</span>
                <span className="hidden sm:inline text-slate-400">· THCS & THPT Long Hiệp</span>
              </div>
            </div>
          </div>

          {/* Zone 2: Module Selector (Categories / Compact Strip) */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
            {MODULES.map((mod) => {
              const Icon = ICONS[mod.iconName] || Layers;
              const isActive = mod.id === activeModule;
              return (
                <button
                  key={mod.id}
                  onClick={() => onSelectModule(mod.id)}
                  title={mod.description}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mod.name}</span>
                  {mod.stage > 1 && (
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      C{mod.stage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Zone 3: Global Actions (Author Info, Presentation, Export, Import, Theme) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Developer / Project Info Modal Button */}
            <button
              onClick={() => setShowAuthorModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/80 whitespace-nowrap shadow-xs"
              title="Thông tin người phát triển: Trầm Cao Bách - lớp 10.5 (Trường THCS và THPT Long Hiệp)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xl:inline">Tác giả</span>
            </button>

            {/* Presentation Mode Toggle */}
            <button
              onClick={onTogglePresentation}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                isPresentation
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Bật/Tắt chế độ trình chiếu giảng dạy (Toàn màn hình & mở rộng không gian)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trình chiếu</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={onExportSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              title="Xuất toàn bộ phiên làm việc ra tệp JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lưu JSON</span>
            </button>

            {/* Import JSON */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors whitespace-nowrap" title="Mở lại phiên đã lưu từ tệp JSON">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở JSON</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Theme switch */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDarkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>

        </div>

        {/* Sub-bar showing active module info banner & developer credit */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{activeInfo?.name}</span>
            <span>·</span>
            <span className="hidden sm:inline">{activeInfo?.description}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Người phát triển:</span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Trầm Cao Bách</strong>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 dark:text-slate-300">10.5</span>
              <span className="hidden lg:inline text-slate-500 dark:text-slate-400">(THCS và THPT Long Hiệp)</span>
            </div>
            <span className="hidden md:inline text-[11px] text-slate-400">Client-side CAS ngoại tuyến 100%</span>
          </div>
        </div>
      </header>

      {/* Developer Information Modal */}
      {showAuthorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Background decorative gradient */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setShowAuthorModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg flex-shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="pr-6">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-1">
                  ĐỒ ÁN PHẦN MỀM HỌC TẬP TOÁN THPT
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  TOÁN HỌC THPT TƯƠNG TÁC
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hệ thống 27 phân hệ tính toán đại số CAS & trực quan hóa hình học không gian 3D
                </p>
              </div>
            </div>

            {/* Author Profile Card */}
            <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 dark:from-indigo-950/30 dark:to-slate-950/60 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Người phát triển:</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Trầm Cao Bách</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lớp học:</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lớp 10.5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đơn vị:</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trường THCS và THPT Long Hiệp</span>
              </div>
            </div>

            {/* Distinctive Mathematical Features */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Đặc trưng giao diện khoa học & môn Toán THPT:
              </div>
              <ul className="space-y-2 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Tính chính xác & Chuẩn mực CAS:</strong> Lời giải hiển thị phân số chính xác, căn thức, ma trận, bảng biến thiên chuẩn SGK THPT và khảo sát đạo hàm cấp cao.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Không gian hình học 3D tương tác:</strong> Hệ trục Oxyz, thiết diện cắt khối, trải phẳng origami 2D–3D, khối tròn xoay và mô phỏng fractal tự đồng dạng.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Phục vụ dạy học & trình chiếu:</strong> Bảng viết đa trang với bút, laser, thước, ô ly học sinh; kết nối chuyển hình ảnh đồ thị trực tiếp lên bảng viết.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>100% Ngoại tuyến & Bảo mật:</strong> Chạy hoàn toàn trên máy khách (Client-side), không gửi dữ liệu ra ngoài, đóng gói trọn gói trong một tệp duy nhất.
                  </span>
                </li>
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Phiên bản hoàn thiện: Chặng 4 · 27 phân hệ
              </span>
              <button
                onClick={() => setShowAuthorModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
              >
                Đã hiểu & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
