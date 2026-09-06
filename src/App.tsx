import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  RaftingSafetyBanner 
} from './components/RaftingSafetyBanner';
import { 
  RiverWaterGauge 
} from './components/RiverWaterGauge';
import { 
  MetricCards 
} from './components/MetricCards';
import { 
  AnalyticsCharts 
} from './components/AnalyticsCharts';
import { 
  AlertsPanel 
} from './components/AlertsPanel';
import { 
  DataTable 
} from './components/DataTable';
import { 
  SettingsModal 
} from './components/SettingsModal';
import { 
  SimulatorModal 
} from './components/SimulatorModal';
import { 
  ConfigurationPage 
} from './components/ConfigurationPage';
import { 
  RiverTelemetry, 
  AlertEvent, 
  SystemStatus, 
  SystemSettings, 
  ThresholdConfig 
} from './types';
import { DEFAULT_THRESHOLDS } from './utils/safety';
import { alarmAudio } from './utils/audioAlarm';
import { requestNotificationPermission, sendLocalPushNotification } from './utils/notification';
import { BellRing, VolumeX, CheckCircle2, Sliders, ArrowRight } from 'lucide-react';

const initialFallbackTelemetry: RiverTelemetry = {
  device: 'AWS-B49793895DC0',
  location: 'lokasi1',
  fw_version: '2.0.0',
  connection: 'wifi',
  timestamp: '2026-09-05 19:50:56',
  send_interval_sec: 10,
  uptime_ms: 881024505,
  rain_mm_1H: 0,
  rain_mm_24H: 0,
  wind_ms: 4.6,
  temperature_c: 21.1,
  humidity_percent: 75.8,
  river_level_m: 1.85,
  battery_voltage_v: 12.8,
  battery_percent: 88,
  battery_status: 'NORMAL',
  wifi_rssi: -4,
  gsm_signal: 0,
};

const defaultSettings: SystemSettings = {
  mqttBrokerUrl: 'mqtt://broker.emqx.io:1883',
  mqttTopic: 'digitaltwin/lokasi1/data',
  connectionCheckIntervalSec: 15,
  dbSaveIntervalMin: 5,
  telegramBotToken: '',
  telegramChatId: '',
  telegramEnabled: false,
  soundAlertEnabled: true,
  pushAlertEnabled: true,
  mongoUri: '',
  thresholds: DEFAULT_THRESHOLDS,
};


const telemetryIdentity = (item: RiverTelemetry) =>
  `${item.device}|${item.location}|${item.timestamp}|${Number(item.uptime_ms ?? -1)}`;

