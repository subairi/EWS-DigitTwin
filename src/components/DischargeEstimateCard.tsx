import React from 'react';
import { Activity, Mountain, Ruler, Waves } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface DischargeEstimateCardProps {
  riverLevelM: number;
}

// Parameter awal model hidraulik berdasarkan data lokasi yang diberikan.
// Nilai ini BUKAN hasil kalibrasi debit lapangan dan dapat disempurnakan nanti.
const UPSTREAM_ELEVATION_M = 1029;
const DOWNSTREAM_ELEVATION_M = 884;
const REACH_LENGTH_M = 3000;
const ENERGY_SLOPE = (UPSTREAM_ELEVATION_M - DOWNSTREAM_ELEVATION_M) / REACH_LENGTH_M; // 0.0483 = 4.83%

// Geometri awal penampang "seperti perahu".
// Pada level referensi 0.39 m, lebar basah diamati sekitar 3-4 m; dipakai titik tengah 3.5 m.
const REFERENCE_LEVEL_M = 0.39;
const REFERENCE_WET_WIDTH_M = 3.5;
const BOTTOM_WIDTH_M = 2.0;
const MAX_WET_WIDTH_M = 15.0;
const SIDE_SLOPE_H_PER_V = (REFERENCE_WET_WIDTH_M - BOTTOM_WIDTH_M) / (2 * REFERENCE_LEVEL_M);

// Sungai alami, tanah berbatu / berboulder: nilai awal konservatif sampai kalibrasi lapangan tersedia.
const MANNING_N = 0.055;
const BOAT_SHAPE_FACTOR = 0.85;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function estimateDischarge(levelM: number) {
  const depth = Math.max(0, Number.isFinite(levelM) ? levelM : 0);
  if (depth <= 0.001) {
    return {
      dischargeM3s: 0,
      velocityMs: 0,
      wetWidthM: BOTTOM_WIDTH_M,
      areaM2: 0,
      hydraulicRadiusM: 0,
    };
  }

  // Lebar basah bertambah mengikuti sisi penampang hingga lebar maksimum sungai 15 m.
  const modeledWetWidth = BOTTOM_WIDTH_M + 2 * SIDE_SLOPE_H_PER_V * depth;
  const wetWidthM = clamp(modeledWetWidth, BOTTOM_WIDTH_M, MAX_WET_WIDTH_M);

  // Bila lebar sudah mencapai batas 15 m, gunakan slope sisi efektif pada kedalaman tersebut.
  const effectiveSideSlope = Math.max(0, (wetWidthM - BOTTOM_WIDTH_M) / (2 * depth));

  // Luas trapezoid dikoreksi faktor bentuk agar mendekati penampang membulat / "seperti perahu".
  const trapezoidArea = ((BOTTOM_WIDTH_M + wetWidthM) / 2) * depth;
  const areaM2 = trapezoidArea * BOAT_SHAPE_FACTOR;

  const wettedPerimeterM = BOTTOM_WIDTH_M + 2 * depth * Math.sqrt(1 + effectiveSideSlope ** 2);
  const hydraulicRadiusM = wettedPerimeterM > 0 ? areaM2 / wettedPerimeterM : 0;

  const velocityMs = hydraulicRadiusM > 0
    ? (1 / MANNING_N) * hydraulicRadiusM ** (2 / 3) * Math.sqrt(ENERGY_SLOPE)
    : 0;

  const dischargeM3s = areaM2 * velocityMs;

  return {
    dischargeM3s,
    velocityMs,
    wetWidthM,
    areaM2,
    hydraulicRadiusM,
  };
}

export const DischargeEstimateCard: React.FC<DischargeEstimateCardProps> = ({ riverLevelM }) => {
  const estimate = estimateDischarge(riverLevelM);

  return (
    <section className="mt-4 rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-4 shadow-xs transition-colors duration-500 dark:border-cyan-900/60 dark:from-cyan-950/30 dark:via-slate-900 dark:to-sky-950/30">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-600 shadow-xs dark:border-cyan-900/70 dark:bg-slate-900 dark:text-cyan-400">
            <Waves className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Estimasi Debit Sungai
              </h3>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
                Estimasi Manning
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
              <AnimatedNumber
                value={estimate.dischargeM3s}
                decimals={2}
                durationMs={700}
                className="text-3xl font-black tracking-tight text-cyan-700 dark:text-cyan-300"
              />
              <span className="text-sm font-bold text-cyan-700/80 dark:text-cyan-300/80">m³/detik</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                dari level <strong className="font-bold text-slate-700 dark:text-slate-200">{riverLevelM.toFixed(2)} m</strong>
              </span>
            </div>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Model awal Digital Twin — belum dikalibrasi dengan pengukuran debit/kecepatan lapangan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[500px]">
          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <Ruler className="h-3 w-3" /> Lebar Basah*
            </div>
            <div className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">
              <AnimatedNumber value={estimate.wetWidthM} decimals={2} durationMs={650} suffix=" m" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <Activity className="h-3 w-3" /> Kecepatan*
            </div>
            <div className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">
              <AnimatedNumber value={estimate.velocityMs} decimals={2} durationMs={650} suffix=" m/s" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <Mountain className="h-3 w-3" /> Slope GMaps
            </div>
            <div className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">4,83%</div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Manning n</div>
            <div className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">0,055</div>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-cyan-100 pt-2 text-[9px] leading-relaxed text-slate-400 dark:border-cyan-950/70 dark:text-slate-500">
        * Lebar basah dan kecepatan masih hasil model. Acuan: elevasi hulu 1.029 m, hilir 884 m, panjang alur 3 km, lebar basah ±3,5 m pada level 0,39 m, lebar maksimum model 15 m, dasar tanah berbatu.
      </div>
    </section>
  );
};
