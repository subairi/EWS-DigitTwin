import React, { useState } from 'react';
import { X, Send, Radio, Sparkles, AlertTriangle, BatteryWarning, Check } from 'lucide-react';
import { RiverTelemetry } from '../types';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishPacket: (packet: Partial<RiverTelemetry>) => Promise<void>;
  currentTelemetry: RiverTelemetry;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onPublishPacket,
  currentTelemetry,
}) => {
  const [formData, setFormData] = useState<Partial<RiverTelemetry>>({
    device: currentTelemetry.device || 'AWS-B49793895DC0',
    location: currentTelemetry.location || 'lokasi1',
    fw_version: '2.0.0',
    connection: 'wifi',
    river_level_m: currentTelemetry.river_level_m || 2.78,
    rain_mm_1H: currentTelemetry.rain_mm_1H || 0,
    rain_mm_24H: currentTelemetry.rain_mm_24H || 0,
    wind_ms: currentTelemetry.wind_ms || 4.6,
    temperature_c: currentTelemetry.temperature_c || 21.1,
    humidity_percent: currentTelemetry.humidity_percent || 75.8,
    battery_percent: currentTelemetry.battery_percent || 14,
    battery_voltage_v: currentTelemetry.battery_voltage_v || 12.16969,
    battery_status: currentTelemetry.battery_status || 'CRITICAL',
    wifi_rssi: currentTelemetry.wifi_rssi || -4,
    gsm_signal: currentTelemetry.gsm_signal || 0,
  });

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const setScenario = (type: 'default' | 'normal' | 'waspada' | 'siaga' | 'bahaya' | 'crit_battery') => {
    switch (type) {
      case 'default':
        setFormData({
          device: 'AWS-B49793895DC0',
          location: 'lokasi1',
          fw_version: '2.0.0',
          connection: 'wifi',
          river_level_m: 2.78,
          rain_mm_1H: 0,
          rain_mm_24H: 0,
          wind_ms: 4.6,
          temperature_c: 21.1,
          humidity_percent: 75.8,
          battery_percent: 14,
          battery_voltage_v: 12.16969,
          battery_status: 'CRITICAL',
          wifi_rssi: -4,
          gsm_signal: 0,
        });
        break;
      case 'normal':
        setFormData((prev) => ({
          ...prev,
          river_level_m: 1.55,
          rain_mm_1H: 0,
          rain_mm_24H: 2.4,
          wind_ms: 3.2,
          temperature_c: 24.5,
          humidity_percent: 68.0,
          battery_percent: 88,
          battery_voltage_v: 12.8,
          battery_status: 'NORMAL',
        }));
        break;
      case 'waspada':
        setFormData((prev) => ({
          ...prev,
          river_level_m: 2.25,
          rain_mm_1H: 12.5,
          rain_mm_24H: 22.0,
          wind_ms: 7.8,
          temperature_c: 21.0,
          humidity_percent: 82.0,
          battery_percent: 65,
          battery_voltage_v: 12.5,
          battery_status: 'NORMAL',
        }));
        break;
      case 'siaga':
        setFormData((prev) => ({
          ...prev,
          river_level_m: 2.85,
          rain_mm_1H: 26.0,
          rain_mm_24H: 45.0,
          wind_ms: 11.2,
          temperature_c: 19.5,
          humidity_percent: 92.0,
          battery_percent: 45,
          battery_voltage_v: 12.3,
          battery_status: 'NORMAL',
        }));
        break;
      case 'bahaya':
        setFormData((prev) => ({
          ...prev,
          river_level_m: 3.55,
          rain_mm_1H: 48.0,
          rain_mm_24H: 95.0,
          wind_ms: 16.5,
          temperature_c: 18.0,
          humidity_percent: 96.0,
          battery_percent: 32,
          battery_voltage_v: 12.2,
          battery_status: 'NORMAL',
        }));
        break;
      case 'crit_battery':
        setFormData((prev) => ({
          ...prev,
          river_level_m: 2.78,
          battery_percent: 10,
          battery_voltage_v: 11.75,
          battery_status: 'CRITICAL',
        }));
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendSuccess(false);

    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await onPublishPacket({
        ...formData,
        timestamp: now,
        uptime_ms: (currentTelemetry.uptime_ms || 881024505) + 10000,
        send_interval_sec: 10,
      });

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 2000);
    } catch (err) {
      alert(`Gagal mengirim paket: ${(err as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Simulator Telemetri Sensor Hulu (EMQX MQTT)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uji coba pengiriman paket real-time dan evaluasi sistem peringatan dini
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Scenario Preset Chips */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
              Skenario Siap Pakai (1-Klik Preset)
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setScenario('default')}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold transition flex items-center gap-1.5 shadow-2xs dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
              >
                <BatteryWarning className="h-3.5 w-3.5 text-rose-600" />
                Data Default Prompt (Kritis)
              </button>

              <button
                type="button"
                onClick={() => setScenario('normal')}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition shadow-2xs dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300"
              >
                Aman / Rekreasi Normal (1.55m)
              </button>

              <button
                type="button"
                onClick={() => setScenario('waspada')}
                className="px-3 py-1.5 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition shadow-2xs dark:bg-yellow-950/40 dark:border-yellow-900 dark:text-yellow-300"
              >
                Waspada Air Naik (2.25m)
              </button>

              <button
                type="button"
                onClick={() => setScenario('siaga')}
                className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition shadow-2xs dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300"
              >
                Siaga Hujan Lebat (2.85m)
              </button>

              <button
                type="button"
                onClick={() => setScenario('bahaya')}
                className="px-3 py-1.5 rounded-xl border border-rose-400 bg-rose-600 text-white hover:bg-rose-700 font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Bahaya Banjir Bandang (3.55m)
              </button>
            </div>
          </div>

          {/* Sliders and Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* River Level Slider */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Ketinggian Air Sungai:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {Number(formData.river_level_m).toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.05"
                value={formData.river_level_m}
                onChange={(e) => setFormData({ ...formData, river_level_m: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Battery Percent Slider */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Baterai Sensor:</span>
                <span className={`font-mono font-bold text-sm ${Number(formData.battery_percent) <= 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formData.battery_percent}% ({Number(formData.battery_voltage_v).toFixed(2)}V)
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={formData.battery_percent}
                onChange={(e) => {
                  const pct = parseInt(e.target.value, 10);
                  const volt = +(11.6 + (pct / 100) * 1.4).toFixed(4);
                  setFormData({
                    ...formData,
                    battery_percent: pct,
                    battery_voltage_v: volt,
                    battery_status: pct <= 15 ? 'CRITICAL' : pct <= 25 ? 'LOW' : 'NORMAL',
                  });
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Rain 1H Slider */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Curah Hujan 1 Jam:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                  {formData.rain_mm_1H} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={formData.rain_mm_1H}
                onChange={(e) => setFormData({ ...formData, rain_mm_1H: parseFloat(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Wind Speed Slider */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Kecepatan Angin:</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {((formData.wind_ms || 0) * 3.6).toFixed(1)} km/jam
                </span>
              </div>
              <input
                type="range"
                min="1.8"
                max="90"
                step="0.5"
                value={(formData.wind_ms || 0) * 3.6}
                onChange={(e) => setFormData({ ...formData, wind_ms: parseFloat(e.target.value) / 3.6 })}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <p className="mt-1 text-[10px] text-slate-400">Payload MQTT tetap memakai wind_ms (m/s); tampilan memakai km/jam.</p>
            </div>
          </div>

          {/* JSON Payload Preview */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Pratinjau JSON Payload (Broker EMQX port 1883):</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                Topik: digitaltwin/{formData.location || 'lokasi1'}/data
              </span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-36">
              {JSON.stringify({
                device: formData.device,
                location: formData.location,
                fw_version: formData.fw_version,
                connection: formData.connection,
                timestamp: '2026-09-05 19:50:56 (Live Timestamp)',
                send_interval_sec: 10,
                uptime_ms: 881024505,
                rain_mm_1H: formData.rain_mm_1H,
                rain_mm_24H: formData.rain_mm_24H,
                wind_ms: formData.wind_ms,
                temperature_c: formData.temperature_c,
                humidity_percent: formData.humidity_percent,
                river_level_m: formData.river_level_m,
                battery_voltage_v: formData.battery_voltage_v,
                battery_percent: formData.battery_percent,
                battery_status: formData.battery_status,
                wifi_rssi: formData.wifi_rssi,
                gsm_signal: formData.gsm_signal,
              }, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <div>
              {sendSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="h-4 w-4" /> Paket berhasil dikirim ke broker EMQX & dashboard!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? 'Mengirim...' : 'Kirim Paket Sensor Sekarang'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
