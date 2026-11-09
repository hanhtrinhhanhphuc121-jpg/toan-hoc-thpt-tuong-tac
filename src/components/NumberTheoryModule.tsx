/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Sparkles, Hash, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { factorizeNumber, gcdLcm, PrimeFactorization } from '../utils/mathEngine';

interface CongruenceResult {
  hasSolution: boolean;
  gcd: number;
  solutions: number[];
  generalFormula: string;
  steps: string[];
}

export const NumberTheoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'gcd' | 'mod'>('profile');

  // --- NUMBER PROFILE STATE ---
  const [numInput, setNumInput] = useState<string>('360360'); // Test case: 192 divisors
  const [profile, setProfile] = useState<PrimeFactorization | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- GCD & LCM STATE ---
  const [numA, setNumA] = useState<string>('252');
  const [numB, setNumB] = useState<string>('105');
  const [euclidResult, setEuclidResult] = useState<{ gcd: number; lcm: number; steps: string[] } | null>(null);
  const [euclidError, setEuclidError] = useState<string | null>(null);

  // --- LINEAR CONGRUENCE: ax = b (mod m) ---
  const [modA, setModA] = useState<string>('3');
  const [modB, setModB] = useState<string>('1');
  const [modM, setModM] = useState<string>('7'); // 3x = 1 (mod 7) -> x = 5 (mod 7)
  const [congruenceResult, setCongruenceResult] = useState<CongruenceResult | null>(null);
  const [congruenceError, setCongruenceError] = useState<string | null>(null);

  // 1. COMPUTE PROFILE
  const handleComputeProfile = (customVal?: string) => {
    setProfileError(null);
    const valStr = customVal !== undefined ? customVal : numInput;
    const n = parseInt(valStr.trim(), 10);

    if (isNaN(n) || n <= 0) {
      setProfileError('Vui lòng nhập số nguyên dương N ≥ 1 hợp lệ.');
      setProfile(null);
      return;
    }

    if (n > 100000000000000) {
      setProfileError('Số quá lớn! Vui lòng nhập N ≤ 10¹⁴ để đảm bảo độ chính xác của phép tính.');
      setProfile(null);
      return;
    }

    try {
      const res = factorizeNumber(n);
      setProfile(res);
    } catch {
      setProfileError('Đã xảy ra lỗi trong quá trình phân tích số.');
      setProfile(null);
    }
  };

  const handleResetProfile = () => {
    setNumInput('360360');
    setProfileError(null);
    handleComputeProfile('360360');
  };

  // 2. COMPUTE EUCLID (GCD & LCM)
  const handleComputeEuclid = (customA?: string, customB?: string) => {
    setEuclidError(null);
    const valA = parseInt(customA !== undefined ? customA : numA, 10);
    const valB = parseInt(customB !== undefined ? customB : numB, 10);

    if (isNaN(valA) || isNaN(valB) || valA <= 0 || valB <= 0) {
      setEuclidError('Vui lòng nhập hai số nguyên dương A và B lớn hơn 0.');
      setEuclidResult(null);
      return;
    }

    const res = gcdLcm(valA, valB);
    setEuclidResult(res);
  };

  const handleResetEuclid = () => {
    setNumA('252');
    setNumB('105');
    setEuclidError(null);
    handleComputeEuclid('252', '105');
  };

  // 3. SOLVE LINEAR CONGRUENCE: ax = b (mod m)
  const handleSolveCongruence = (cA?: string, cB?: string, cM?: string) => {
    setCongruenceError(null);
    const a = parseInt(cA !== undefined ? cA : modA, 10);
    const b = parseInt(cB !== undefined ? cB : modB, 10);
    const m = parseInt(cM !== undefined ? cM : modM, 10);

    if (isNaN(a) || isNaN(b) || isNaN(m)) {
      setCongruenceError('Vui lòng nhập đầy đủ các hệ số a, b, m là số nguyên.');
      setCongruenceResult(null);
      return;
    }

    if (m <= 1) {
      setCongruenceError('Modulo m phải là số nguyên lớn hơn 1 (m ≥ 2).');
      setCongruenceResult(null);
      return;
    }

    // Extended Euclidean Algorithm to solve ax + my = gcd(a, m)
    const steps: string[] = [];
    steps.push(`Phương trình: ${a}x ≡ ${b} (mod ${m})`);

    // Standardize a, b modulo m
    const normA = ((a % m) + m) % m;
    const normB = ((b % m) + m) % m;
    steps.push(`Đưa về dạng thu gọn: ${normA}x ≡ ${normB} (mod ${m})`);

    // Find gcd(a, m)
    let r0 = normA, r1 = m;
    let s0 = 1, s1 = 0;
    while (r1 !== 0) {
      const q = Math.floor(r0 / r1);
      const rem = r0 - q * r1;
      r0 = r1;
      r1 = rem;
      const sRem = s0 - q * s1;
      s0 = s1;
      s1 = sRem;
    }
    const d = r0;
    steps.push(`Tính ƯCLN(${normA}, ${m}) = ${d}`);

    if (normB % d !== 0) {
      steps.push(`Do ${normB} không chia hết cho ${d} nên phương trình VÔ NGHIỆM.`);
      setCongruenceResult({
        hasSolution: false,
        gcd: d,
        solutions: [],
        generalFormula: 'Phương trình vô nghiệm',
        steps,
      });
      return;
    }

    // d divides normB -> exactly d solutions modulo m
    const aPrime = normA / d;
    const bPrime = normB / d;
    const mPrime = m / d;
    steps.push(`Chia cả hai vế và modulo cho ${d}: ${aPrime}x ≡ ${bPrime} (mod ${mPrime})`);

    // Find modular inverse of aPrime mod mPrime
    let inv = 1;
    for (let i = 1; i < mPrime; i++) {
      if ((aPrime * i) % mPrime === 1) {
        inv = i;
        break;
      }
    }
    steps.push(`Nghịch đảo của ${aPrime} theo modulo ${mPrime} là ${inv}`);

    const x0 = (bPrime * inv) % mPrime;
    steps.push(`Nghiệm cơ bản: x₀ = (${bPrime} × ${inv}) mod ${mPrime} = ${x0}`);

    const sols: number[] = [];
    for (let k = 0; k < d; k++) {
      sols.push(x0 + k * mPrime);
    }

    steps.push(`Các nghiệm phân biệt modulo ${m}: x = ${sols.join(', ')}`);

    setCongruenceResult({
      hasSolution: true,
      gcd: d,
      solutions: sols,
      generalFormula: `x ≡ ${sols.join(', ')} (mod ${m})`,
      steps,
    });
  };

  const handleResetCongruence = () => {
    setModA('3');
    setModB('1');
    setModM('7');
    setCongruenceError(null);
    handleSolveCongruence('3', '1', '7');
  };

  useEffect(() => {
    handleComputeProfile('360360');
    handleComputeEuclid('252', '105');
    handleSolveCongruence('3', '1', '7');
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Tab Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Hồ sơ của một số & Ước số
        </button>
        <button
          onClick={() => setActiveTab('gcd')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'gcd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          ƯCLN – BCNN (Thuật toán Euclid)
        </button>
        <button
          onClick={() => setActiveTab('mod')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mod' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Đồng dư tuyến tính: ax ≡ b (mod m)
        </button>
      </div>

      {/* INPUT LIMIT DECLARATION NOTICE */}
      <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Công bố giới hạn đầu vào:</span> Hỗ trợ số nguyên chính xác N ≤ 10¹⁴ (phân tích thừa số & kiểm tra nguyên tố). Đối với danh sách liệt kê chi tiết các ước số, hiển thị trọn vẹn với N ≤ 10⁷ để đảm bảo độ mượt của giao diện trình duyệt.
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: NUMBER PROFILE */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Header & Samples */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Hồ sơ số nguyên dương N
              </span>

              {/* Sample Loader Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setNumInput('360360');
                    handleComputeProfile('360360');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test 1: 360360 (192 ước)
                </button>
                <button
                  onClick={() => {
                    setNumInput('9973');
                    handleComputeProfile('9973');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100"
                >
                  Test 2: Số nguyên tố 9973
                </button>
                <button
                  onClick={() => {
                    setNumInput('1000000');
                    handleComputeProfile('1000000');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  1 000 000 (10⁶)
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {profileError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Inputs & Standard Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Nhập số nguyên dương N
                </label>
                <input
                  type="text"
                  value={numInput}
                  onChange={(e) => setNumInput(e.target.value)}
                  placeholder="Ví dụ: 360360"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end gap-2 pt-5">
                <button
                  onClick={() => handleComputeProfile()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Phân tích hồ sơ</span>
                </button>
                <button
                  onClick={handleResetProfile}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          </div>

          {profile && (
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Total Divisors */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                    Số lượng ước số dương:
                  </span>
                  <div className="text-3xl font-black font-mono text-indigo-950 dark:text-white mt-1">
                    {profile.totalDivisors} ước
                  </div>
                  <span className={`text-xs font-bold mt-1.5 inline-block px-2 py-0.5 rounded ${
                    profile.isPrime ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {profile.isPrime ? '★ Là số nguyên tố' : 'Hợp số'}
                  </span>
                </div>

                {/* Factorization representation */}
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 sm:col-span-2">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                    Phân tích thừa số nguyên tố chuẩn tắc:
                  </span>
                  <div className="text-2xl font-bold font-mono text-sky-950 dark:text-white mt-1">
                    {profile.n} = {profile.factors.length > 0
                      ? profile.factors.map((f) => `${f.prime}${f.power > 1 ? `^${f.power}` : ''}`).join(' × ')
                      : '1'}
                  </div>
                  <span className="text-xs text-sky-700 dark:text-sky-400 mt-1 block">
                    Số lượng ước số d(N) = {profile.factors.map((f) => `(${f.power} + 1)`).join(' × ')} = {profile.totalDivisors}
                  </span>
                </div>

              </div>

              {/* Full Divisors list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Danh sách toàn bộ {profile.divisors.length} ước số dương của {profile.n}:
                  </span>
                  <span className="text-xs text-slate-400">
                    Sắp xếp tăng dần
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-800 dark:text-slate-200 flex flex-wrap gap-2">
                  {profile.divisors.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-center shadow-2xs">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GCD & LCM */}
      {/* ============================================================== */}
      {activeTab === 'gcd' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Ước chung lớn nhất & Bội chung nhỏ nhất (Thuật toán chia Euclid)
              </span>

              {/* Sample */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setNumA('252');
                    setNumB('105');
                    handleComputeEuclid('252', '105');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test: 252 & 105 (ƯCLN=21)
                </button>
                <button
                  onClick={() => {
                    setNumA('120');
                    setNumB('45');
                    handleComputeEuclid('120', '45');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  120 & 45
                </button>
              </div>
            </div>

            {euclidError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{euclidError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Số nguyên A
                </label>
                <input
                  type="text"
                  value={numA}
                  onChange={(e) => setNumA(e.target.value)}
                  className="w-32 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                  placeholder="Số A"
                />
              </div>

              <span className="font-bold text-slate-400 pt-5">và</span>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Số nguyên B
                </label>
                <input
                  type="text"
                  value={numB}
                  onChange={(e) => setNumB(e.target.value)}
                  className="w-32 px-3 py-2 text-sm font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                  placeholder="Số B"
                />
              </div>

              <div className="flex items-end gap-2 pt-5">
                <button
                  onClick={() => handleComputeEuclid()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tính ƯCLN & BCNN</span>
                </button>
                <button
                  onClick={handleResetEuclid}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          </div>

          {euclidResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">ƯCLN(A, B):</span>
                  <div className="text-3xl font-black text-emerald-950 dark:text-white mt-1">
                    {euclidResult.gcd}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200">
                  <span className="text-xs text-sky-800 dark:text-sky-300 font-bold block">BCNN(A, B):</span>
                  <div className="text-3xl font-black text-sky-950 dark:text-white mt-1">
                    {euclidResult.lcm}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                  Các bước chia liên tiếp trong thuật toán Euclid:
                </span>
                {euclidResult.steps.map((st, i) => (
                  <p key={i}>{st}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LINEAR CONGRUENCE */}
      {/* ============================================================== */}
      {activeTab === 'mod' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Giải phương trình đồng dư bậc nhất: ax ≡ b (mod m)
              </span>

              {/* Sample */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Bài mẫu:</span>
                <button
                  onClick={() => {
                    setModA('3');
                    setModB('1');
                    setModM('7');
                    handleSolveCongruence('3', '1', '7');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
                >
                  Test: 3x ≡ 1 (mod 7)
                </button>
                <button
                  onClick={() => {
                    setModA('2');
                    setModB('4');
                    setModM('6');
                    handleSolveCongruence('2', '4', '6');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-100"
                >
                  2x ≡ 4 (mod 6)
                </button>
                <button
                  onClick={() => {
                    setModA('4');
                    setModB('3');
                    setModM('6');
                    handleSolveCongruence('4', '3', '6');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100"
                >
                  4x ≡ 3 (mod 6) (Vô nghiệm)
                </button>
              </div>
            </div>

            {congruenceError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{congruenceError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
              <input
                type="text"
                value={modA}
                onChange={(e) => setModA(e.target.value)}
                className="w-16 px-2 py-2 text-center font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                placeholder="a"
              />
              <span className="font-bold">x ≡</span>
              <input
                type="text"
                value={modB}
                onChange={(e) => setModB(e.target.value)}
                className="w-16 px-2 py-2 text-center font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                placeholder="b"
              />
              <span className="font-bold">(mod</span>
              <input
                type="text"
                value={modM}
                onChange={(e) => setModM(e.target.value)}
                className="w-16 px-2 py-2 text-center font-bold border rounded-xl bg-slate-50 dark:bg-slate-950"
                placeholder="m"
              />
              <span className="font-bold">)</span>

              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => handleSolveCongruence()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Giải phương trình</span>
                </button>
                <button
                  onClick={handleResetCongruence}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          </div>

          {congruenceResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border font-mono text-sm font-bold ${
                congruenceResult.hasSolution
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-950 dark:text-rose-100'
              }`}>
                <div className="flex items-center gap-2">
                  {congruenceResult.hasSolution ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>{congruenceResult.generalFormula}</span>
                </div>
              </div>

              {/* Step by step */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 font-mono text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Các bước giải chi tiết bằng thuật toán Euclid mở rộng:
                </span>
                <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300">
                  {congruenceResult.steps.map((st, i) => (
                    <p key={i}>{st}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

