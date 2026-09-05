import React, { useState } from 'react';
import { 
  Waves, 
  ShieldAlert, 
  BatteryWarning, 
  CloudRain, 
  Wind, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  RotateCcw, 
  Save, 
  ArrowLeft, 
  Radio, 
  Database, 
  Send, 
  BellRing,
  AlertTriangle,
  Sliders,
  Check,
  Info,
  ShieldCheck,
  Play
} from 'lucide-react';
import { SystemSettings, ThresholdConfig, RiverTelemetry, SystemStatus } from '../types';
import { DEFAULT_THRESHOLDS } from '../utils/safety';
import { alarmAudio } from '../utils/audioAlarm';

interface ConfigurationPageProps {
  settings: SystemSettings;
  latest: RiverTelemetry;
  status: SystemStatus;
  soundMuted: boolean;
  onToggleSound: () => void;
  isAlarmSounding: boolean;
  activeAlarmReason: string | null;
  onAcknowledgeAlarm: () => void;
  onSaveSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onTestTelegram: (botToken: string, chatId: string) => Promise<{ success: boolean; message?: string }>;
  onBackToDashboard: () => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
  settings,
  latest,
  status,
  soundMuted,
  onToggleSound,
  isAlarmSounding,
  activeAlarmReason,
  onAcknowledgeAlarm,
  onSaveSettings,
  onTestTelegram,
  onBackToDashboard,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({
    ...settings,
    thresholds: { ...DEFAULT_THRESHOLDS, ...settings.thresholds },
  });

  const [activeTab, setActiveTab] = useState<'water' | 'battery' | 'weather' | 'sound' | 'database' | 'mqtt'>('water');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({
    loading: false,
  });

  const handleThresholdChange = (key: keyof ThresholdConfig, value: number) => {
    setFormData((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: value,
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch {
      // handled
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Kembalikan semua ambang batas ke nilai standar rekomendasi keselamatan arung jeram?')) {
      setFormData((prev) => ({
        ...prev,
        thresholds: DEFAULT_THRESHOLDS,
        dbSaveIntervalMin: 5,
        connectionCheckIntervalSec: 15,
      }));
    }
  };

  const handleTestSendTelegram = async () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) return;
    setTestTelegramStatus({ loading: true });
    try {
      const res = await onTestTelegram(formData.telegramBotToken, formData.telegramChatId);
      setTestTelegramStatus({ loading: false, success: res.success, message: res.message });
    } catch (err) {
      setTestTelegramStatus({
        loading: false,
        success: false,
        message: err instanceof Error ? err.message : 'Gagal mengirim pesan uji coba',
      });
    }
  };

  const waterLevel = latest.river_level_m;
  const th = formData.thresholds;

