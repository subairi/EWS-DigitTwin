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
  Download,
} from 'lucide-react';
import { RiverTelemetry, ThresholdConfig } from '../types';

interface AnalyticsChartsProps {
  history: RiverTelemetry[];
  thresholds: ThresholdConfig;
  activeTimeRange: string;
  onChangeTimeRange: (range: string) => void;
  onExportCsv?: (range: '1h' | '6h' | '24h' | '7d' | '30d') => void;
  isExporting?: boolean;
  dataSource?: 'mongodb' | 'memory';
  mongoConnected?: boolean;
}

const MONTH_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatChartAxisLabel(timestamp?: string, receivedAt?: string, isDailyRange = false): string {
  const raw = (timestamp || receivedAt || '').trim();
  if (!raw) return '-';

  const spaceSplit = raw.split(' ');
  if (isDailyRange) {
    if (spaceSplit[0] && /^\d{4}-\d{2}-\d{2}$/.test(spaceSplit[0])) {
      const [, mm, dd] = spaceSplit[0].split('-');
      const monthIdx = parseInt(mm, 10) - 1;
      return `${dd} ${MONTH_SHORT_ID[monthIdx] || mm}`;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const month = MONTH_SHORT_ID[parsed.getMonth()];
      return `${dd} ${month}`;
    }
    return raw.substring(0, 10);
  }

  if (spaceSplit[1] && spaceSplit[1].length >= 5) {
    return spaceSplit[1].substring(0, 5);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  }
  return raw;
}

