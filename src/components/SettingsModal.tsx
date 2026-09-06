import React, { useEffect, useState } from 'react';
import { 
  X, 
  Send, 
  Database, 
  Radio, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  BellRing,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSaveSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onTestTelegram: (botToken: string, chatId: string) => Promise<{ success: boolean; message?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestTelegram,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        thresholds: { ...settings.thresholds },
      });
    }
    // Intentionally depend only on isOpen: while the modal is open,
    // background settings/status updates must not overwrite operator input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestTelegram = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await onTestTelegram(formData.telegramBotToken, formData.telegramChatId);
      setTestStatus({ loading: false, success: res.success, message: res.message || 'Pesan tes terkirim!' });
    } catch (err) {
      setTestStatus({ loading: false, success: false, message: (err as Error).message });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert(`Gagal menyimpan: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Pengaturan Sistem & Integrasi EWS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasi Telegram Bot, MongoDB Atlas, Broker MQTT, & Ambang Batas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Telegram Bot Alert */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-500" />
                Integrasi Notifikasi Telegram Bot
              </h3>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.telegramEnabled}
                  onChange={(e) => setFormData({ ...formData, telegramEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Aktifkan Peringatan Otomatis</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstu"
                  value={formData.telegramBotToken}
                  onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Dapatkan dari @BotFather di Telegram</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chat ID / Group ID Penerima
                </label>
                <input
                  type="text"
                  placeholder="Contoh: -100123456789 atau ID Akun"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Dapatkan ID via bot @userinfobot</span>
              </div>
            </div>

            {/* Test Telegram button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testStatus.loading || !formData.telegramBotToken || !formData.telegramChatId}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testStatus.loading ? 'Menguji...' : 'Uji Kirim Pesan ke Telegram'}</span>
              </button>

              {testStatus.message && (
                <div className={`text-xs flex items-center gap-1 font-medium ${testStatus.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {testStatus.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>

            {/* Deduplication Anti-Spam Explanation */}
            <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Deduplikasi Pesan Telegram Otomatis (Anti-Spam)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jika notifikasi status (air sungai, baterai, hujan, atau angin) sudah pernah dikirimkan dan statusnya tidak berubah, sistem <strong>tidak akan mengirimkan pesan berulang</strong> ke Telegram. Pesan Telegram baru hanya dikirimkan saat terjadi <strong>perubahan/transisi status</strong> (misal: naik ke SIAGA/BAHAYA, atau kembali normal ke AMAN).
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: MongoDB Atlas */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              Database MongoDB Atlas (Riwayat Jangka Panjang)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MongoDB Connection URI (Atlas Cluster)
              </label>
              <input
                type="text"
                placeholder="mongodb+srv://username:password@cluster.mongodb.net/river_flood_monitoring?retryWrites=true&w=majority"
                value={formData.mongoUri}
                onChange={(e) => setFormData({ ...formData, mongoUri: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Jika dibiarkan kosong, data telemetri tetap tersimpan di memory buffer aplikasi. Ketika URI dihubungkan, sistem akan otomatis menyinkronkan seluruh riwayat telemetri.
              </p>
            </div>

            {/* Interval Penyimpanan Database (Default 5 Menit) */}
            <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Interval Simpan ke Database
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                      Tiap {formData.dbSaveIntervalMin || 5} Menit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Data disimpan ke database setiap <strong className="text-emerald-600 dark:text-emerald-400">{formData.dbSaveIntervalMin || 5} menit</strong> untuk efisiensi penyimpanan & kuota. <strong>Tampilan UI & grafik tetap live & dinamis real-time</strong> setiap kali ada paket data masuk dari MQTT.
                  </p>
                </div>
              </div>

              {/* Slider & Quick Presets */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={formData.dbSaveIntervalMin || 5}
                  onChange={(e) => setFormData({
                    ...formData,
                    dbSaveIntervalMin: parseInt(e.target.value, 10),
                  })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                {[1, 5, 10, 15, 30].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setFormData({ ...formData, dbSaveIntervalMin: min })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      (formData.dbSaveIntervalMin || 5) === min
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {min} menit
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: MQTT Broker EMQX */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Radio className="h-4 w-4 text-indigo-500" />
              Broker MQTT, Topik Sensor & Cek Koneksi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Server MQTT Broker
                </label>
                <input
                  type="text"
                  value={formData.mqttBrokerUrl}
                  onChange={(e) => setFormData({ ...formData, mqttBrokerUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Sesuai request: broker.emqx.io port 1883</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topik MQTT Telemetri
                </label>
                <input
                  type="text"
                  value={formData.mqttTopic}
                  onChange={(e) => setFormData({ ...formData, mqttTopic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-semibold"
                />
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 block font-medium">Topik default: digitaltwin/lokasi1/data</span>
              </div>
            </div>

            {/* Connection Check Interval (10 s/d 30 detik) */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Interval Cek Koneksi MQTT (10 s/d 30 Detik)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Frekuensi pemeriksaan heartbeat, keepalive broker EMQX, dan pemulihan koneksi otomatis.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/80 shrink-0">
                  Tiap {formData.connectionCheckIntervalSec || 15} Detik
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="1"
                  value={formData.connectionCheckIntervalSec || 15}
                  onChange={(e) => setFormData({
                    ...formData,
                    connectionCheckIntervalSec: parseInt(e.target.value, 10),
                  })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Quick Preset Buttons (10s, 15s, 20s, 30s) */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                {[10, 15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setFormData({ ...formData, connectionCheckIntervalSec: sec })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      formData.connectionCheckIntervalSec === sec
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {sec} detik
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Ambang Batas Peringatan (Thresholds) */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-500" />
              Ambang Batas Pemicu Peringatan (Safety Thresholds)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Baterai Kritis (%)</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={formData.thresholds.batteryCritPercent}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, batteryCritPercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Air Waspada (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.thresholds.waterLevelWaspada}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, waterLevelWaspada: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Air Siaga (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.thresholds.waterLevelSiaga}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, waterLevelSiaga: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Air Bahaya (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.thresholds.waterLevelBahaya}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, waterLevelBahaya: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Hujan Ekstrem 1J (mm)</label>
                <input
                  type="number"
                  value={formData.thresholds.rainExtreme1H}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, rainExtreme1H: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Angin Kencang (km/jam)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={(formData.thresholds.windExtremeMs * 3.6).toFixed(1)}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, windExtremeMs: Number(e.target.value) / 3.6 }
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Pengaturan berhasil disimpan!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