const dedupeTelemetryHistory = (items: RiverTelemetry[]) => {
  const seen = new Set<string>();
  const unique: RiverTelemetry[] = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const key = telemetryIdentity(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.reverse();
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'configuration'>('dashboard');
  const [latest, setLatest] = useState<RiverTelemetry>(initialFallbackTelemetry);
  const [previousLevel, setPreviousLevel] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<RiverTelemetry[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [status, setStatus] = useState<SystemStatus>({
    mqttConnected: false,
    mqttBroker: 'mqtt://broker.emqx.io:1883',
    mqttTopic: 'digitaltwin/lokasi1/data',
    deviceOnline: false,
    deviceStatusTopic: 'digitaltwin/lokasi1/status',
    connectionCheckIntervalSec: 15,
    lastConnectionCheckTime: new Date().toISOString(),
    connectionHealth: 'optimal',
    dbSaveIntervalMin: 5,
    lastDbSaveTime: undefined,
    totalDbSnapshotsSaved: 0,
    mongoConnected: false,
    telegramConfigured: false,
    lastPacketTime: '2026-09-05 19:50:56',
    totalPacketsReceived: 1,
    activeClientsCount: 1,
    uptimeSeconds: 0,
  });

  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState('24h');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('ews-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply manual theme to the whole application and remember the user's choice.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    window.localStorage.setItem('ews-theme', theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Alarm state & ACK management
  const [acknowledgedAlarmSignature, setAcknowledgedAlarmSignature] = useState<string | null>(null);
  const [activeAlarmSignature, setActiveAlarmSignature] = useState<string | null>(null);
  const [activeAlarmReason, setActiveAlarmReason] = useState<string | null>(null);
  const [isAlarmSounding, setIsAlarmSounding] = useState<boolean>(false);

  // Modals & loading states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Acknowledge Alarm Handler
  const handleAcknowledgeAlarm = useCallback(() => {
    alarmAudio.stop();
    alarmAudio.playAckChime();
    if (activeAlarmSignature) {
      setAcknowledgedAlarmSignature(activeAlarmSignature);
    }
    setIsAlarmSounding(false);
  }, [activeAlarmSignature]);

  // Handle incoming telemetry
  const handleIncomingTelemetry = useCallback((telemetry: RiverTelemetry) => {
    setLatest((prev) => {
      setPreviousLevel(prev.river_level_m);
      return telemetry;
    });

    // Dynamic real-time UI update: every incoming MQTT packet adds to the live visualization
    setHistory((prev) => {
      const incomingKey = telemetryIdentity(telemetry);
      const exists = prev.some((item) => telemetryIdentity(item) === incomingKey);
      if (exists) return prev;
      return [...prev, telemetry].slice(-300);
    });

    // Do not evaluate alarms with fallback defaults before persisted settings finish loading.
    if (!settingsLoaded) return;

    const th = settings.thresholds || DEFAULT_THRESHOLDS;
    const isWaterDanger = telemetry.river_level_m >= th.waterLevelBahaya;
    const isWaterSiaga = telemetry.river_level_m >= th.waterLevelSiaga;
    const isWaterWaspada = telemetry.river_level_m >= th.waterLevelWaspada;
    const isBatteryCritical = telemetry.battery_percent <= th.batteryCritPercent;
    const isBatteryLow = telemetry.battery_percent <= th.batteryLowPercent;
    const isRainExtreme = telemetry.rain_mm_1H >= th.rainExtreme1H || telemetry.rain_mm_24H >= th.rainExtreme24H;
    const isWindExtreme = telemetry.wind_ms >= th.windExtremeMs;

    let conditionSig: string | null = null;
    let reason = '';
    let severity: 'critical' | 'warning' | null = null;

    if (isWaterDanger) {
      conditionSig = `WATER_BAHAYA`;
      reason = `Level Air BAHAYA (${telemetry.river_level_m.toFixed(2)} m ≥ ${th.waterLevelBahaya} m)`;
      severity = 'critical';
    } else if (isBatteryCritical) {
      conditionSig = `BATTERY_CRITICAL`;
      reason = `Baterai Kritis (${telemetry.battery_percent}% ≤ ${th.batteryCritPercent}%)`;
      severity = 'critical';
    } else if (isWaterSiaga) {
      conditionSig = `WATER_SIAGA`;
      reason = `Level Air SIAGA (${telemetry.river_level_m.toFixed(2)} m ≥ ${th.waterLevelSiaga} m)`;
      severity = 'warning';
    } else if (isRainExtreme) {
      conditionSig = `RAIN_EXTREME`;
      reason = `Curah Hujan Melampaui Ambang (1J ${telemetry.rain_mm_1H}/${th.rainExtreme1H} mm; 24J ${telemetry.rain_mm_24H}/${th.rainExtreme24H} mm)`;
      severity = 'warning';
    } else if (isWindExtreme) {
      conditionSig = `WIND_EXTREME`;
      reason = `Kecepatan Angin Melampaui Ambang (${(telemetry.wind_ms * 3.6).toFixed(1)} ≥ ${(th.windExtremeMs * 3.6).toFixed(1)} km/jam)`;
      severity = 'warning';
    } else if (isBatteryLow) {
      conditionSig = `BATTERY_LOW`;
      reason = `Baterai Menipis (${telemetry.battery_percent}% ≤ ${th.batteryLowPercent}%)`;
      severity = 'warning';
    } else if (isWaterWaspada) {
      conditionSig = `WATER_WASPADA`;
      reason = `Level Air WASPADA (${telemetry.river_level_m.toFixed(2)} m ≥ ${th.waterLevelWaspada} m)`;
      severity = 'warning';
    }

    if (conditionSig === null) {
      // Safe / Normal condition: stop any ringing and clear active alarm
      setActiveAlarmSignature(null);
      setActiveAlarmReason(null);
      setIsAlarmSounding(false);
      alarmAudio.stop();
    } else {
      setActiveAlarmSignature(conditionSig);
      setActiveAlarmReason(reason);

      // Check if this condition is ALREADY acknowledged by operator
      if (conditionSig === acknowledgedAlarmSignature) {
        // ALREADY ACKNOWLEDGED: Silent! Do not play siren.
        setIsAlarmSounding(false);
      } else {
        // NEW or UNACKNOWLEDGED status! Play siren if sound is enabled
        if (!soundMuted && settings.soundAlertEnabled) {
          setIsAlarmSounding(true);
          alarmAudio.playSiren(severity || 'warning');
        }
      }
    }
  }, [settings.thresholds, settings.soundAlertEnabled, settingsLoaded, soundMuted, acknowledgedAlarmSignature]);

  // Handle incoming alert
  const handleIncomingAlert = useCallback((alert: AlertEvent) => {
    setAlerts((prev) => [alert, ...prev.slice(0, 50)]);

    // Trigger local push notification if granted
    if (pushEnabled) {
      sendLocalPushNotification(alert.title, {
        body: alert.message,
        tag: alert.type,
      });
    }

    const alertSig = `ALERT_${alert.type}_${alert.severity}`;
    setActiveAlarmSignature(alertSig);
    setActiveAlarmReason(alert.title);

    if (alertSig === acknowledgedAlarmSignature) {
      setIsAlarmSounding(false);
    } else {
      if (!soundMuted && settings.soundAlertEnabled) {
        setIsAlarmSounding(true);
        alarmAudio.playSiren(alert.severity === 'critical' ? 'critical' : 'warning');
      }
    }
  }, [pushEnabled, soundMuted, settings.soundAlertEnabled, acknowledgedAlarmSignature]);

  // Connect WebSocket to backend server
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    function connectWs() {
      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          // Browser -> backend WebSocket success is different from backend -> MQTT broker status.
          fetch('/api/status')
            .then((r) => r.json())
            .then((s) => setStatus(s))
            .catch(() => {});
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'init') {
              const payload = data.payload;
              if (payload.latest) setLatest(payload.latest);
              if (payload.history) setHistory(dedupeTelemetryHistory(payload.history));
              if (payload.alerts) setAlerts(payload.alerts);
              if (payload.status) setStatus(payload.status);
              // The backend only starts after MongoDB settings are loaded. Use that
              // snapshot on the first connection to avoid a brief fallback-default alert,
              // but never overwrite settings after the operator has started editing.
              if (!settingsLoaded && payload.settings) {
                setSettings((prev) => ({
                  ...prev,
                  ...payload.settings,
                  thresholds: { ...prev.thresholds, ...payload.settings.thresholds },
                }));
                setSettingsLoaded(true);
              }
            } else if (data.type === 'telemetry:update') {
              handleIncomingTelemetry(data.payload);
            } else if (data.type === 'alert:new') {
              handleIncomingAlert(data.payload);
            } else if (data.type === 'mqtt:status') {
              setStatus((prev) => ({ 
                ...prev, 
                mqttConnected: data.payload.connected,
                mqttTopic: data.payload.topic || prev.mqttTopic,
                mqttBroker: data.payload.broker || prev.mqttBroker,
                connectionCheckIntervalSec: data.payload.connectionCheckIntervalSec ?? prev.connectionCheckIntervalSec,
                lastConnectionCheckTime: data.payload.lastConnectionCheckTime || prev.lastConnectionCheckTime,
                connectionHealth: data.payload.connectionHealth || prev.connectionHealth,
                telegramDeduplicationActive: data.payload.telegramDeduplicationActive ?? prev.telegramDeduplicationActive,
                totalTelegramDispatched: data.payload.totalTelegramDispatched ?? prev.totalTelegramDispatched,
                totalDuplicateAlertsSuppressed: data.payload.totalDuplicateAlertsSuppressed ?? prev.totalDuplicateAlertsSuppressed,
                lastSentTelegramWaterStatus: data.payload.lastSentTelegramWaterStatus || prev.lastSentTelegramWaterStatus,
              }));
            } else if (data.type === 'device:status') {
              setStatus((prev) => ({
                ...prev,
                deviceOnline: data.payload.deviceOnline ?? false,
                deviceId: data.payload.deviceId ?? prev.deviceId,
                deviceLocation: data.payload.deviceLocation ?? prev.deviceLocation,
                deviceConnection: data.payload.deviceConnection ?? prev.deviceConnection,
                deviceLastSeen: data.payload.deviceLastSeen ?? prev.deviceLastSeen,
                deviceStatusFreshnessSec: data.payload.deviceStatusFreshnessSec,
                deviceHeartbeatIntervalSec: data.payload.deviceHeartbeatIntervalSec ?? prev.deviceHeartbeatIntervalSec,
                deviceStatusTimeoutSec: data.payload.deviceStatusTimeoutSec ?? prev.deviceStatusTimeoutSec,
                deviceStatusTopic: data.payload.deviceStatusTopic ?? prev.deviceStatusTopic,
                deviceStatusMessage: data.payload.deviceStatusMessage ?? prev.deviceStatusMessage,
              }));
            } else if (data.type === 'settings:update') {
              const cfg = data.payload;
              if (cfg) {
                setSettings((prev) => ({
                  ...prev,
                  ...cfg,
                  thresholds: { ...prev.thresholds, ...cfg.thresholds },
                }));
                setSettingsLoaded(true);
              }
            } else if (data.type === 'mongo:status') {
              setStatus((prev) => ({ ...prev, mongoConnected: data.payload.connected, mongoDatabaseName: data.payload.dbName }));
            } else if (data.type === 'db:status' || data.type === 'db:snapshot') {
              setStatus((prev) => ({
                ...prev,
                lastDbSaveTime: data.payload.lastDbSaveTime || prev.lastDbSaveTime,
                totalDbSnapshotsSaved: data.payload.totalDbSnapshotsSaved ?? prev.totalDbSnapshotsSaved,
                dbSaveIntervalMin: data.payload.dbSaveIntervalMin ?? prev.dbSaveIntervalMin,
              }));
            }
          } catch {
            // ignore malformed ws payload
          }
        };

        ws.onclose = () => {
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    // Initial Fetch fallback
    fetch(`/api/telemetry/history?timeRange=${activeTimeRange}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const unique = dedupeTelemetryHistory(data);
          setHistory(unique);
          setLatest(unique[unique.length - 1]);
        }
      })
      .catch(() => {});

    fetch('/api/status')
      .then((r) => r.json())
      .then((s) => setStatus(s))
      .catch(() => {});

    fetch('/api/alerts')
      .then((r) => r.json())
      .then((a) => {
        if (Array.isArray(a)) setAlerts(a);
      })
      .catch(() => {});

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [activeTimeRange, handleIncomingTelemetry, handleIncomingAlert]);

  // Load persisted configuration exactly once per browser page load.
  // Keeping this separate from the WebSocket lifecycle avoids resetting the
  // configuration form whenever the socket reconnects.
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error('Gagal memuat konfigurasi');
        return r.json();
      })
      .then((cfg) => {
        if (cfg) {
          setSettings((prev) => ({
            ...prev,
            ...cfg,
            thresholds: { ...prev.thresholds, ...cfg.thresholds },
          }));
          setSettingsLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('[Settings] Gagal memuat konfigurasi:', err);
        setSettingsLoaded(true);
      });
  }, []);

  // Push notification permission toggle
  const handleRequestPush = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      sendLocalPushNotification('Sistem Monitoring Sungai', {
        body: 'Notifikasi push berhasil diaktifkan untuk peringatan dini bencana.',
      });
    } else {
      setPushEnabled(false);
      alert('Izin notifikasi tidak diberikan di browser.');
    }
  };

  // Sound mute toggle
  const handleToggleSound = () => {
    const newMuted = !soundMuted;
    setSoundMuted(newMuted);
    alarmAudio.setMuted(newMuted);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    setIsExporting(true);
    const link = document.createElement('a');
    link.href = '/api/telemetry/export-csv';
    link.setAttribute('download', `river_telemetry_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 1200);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<SystemSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan pengaturan');
    }

    const savedSettings = data.settings || newSettings;
    setSettingsLoaded(true);
    setAcknowledgedAlarmSignature(null);
    setActiveAlarmSignature(null);
    setActiveAlarmReason(null);
    setIsAlarmSounding(false);
    alarmAudio.stop();
    setSettings((prev) => ({
      ...prev,
      ...savedSettings,
      thresholds: { ...prev.thresholds, ...savedSettings.thresholds },
    }));
    // refresh status
    fetch('/api/status').then((r) => r.json()).then(setStatus).catch(() => {});
  };

  // Test Telegram Bot
  const handleTestTelegram = async (botToken: string, chatId: string) => {
    const res = await fetch('/api/alerts/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || 'Gagal mengirim pesan Telegram' };
    }
    return { success: true, message: data.message };
  };

  // Broadcast manual Telegram Siaga
  const handleBroadcastTelegram = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setIsSettingsOpen(true);
      return;
    }

    setIsSendingTelegram(true);
    try {
      await fetch('/api/alerts/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      alert('Pemberitahuan siaga berhasil dikirimkan ke Telegram!');
    } catch (err) {
      alert(`Gagal mengirim ke Telegram: ${(err as Error).message}`);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  // Publish packet via simulator
  const handlePublishPacket = async (packet: Partial<RiverTelemetry>) => {
    const res = await fetch('/api/telemetry/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Gagal menerbitkan paket telemetri');
    }
  };

  // Change chart time range
  const handleChangeTimeRange = (range: string) => {
    setActiveTimeRange(range);
    fetch(`/api/telemetry/history?timeRange=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(dedupeTelemetryHistory(data));
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        status={status}
        latest={latest}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        pushEnabled={pushEnabled}
        onRequestPush={handleRequestPush}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        isAlarmSounding={isAlarmSounding}
        activeAlarmReason={activeAlarmReason}
        activeAlarmSignature={activeAlarmSignature}
        onAcknowledgeAlarm={handleAcknowledgeAlarm}
      />

      {/* Conditional Page Rendering */}
      {currentPage === 'configuration' ? (
        <ConfigurationPage
          settings={settings}
          latest={latest}
          status={status}
          soundMuted={soundMuted}
          onToggleSound={handleToggleSound}
          isAlarmSounding={isAlarmSounding}
          activeAlarmReason={activeAlarmReason}
          onAcknowledgeAlarm={handleAcknowledgeAlarm}
          onSaveSettings={handleSaveSettings}
          onTestTelegram={handleTestTelegram}
          onBackToDashboard={() => setCurrentPage('dashboard')}
        />
      ) : (
        /* Main Content Area: Dashboard */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Active Alarm Sound & ACK Banner */}
          {isAlarmSounding && (
            <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/25 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse border border-rose-500">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm uppercase tracking-wide">Peringatan Alarm EWS Aktif!</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-rose-700">Sirine Berbunyi</span>
                  </div>
                  <p className="text-xs text-rose-100 mt-0.5">
                    {activeAlarmReason || 'Terdeteksi kondisi di luar ambang batas aman.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-ack-silence-dashboard"
                  type="button"
                  onClick={handleAcknowledgeAlarm}
                  className="px-4 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  title="Hentikan bunyi sirine (ACK). Sistem akan hening selama kondisi tidak berubah."
                >
                  <VolumeX className="h-4 w-4" />
                  <span>Acknowledge & Heningkan (ACK)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('configuration')}
                  className="px-3 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Konfigurasi</span>
                </button>
              </div>
            </div>
          )}

          {/* Alarm Acknowledged (Silent) Notification Banner */}
          {!isAlarmSounding && activeAlarmSignature && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Alarm Ter-Acknowledge (Hening): </span>
                  <span>{activeAlarmReason} telah dikonfirmasi operator. Sirine tetap diam (silent) dan hanya akan berbunyi jika status kondisi berubah.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('configuration')}
                className="text-xs text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Ubah Ambang Batas</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* 1. Rafting Water Safety Banner */}
          <RaftingSafetyBanner
            telemetry={latest}
            thresholds={settings.thresholds}
          />

          {/* 2. Key Metrics & Gauges Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual River Level Gauge (1 Col) */}
            <div className="lg:col-span-1">
              <RiverWaterGauge
                currentLevel={latest.river_level_m}
                thresholds={settings.thresholds}
                previousLevel={previousLevel}
              />
            </div>

            {/* Environmental Microclimate & Battery Cards (2 Cols) */}
            <div className="lg:col-span-2">
              <MetricCards telemetry={latest} thresholds={settings.thresholds} />
            </div>
          </div>

          {/* 3. Analytics Charts & Alerts EWS Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Trends Graph (2 Cols) */}
            <div className="lg:col-span-2">
              <AnalyticsCharts
                history={history}
                thresholds={settings.thresholds}
                activeTimeRange={activeTimeRange}
                onChangeTimeRange={handleChangeTimeRange}
              />
            </div>

            {/* Real-Time EWS & Notifications Log (1 Col) */}
            <div className="lg:col-span-1">
              <AlertsPanel
                alerts={alerts}
                telegramConfigured={Boolean(settings.telegramBotToken && settings.telegramChatId)}
                onSendManualTelegram={handleBroadcastTelegram}
                isSendingTelegram={isSendingTelegram}
                suppressedDuplicatesCount={status.totalDuplicateAlertsSuppressed}
                totalTelegramDispatched={status.totalTelegramDispatched}
              />
            </div>
          </div>

          {/* 4. Full Historical Data Table with CSV Export */}
          <DataTable
            history={history}
            onExportCsv={handleExportCsv}
            isExporting={isExporting}
            thresholds={settings.thresholds}
          />
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-4.5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Sistem Mitigasi Banjir & Keselamatan Wisata Arung Jeram • <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tampilan UI Real-time Dinamis</span> (tiap paket MQTT) • Database: <span className="font-semibold text-slate-700 dark:text-slate-300">Snapshot Tiap {status.dbSaveIntervalMin || 5} Menit</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Topik: <code className="font-mono text-indigo-600 dark:text-indigo-400">{status.mqttTopic}</code></span>
            <span>•</span>
            <span>MongoDB Atlas</span>
            <span>•</span>
            <span>Telegram EWS</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestTelegram={handleTestTelegram}
      />

      {/* Hardware / Sensor Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onPublishPacket={handlePublishPacket}
        currentTelemetry={latest}
        thresholds={settings.thresholds}
      />
    </div>
  );
}
