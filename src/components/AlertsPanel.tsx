import React from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  BatteryWarning, 
  Waves, 
  CloudRain, 
  Wind, 
  Send, 
  CheckCircle2, 
  Clock,
  ShieldAlert,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { AlertEvent } from '../types';

interface AlertsPanelProps {
  alerts: AlertEvent[];
  telegramConfigured: boolean;
  onSendManualTelegram: () => void;
  isSendingTelegram: boolean;
  suppressedDuplicatesCount?: number;
  totalTelegramDispatched?: number;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  telegramConfigured,
  onSendManualTelegram,
  isSendingTelegram,
  suppressedDuplicatesCount = 0,
  totalTelegramDispatched = 0,
}) => {
  const getAlertIcon = (type: AlertEvent['type'], severity: AlertEvent['severity']) => {
    if (type === 'battery') {
      return <BatteryWarning className={`h-4 w-4 ${severity === 'critical' ? 'text-rose-600 animate-pulse' : 'text-amber-500'}`} />;
    }
    if (type === 'water_level') {
      return <Waves className={`h-4 w-4 ${severity === 'critical' ? 'text-rose-600 animate-pulse' : 'text-amber-500'}`} />;
    }
    if (type === 'rain') {
      return <CloudRain className={`h-4 w-4 ${severity === 'critical' ? 'text-rose-600' : 'text-sky-500'}`} />;
    }
    if (type === 'wind') {
      return <Wind className={`h-4 w-4 ${severity === 'critical' ? 'text-rose-600' : 'text-teal-500'}`} />;
    }
    return <ShieldAlert className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Log Sistem Peringatan Dini (EWS)
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Notifikasi otomatis Telegram Bot & Push Mobile
            </span>
          </div>
        </div>

        {/* Manual Emergency Alert Button */}
        <button
          id="btn-broadcast-telegram"
          type="button"
          onClick={onSendManualTelegram}
          disabled={isSendingTelegram || !telegramConfigured}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
          title={telegramConfigured ? 'Kirim status peringatan terkini ke grup Telegram' : 'Konfigurasikan Telegram Bot terlebih dahulu di menu Pengaturan'}
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isSendingTelegram ? 'Mengirim...' : 'Kirim Siaga Telegram'}</span>
        </button>
      </div>

      {/* Alerts List */}
      <div className="mt-3.5 flex-1 overflow-y-auto max-h-80 space-y-2.5 pr-1">
        {alerts.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Semua parameter sensor dalam batas aman
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-1">
              Peringatan akan otomatis muncul dan dikirimkan ke Telegram jika level air, baterai, atau cuaca melewati ambang batas.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border text-xs transition ${
                  isCritical
                    ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900'
                    : 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700/60">
                      {getAlertIcon(alert.type, alert.severity)}
                    </div>
                    <div>
                      <h4 className={`font-bold ${isCritical ? 'text-rose-700 dark:text-rose-400' : 'text-amber-800 dark:text-amber-300'}`}>
                        {alert.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(alert.timestamp).toLocaleTimeString('id-ID')}
                        {alert.metricValue && (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            • Nilai: {alert.metricValue}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {alert.dispatchedTelegram && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200/80 dark:border-indigo-800" title="Notifikasi terkirim ke Telegram">
                        <Send className="h-2.5 w-2.5" /> Bot
                      </span>
                    )}
                    {alert.dispatchedPush && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200/80 dark:border-sky-800" title="Push notifikasi browser / mobile aktif">
                        <Smartphone className="h-2.5 w-2.5" /> Push
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {alert.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Info status & Deduplication Anti-Spam */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Anti-Spam Telegram Aktif</span>
          </div>
          <span className={telegramConfigured ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600'}>
            {telegramConfigured ? '● Telegram Bot Terhubung' : '○ Telegram Belum Aktif'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug flex items-center justify-between">
          <span>Hanya mengirim jika status/kondisi berubah</span>
          {suppressedDuplicatesCount > 0 && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200/60 dark:border-emerald-800">
              {suppressedDuplicatesCount} duplikasi dicegah
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
