import React from 'react';
import { 
  CloudRain, 
  Wind, 
  Thermometer, 
  Droplets, 
  BatteryCharging, 
  BatteryWarning, 
  Wifi, 
  Radio, 
  Cpu, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';
import { RiverTelemetry } from '../types';
import { formatUptime, getSignalQuality } from '../utils/safety';

interface MetricCardsProps {
  telemetry: RiverTelemetry;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ telemetry }) => {
  const isBatteryCritical = telemetry.battery_status === 'CRITICAL' || telemetry.battery_percent <= 15;
  const isBatteryLow = telemetry.battery_percent <= 25 && !isBatteryCritical;
  const signal = getSignalQuality(telemetry.wifi_rssi);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Curah Hujan (Rainfall) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Presipitasi Hulu
            </span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
              <CloudRain className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {telemetry.rain_mm_1H}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">mm / 1 Jam</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Akumulasi 24 Jam</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{telemetry.rain_mm_24H} mm</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
          {telemetry.rain_mm_1H >= 20 ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Hujan Sangat Lebat (Bahaya)
            </span>
          ) : telemetry.rain_mm_1H >= 5 ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <span>🌧️</span> Hujan Sedang / Deras
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span>☀️</span> Cerah / Hujan Ringan
            </span>
          )}
        </div>
      </div>

      {/* 2. Kecepatan Angin (Wind Speed) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kecepatan Angin
            </span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50">
              <Wind className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {telemetry.wind_ms}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">m/s</span>
              <span className="text-xs text-slate-400 ml-1">({(telemetry.wind_ms * 3.6).toFixed(1)} km/j)</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Skala Beaufort</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {telemetry.wind_ms >= 10.8 ? 'Angin Kuat (F6)' : telemetry.wind_ms >= 5.5 ? 'Angin Sedang (F4)' : 'Angin Tenang (F1-3)'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
          {telemetry.wind_ms >= 10 ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Waspada Ranting Tumbang
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span>🍃</span> Kondisi Angin Lembah Aman
            </span>
          )}
        </div>
      </div>

      {/* 3. Suhu & Kelembaban Udara */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mikroklimat Hulu
            </span>
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline gap-2.5">
              <div className="flex items-baseline gap-0.5">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {telemetry.temperature_c}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">°C</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-baseline gap-1 text-sky-600 dark:text-sky-400 font-semibold text-sm">
                <Droplets className="h-3.5 w-3.5" />
                <span>{telemetry.humidity_percent}%</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Titik Embun / Kabut</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {telemetry.humidity_percent >= 85 ? 'Sangat Lembab' : 'Sejuk Normal'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
          Sensor suhu & kelembaban air sungai
        </div>
      </div>

      {/* 4. Status Baterai Sensor (Critical Warning Component) */}
      <div 
        className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between ${
          isBatteryCritical 
            ? 'bg-rose-50/90 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-2 ring-rose-500/20' 
            : isBatteryLow
            ? 'bg-amber-50/90 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daya Sensor Hulu
            </span>
            <div 
              className={`p-2.5 rounded-xl border ${
                isBatteryCritical 
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse' 
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
              }`}
            >
              {isBatteryCritical ? <BatteryWarning className="h-4 w-4" /> : <BatteryCharging className="h-4 w-4" />}
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold tracking-tight ${isBatteryCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {telemetry.battery_percent}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  ({telemetry.battery_voltage_v.toFixed(2)}V)
                </span>
              </div>

              <span 
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  isBatteryCritical 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {telemetry.battery_status}
              </span>
            </div>

            {/* Battery Level Progress Bar */}
            <div className="mt-3 w-full bg-slate-200/80 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isBatteryCritical ? 'bg-rose-600' : isBatteryLow ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, telemetry.battery_percent))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
          {isBatteryCritical ? (
            <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> KRITIS! Ganti / charge segera
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
              Sistem Solar Panel Aktif
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