  // Calculate percentage positions for visual threshold diagram (scale: 0m to max(4m, bahaya + 0.8))
  const maxScale = Math.max(4.0, (th.waterLevelBahaya || 3.2) + 0.8);
  const waspadaPct = Math.min(100, (th.waterLevelWaspada / maxScale) * 100);
  const siagaPct = Math.min(100, (th.waterLevelSiaga / maxScale) * 100);
  const bahayaPct = Math.min(100, (th.waterLevelBahaya / maxScale) * 100);
  const currentWaterPct = Math.min(100, (waterLevel / maxScale) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-dashboard"
              type="button"
              onClick={onBackToDashboard}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Konfigurasi Parameter & Ambang Batas
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                  Settings Page
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kalibrasi level Aman, Waspada, Siaga, Bahaya, alarm audio ACK, database 5 menit, & MQTT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <Check className="h-3.5 w-3.5" /> Konfigurasi Tersimpan!
              </span>
            )}
            <button
              id="btn-reset-defaults"
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Default</span>
            </button>
            <button
              id="btn-save-settings-page"
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'water'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Waves className="h-3.5 w-3.5" />
            <span>Air Sungai (Aman, Waspada, Siaga, Bahaya)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sound')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sound'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Alarm Audio & Fitur ACK (Silent)</span>
            {isAlarmSounding && (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('battery')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'battery'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BatteryWarning className="h-3.5 w-3.5" />
            <span>Baterai Sensor Hulu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weather')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'weather'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CloudRain className="h-3.5 w-3.5" />
            <span>Cuaca Ekstrem (Hujan & Angin)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Database (Simpan Tiap 5 Menit)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mqtt')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mqtt'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>MQTT EMQX & Telegram Bot</span>
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Active Alarm ACK Notification Banner if sound is alarming */}
        {isAlarmSounding && (
          <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">ALARM AUDIO SEDANG BERBUNYI!</h4>
                <p className="text-xs text-rose-100">
                  {activeAlarmReason || 'Terdeteksi kondisi bahaya/kritis pada sensor air atau baterai.'}
                </p>
              </div>
            </div>
            <button
              id="btn-ack-alarm-banner"
              type="button"
              onClick={onAcknowledgeAlarm}
              className="px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-extrabold shadow-md transition shrink-0 flex items-center gap-1.5"
            >
              <VolumeX className="h-4 w-4" />
              <span>Acknowledge (Diamkan Bunyi)</span>
            </button>
          </div>
        )}

        {/* SECTION 1: Ambang Batas Air Sungai */}
        {(activeTab === 'water' || activeTab === 'sound') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                  <Waves className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Ambang Batas Debit Air Sungai (Arung Jeram SafeGuard)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atur nilai batas ketinggian air untuk zona Aman, Waspada, Siaga, dan Bahaya Banjir.
                  </p>
                </div>
              </div>
              <div className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Level Air Live: <strong className="font-mono font-bold text-blue-600 dark:text-blue-400">{waterLevel.toFixed(2)} m</strong>
              </div>
            </div>

            {/* Visual Zone Spectrum Diagram */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Visualisasi Zona Keselamatan Ketinggian Air</span>
                <span className="text-[11px] text-slate-400 font-mono">Rentang Skala: 0.0 s/d {maxScale.toFixed(1)} m</span>
              </div>

              {/* Progress bar container */}
              <div className="relative h-10 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-700">
                {/* AMAN Zone */}
                <div 
                  style={{ width: `${waspadaPct}%` }} 
                  className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold tracking-tight px-1 transition-all"
                  title={`Zona Aman: 0 s/d ${th.waterLevelWaspada} m`}
                >
                  AMAN (0 - {th.waterLevelWaspada}m)
                </div>

                {/* WASPADA Zone */}
                <div 
                  style={{ width: `${Math.max(5, siagaPct - waspadaPct)}%` }} 
                  className="bg-amber-400 flex items-center justify-center text-amber-950 text-[10px] font-bold tracking-tight px-1 transition-all"
                  title={`Zona Waspada: ${th.waterLevelWaspada} s/d ${th.waterLevelSiaga} m`}
                >
                  WASPADA ({th.waterLevelWaspada}m+)
                </div>

                {/* SIAGA Zone */}
                <div 
                  style={{ width: `${Math.max(5, bahayaPct - siagaPct)}%` }} 
                  className="bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold tracking-tight px-1 transition-all"
                  title={`Zona Siaga: ${th.waterLevelSiaga} s/d ${th.waterLevelBahaya} m`}
                >
                  SIAGA ({th.waterLevelSiaga}m+)
                </div>

                {/* BAHAYA Zone */}
                <div 
                  style={{ width: `${Math.max(5, 100 - bahayaPct)}%` }} 
                  className="bg-rose-600 flex items-center justify-center text-white text-[10px] font-bold tracking-tight px-1 transition-all"
                  title={`Zona Bahaya: Di atas ${th.waterLevelBahaya} m`}
                >
                  BAHAYA ({th.waterLevelBahaya}m+)
                </div>

                {/* Current live river level marker indicator */}
                <div
                  style={{ left: `${currentWaterPct}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10 -ml-0.5 pointer-events-none"
                  title={`Posisi Saat Ini: ${waterLevel.toFixed(2)} m`}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 dark:bg-white rounded-full border-2 border-indigo-500 shadow-xs" />
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-mono px-1 rounded whitespace-nowrap shadow-xs">
                    Live: {waterLevel.toFixed(2)}m
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> AMAN: Trip Normal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> WASPADA: Pantau Ekstra</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> SIAGA: Anak/Pemula Stop</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> BAHAYA: Arung Jeram Dilarang</span>
              </div>
            </div>

            {/* 4 Cards for Setting Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 1. Status AMAN */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Status AMAN
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                    Zone Normal
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Ketinggian di bawah batas Waspada (&lt; {th.waterLevelWaspada} m). Kondisi ideal untuk semua peserta dan keluarga.
                </div>
                <div className="pt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Otomatis terdefinisi &lt; {th.waterLevelWaspada} m
                </div>
              </div>

              {/* 2. Status WASPADA */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Level WASPADA
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                    Siaga Pemandu
                  </span>
                </div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Batas Mulai Waspada (Meter):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-threshold-waspada"
                    type="number"
                    step="0.05"
                    min="1.0"
                    max={th.waterLevelSiaga - 0.1}
                    value={th.waterLevelWaspada}
                    onChange={(e) => handleThresholdChange('waterLevelWaspada', parseFloat(e.target.value) || 2.0)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs font-semibold text-slate-500">m</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Kenaikan debit air mulai terasa. Pemandu wajib standby dan life jacket harus terpasang rapi.
                </p>
              </div>

              {/* 3. Status SIAGA */}
              <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/40 dark:bg-orange-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-orange-600" />
                    Level SIAGA
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 font-bold">
                    Arus Deras
                  </span>
                </div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Batas Mulai Siaga (Meter):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-threshold-siaga"
                    type="number"
                    step="0.05"
                    min={th.waterLevelWaspada + 0.1}
                    max={th.waterLevelBahaya - 0.1}
                    value={th.waterLevelSiaga}
                    onChange={(e) => handleThresholdChange('waterLevelSiaga', parseFloat(e.target.value) || 2.5)}
                    className="w-full px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs font-semibold text-slate-500">m</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Arus deras dan hidraulik tinggi. Larang peserta anak/pemula, persiapkan tim rescue darurat.
                </p>
              </div>

              {/* 4. Status BAHAYA */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <BellRing className="h-4 w-4 text-rose-600" />
                    Level BAHAYA
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold">
                    Stop Total
                  </span>
                </div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Batas Bahaya / Banjir (Meter):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-threshold-bahaya"
                    type="number"
                    step="0.05"
                    min={th.waterLevelSiaga + 0.1}
                    max="6.0"
                    value={th.waterLevelBahaya}
                    onChange={(e) => handleThresholdChange('waterLevelBahaya', parseFloat(e.target.value) || 3.2)}
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs font-semibold text-slate-500">m</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Banjir bandang / luapan sungai. Semua trip arung jeram dihentikan total, segera evakuasi ke titik kumpul.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Audio Alarm & Fitur ACK (Silent) */}
        {(activeTab === 'sound' || activeTab === 'water') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-100 dark:border-purple-900">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Manajemen Alarm Audio & Fitur ACK (Acknowledge Anti-Bising)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem hening otomatis: saat tombol ACK diklik, sirine berhenti dan tetap hening selama status kondisi tidak berubah.
                  </p>
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    !soundMuted
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                      : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {!soundMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>{!soundMuted ? 'Sirine Audio Aktif' : 'Sirine Dibisukan (Muted)'}</span>
                </button>
              </div>
            </div>

            {/* ACK Status Box & Interactive Control */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Mekanisme Acknowledge (ACK) Bunyi
                  </span>
                  {isAlarmSounding ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 animate-pulse">
                      Sedang Berbunyi
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Silent / Ter-Acknowledge
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {activeAlarmReason ? (
                    <span>Status terdeteksi saat ini: <strong className="text-slate-900 dark:text-white">{activeAlarmReason}</strong>.</span>
                  ) : (
                    <span>Semua parameter saat ini dalam batas aman.</span>
                  )}{' '}
                  Jika Anda menekan tombol <strong>Acknowledge</strong>, alarm audio akan <strong>langsung hening</strong> dan <strong>tidak akan berbunyi lagi</strong> selama tidak ada status/kondisi bahaya baru yang terjadi.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-ack-silence-config"
                  type="button"
                  onClick={onAcknowledgeAlarm}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <VolumeX className="h-4 w-4" />
                  <span>Acknowledge & Heningkan Bunyi (ACK)</span>
                </button>
              </div>
            </div>

            {/* Test Audio Synthesizer Buttons */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Uji Coba Bunyi Audio Alarm Synthesizer:
              </span>
              <div className="flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => alarmAudio.playSiren('critical')}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Tes Sirine Bahaya (Critical Pulse)</span>
                </button>

                <button
                  type="button"
                  onClick={() => alarmAudio.playSiren('warning')}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Tes Chime Waspada (Warning)</span>
                </button>

                <button
                  type="button"
                  onClick={() => alarmAudio.playAckChime()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Tes Nada Konfirmasi ACK (Silent Confirmed)</span>
                </button>

                <button
                  type="button"
                  onClick={() => alarmAudio.stop()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-200 transition flex items-center gap-1.5"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Hentikan Bunyi (Stop)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Ambang Batas Baterai Sensor */}
        {(activeTab === 'battery' || activeTab === 'water') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
                <BatteryWarning className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ambang Batas Daya Baterai Sensor Hulu (Remote Telemetry)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Peringatan dini sebelum transmisi telemetry MQTT stasiun hulu terputus akibat kehabisan daya baterai solar panel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Batas Baterai Menipis / LOW (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="15"
                    max="50"
                    value={th.batteryLowPercent || 25}
                    onChange={(e) => handleThresholdChange('batteryLowPercent', parseInt(e.target.value, 10) || 25)}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">% kapasitas daya</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Status peringatan kuning untuk memeriksa sistem pengisian solar panel sensor sebelum baterai habis.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <label className="block text-xs font-bold text-rose-800 dark:text-rose-300">
                  Batas Baterai Kritis / CRITICAL (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="20"
                    value={th.batteryCritPercent || 15}
                    onChange={(e) => handleThresholdChange('batteryCritPercent', parseInt(e.target.value, 10) || 15)}
                    className="w-32 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">% daya minimum</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Memicu peringatan darurat ke Telegram dan sirine audio karena sensor terancam mati (blackout).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Cuaca Ekstrem */}
        {(activeTab === 'weather' || activeTab === 'water') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border border-sky-100 dark:border-sky-900">
                <CloudRain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ambang Batas Cuaca Ekstrem (Curah Hujan & Kecepatan Angin)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hujan lebat di daerah hulu sungai adalah pemicu utama banjir bandang kiriman beberapa jam kemudian.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Curah Hujan 1 Jam (mm)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={th.rainExtreme1H || 20}
                    onChange={(e) => handleThresholdChange('rainExtreme1H', parseFloat(e.target.value) || 20)}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">mm/jam</span>
                </div>
                <p className="text-[11px] text-slate-500">Batas intensitas hujan lebat jangka pendek di hulu.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Curah Hujan Akumulasi 24 Jam (mm)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="20"
                    max="200"
                    value={th.rainExtreme24H || 50}
                    onChange={(e) => handleThresholdChange('rainExtreme24H', parseFloat(e.target.value) || 50)}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">mm/24h</span>
                </div>
                <p className="text-[11px] text-slate-500">Akumulasi tanah jenuh berpotensi longsor & banjir bandang.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kecepatan Angin Maksimal (km/jam)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="18"
                    max="108"
                    step="0.5"
                    value={((th.windExtremeMs || 10) * 3.6).toFixed(1)}
                    onChange={(e) => handleThresholdChange('windExtremeMs', (parseFloat(e.target.value) || 36) / 3.6)}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">km/jam</span>
                </div>
                <p className="text-[11px] text-slate-500">Batas angin kencang berbahaya bagi pohon tumbang di bibir sungai.</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Interval Database MongoDB Atlas */}
        {(activeTab === 'database' || activeTab === 'water') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Penyimpanan Database & Riwayat Telemetri
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Konfigurasi penyimpanan snapshot database tiap 5 menit untuk efisiensi penyimpanan & kuota.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Interval Simpan Snapshot ke Database</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold">
                      Tiap {formData.dbSaveIntervalMin || 5} Menit
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Sesuai instruksi: Data disimpan ke database setiap <strong>5 menit</strong>, tetapi <strong>tampilan grafik dan dashboard tetap live dinamis</strong> setiap ada paket data baru masuk dari MQTT.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={formData.dbSaveIntervalMin || 5}
                  onChange={(e) => setFormData({ ...formData, dbSaveIntervalMin: parseInt(e.target.value, 10) || 5 })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 w-16 text-right">
                  {formData.dbSaveIntervalMin || 5} Menit
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Preset Cepat:</span>
                {[1, 5, 10, 15, 30].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setFormData({ ...formData, dbSaveIntervalMin: min })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      (formData.dbSaveIntervalMin || 5) === min
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {min} Menit
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                MongoDB Connection URI (Atlas Cluster)
              </label>
              <input
                type="text"
                placeholder="mongodb+srv://username:password@cluster.mongodb.net/river_flood_monitoring?retryWrites=true&w=majority"
                value={formData.mongoUri}
                onChange={(e) => setFormData({ ...formData, mongoUri: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Status saat ini: {status.mongoConnected ? `Terhubung (${status.mongoDatabaseName})` : 'Memory cache buffer aktif'}.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 6: MQTT Broker EMQX & Telegram Bot */}
        {(activeTab === 'mqtt' || activeTab === 'water') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Koneksi MQTT Broker EMQX & Notifikasi Telegram Bot
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transmisi telemetri sensor hulu & peringatan dini bencana via Telegram Bot dengan deduplikasi anti-spam.
                </p>
              </div>
            </div>

            {/* MQTT Configurations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Server MQTT Broker
                </label>
                <input
                  type="text"
                  value={formData.mqttBrokerUrl}
                  onChange={(e) => setFormData({ ...formData, mqttBrokerUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">Default EMQX: broker.emqx.io:1883</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topik MQTT Sensor
                </label>
                <input
                  type="text"
                  value={formData.mqttTopic}
                  onChange={(e) => setFormData({ ...formData, mqttTopic: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">Topik: digitaltwin/lokasi1/data</span>
              </div>
            </div>

            {/* Connection Check Range 10-30s */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Interval Pengecekan Koneksi MQTT (10 s/d 30 Detik)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  Tiap {formData.connectionCheckIntervalSec || 15} Detik
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                value={formData.connectionCheckIntervalSec || 15}
                onChange={(e) => setFormData({ ...formData, connectionCheckIntervalSec: parseInt(e.target.value, 10) || 15 })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Telegram Bot Details */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Integrasi Notifikasi Telegram Bot
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.telegramEnabled}
                    onChange={(e) => setFormData({ ...formData, telegramEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Aktifkan Notifikasi Telegram</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstu"
                    value={formData.telegramBotToken}
                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chat ID / Group ID Penerima
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: -100123456789 atau ID Akun"
                    value={formData.telegramChatId}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Anti-Spam Explanation Card */}
              <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                    Fitur Anti-Spam Telegram Aktif
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sistem tidak akan mengirim data/status berulang ke grup Telegram jika status peringatan tidak berubah. Pesan Telegram baru hanya dikirimkan jika terjadi perubahan status kondisi sungai atau sensor.
                  </p>
                </div>
              </div>

              {/* Test Telegram button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestSendTelegram}
                  disabled={testTelegramStatus.loading || !formData.telegramBotToken || !formData.telegramChatId}
                  className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{testTelegramStatus.loading ? 'Mengirim Uji Coba...' : 'Uji Kirim Pesan ke Telegram'}</span>
                </button>

                {testTelegramStatus.message && (
                  <div className={`text-xs flex items-center gap-1 font-medium ${testTelegramStatus.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {testTelegramStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <span>{testTelegramStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Save Action */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Dashboard Utama</span>
          </button>

          <button
            id="btn-save-settings-bottom"
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Semua Konfigurasi'}</span>
          </button>
        </div>

      </main>
    </div>
  );
};