const TIME_RANGE_OPTIONS: Array<{ value: '1h' | '6h' | '24h' | '7d' | '30d'; label: string; title: string }> = [
  { value: '1h', label: '1H', title: '1 Jam Terakhir' },
  { value: '6h', label: '6H', title: '6 Jam Terakhir' },
  { value: '24h', label: '24H', title: '24 Jam Terakhir' },
  { value: '7d', label: '7D', title: '7 Hari Terakhir (Sumbu Tanggal)' },
  { value: '30d', label: '30D', title: '30 Hari Terakhir (Sumbu Tanggal)' },
];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  history,
  thresholds,
  activeTimeRange,
  onChangeTimeRange,
  onExportCsv,
  isExporting = false,
  dataSource = 'memory',
  mongoConnected = false,
}) => {
  const [activeTab, setActiveTab] = useState<'water' | 'rain' | 'wind' | 'battery'>('water');
  const isDailyAxis = activeTimeRange === '7d' || activeTimeRange === '30d';

  // Format chart data timestamps (switches automatically from HH:mm to DD MMM on 7D & 30D)
  const chartData = history.map((item) => ({
    time: formatChartAxisLabel(item.timestamp, item.received_at, isDailyAxis),
    fullTime: item.timestamp || item.received_at || '-',
    river_level: item.river_level_m,
    rain_1h: item.rain_mm_1H,
    rain_24h: item.rain_mm_24H,
    wind_speed: Number((item.wind_ms * 3.6).toFixed(1)),
    temperature: item.temperature_c,
    humidity: item.humidity_percent,
    battery_pct: item.battery_percent,
    battery_volt: item.battery_voltage_v,
  }));

  const formatTooltipLabel = (
    label: unknown,
    payload?: ReadonlyArray<{ payload?: { fullTime?: string } }>,
  ) => {
    const full = payload?.[0]?.payload?.fullTime;
    return `Waktu: ${full || String(label ?? '-')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-xs">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Analitik Tren Lingkungan Hulu
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualisasi time-series real-time · Sumbu waktu: {isDailyAxis ? 'Tanggal (Harian)' : 'Jam (HH:mm)'}
            </p>
          </div>
        </div>

        {/* Filters, Time Range, and CSV Export Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          {/* Chart Metric Selectors */}
          <div className="flex items-center overflow-x-auto max-w-full rounded-xl bg-slate-100/90 dark:bg-slate-800/90 p-1 text-xs font-semibold gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('water')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'water'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Waves className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Level Air</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rain')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'rain'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
              <span>Curah Hujan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wind')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'wind'
                  ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wind className="h-3.5 w-3.5 text-teal-500" />
              <span>Angin &amp; Iklim</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('battery')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'battery'
                  ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BatteryCharging className="h-3.5 w-3.5 text-amber-500" />
              <span>Baterai</span>
            </button>
          </div>

          {/* Time Range Filter Buttons + CSV Export */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 p-0.5 text-xs font-medium overflow-x-auto max-w-full">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  onClick={() => onChangeTimeRange(opt.value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTimeRange === opt.value
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {onExportCsv && (
              <button
                id="btn-chart-export-csv"
                type="button"
                onClick={() => onExportCsv((activeTimeRange as '1h' | '6h' | '24h' | '7d' | '30d') || '24h')}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold shadow-xs transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                title={`Ekspor data grafik (${activeTimeRange.toUpperCase()}) ke format CSV`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isExporting ? 'Mengunduh...' : 'Ekspor CSV'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-64 sm:h-72 w-full pt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Menunggu data telemetry terkumpul...
          </div>
        ) : activeTab === 'water' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="waterLevelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, (dataMax: number) => Math.max(4.0, +(dataMax + 0.5).toFixed(1))]}
                unit="m"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                width={46}
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
                labelFormatter={formatTooltipLabel}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />

              {/* Safety Threshold Reference Lines */}
              <ReferenceLine
                y={thresholds.waterLevelBahaya}
                label={{ value: `BAHAYA (${thresholds.waterLevelBahaya}m)`, fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }}
                stroke="#e11d48"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <ReferenceLine
                y={thresholds.waterLevelSiaga}
                label={{ value: `SIAGA (${thresholds.waterLevelSiaga}m)`, fill: '#d97706', fontSize: 10, position: 'insideTopRight' }}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={thresholds.waterLevelWaspada}
                label={{ value: `WASPADA (${thresholds.waterLevelWaspada}m)`, fill: '#ca8a04', fontSize: 10, position: 'insideTopRight' }}
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
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis unit="mm" tick={{ fontSize: 11 }} stroke="#94a3b8" width={48} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
                labelFormatter={formatTooltipLabel}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                y={thresholds.rainExtreme1H}
                label={{ value: `Ambang 1J (${thresholds.rainExtreme1H}mm)`, fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }}
                stroke="#e11d48"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={thresholds.rainExtreme24H}
                label={{ value: `Ambang 24J (${thresholds.rainExtreme24H}mm)`, fill: '#d97706', fontSize: 10, position: 'insideTopRight' }}
                stroke="#d97706"
                strokeDasharray="4 4"
              />
              <Bar dataKey="rain_1h" name="Curah Hujan 1 Jam (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rain_24h" name="Curah Hujan 24 Jam (mm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : activeTab === 'wind' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="wind" unit=" km/j" tick={{ fontSize: 11 }} stroke="#0d9488" width={54} />
              <YAxis yAxisId="temp" orientation="right" unit="°C" tick={{ fontSize: 11 }} stroke="#f97316" width={42} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
                labelFormatter={formatTooltipLabel}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                yAxisId="wind"
                y={thresholds.windExtremeMs * 3.6}
                label={{ value: `Angin Kencang (${(thresholds.windExtremeMs * 3.6).toFixed(1)} km/jam)`, fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }}
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
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} stroke="#94a3b8" width={46} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                }}
                labelFormatter={formatTooltipLabel}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                y={thresholds.batteryCritPercent}
                label={{ value: `Kritis (${thresholds.batteryCritPercent}%)`, fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }}
                stroke="#e11d48"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={thresholds.batteryLowPercent}
                label={{ value: `Low (${thresholds.batteryLowPercent}%)`, fill: '#d97706', fontSize: 10, position: 'insideTopRight' }}
                stroke="#d97706"
                strokeDasharray="3 3"
              />
              <Area type="monotone" dataKey="battery_pct" name="Daya Baterai (%)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#batteryGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer for the graph */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
          <span>
            Total titik rekaman ({activeTimeRange.toUpperCase()}): <strong className="text-slate-800 dark:text-slate-200">{chartData.length} data</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span>
            Sumber:{' '}
            <strong className={dataSource === 'mongodb' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {dataSource === 'mongodb'
                ? 'MongoDB Atlas'
                : mongoConnected
                  ? 'Memori RAM (Belum ada snapshot DB di rentang ini)'
                  : 'Memori RAM (MongoDB belum terhubung)'}
            </strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
          <span>Tingkat Kritis Baterai: <strong>{thresholds.batteryCritPercent}%</strong></span>
          <span>Batas Bahaya Air: <strong>{thresholds.waterLevelBahaya} m</strong></span>
        </div>
      </div>
    </div>
  );
};

