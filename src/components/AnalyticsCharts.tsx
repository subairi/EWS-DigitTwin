import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  TrendingUp, 
  Waves, 
  CloudRain, 
  Wind, 
  BatteryCharging, 
  Calendar,
  Maximize2
} from 'lucide-react';
import { RiverTelemetry, ThresholdConfig } from '../types';

interface AnalyticsChartsProps {
  history: RiverTelemetry[];
  thresholds: ThresholdConfig;
  activeTimeRange: string;
  onChangeTimeRange: (range: string) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  history,
  thresholds,
  activeTimeRange,
  onChangeTimeRange,
}) => {
  const [activeTab, setActiveTab] = useState<'water' | 'rain' | 'wind' | 'battery'>('water');

  // Format chart data timestamps
  const chartData = history.map((item) => {
    const timeParts = item.timestamp ? item.timestamp.split(' ') : ['', ''];
    const timeShort = timeParts[1] ? timeParts[1].substring(0, 5) : item.timestamp;
    return {
      time: timeShort,
      fullTime: item.timestamp,
      river_level: item.river_level_m,
      rain_1h: item.rain_mm_1H,
      rain_24h: item.rain_mm_24H,
      wind_speed: Number((item.wind_ms * 3.6).toFixed(1)),
      temperature: item.temperature_c,
      humidity: item.humidity_percent,
      battery_pct: item.battery_percent,
      battery_volt: item.battery_voltage_v,
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Dashboard Analitik Tren Lingkungan Hulu
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visualisasi time-series real-time untuk analisis kenaikan debit air dan mitigasi bahaya
          </p>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chart Metric Selectors */}
          <div className="flex items-center rounded-xl bg-slate-100/90 dark:bg-slate-800/90 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('water')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'water'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Waves className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Level Air</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'rain'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
              <span>Curah Hujan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wind')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'wind'
                  ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Wind className="h-3.5 w-3.5 text-teal-500" />
              <span>Angin & Iklim</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('battery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'battery'
                  ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <BatteryCharging className="h-3.5 w-3.5 text-amber-500" />
              <span>Baterai</span>
            </button>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 p-0.5 text-xs font-medium">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onChangeTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTimeRange === range
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-72 w-full pt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Menunggu data telemetry terkumpul...
          </div>
        ) : activeTab === 'water' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="waterLevelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis 
                domain={[0, (dataMax: number) => Math.max(4.0, +(dataMax + 0.5).toFixed(1))]} 
                unit="m" 
                tick={{ fontSize: 11 }} 
                stroke="#94a3b8" 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(value: unknown) => {
                  const valNum = Number(value);
                  return [`${valNum.toFixed(2)} meter`, 'Tinggi Air Sungai'];
                }}
                labelFormatter={(label) => `Waktu: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />

              {/* Safety Threshold Reference Lines */}
              <ReferenceLine
                y={thresholds.waterLevelBahaya}
                label={{ value: 'BAHAYA (3.2m)', fill: '#e11d48', fontSize: 10, position: 'right' }}
                stroke="#e11d48"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <ReferenceLine
                y={thresholds.waterLevelSiaga}
                label={{ value: 'SIAGA (2.5m)', fill: '#d97706', fontSize: 10, position: 'right' }}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={thresholds.waterLevelWaspada}
                label={{ value: 'WASPADA (2.0m)', fill: '#ca8a04', fontSize: 10, position: 'right' }}
                stroke="#ca8a04"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />

              <Area
                type="monotone"
                dataKey="river_level"
                name="Tinggi Air Sungai (m)"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#waterLevelGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : activeTab === 'rain' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis unit="mm" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <Bar dataKey="rain_1h" name="Curah Hujan 1 Jam (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rain_24h" name="Curah Hujan 24 Jam (mm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : activeTab === 'wind' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis yAxisId="wind" unit=" km/j" tick={{ fontSize: 11 }} stroke="#0d9488" />
              <YAxis yAxisId="temp" orientation="right" unit="°C" tick={{ fontSize: 11 }} stroke="#f97316" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                yAxisId="wind"
                y={thresholds.windExtremeMs * 3.6}
                label={{ value: `Angin Kencang (${(thresholds.windExtremeMs * 3.6).toFixed(1)} km/jam)`, fill: '#e11d48', fontSize: 10 }}
                stroke="#e11d48"
                strokeDasharray="4 4"
              />
              <Line yAxisId="wind" type="monotone" dataKey="wind_speed" name="Kecepatan Angin (km/jam)" stroke="#0d9488" strokeWidth={2} dot={false} />
              <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Suhu Udara (°C)" stroke="#ea580c" strokeWidth={2} dot={false} />
              <Line yAxisId="wind" type="monotone" dataKey="humidity" name="Kelembaban (%)" stroke="#0284c7" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                y={thresholds.batteryCritPercent}
                label={{ value: `Kritis (${thresholds.batteryCritPercent}%)`, fill: '#e11d48', fontSize: 10 }}
                stroke="#e11d48"
                strokeDasharray="3 3"
              />
              <Area type="monotone" dataKey="battery_pct" name="Daya Baterai (%)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#batteryGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer for the graph */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          Total titik rekaman: <strong className="text-slate-800 dark:text-slate-200">{chartData.length} data</strong>
        </div>
        <div className="flex items-center gap-4">
          <span>Tingkat Kritis Baterai: <strong>{thresholds.batteryCritPercent}%</strong></span>
          <span>Batas Bahaya Air: <strong>{thresholds.waterLevelBahaya} m</strong></span>
        </div>
      </div>
    </div>
  );
};
