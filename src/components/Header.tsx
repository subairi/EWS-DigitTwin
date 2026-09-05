import React from 'react';
import { 
  Waves, 
  Wifi, 
  Database, 
  Send, 
  Volume2, 
  VolumeX, 
  Bell, 
  Download, 
  Sliders, 
  Radio, 
  Clock, 
  ShieldAlert,
  Laptop,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import { SystemStatus, RiverTelemetry } from '../types';

interface HeaderProps {
  status: SystemStatus;
  latest: RiverTelemetry;
  soundMuted: boolean;
  onToggleSound: () => void;
  pushEnabled: boolean;
  onRequestPush: () => void;
  onOpenSettings: () => void;
  onOpenSimulator: () => void;
  onExportCsv: () => void;
  isExporting: boolean;
  currentPage?: 'dashboard' | 'configuration';
  onNavigate?: (page: 'dashboard' | 'configuration') => void;
  isAlarmSounding?: boolean;
  activeAlarmReason?: string | null;
  activeAlarmSignature?: string | null;
  onAcknowledgeAlarm?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  latest,
  soundMuted,
  onToggleSound,
  pushEnabled,
  onRequestPush,
  onOpenSettings,
  onOpenSimulator,
  onExportCsv,
  isExporting,
  currentPage = 'dashboard',
  onNavigate,
  isAlarmSounding = false,
  activeAlarmReason,
  activeAlarmSignature,
  onAcknowledgeAlarm,
}) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs dark:bg-slate-900/95 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo and Brand Title & Page Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => onNavigate?.('dashboard')}
                className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-600/25 shrink-0 cursor-pointer"
              >
                <Waves className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 
                    onClick={() => onNavigate?.('dashboard')}
                    className="text-base sm:text-lg font-bold text-slate-900 tracking-tight dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    RIVERFLOW MONITOR & EWS
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                    SafeGuard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>Sensor: <strong className="font-semibold text-slate-700 dark:text-slate-300">{latest.device}</strong> ({latest.location})</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {latest.timestamp}
                  </span>
                </p>
              </div>
            </div>

            {/* Top Page Navigation Tabs */}
            {onNavigate && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button
                  id="nav-tab-dashboard"
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    currentPage === 'dashboard'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard Live</span>
                </button>

                <button
                  id="nav-tab-config"
                  type="button"
                  onClick={() => onNavigate('configuration')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    currentPage === 'configuration'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Konfigurasi Parameter</span>
                </button>
              </div>
            )}
          </div>

          {/* System Status Indicators & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* ACK Alarm Button (If currently sounding) */}
            {isAlarmSounding && onAcknowledgeAlarm && (
              <button
                id="btn-header-ack-alarm"
                type="button"
                onClick={onAcknowledgeAlarm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-extrabold shadow-md shadow-rose-500/25 animate-pulse"
                title="Klik untuk heningkan sirine (ACK). Sistem akan tetap hening selama status tidak berubah."
              >
                <VolumeX className="h-4 w-4" />
                <span>🔕 ACK Bunyi (Silent)</span>
              </button>
            )}

            {/* If alarm active but acknowledged (silent) */}
            {!isAlarmSounding && activeAlarmSignature && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold"
                title={`Kondisi ${activeAlarmReason || 'peringatan'} telah di-ACK. Sirine hening sampai status berubah.`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ter-ACK (Hening)</span>
              </div>
            )}

            {/* MQTT Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                status.mqttConnected 
                  ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80' 
                  : 'bg-amber-50/90 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80'
              }`}
              title={`Broker: ${status.mqttBroker} | Topik: ${status.mqttTopic} | Cek Koneksi: Tiap ${status.connectionCheckIntervalSec || 15}s (10-30 detik)`}
            >
              <Radio className={`h-3.5 w-3.5 ${status.mqttConnected ? 'animate-pulse text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
              <span>MQTT: {status.mqttConnected ? `EMQX (${status.connectionCheckIntervalSec || 15}s)` : 'Reconnecting'}</span>
            </div>

            {/* MongoDB Atlas Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                status.mongoConnected 
                  ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80' 
                  : 'bg-slate-100/70 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/80'
              }`}
              title={status.mongoConnected ? `Terhubung ke MongoDB Atlas cluster | Snapshot database: Tiap ${status.dbSaveIntervalMin || 5} menit` : `Penyimpanan database diatur tiap ${status.dbSaveIntervalMin || 5} menit (Mode Memory Cache / Siap Sambung Atlas)`}
            >
              <Database className={`h-3.5 w-3.5 ${status.mongoConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>DB: {status.mongoConnected ? `Atlas (${status.dbSaveIntervalMin || 5}m)` : `Tiap ${status.dbSaveIntervalMin || 5}m`}</span>
            </div>

            {/* Telegram Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                status.telegramConfigured 
                  ? 'bg-sky-50/90 text-sky-700 border-sky-200/90 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/80' 
                  : 'bg-slate-100/70 text-slate-500 border-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700/80'
              }`}
              title={status.telegramConfigured ? 'Bot Telegram siap kirim peringatan dini (Anti-spam aktif)' : 'Telegram Bot belum dikonfigurasi'}
            >
              <Send className={`h-3.5 w-3.5 ${status.telegramConfigured ? 'text-sky-500' : 'text-slate-400'}`} />
              <span>Telegram: {status.telegramConfigured ? 'EWS Siap' : 'Off'}</span>
            </div>

            {/* Audio Siren Toggle */}
            <button
              id="btn-toggle-sound"
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
                !soundMuted 
                  ? 'bg-indigo-50 border-indigo-200/90 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/80 dark:text-indigo-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
              title={!soundMuted ? 'Sirine Audio Aktif' : 'Sirine Audio Dibisukan (Muted)'}
            >
              {!soundMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Push Notification Request */}
            <button
              id="btn-request-push"
              type="button"
              onClick={onRequestPush}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
                pushEnabled 
                  ? 'bg-sky-50 border-sky-200/90 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800/80 dark:text-sky-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
              title={pushEnabled ? 'Push Notification Browser Aktif' : 'Aktifkan Push Notifikasi'}
            >
              <Bell className="h-4 w-4" />
            </button>

            {/* Test Hardware Simulator */}
            <button
              id="btn-open-simulator"
              type="button"
              onClick={onOpenSimulator}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Kirim atau simulasikan payload telemetry MQTT hulu"
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Simulator</span>
            </button>

            {/* CSV Export Button */}
            <button
              id="btn-export-csv"
              type="button"
              onClick={onExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold shadow-xs transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50"
              title="Download riwayat data sensor format CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? '...' : 'CSV'}</span>
            </button>

            {/* Settings Page Quick Link Button */}
            <button
              id="btn-open-settings"
              type="button"
              onClick={() => onNavigate ? onNavigate('configuration') : onOpenSettings()}
              className={`p-2 rounded-lg border transition-colors ${
                currentPage === 'configuration'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/80'
              }`}
              title="Buka Halaman Konfigurasi Parameter & Ambang Batas"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
