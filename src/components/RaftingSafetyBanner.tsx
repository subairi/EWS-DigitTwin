import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, Compass, LifeBuoy, ArrowUpRight } from 'lucide-react';
import { RiverTelemetry, ThresholdConfig } from '../types';
import { assessRaftingSafety } from '../utils/safety';
import { AnimatedNumber } from './AnimatedNumber';

interface RaftingSafetyBannerProps {
  telemetry: RiverTelemetry;
  thresholds?: ThresholdConfig;
}

export const RaftingSafetyBanner: React.FC<RaftingSafetyBannerProps> = ({
  telemetry,
  thresholds,
}) => {
  const assessment = assessRaftingSafety(telemetry, thresholds);

  const getStatusIcon = () => {
    switch (assessment.status) {
      case 'BAHAYA':
        return <AlertOctagon className="h-7 w-7 text-rose-600 dark:text-rose-400 animate-pulse" />;
      case 'SIAGA':
        return <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />;
      case 'WASPADA':
        return <Info className="h-7 w-7 text-amber-500 dark:text-amber-400" />;
      case 'AMAN':
      default:
        return <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (assessment.status) {
      case 'BAHAYA':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-rose-600 text-white uppercase shadow-xs">
            BAHAYA BANJIR (STOP TRIP)
          </span>
        );
      case 'SIAGA':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-amber-600 text-white uppercase shadow-xs">
            SIAGA (TUNDA TRIP)
          </span>
        );
      case 'WASPADA':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-amber-500 text-white uppercase shadow-xs">
            WASPADA (PENGAWASAN KETAT)
          </span>
        );
      case 'AMAN':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-emerald-600 text-white uppercase shadow-xs">
            STATUS AMAN (LAYAK REKREASI)
          </span>
        );
    }
  };

  return (
    <div 
      id="rafting-safety-banner"
      className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${assessment.bgLight} ${assessment.borderLight}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white shadow-xs dark:bg-slate-800 shrink-0 mt-0.5 border border-slate-200/60 dark:border-slate-700/60">
            {getStatusIcon()}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {getStatusBadge()}
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {assessment.gradeText}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                | Ketinggian Hulu: <strong className="font-semibold text-slate-800 dark:text-slate-100"><AnimatedNumber value={telemetry.river_level_m} decimals={2} durationMs={700} suffix=" m" /></strong>
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium max-w-4xl leading-relaxed">
              {assessment.recommendation}
            </p>

            {assessment.hazardNote && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 pt-0.5">
                <span>⚠️ Catatan Bahaya:</span>
                <span>{assessment.hazardNote}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Checkpoints for Operators */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-2 lg:pt-0 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800 lg:pl-6">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 min-w-[135px] shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5 text-indigo-500" />
              Izin Peluncuran
            </div>
            <div className={`text-sm font-bold mt-0.5 ${assessment.isRaftingAllowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {assessment.isRaftingAllowed ? 'Diberikan Izin' : 'Dilarang Masuk'}
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 min-w-[135px] shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-indigo-600" />
              Tingkat Jeram
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {telemetry.river_level_m >= 3.0 ? 'Grade V (Ekstrem)' : telemetry.river_level_m >= 2.3 ? 'Grade III-IV' : 'Grade I-II'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
