import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  Download, 
  Search, 
  ArrowUpDown, 
  RefreshCw,
  Clock,
  BatteryCharging,
  Wifi
} from 'lucide-react';
import { RiverTelemetry, ThresholdConfig } from '../types';
import { formatUptime } from '../utils/safety';

interface DataTableProps {
  history: RiverTelemetry[];
  onExportCsv: () => void;
  isExporting: boolean;
  thresholds: ThresholdConfig;
}

export const DataTable: React.FC<DataTableProps> = ({
  history,
  onExportCsv,
  isExporting,
  thresholds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredHistory = history
    .filter((row) => {
      const matchSearch =
        row.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.battery_status.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.received_at || a.timestamp).getTime();
      const timeB = new Date(b.received_at || b.timestamp).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs">
      {/* Table Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <TableIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Log Riwayat Telemetri Sensor Hulu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disinkronkan ke MongoDB Atlas & format unduhan CSV untuk audit berkala
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari waktu / status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors shadow-xs"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortAsc ? 'Terlama' : 'Terbaru'}</span>
          </button>

          {/* CSV Download Button */}
          <button
            id="btn-download-csv-table"
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Mengunduh...' : 'Unduh CSV'}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="mt-3.5 overflow-x-auto max-h-96 rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 text-[11px]">
            <tr>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Waktu Sensor / Diterima</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Level Air (m)</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Hujan 1J / 24J</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Angin (km/jam)</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Suhu & Lembab</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Baterai</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Sinyal</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Uptime</th>
              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Tidak ada data yang cocok dengan pencarian
                </td>
              </tr>
            ) : (
              filteredHistory.map((row, idx) => {
                const rowBatteryStatus = row.battery_percent <= thresholds.batteryCritPercent
                  ? 'CRITICAL'
                  : row.battery_percent <= thresholds.batteryLowPercent
                  ? 'LOW'
                  : 'NORMAL';
                return (
                  <tr 
                    key={row._id || `${row.timestamp}_${idx}`}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                      idx === 0 && !sortAsc ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {idx === 0 && !sortAsc && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" title="Paket Terkini" />
                        )}
                        <div className="flex flex-col leading-tight">
                          <span>{row.timestamp}</span>
                          {row.received_at && (
                            <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500" title="Waktu diterima backend Render">
                              RX {new Date(row.received_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                fractionalSecondDigits: 3,
                                hour12: false,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-bold">
                      <span className={row.river_level_m >= thresholds.waterLevelBahaya ? 'text-rose-600 dark:text-rose-400' : row.river_level_m >= thresholds.waterLevelSiaga ? 'text-amber-600' : row.river_level_m >= thresholds.waterLevelWaspada ? 'text-yellow-600' : 'text-slate-900 dark:text-slate-100'}>
                        {row.river_level_m.toFixed(2)} m
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-medium">
                      {row.rain_mm_1H} / {row.rain_mm_24H} mm
                    </td>
                    <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                      {(row.wind_ms * 3.6).toFixed(1)} km/jam
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {row.temperature_c}°C / {row.humidity_percent}%
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${row.battery_percent <= thresholds.batteryCritPercent ? 'text-rose-600 font-bold' : row.battery_percent <= thresholds.batteryLowPercent ? 'text-amber-600 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                          {row.battery_percent}%
                        </span>
                        <span className="text-[10px] text-slate-400">({row.battery_voltage_v.toFixed(1)}V)</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-500">
                      WiFi: {row.wifi_rssi} dBm
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatUptime(row.uptime_ms)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span 
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          rowBatteryStatus === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900'
                            : rowBatteryStatus === 'LOW'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                        }`}
                      >
                        {rowBatteryStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>Menampilkan {filteredHistory.length} entri rekaman sensor</span>
        <span>Format CSV siap diimpor ke Excel, Google Sheets, atau GIS</span>
      </div>
    </div>
  );
};
