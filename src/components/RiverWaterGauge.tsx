import React from 'react';
import { Waves, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ThresholdConfig } from '../types';

interface RiverWaterGaugeProps {
  currentLevel: number;
  thresholds: ThresholdConfig;
  previousLevel?: number;
}

export const RiverWaterGauge: React.FC<RiverWaterGaugeProps> = ({
  currentLevel,
  thresholds,
  previousLevel,
}) => {
  const maxScale = Math.max(4.5, thresholds.waterLevelBahaya + 1.0);
  const fillPercent = Math.min(100, Math.max(0, (currentLevel / maxScale) * 100));

  const diff = typeof previousLevel === 'number' ? +(currentLevel - previousLevel).toFixed(2) : 0;

  // Threshold percentage marks on the tank
  const waspadaPercent = (thresholds.waterLevelWaspada / maxScale) * 100;
  const siagaPercent = (thresholds.waterLevelSiaga / maxScale) * 100;
  const bahayaPercent = (thresholds.waterLevelBahaya / maxScale) * 100;

  const isBahaya = currentLevel >= thresholds.waterLevelBahaya;
  const isSiaga = currentLevel >= thresholds.waterLevelSiaga && !isBahaya;
  const isWaspada = currentLevel >= thresholds.waterLevelWaspada && !isSiaga && !isBahaya;

  const getWaterGradient = () => {
    if (isBahaya) return 'from-rose-600 via-rose-500 to-red-600';
    if (isSiaga) return 'from-amber-600 via-orange-500 to-amber-500';
    if (isWaspada) return 'from-amber-500 via-sky-500 to-indigo-500';
    return 'from-indigo-600 via-sky-500 to-cyan-400';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Water Level Sensor
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
            <Waves className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Level Air Hulu Sungai
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {diff > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              <ArrowUp className="h-3.5 w-3.5" /> +{diff}m
            </span>
          ) : diff < 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <ArrowDown className="h-3.5 w-3.5" /> {diff}m
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-0.5">
              <Minus className="h-3.5 w-3.5" /> Stabil
            </span>
          )}
        </div>
      </div>

      {/* Main Gauge Graphic */}
      <div className="py-5 flex items-center gap-6 justify-center">
        {/* The Tank Meter */}
        <div className="relative w-24 h-60 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 overflow-hidden flex flex-col justify-end shadow-inner">
          {/* Ruler marks on side */}
          <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between py-2 text-[9px] text-slate-400 pointer-events-none font-mono z-20">
            <span>4m</span>
            <span>3m</span>
            <span>2m</span>
            <span>1m</span>
            <span>0m</span>
          </div>

          {/* Threshold Lines */}
          {/* Bahaya */}
          <div 
            className="absolute w-full border-b border-dashed border-rose-500 z-20 flex items-center justify-end pr-1 pointer-events-none"
            style={{ bottom: `${bahayaPercent}%` }}
          >
            <span className="text-[9px] font-bold text-rose-600 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded shadow-xs">
              BAHAYA ({thresholds.waterLevelBahaya}m)
            </span>
          </div>

          {/* Siaga */}
          <div 
            className="absolute w-full border-b border-dashed border-amber-500 z-20 flex items-center justify-end pr-1 pointer-events-none"
            style={{ bottom: `${siagaPercent}%` }}
          >
            <span className="text-[9px] font-bold text-amber-600 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded shadow-xs">
              SIAGA ({thresholds.waterLevelSiaga}m)
            </span>
          </div>

          {/* Waspada */}
          <div 
            className="absolute w-full border-b border-dashed border-amber-400 z-20 flex items-center justify-end pr-1 pointer-events-none"
            style={{ bottom: `${waspadaPercent}%` }}
          >
            <span className="text-[9px] font-bold text-amber-600 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded shadow-xs">
              WASPADA ({thresholds.waterLevelWaspada}m)
            </span>
          </div>

          {/* Water Fluid */}
          <div 
            className={`w-full bg-gradient-to-t ${getWaterGradient()} transition-all duration-700 ease-out relative`}
            style={{ height: `${fillPercent}%` }}
          >
            {/* Water Surface Wave Highlights */}
            <div className="absolute -top-1.5 left-0 w-full h-3 bg-white/35 rounded-full animate-pulse blur-[1px]" />
          </div>
        </div>

        {/* Level Numeric & Threshold Explanations */}
        <div className="flex-1 space-y-3.5">
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
              <span>{currentLevel.toFixed(2)}</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">meter</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sensor Ultrasonik Hulu (Real-Time)
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
              <span className="font-medium">Aman / Normal</span>
              <span className="font-semibold">&lt; {thresholds.waterLevelWaspada} m</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40">
              <span className="font-medium">Waspada</span>
              <span className="font-semibold">{thresholds.waterLevelWaspada} - {thresholds.waterLevelSiaga} m</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/70 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border border-orange-100 dark:border-orange-900/40">
              <span className="font-medium">Siaga Banjir</span>
              <span className="font-semibold">{thresholds.waterLevelSiaga} - {thresholds.waterLevelBahaya} m</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900/50">
              <span>Bahaya / Evakuasi</span>
              <span>&gt; {thresholds.waterLevelBahaya} m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        Ambang batas dapat disesuaikan pada menu pengaturan
      </div>
    </div>
  );
};
