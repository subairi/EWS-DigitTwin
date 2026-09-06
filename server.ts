import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import mqtt, { MqttClient } from 'mqtt';
import { MongoClient, Db } from 'mongodb';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { RiverTelemetry, DeviceStatus, AlertEvent, ThresholdConfig, SystemSettings, SystemStatus } from './src/types';

dotenv.config();

const PORT = Number(process.env.PORT) || 10000;
const DEVICE_STATUS_TOPIC = (process.env.MQTT_STATUS_TOPIC || 'digitaltwin/lokasi1/status').trim();
const SETTINGS_COLLECTION = 'system_settings';
const SETTINGS_DOCUMENT_ID = 'global';
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Active in-memory state
let activeMqttClient: MqttClient | null = null;
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;
let latestDeviceStatus: DeviceStatus | null = null;
let lastDeviceStatusReceivedAt = 0;

// Settings with defaults
const defaultThresholds: ThresholdConfig = {
  batteryCritPercent: 15,
  batteryLowPercent: 25,
  waterLevelWaspada: 2.0,
  waterLevelSiaga: 2.5,
  waterLevelBahaya: 3.2,
  rainExtreme1H: 20,
  rainExtreme24H: 50,
  windExtremeMs: 10,
};

// Helper to ensure MQTT broker URL has valid protocol and port
function normalizeMqttUrl(rawUrl: string): string {
  let trimmed = (rawUrl || '').trim();
  if (!trimmed) return 'mqtt://broker.emqx.io:1883';

  // If protocol missing, add mqtt://
  if (!trimmed.includes('://')) {
    trimmed = `mqtt://${trimmed}`;
  }

  // Ensure port exists if standard mqtt/tcp protocol
  try {
    const url = new URL(trimmed);
    if (!url.port) {
      if (url.protocol === 'mqtt:' || url.protocol === 'tcp:') {
        url.port = '1883';
      } else if (url.protocol === 'ws:') {
        url.port = '8083';
      } else if (url.protocol === 'wss:') {
        url.port = '8084';
      }
      return url.toString().replace(/\/$/, '');
    }
    return trimmed;
  } catch {
    if (!trimmed.includes(':')) {
      return `${trimmed}:1883`;
    }
    return trimmed;
  }
}

let currentSettings: SystemSettings = {
  mqttBrokerUrl: normalizeMqttUrl(process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883'),
  mqttTopic: (process.env.MQTT_TOPIC || 'digitaltwin/lokasi1/data').trim(),
  connectionCheckIntervalSec: Math.max(10, Math.min(30, Number(process.env.MQTT_CHECK_INTERVAL_SEC) || 15)),
  dbSaveIntervalMin: Math.max(1, Math.min(60, Number(process.env.DB_SAVE_INTERVAL_MIN) || 5)),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  soundAlertEnabled: true,
  pushAlertEnabled: true,
  mongoUri: process.env.MONGODB_URI || '',
  thresholds: { ...defaultThresholds },
};

// Persist operational settings in MongoDB so browser refreshes / Render restarts
// do not reset thresholds to the hard-coded defaults. Secrets remain sourced from
// environment variables and are intentionally not written into system_settings.
function getPersistableSettings() {
  return {
    mqttBrokerUrl: currentSettings.mqttBrokerUrl,
    mqttTopic: currentSettings.mqttTopic,
    connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
    dbSaveIntervalMin: currentSettings.dbSaveIntervalMin,
    telegramChatId: currentSettings.telegramChatId,
    telegramEnabled: currentSettings.telegramEnabled,
    soundAlertEnabled: currentSettings.soundAlertEnabled,
    pushAlertEnabled: currentSettings.pushAlertEnabled,
    thresholds: { ...currentSettings.thresholds },
    updatedAt: new Date(),
  };
}

function getPublicSettings() {
  return {
    ...currentSettings,
    telegramBotToken: currentSettings.telegramBotToken
      ? '••••••••' + currentSettings.telegramBotToken.slice(-4)
      : '',
    mongoUri: currentSettings.mongoUri ? 'mongodb+srv://••••••••' : '',
    thresholds: { ...currentSettings.thresholds },
  };
}

async function persistSettingsToMongo(): Promise<boolean> {
  if (!mongoDb || !isMongoConnected) {
    console.warn('[Settings] MongoDB belum terhubung; konfigurasi hanya tersimpan sementara di RAM.');
    return false;
  }

  try {
    await mongoDb.collection(SETTINGS_COLLECTION).updateOne(
      { _id: SETTINGS_DOCUMENT_ID as any },
      {
        $set: getPersistableSettings(),
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    console.log('[Settings] Konfigurasi tersimpan permanen di MongoDB.');
    return true;
  } catch (err) {
    console.error('[Settings] Gagal menyimpan konfigurasi ke MongoDB:', (err as Error).message);
    return false;
  }
}

async function loadSettingsFromMongo(): Promise<boolean> {
  if (!mongoDb || !isMongoConnected) return false;

  try {
    const saved = await mongoDb.collection(SETTINGS_COLLECTION).findOne({
      _id: SETTINGS_DOCUMENT_ID as any,
    });

    if (!saved) {
      // First run: create one persistent document from current defaults/env settings.
      await persistSettingsToMongo();
      return false;
    }

    if (typeof saved.mqttBrokerUrl === 'string' && saved.mqttBrokerUrl) {
      currentSettings.mqttBrokerUrl = normalizeMqttUrl(saved.mqttBrokerUrl);
    }
    if (typeof saved.mqttTopic === 'string' && saved.mqttTopic.trim()) {
      currentSettings.mqttTopic = saved.mqttTopic.trim();
    }
    if (typeof saved.connectionCheckIntervalSec === 'number') {
      currentSettings.connectionCheckIntervalSec = Math.max(10, Math.min(30, saved.connectionCheckIntervalSec));
    }
    if (typeof saved.dbSaveIntervalMin === 'number') {
      currentSettings.dbSaveIntervalMin = Math.max(1, Math.min(60, saved.dbSaveIntervalMin));
    }
    if (typeof saved.telegramChatId === 'string') currentSettings.telegramChatId = saved.telegramChatId;
    if (typeof saved.telegramEnabled === 'boolean') currentSettings.telegramEnabled = saved.telegramEnabled;
    if (typeof saved.soundAlertEnabled === 'boolean') currentSettings.soundAlertEnabled = saved.soundAlertEnabled;
    if (typeof saved.pushAlertEnabled === 'boolean') currentSettings.pushAlertEnabled = saved.pushAlertEnabled;
    if (saved.thresholds && typeof saved.thresholds === 'object') {
      currentSettings.thresholds = {
        ...defaultThresholds,
        ...currentSettings.thresholds,
        ...saved.thresholds,
      };
    }

    // Keep the initial/in-memory battery label aligned with the persisted thresholds too.
    if (latestTelemetry) {
      latestTelemetry.battery_status = latestTelemetry.battery_percent <= currentSettings.thresholds.batteryCritPercent
        ? 'CRITICAL'
        : latestTelemetry.battery_percent <= currentSettings.thresholds.batteryLowPercent
        ? 'LOW'
        : 'NORMAL';
    }

    console.log('[Settings] Konfigurasi berhasil dimuat dari MongoDB.');
    return true;
  } catch (err) {
    console.error('[Settings] Gagal memuat konfigurasi dari MongoDB:', (err as Error).message);
    return false;
  }
}

// Database storage rate limiter: Snapshot every 5 minutes only
let lastDbSaveTimestamp = 0;
let lastDbSaveTime: string | undefined = undefined;
let totalDbSnapshotsSaved = 0;

// Seed initial packet from prompt specification
const initialSamplePacket: RiverTelemetry = {
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
  river_level_m: 2.78,
  battery_voltage_v: 12.16969,
  battery_percent: 14,
  battery_status: 'CRITICAL',
  wifi_rssi: -4,
  gsm_signal: 0,
  received_at: new Date().toISOString(),
};

// In-memory stores
const MAX_HISTORY = 1000;
let telemetryHistory: RiverTelemetry[] = [];
let latestTelemetry: RiverTelemetry = { ...initialSamplePacket };
let alertHistory: AlertEvent[] = [];
let totalPacketsReceived = 0;
const appStartTime = Date.now();

// Deduplikasi paket berdasarkan identitas sampel sensor, bukan received_at.
// received_at dibuat oleh server sehingga akan selalu berbeda pada pengiriman duplikat.
const recentTelemetryKeys = new Map<string, number>();
const TELEMETRY_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

function telemetrySampleKey(data: Partial<RiverTelemetry>): string {
  return [
    data.device || 'unknown-device',
    data.location || 'unknown-location',
    data.timestamp || 'no-timestamp',
    Number(data.uptime_ms ?? -1),
  ].join('|');
}

function isDuplicateTelemetrySample(data: Partial<RiverTelemetry>): boolean {
  const key = telemetrySampleKey(data);
  const now = Date.now();
  const previous = recentTelemetryKeys.get(key);

  if (recentTelemetryKeys.size > 2000) {
    for (const [savedKey, savedAt] of recentTelemetryKeys) {
      if (now - savedAt > TELEMETRY_DEDUPE_WINDOW_MS) recentTelemetryKeys.delete(savedKey);
    }
  }

  if (previous && now - previous <= TELEMETRY_DEDUPE_WINDOW_MS) return true;
  recentTelemetryKeys.set(key, now);
  return false;
}

function dedupeTelemetryRecords<T extends Partial<RiverTelemetry>>(records: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const record of records) {
    const key = telemetrySampleKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(record);
  }
  return result;
}

// State tracker for Telegram alerts: ONLY dispatch when status changes.
// If status has already been sent and the state/data does not change, DO NOT send duplicate messages to Telegram.
interface TelegramStateTracking {
  waterStatus: 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA' | null;
  batteryStatus: 'NORMAL' | 'LOW' | 'CRITICAL' | null;
  rainStatus: 'NORMAL' | 'EXTREME' | null;
  windStatus: 'NORMAL' | 'EXTREME' | null;
  lastSentWaterLevel?: number;
  lastSentTimestamp?: string;
  totalAlertsDispatched: number;
  totalDuplicateAlertsSuppressed: number;
}

const lastSentTelegramState: TelegramStateTracking = {
  waterStatus: null,
  batteryStatus: null,
  rainStatus: null,
  windStatus: null,
  totalAlertsDispatched: 0,
  totalDuplicateAlertsSuppressed: 0,
};

// Generate realistic 24-hour seed history leading up to the prompt's telemetry
function generateInitialHistory() {
  const history: RiverTelemetry[] = [];
  const now = Date.now();
  const count = 48; // every 30 minutes over 24 hours

  for (let i = count - 1; i >= 1; i--) {
    const timeOffset = now - i * 30 * 60 * 1000;
    const dateObj = new Date(timeOffset);
    const dateStr = dateObj.toISOString().replace('T', ' ').substring(0, 19);

    // River level gradually rose from 1.4m to 2.78m
    const progress = (count - i) / count;
    const level = +(1.4 + progress * 1.35 + (Math.sin(i / 3) * 0.1)).toFixed(2);
    const rain1H = progress > 0.6 ? +(12 * Math.sin((progress - 0.6) * 5)).toFixed(1) : 0;
    const rain24H = +(rain1H * 2.5).toFixed(1);
    const wind = +(3.0 + progress * 2.2 + (Math.cos(i) * 0.8)).toFixed(1);
    const temp = +(23.5 - progress * 2.4).toFixed(1);
    const hum = +(65.0 + progress * 11.5).toFixed(1);
    const batt = Math.max(14, Math.round(92 - progress * 78));
    const volt = +(11.8 + (batt / 100) * 1.4).toFixed(4);

    history.push({
      device: 'AWS-B49793895DC0',
      location: 'lokasi1',
      fw_version: '2.0.0',
      connection: 'wifi',
      timestamp: dateStr,
      send_interval_sec: 10,
      uptime_ms: 881024505 - i * 30 * 60 * 1000,
      rain_mm_1H: Math.max(0, rain1H),
      rain_mm_24H: Math.max(0, rain24H),
      wind_ms: Math.max(0.5, wind),
      temperature_c: temp,
      humidity_percent: hum,
      river_level_m: level,
      battery_voltage_v: volt,
      battery_percent: batt,
      battery_status: batt <= 15 ? 'CRITICAL' : batt <= 25 ? 'LOW' : 'NORMAL',
      wifi_rssi: -4 - Math.round(Math.random() * 8),
      gsm_signal: 0,
      received_at: dateObj.toISOString(),
    });
  }

  // Push latest target packet
  history.push({ ...initialSamplePacket });
  return history;
}

telemetryHistory = generateInitialHistory();

// WebSocket Broadcast Helper
function broadcastToClients(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getDeviceStatusSnapshot() {
  const heartbeatIntervalSec = Math.max(1, Number(latestDeviceStatus?.send_interval_sec || 10));
  const timeoutSec = Math.max(30, heartbeatIntervalSec * 3);
  const freshnessSec = lastDeviceStatusReceivedAt > 0
    ? Math.max(0, Math.round((Date.now() - lastDeviceStatusReceivedAt) / 1000))
    : undefined;

  const deviceOnline = Boolean(
    latestDeviceStatus?.message?.toLowerCase() === 'online' &&
    typeof freshnessSec === 'number' &&
    freshnessSec <= timeoutSec
  );

  return {
    deviceOnline,
    deviceId: latestDeviceStatus?.device,
    deviceLocation: latestDeviceStatus?.location,
    deviceConnection: latestDeviceStatus?.connection,
    deviceLastSeen: latestDeviceStatus?.received_at,
    deviceStatusFreshnessSec: freshnessSec,
    deviceHeartbeatIntervalSec: heartbeatIntervalSec,
    deviceStatusTimeoutSec: timeoutSec,
    deviceStatusTopic: DEVICE_STATUS_TOPIC,
    deviceStatusMessage: deviceOnline ? 'online' : 'offline',
  };
}

function processIncomingDeviceStatus(rawPayload: unknown) {
  try {
    const data: Partial<DeviceStatus> = typeof rawPayload === 'string'
      ? JSON.parse(rawPayload)
      : rawPayload as Partial<DeviceStatus>;

    if (!data || !data.device || !data.message) {
      console.warn('[MQTT STATUS] Invalid device status packet:', rawPayload);
      return;
    }

    latestDeviceStatus = {
      device: String(data.device),
      location: String(data.location || 'lokasi1'),
      message: String(data.message).toLowerCase(),
      send_interval_sec: Math.max(1, Number(data.send_interval_sec || 10)),
      timestamp: String(data.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19)),
      connection: String(data.connection || 'unknown'),
      received_at: new Date().toISOString(),
    };
    lastDeviceStatusReceivedAt = Date.now();

    const snapshot = getDeviceStatusSnapshot();
    console.log(
      `[MQTT DEVICE] ${latestDeviceStatus.device} | ${latestDeviceStatus.location} | ` +
      `${snapshot.deviceOnline ? 'ONLINE' : 'OFFLINE'} | ${latestDeviceStatus.connection}`
    );
    broadcastToClients('device:status', snapshot);
  } catch (err) {
    console.error('[MQTT STATUS] Error processing device status:', err);
  }
}

// Telegram Alert Dispatcher
async function sendTelegramAlert(title: string, message: string, severity: 'info' | 'warning' | 'critical', details: RiverTelemetry) {
  if (!currentSettings.telegramEnabled || !currentSettings.telegramBotToken || !currentSettings.telegramChatId) {
    return false;
  }

  const icon = severity === 'critical'
    ? '🚨🚨 *PERINGATAN BAHAYA / DARURAT* 🚨🚨'
    : title.toUpperCase().includes('AMAN') || title.toUpperCase().includes('NORMAL')
    ? '✅ *PEMBERITAHUAN KONDISI AMAN / PULIH* ✅'
    : '⚠️ *PERINGATAN DINI CUACA & SUNGAI* ⚠️';

  const telegramText = `${icon}
*${title}*
${message}

📍 *Lokasi*: ${details.location} (${details.device})
🌊 *Ketinggian Air*: \`${details.river_level_m.toFixed(2)} m\`
🌧️ *Curah Hujan (1 Jam)*: \`${details.rain_mm_1H} mm\`
💨 *Kecepatan Angin*: \`${(details.wind_ms * 3.6).toFixed(1)} km/jam\`
🌡️ *Suhu / Kelembaban*: \`${details.temperature_c}°C / ${details.humidity_percent}%\`
🔋 *Baterai Sensor*: \`${details.battery_percent}% (${details.battery_status})\`
⏱️ *Waktu Sensor*: \`${details.timestamp}\`

🛶 *Rekomendasi Arung Jeram*:
${details.river_level_m >= currentSettings.thresholds.waterLevelBahaya
  ? '⛔ DILARANG TOTAL! Evakuasi seluruh wisatawan dan perahu dari sungai!'
  : details.river_level_m >= currentSettings.thresholds.waterLevelSiaga
  ? '🛑 Tunda peluncuran trip rafting! Debit air sangat deras.'
  : details.river_level_m >= currentSettings.thresholds.waterLevelWaspada
  ? '⚠️ Pemandu & tim rescue wajib siaga di pos pantau.'
  : '✅ Debit aman dan stabil. Wisata arung jeram aman beroperasi.'}

_Sistem Monitoring Hulu Sungai & Wisata Arung Jeram_
_Anti-Spam: Pesan Telegram hanya dikirimkan jika status/kondisi berubah._`;

  try {
    const url = `https://api.telegram.org/bot${currentSettings.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: currentSettings.telegramChatId,
        text: telegramText,
        parse_mode: 'Markdown',
      }),
    });

    const resJson = await response.json() as { ok: boolean; description?: string };
    if (!resJson.ok) {
      console.error('Telegram API error:', resJson.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send Telegram alert:', err);
    return false;
  }
}

// Evaluate Incoming Telemetry for Automated Alerts with Status Deduplication
async function evaluateAlerts(telemetry: RiverTelemetry) {
  const alertsToDispatch: {
    category: string;
    type: 'battery' | 'water_level' | 'rain' | 'wind';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    metricValue: number | string;
    parameter: 'water' | 'battery' | 'rain' | 'wind';
    newStatus: string;
  }[] = [];

  const th = currentSettings.thresholds;

  // 1. Evaluate Water Level Status
  const currentWaterStatus: 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA' =
    telemetry.river_level_m >= th.waterLevelBahaya ? 'BAHAYA' :
    telemetry.river_level_m >= th.waterLevelSiaga ? 'SIAGA' :
    telemetry.river_level_m >= th.waterLevelWaspada ? 'WASPADA' : 'AMAN';

  if (lastSentTelegramState.waterStatus === null) {
    // Initial startup check
    lastSentTelegramState.waterStatus = currentWaterStatus;
    if (currentWaterStatus !== 'AMAN') {
      alertsToDispatch.push({
        category: `water_${currentWaterStatus.toLowerCase()}`,
        type: 'water_level',
        severity: currentWaterStatus === 'BAHAYA' ? 'critical' : 'warning',
        title: currentWaterStatus === 'BAHAYA' ? 'BAHAYA BANJIR: Ketinggian Air Ekstrem!' : `Status Debit Sungai: ${currentWaterStatus}`,
        message: `Ketinggian air sungai terdeteksi pada ${telemetry.river_level_m.toFixed(2)}m (Status: ${currentWaterStatus}).`,
        metricValue: `${telemetry.river_level_m.toFixed(2)} m`,
        parameter: 'water',
        newStatus: currentWaterStatus,
      });
    }
  } else if (currentWaterStatus !== lastSentTelegramState.waterStatus) {
    // Status HAS CHANGED! Send update to Telegram
    if (currentWaterStatus === 'BAHAYA') {
      alertsToDispatch.push({
        category: 'water_bahaya',
        type: 'water_level',
        severity: 'critical',
        title: 'BAHAYA BANJIR: Ketinggian Air Ekstrem!',
        message: `Status sungai BERUBAH ke BAHAYA! Ketinggian air di ${telemetry.location} naik ke ${telemetry.river_level_m.toFixed(2)}m (Ambang Bahaya: ${th.waterLevelBahaya}m). SELURUH AKTIVITAS ARUNG JERAM DILARANG TOTAL! Lakukan evakuasi segera!`,
        metricValue: `${telemetry.river_level_m.toFixed(2)} m`,
        parameter: 'water',
        newStatus: 'BAHAYA',
      });
    } else if (currentWaterStatus === 'SIAGA') {
      alertsToDispatch.push({
        category: 'water_siaga',
        type: 'water_level',
        severity: 'warning',
        title: 'SIAGA AIR: Debit Sungai Meningkat Drastis!',
        message: `Status sungai BERUBAH ke SIAGA! Ketinggian air mencapai ${telemetry.river_level_m.toFixed(2)}m (Ambang Siaga: ${th.waterLevelSiaga}m). Tunda keberangkatan trip arung jeram.`,
        metricValue: `${telemetry.river_level_m.toFixed(2)} m`,
        parameter: 'water',
        newStatus: 'SIAGA',
      });
    } else if (currentWaterStatus === 'WASPADA') {
      alertsToDispatch.push({
        category: 'water_waspada',
        type: 'water_level',
        severity: 'warning',
        title: 'WASPADA: Permukaan Air Sungai Mulai Naik',
        message: `Status sungai BERUBAH ke WASPADA! Ketinggian air mencapai ${telemetry.river_level_m.toFixed(2)}m (Ambang Waspada: ${th.waterLevelWaspada}m). Tim rescue dan pemandu wajib bersiaga di pos pantau.`,
        metricValue: `${telemetry.river_level_m.toFixed(2)} m`,
        parameter: 'water',
        newStatus: 'WASPADA',
      });
    } else if (currentWaterStatus === 'AMAN') {
      alertsToDispatch.push({
        category: 'water_aman',
        type: 'water_level',
        severity: 'info',
        title: 'STATUS SUNGAI KEMBALI AMAN & STABIL',
        message: `Status sungai BERUBAH ke AMAN! Ketinggian air kini turun ke ${telemetry.river_level_m.toFixed(2)}m (di bawah batas waspada ${th.waterLevelWaspada}m). Debit air aman dan jalur wisata arung jeram siap beroperasi kembali.`,
        metricValue: `${telemetry.river_level_m.toFixed(2)} m`,
        parameter: 'water',
        newStatus: 'AMAN',
      });
    }
  } else {
    // Status DID NOT CHANGE -> SUPPRESS DUPLICATE TELEGRAM!
    lastSentTelegramState.totalDuplicateAlertsSuppressed++;
  }

  // 2. Evaluate Battery Status
  const currentBatteryStatus: 'NORMAL' | 'LOW' | 'CRITICAL' =
    telemetry.battery_percent <= th.batteryCritPercent ? 'CRITICAL' :
    telemetry.battery_percent <= th.batteryLowPercent ? 'LOW' : 'NORMAL';

  if (lastSentTelegramState.batteryStatus === null) {
    lastSentTelegramState.batteryStatus = currentBatteryStatus;
    if (currentBatteryStatus !== 'NORMAL') {
      alertsToDispatch.push({
        category: `battery_${currentBatteryStatus.toLowerCase()}`,
        type: 'battery',
        severity: currentBatteryStatus === 'CRITICAL' ? 'critical' : 'warning',
        title: currentBatteryStatus === 'CRITICAL' ? 'Baterai Sensor Kritis!' : 'Baterai Sensor Menipis (Low)',
        message: `Daya baterai sensor berada di ${telemetry.battery_percent}% (${telemetry.battery_voltage_v.toFixed(2)}V). Ambang Low: ${th.batteryLowPercent}%, Kritis: ${th.batteryCritPercent}%.`,
        metricValue: `${telemetry.battery_percent}%`,
        parameter: 'battery',
        newStatus: currentBatteryStatus,
      });
    }
  } else if (currentBatteryStatus !== lastSentTelegramState.batteryStatus) {
    // Status HAS CHANGED!
    if (currentBatteryStatus === 'CRITICAL') {
      alertsToDispatch.push({
        category: 'battery_crit',
        type: 'battery',
        severity: 'critical',
        title: 'Baterai Sensor Kritis!',
        message: `Status baterai sensor BERUBAH ke KRITIS! Daya tersisa ${telemetry.battery_percent}% (Ambang Kritis: ${th.batteryCritPercent}%). Segera ganti/isi ulang solar panel!`,
        metricValue: `${telemetry.battery_percent}%`,
        parameter: 'battery',
        newStatus: 'CRITICAL',
      });
    } else if (currentBatteryStatus === 'LOW') {
      alertsToDispatch.push({
        category: 'battery_low',
        type: 'battery',
        severity: 'warning',
        title: 'Baterai Sensor Menipis (Low)',
        message: `Status baterai sensor BERUBAH ke MENIPIS (${telemetry.battery_percent}%). Ambang Low: ${th.batteryLowPercent}%. Periksa pasokan daya cadangan.`,
        metricValue: `${telemetry.battery_percent}%`,
        parameter: 'battery',
        newStatus: 'LOW',
      });
    } else if (currentBatteryStatus === 'NORMAL') {
      alertsToDispatch.push({
        category: 'battery_normal',
        type: 'battery',
        severity: 'info',
        title: 'Daya Baterai Sensor Kembali Normal',
        message: `Status baterai sensor pulih ke NORMAL (${telemetry.battery_percent}%, ${telemetry.battery_voltage_v.toFixed(2)}V). Pemantauan beroperasi optimal.`,
        metricValue: `${telemetry.battery_percent}%`,
        parameter: 'battery',
        newStatus: 'NORMAL',
      });
    }
  } else {
    lastSentTelegramState.totalDuplicateAlertsSuppressed++;
  }

  // 3. Evaluate Extreme Rainfall
  const currentRainStatus: 'NORMAL' | 'EXTREME' =
    (telemetry.rain_mm_1H >= th.rainExtreme1H || telemetry.rain_mm_24H >= th.rainExtreme24H) ? 'EXTREME' : 'NORMAL';

  if (lastSentTelegramState.rainStatus === null) {
    lastSentTelegramState.rainStatus = currentRainStatus;
    if (currentRainStatus === 'EXTREME') {
      alertsToDispatch.push({
        category: 'rain_extreme',
        type: 'rain',
        severity: (telemetry.rain_mm_1H >= th.rainExtreme1H && telemetry.rain_mm_24H >= th.rainExtreme24H) ? 'critical' : 'warning',
        title: 'Curah Hujan Hulu Sangat Lebat!',
        message: `Curah hujan melampaui ambang konfigurasi. 1 Jam: ${telemetry.rain_mm_1H} mm (ambang ${th.rainExtreme1H} mm); 24 Jam: ${telemetry.rain_mm_24H} mm (ambang ${th.rainExtreme24H} mm). Waspadai kenaikan air susulan.`,
        metricValue: `${telemetry.rain_mm_1H} mm/jam`,
        parameter: 'rain',
        newStatus: 'EXTREME',
      });
    }
  } else if (currentRainStatus !== lastSentTelegramState.rainStatus) {
    if (currentRainStatus === 'EXTREME') {
      alertsToDispatch.push({
        category: 'rain_extreme',
        type: 'rain',
        severity: (telemetry.rain_mm_1H >= th.rainExtreme1H && telemetry.rain_mm_24H >= th.rainExtreme24H) ? 'critical' : 'warning',
        title: 'Curah Hujan Hulu Sangat Lebat!',
        message: `Kondisi curah hujan BERUBAH ke EKSTREM! 1 Jam: ${telemetry.rain_mm_1H} mm (ambang ${th.rainExtreme1H} mm); 24 Jam: ${telemetry.rain_mm_24H} mm (ambang ${th.rainExtreme24H} mm). Waspadai kenaikan air susulan.`,
        metricValue: `${telemetry.rain_mm_1H} mm/jam`,
        parameter: 'rain',
        newStatus: 'EXTREME',
      });
    } else {
      lastSentTelegramState.rainStatus = 'NORMAL';
    }
  } else {
    lastSentTelegramState.totalDuplicateAlertsSuppressed++;
  }

  // 4. Evaluate Extreme Wind
  const currentWindStatus: 'NORMAL' | 'EXTREME' =
    telemetry.wind_ms >= th.windExtremeMs ? 'EXTREME' : 'NORMAL';

  if (lastSentTelegramState.windStatus === null) {
    lastSentTelegramState.windStatus = currentWindStatus;
    if (currentWindStatus === 'EXTREME') {
      alertsToDispatch.push({
        category: 'wind_extreme',
        type: 'wind',
        severity: 'warning',
        title: 'Kecepatan Angin Kencang / Ekstrem!',
        message: `Kecepatan angin mencapai ${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam (ambang ${(th.windExtremeMs * 3.6).toFixed(1)} km/jam).`,
        metricValue: `${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam`,
        parameter: 'wind',
        newStatus: 'EXTREME',
      });
    }
  } else if (currentWindStatus !== lastSentTelegramState.windStatus) {
    if (currentWindStatus === 'EXTREME') {
      alertsToDispatch.push({
        category: 'wind_extreme',
        type: 'wind',
        severity: 'warning',
        title: 'Kecepatan Angin Kencang / Ekstrem!',
        message: `Kondisi angin BERUBAH ke KENCANG! Kecepatan angin mencapai ${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam (ambang ${(th.windExtremeMs * 3.6).toFixed(1)} km/jam). Waspadai pohon tumbang di jalur arung jeram!`,
        metricValue: `${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam`,
        parameter: 'wind',
        newStatus: 'EXTREME',
      });
    } else {
      lastSentTelegramState.windStatus = 'NORMAL';
    }
  } else {
    lastSentTelegramState.totalDuplicateAlertsSuppressed++;
  }

  // Dispatch only the alerts that represent real status transitions
  for (const alert of alertsToDispatch) {
    let dispatchedTelegram = false;
    dispatchedTelegram = await sendTelegramAlert(alert.title, alert.message, alert.severity, telemetry);

    // Update state tracker for the corresponding parameter
    if (alert.parameter === 'water') {
      lastSentTelegramState.waterStatus = alert.newStatus as any;
      lastSentTelegramState.lastSentWaterLevel = telemetry.river_level_m;
    } else if (alert.parameter === 'battery') {
      lastSentTelegramState.batteryStatus = alert.newStatus as any;
    } else if (alert.parameter === 'rain') {
      lastSentTelegramState.rainStatus = alert.newStatus as any;
    } else if (alert.parameter === 'wind') {
      lastSentTelegramState.windStatus = alert.newStatus as any;
    }

    if (dispatchedTelegram) {
      lastSentTelegramState.totalAlertsDispatched++;
      lastSentTelegramState.lastSentTimestamp = new Date().toISOString();
      console.log(`[Telegram EWS] Notifikasi perubahan status '${alert.newStatus}' (${alert.title}) berhasil dikirim ke Telegram.`);
    }

    const event: AlertEvent = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metricValue: alert.metricValue,
      dispatchedTelegram,
      dispatchedPush: true,
    };

    alertHistory.unshift(event);
    if (alertHistory.length > 200) {
      alertHistory.pop();
    }

    broadcastToClients('alert:new', event);
  }
}

// Ingest Incoming Telemetry Packet
async function processIncomingTelemetry(rawPayload: unknown) {
  try {
    let data: Partial<RiverTelemetry>;
    if (typeof rawPayload === 'string') {
      data = JSON.parse(rawPayload);
    } else {
      data = rawPayload as Partial<RiverTelemetry>;
    }

    if (!data || typeof data.river_level_m === 'undefined') {
      console.warn('Invalid telemetry packet schema received:', rawPayload);
      return;
    }

    const batteryPercent = Number(data.battery_percent ?? 50);
    const batteryStatus = batteryPercent <= currentSettings.thresholds.batteryCritPercent
      ? 'CRITICAL'
      : batteryPercent <= currentSettings.thresholds.batteryLowPercent
      ? 'LOW'
      : 'NORMAL';

    const telemetryRecord: RiverTelemetry = {
      device: data.device || 'AWS-B49793895DC0',
      location: data.location || 'lokasi1',
      fw_version: data.fw_version || '2.0.0',
      connection: data.connection || 'wifi',
      timestamp: data.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      send_interval_sec: Number(data.send_interval_sec ?? 10),
      uptime_ms: Number(data.uptime_ms ?? 0),
      rain_mm_1H: Number(data.rain_mm_1H ?? 0),
      rain_mm_24H: Number(data.rain_mm_24H ?? 0),
      wind_ms: Number(data.wind_ms ?? 0),
      temperature_c: Number(data.temperature_c ?? 20),
      humidity_percent: Number(data.humidity_percent ?? 70),
      river_level_m: Number(data.river_level_m),
      battery_voltage_v: Number(data.battery_voltage_v ?? 12.0),
      battery_percent: batteryPercent,
      battery_status: batteryStatus,
      wifi_rssi: Number(data.wifi_rssi ?? -50),
      gsm_signal: Number(data.gsm_signal ?? 0),
      received_at: new Date().toISOString(),
    };

    if (isDuplicateTelemetrySample(telemetryRecord)) {
      console.log(`[MQTT DEDUPE] Paket telemetry duplikat diabaikan: ${telemetrySampleKey(telemetryRecord)}`);
      return;
    }

    latestTelemetry = telemetryRecord;
    totalPacketsReceived++;

    telemetryHistory.push(telemetryRecord);
    if (telemetryHistory.length > MAX_HISTORY) {
      telemetryHistory.shift();
    }

    // 1. Tampilan UI Live & Dinamis: Broadcast langsung ke semua klien setiap ada data masuk dari MQTT
    broadcastToClients('telemetry:update', telemetryRecord);

    // Evaluasi EWS Alert langsung untuk deteksi dini bahaya banjir & baterai
    await evaluateAlerts(telemetryRecord);

    // 2. Penyimpanan Database: Dibatasi tiap 5 menit saja (hemat storage & kuota, snapshot berkala)
    const now = Date.now();
    const dbIntervalMs = (currentSettings.dbSaveIntervalMin || 5) * 60 * 1000;
    const isDueForDbSnapshot = isMongoConnected && mongoDb && (now - lastDbSaveTimestamp >= dbIntervalMs || lastDbSaveTimestamp === 0);

    if (isDueForDbSnapshot && mongoDb) {
      lastDbSaveTimestamp = now;
      lastDbSaveTime = new Date(now).toISOString();
      totalDbSnapshotsSaved++;
      const { _id: _omittedId, ...docData } = telemetryRecord;

      mongoDb.collection('telemetry_records').insertOne({
        ...docData,
        createdAt: new Date(),
        dbSnapshotIntervalMin: currentSettings.dbSaveIntervalMin || 5,
        snapshotType: '5_min_periodic',
      }).then((result) => {
        console.log(`[MongoDB Atlas] Snapshot ${currentSettings.dbSaveIntervalMin || 5} menit tersimpan (ID: ${result.insertedId}) Level: ${telemetryRecord.river_level_m}m @ ${telemetryRecord.timestamp}`);
        broadcastToClients('db:status', {
          lastDbSaveTime,
          totalDbSnapshotsSaved,
          dbSaveIntervalMin: currentSettings.dbSaveIntervalMin || 5,
          savedRecord: {
            timestamp: telemetryRecord.timestamp,
            river_level_m: telemetryRecord.river_level_m,
          },
        });
      }).catch((err) => {
        console.error('Failed to insert telemetry snapshot into MongoDB Atlas:', err);
      });
    }

  } catch (err) {
    console.error('Error processing incoming telemetry:', err);
  }
}

// Connection Check Timer & Health Tracker (every 10 to 30 seconds)
let connectionCheckTimer: NodeJS.Timeout | null = null;
let lastConnectionCheckTime = new Date().toISOString();

function performConnectionCheck() {
  const isConnected = Boolean(activeMqttClient && activeMqttClient.connected);
  lastConnectionCheckTime = new Date().toISOString();

  // If MQTT broker link disconnected, attempt reconnect or reinit
  if (!isConnected) {
    if (activeMqttClient) {
      console.log(`[Cek Koneksi ${currentSettings.connectionCheckIntervalSec}s] Broker MQTT belum terhubung, mencoba reconnect ke ${currentSettings.mqttBrokerUrl}...`);
      try {
        activeMqttClient.reconnect();
      } catch (err) {
        console.warn('Gagal memicu reconnect MQTT, inisialisasi ulang:', err);
        initMqtt(currentSettings.mqttBrokerUrl, currentSettings.mqttTopic);
      }
    } else {
      initMqtt(currentSettings.mqttBrokerUrl, currentSettings.mqttTopic);
    }
  }

  const now = Date.now();
  const lastPacketDate = new Date(latestTelemetry.received_at || latestTelemetry.timestamp).getTime();
  const sensorFreshnessSec = Math.max(0, Math.round((now - lastPacketDate) / 1000));
  const healthStatus: 'optimal' | 'idle' | 'warning' | 'disconnected' = !isConnected
    ? 'disconnected'
    : sensorFreshnessSec <= currentSettings.connectionCheckIntervalSec * 2
    ? 'optimal'
    : 'idle';
  const deviceStatusSnapshot = getDeviceStatusSnapshot();

  broadcastToClients('mqtt:status', {
    connected: isConnected,
    broker: currentSettings.mqttBrokerUrl,
    topic: currentSettings.mqttTopic,
    connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
    lastConnectionCheckTime,
    connectionHealth: healthStatus,
    sensorFreshnessSec,
    telegramDeduplicationActive: true,
    totalTelegramDispatched: lastSentTelegramState.totalAlertsDispatched,
    totalDuplicateAlertsSuppressed: lastSentTelegramState.totalDuplicateAlertsSuppressed,
    lastSentTelegramWaterStatus: lastSentTelegramState.waterStatus || undefined,
  });
  broadcastToClients('device:status', deviceStatusSnapshot);
}

function startConnectionCheckTimer(intervalSec: number) {
  if (connectionCheckTimer) {
    clearInterval(connectionCheckTimer);
  }
  // Clamp interval between 10 and 30 seconds as requested
  const clampedInterval = Math.max(10, Math.min(30, Number(intervalSec) || 15));
  currentSettings.connectionCheckIntervalSec = clampedInterval;
  console.log(`[MQTT] Pengecekan koneksi broker aktif setiap ${clampedInterval} detik (rentang 10 s/d 30 detik)`);

  // Immediate check
  performConnectionCheck();

  connectionCheckTimer = setInterval(() => {
    performConnectionCheck();
  }, clampedInterval * 1000);
}

// Initialize MQTT Client with broker.emqx.io:1883
function initMqtt(brokerUrl: string, topic: string) {
  const normalizedBroker = normalizeMqttUrl(brokerUrl);
  currentSettings.mqttBrokerUrl = normalizedBroker;
  const cleanTopic = (topic || 'digitaltwin/lokasi1/data').trim();
  currentSettings.mqttTopic = cleanTopic;

  if (activeMqttClient) {
    try {
      activeMqttClient.end(true);
    } catch {
      // ignore
    }
  }

  console.log(`Connecting to MQTT Broker: ${normalizedBroker}, Topic: ${cleanTopic} (Cek koneksi tiap ${currentSettings.connectionCheckIntervalSec}s)`);

  try {
    activeMqttClient = mqtt.connect(normalizedBroker, {
      clientId: `river_dashboard_${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 4000,
      keepalive: currentSettings.connectionCheckIntervalSec, // Ping interval 10-30s
    });

    activeMqttClient.on('connect', () => {
      console.log(`MQTT Connected to ${normalizedBroker} on topic: ${cleanTopic}`);
      broadcastToClients('mqtt:status', { 
        connected: true, 
        broker: normalizedBroker, 
        topic: cleanTopic,
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
        lastConnectionCheckTime: new Date().toISOString(),
        connectionHealth: 'optimal',
      });

      // Subscribe hanya ke topic yang memang dipakai aplikasi.
      // Hindari wildcard tumpang tindih karena satu publikasi MQTT dapat cocok ke beberapa filter.
      activeMqttClient?.subscribe(cleanTopic, { qos: 0 }, (err) => {
        if (err) {
          console.error('MQTT Telemetry subscription error:', err);
        } else {
          console.log(`MQTT Telemetry subscribed: ${cleanTopic}`);
        }
      });

      activeMqttClient?.subscribe(DEVICE_STATUS_TOPIC, { qos: 0 }, (err) => {
        if (err) {
          console.error('MQTT Device status subscription error:', err);
        } else {
          console.log(`MQTT Device status subscribed: ${DEVICE_STATUS_TOPIC}`);
        }
      });

      // Start / refresh the periodic connection check timer
      startConnectionCheckTimer(currentSettings.connectionCheckIntervalSec);
    });

    activeMqttClient.on('message', async (receivedTopic, payload) => {
      try {
        const str = payload.toString();
        console.log(`[MQTT RX] ${receivedTopic}`);

        // Routing ketat: hanya topic yang dikonfigurasi yang boleh diproses.
        if (receivedTopic === DEVICE_STATUS_TOPIC) {
          processIncomingDeviceStatus(str);
          return;
        }

        if (receivedTopic === currentSettings.mqttTopic) {
          await processIncomingTelemetry(str);
          return;
        }

        console.log(`[MQTT] Topic diabaikan: ${receivedTopic}`);
      } catch (err) {
        console.error(`Error handling MQTT message on ${receivedTopic}:`, err);
      }
    });

    activeMqttClient.on('error', (err) => {
      console.warn('MQTT connection warning/error:', err.message);
      broadcastToClients('mqtt:status', { 
        connected: false, 
        error: err.message,
        broker: normalizedBroker,
        topic: cleanTopic,
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
        lastConnectionCheckTime: new Date().toISOString(),
        connectionHealth: 'disconnected',
      });
    });

    activeMqttClient.on('offline', () => {
      broadcastToClients('mqtt:status', { 
        connected: false, 
        offline: true,
        broker: normalizedBroker,
        topic: cleanTopic,
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
        lastConnectionCheckTime: new Date().toISOString(),
        connectionHealth: 'disconnected',
      });
    });

    activeMqttClient.on('reconnect', () => {
      console.log(`[MQTT] Reconnecting to broker ${normalizedBroker} (${currentSettings.connectionCheckIntervalSec}s keepalive)...`);
    });
  } catch (err) {
    console.error('MQTT initialization error:', err);
  }
}

// Initialize MongoDB Atlas Connection
async function initMongo(mongoUri: string) {
  if (!mongoUri || !mongoUri.startsWith('mongodb')) {
    isMongoConnected = false;
    mongoDb = null;
    return;
  }

  try {
    if (mongoClient) {
      await mongoClient.close();
    }

    console.log('Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await mongoClient.connect();
    mongoDb = mongoClient.db('river_flood_monitoring');
    isMongoConnected = true;
    console.log('MongoDB Atlas connected successfully to river_flood_monitoring');

    // Load persistent application settings before continuing normal operation.
    await loadSettingsFromMongo();

    // Sync in-memory history to MongoDB collection if collection is empty
    const count = await mongoDb.collection('telemetry_records').countDocuments();
    if (count === 0 && telemetryHistory.length > 0) {
      const recordsToInsert = telemetryHistory.map((t) => {
        const { _id: _omittedId, ...docData } = t;
        return { ...docData, createdAt: new Date(t.received_at || t.timestamp) };
      });
      await mongoDb.collection('telemetry_records').insertMany(recordsToInsert);
      console.log(`Synced ${recordsToInsert.length} initial telemetry records to MongoDB Atlas`);
    }

    broadcastToClients('mongo:status', { connected: true, dbName: 'river_flood_monitoring' });
  } catch (err) {
    isMongoConnected = false;
    mongoDb = null;
    console.warn('MongoDB Atlas connection failed or invalid URI:', (err as Error).message);
    broadcastToClients('mongo:status', { connected: false, error: (err as Error).message });
  }
}

// WebSocket Connection Lifecycle
wss.on('connection', (ws) => {
  // Send initial snapshot
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      latest: latestTelemetry,
      history: telemetryHistory.slice(-100),
      alerts: alertHistory.slice(0, 30),
      settings: getPublicSettings(),
      status: {
        mqttConnected: activeMqttClient?.connected || false,
        mqttBroker: currentSettings.mqttBrokerUrl,
        mqttTopic: currentSettings.mqttTopic,
        ...getDeviceStatusSnapshot(),
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
        lastConnectionCheckTime,
        connectionHealth: activeMqttClient?.connected ? 'optimal' : 'disconnected',
        dbSaveIntervalMin: currentSettings.dbSaveIntervalMin || 5,
        lastDbSaveTime: lastDbSaveTime,
        totalDbSnapshotsSaved,
        mongoConnected: isMongoConnected,
        mongoDatabaseName: isMongoConnected ? 'river_flood_monitoring' : undefined,
        telegramConfigured: Boolean(currentSettings.telegramBotToken && currentSettings.telegramChatId),
        telegramDeduplicationActive: true,
        totalTelegramDispatched: lastSentTelegramState.totalAlertsDispatched,
        totalDuplicateAlertsSuppressed: lastSentTelegramState.totalDuplicateAlertsSuppressed,
        lastSentTelegramWaterStatus: lastSentTelegramState.waterStatus || undefined,
        lastPacketTime: latestTelemetry.timestamp,
        totalPacketsReceived,
        activeClientsCount: wss.clients.size,
        uptimeSeconds: Math.floor((Date.now() - appStartTime) / 1000),
      },
    },
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // ignore
    }
  });
});

// REST API Endpoints

// 1. Health and Status
app.get('/api/status', (_req, res) => {
  const isConnected = Boolean(activeMqttClient && activeMqttClient.connected);
  const status: SystemStatus = {
    mqttConnected: isConnected,
    mqttBroker: currentSettings.mqttBrokerUrl,
    mqttTopic: currentSettings.mqttTopic,
    ...getDeviceStatusSnapshot(),
    connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,
    lastConnectionCheckTime,
    connectionHealth: isConnected ? 'optimal' : 'disconnected',
    dbSaveIntervalMin: currentSettings.dbSaveIntervalMin || 5,
    lastDbSaveTime: lastDbSaveTime,
    totalDbSnapshotsSaved,
    mongoConnected: isMongoConnected,
    mongoDatabaseName: isMongoConnected ? 'river_flood_monitoring' : undefined,
    telegramConfigured: Boolean(currentSettings.telegramBotToken && currentSettings.telegramChatId),
    telegramDeduplicationActive: true,
    totalTelegramDispatched: lastSentTelegramState.totalAlertsDispatched,
    totalDuplicateAlertsSuppressed: lastSentTelegramState.totalDuplicateAlertsSuppressed,
    lastSentTelegramWaterStatus: lastSentTelegramState.waterStatus || undefined,
    lastPacketTime: latestTelemetry?.timestamp || null,
    totalPacketsReceived,
    activeClientsCount: wss.clients.size,
    uptimeSeconds: Math.floor((Date.now() - appStartTime) / 1000),
  };
  res.json(status);
});

app.get('/api/device/status', (_req, res) => {
  res.json(getDeviceStatusSnapshot());
});

// 2. Latest Telemetry
app.get('/api/telemetry/latest', (_req, res) => {
  res.json(latestTelemetry);
});

// 3. Telemetry History with Filter
app.get('/api/telemetry/history', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const timeRange = (req.query.timeRange as string) || '24h';

  // If MongoDB is connected and has records, query from Atlas
  if (isMongoConnected && mongoDb) {
    try {
      let timeQuery = {};
      const now = Date.now();
      if (timeRange === '1h') {
        timeQuery = { createdAt: { $gte: new Date(now - 60 * 60 * 1000) } };
      } else if (timeRange === '6h') {
        timeQuery = { createdAt: { $gte: new Date(now - 6 * 60 * 60 * 1000) } };
      } else if (timeRange === '24h') {
        timeQuery = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
      } else if (timeRange === '7d') {
        timeQuery = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
      }

      const records = await mongoDb.collection('telemetry_records')
        .find(timeQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      if (records.length > 0) {
        const uniqueRecords = dedupeTelemetryRecords(records);
        return res.json(uniqueRecords.reverse());
      }
    } catch (err) {
      console.warn('MongoDB query fallback to memory:', err);
    }
  }

  // Fallback to in-memory history
  let filtered = [...telemetryHistory];
  const now = Date.now();
  if (timeRange === '1h') {
    filtered = filtered.filter((t) => (now - new Date(t.received_at || t.timestamp).getTime()) <= 60 * 60 * 1000);
  } else if (timeRange === '6h') {
    filtered = filtered.filter((t) => (now - new Date(t.received_at || t.timestamp).getTime()) <= 6 * 60 * 60 * 1000);
  } else if (timeRange === '24h') {
    filtered = filtered.filter((t) => (now - new Date(t.received_at || t.timestamp).getTime()) <= 24 * 60 * 60 * 1000);
  } else if (timeRange === '7d') {
    filtered = filtered.filter((t) => (now - new Date(t.received_at || t.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
  }

  res.json(dedupeTelemetryRecords(filtered).slice(-limit));
});

// 4. Publish / Simulate Telemetry Packet
app.post('/api/telemetry/publish', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload.river_level_m === 'undefined') {
      return res.status(400).json({ error: 'Field river_level_m required' });
    }

    // Jika MQTT terhubung, publish satu kali dan biarkan subscriber menjadi jalur ingestion tunggal.
    if (activeMqttClient && activeMqttClient.connected) {
      const topic = currentSettings.mqttTopic;
      activeMqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
      return res.json({ success: true, message: 'Telemetry dipublikasikan ke MQTT dan diproses satu kali melalui subscriber.' });
    }

    // Fallback saat broker offline: proses lokal satu kali.
    await processIncomingTelemetry(payload);
    res.json({ success: true, message: 'MQTT offline; telemetry diproses lokal satu kali.' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. CSV Export Endpoint
app.get('/api/telemetry/export-csv', async (req, res) => {
  try {
    let records: RiverTelemetry[] = [];
    if (isMongoConnected && mongoDb) {
      try {
        const mongoRecords = await mongoDb.collection('telemetry_records')
          .find({})
          .sort({ createdAt: -1 })
          .limit(2000)
          .toArray();
        records = (mongoRecords as unknown as RiverTelemetry[]).reverse();
      } catch {
        records = telemetryHistory;
      }
    } else {
      records = telemetryHistory;
    }

    const headers = [
      'Timestamp',
      'Device_ID',
      'Location',
      'River_Level_m',
      'Rain_1H_mm',
      'Rain_24H_mm',
      'Wind_Speed_ms',
      'Wind_Speed_kmh',
      'Temperature_C',
      'Humidity_Percent',
      'Battery_Voltage_V',
      'Battery_Percent',
      'Battery_Status',
      'WiFi_RSSI',
      'GSM_Signal',
      'Uptime_ms',
      'Connection',
      'FW_Version',
    ];

    const rows = records.map((t) => [
      `"${t.timestamp}"`,
      `"${t.device}"`,
      `"${t.location}"`,
      t.river_level_m,
      t.rain_mm_1H,
      t.rain_mm_24H,
      t.wind_ms,
      Number((t.wind_ms * 3.6).toFixed(1)),
      t.temperature_c,
      t.humidity_percent,
      t.battery_voltage_v,
      t.battery_percent,
      `"${t.battery_status}"`,
      t.wifi_rssi,
      t.gsm_signal,
      t.uptime_ms,
      `"${t.connection}"`,
      `"${t.fw_version}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="river_telemetry_${new Date().toISOString().substring(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 6. Alerts Log
app.get('/api/alerts', (_req, res) => {
  res.json(alertHistory);
});

// 7. Test Telegram Bot Alert
app.post('/api/alerts/test-telegram', async (req, res) => {
  const { botToken, chatId } = req.body;
  const token = botToken || currentSettings.telegramBotToken;
  const chat = chatId || currentSettings.telegramChatId;

  if (!token || !chat) {
    return res.status(400).json({ error: 'Telegram Bot Token dan Chat ID wajib diisi' });
  }

  try {
    const testMessage = `🌊 *SISTEM MONITORING AIR SUNGAI & ARUNG JERAM* 🛶
✅ *Koneksi Telegram Bot Berhasil!*

Sistem peringatan dini (Early Warning System) aktif dan siap memantau:
• Ketinggian Air Sungai & Ambang Bahaya Banjir
• Notifikasi Baterai Kritis Sensor Hulu
• Curah Hujan & Kecepatan Angin Ekstrem

_Waktu Uji_: \`${new Date().toISOString().replace('T', ' ').substring(0, 19)}\`
_Broker MQTT_: \`${currentSettings.mqttBrokerUrl}\``;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: testMessage,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json() as { ok: boolean; description?: string };
    if (!result.ok) {
      return res.status(400).json({ error: result.description || 'Gagal mengirim pesan ke Telegram' });
    }

    res.json({ success: true, message: 'Tes notifikasi berhasil terkirim ke Telegram!' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. Get & Update Settings
app.get('/api/settings', (_req, res) => {
  res.json(getPublicSettings());
});

app.post('/api/settings', async (req, res) => {
  try {
    const newSettings = req.body as Partial<SystemSettings>;
    const prevBroker = currentSettings.mqttBrokerUrl;
    const prevTopic = currentSettings.mqttTopic;
    const prevMongo = currentSettings.mongoUri;
    const prevInterval = currentSettings.connectionCheckIntervalSec;

    if (newSettings.thresholds) {
      currentSettings.thresholds = { ...currentSettings.thresholds, ...newSettings.thresholds };

      // Threshold changes must take effect immediately for every alert category.
      // Reset transition trackers so the next evaluation uses the new configuration,
      // rather than retaining a status calculated from an older threshold.
      lastSentTelegramState.waterStatus = null;
      lastSentTelegramState.batteryStatus = null;
      lastSentTelegramState.rainStatus = null;
      lastSentTelegramState.windStatus = null;

      if (latestTelemetry) {
        latestTelemetry.battery_status = latestTelemetry.battery_percent <= currentSettings.thresholds.batteryCritPercent
          ? 'CRITICAL'
          : latestTelemetry.battery_percent <= currentSettings.thresholds.batteryLowPercent
          ? 'LOW'
          : 'NORMAL';
      }
    }
    if (newSettings.mqttBrokerUrl) currentSettings.mqttBrokerUrl = normalizeMqttUrl(newSettings.mqttBrokerUrl);
    if (newSettings.mqttTopic) currentSettings.mqttTopic = newSettings.mqttTopic.trim();

    if (typeof newSettings.connectionCheckIntervalSec === 'number') {
      const clamped = Math.max(10, Math.min(30, Number(newSettings.connectionCheckIntervalSec) || 15));
      currentSettings.connectionCheckIntervalSec = clamped;
      if (clamped !== prevInterval) {
        startConnectionCheckTimer(clamped);
      }
    }
    if (typeof newSettings.dbSaveIntervalMin === 'number') {
      currentSettings.dbSaveIntervalMin = Math.max(1, Math.min(60, Number(newSettings.dbSaveIntervalMin) || 5));
    }
    if (typeof newSettings.telegramBotToken === 'string' && !newSettings.telegramBotToken.includes('••••')) {
      currentSettings.telegramBotToken = newSettings.telegramBotToken;
    }
    if (typeof newSettings.telegramChatId === 'string') currentSettings.telegramChatId = newSettings.telegramChatId;
    if (typeof newSettings.telegramEnabled === 'boolean') currentSettings.telegramEnabled = newSettings.telegramEnabled;
    if (typeof newSettings.soundAlertEnabled === 'boolean') currentSettings.soundAlertEnabled = newSettings.soundAlertEnabled;
    if (typeof newSettings.pushAlertEnabled === 'boolean') currentSettings.pushAlertEnabled = newSettings.pushAlertEnabled;

    if (typeof newSettings.mongoUri === 'string' && !newSettings.mongoUri.includes('••••')) {
      currentSettings.mongoUri = newSettings.mongoUri;
      if (currentSettings.mongoUri !== prevMongo) {
        initMongo(currentSettings.mongoUri);
      }
    }

    // Re-connect MQTT if broker or topic changed
    if (currentSettings.mqttBrokerUrl !== prevBroker || currentSettings.mqttTopic !== prevTopic) {
      initMqtt(currentSettings.mqttBrokerUrl, currentSettings.mqttTopic);
    }

    const persisted = await persistSettingsToMongo();
    const publicSettings = getPublicSettings();
    broadcastToClients('settings:update', publicSettings);

    if (newSettings.thresholds && latestTelemetry) {
      broadcastToClients('telemetry:update', latestTelemetry);
      await evaluateAlerts(latestTelemetry);
    }

    res.json({
      success: true,
      persisted,
      settings: publicSettings,
      message: persisted
        ? 'Pengaturan berhasil disimpan permanen ke MongoDB'
        : 'Pengaturan diperbarui, tetapi belum tersimpan permanen karena MongoDB tidak terhubung',
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Vite Middleware for Development, Static Serving for Production
async function start() {
  // Load persisted configuration before the dashboard can request /api/settings.
  // This eliminates the startup race that previously returned default values first.
  if (currentSettings.mongoUri) {
    await initMongo(currentSettings.mongoUri);
  }

  // MQTT starts only after persisted broker/topic/interval settings are available.
  initMqtt(currentSettings.mqttBrokerUrl, currentSettings.mqttTopic);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server monitoring air sungai & cuaca berjalan di http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal server startup error:', err);
});
