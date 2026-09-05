#!/usr/bin/env python3
# Updater untuk repo https://github.com/subairi/EWS-DigitTwin
#
# Perubahan:
# - Pisahkan MQTT /data dan /status
# - Heartbeat device online/offline
# - Badge device di header
# - WebSocket frontend tidak lagi memalsukan mqttConnected=true
# - Tampilan angin km/jam (data internal MQTT tetap wind_ms)
# - CSV berisi m/s + km/jam
# - Endpoint /api/device/status
# - MQTT_STATUS_TOPIC di .env.example
#
# Jalankan dari ROOT repository:
#     python apply_ews_fix.py

from pathlib import Path
import sys

ROOT = Path.cwd()
changed_files = []

def replace_once(relpath: str, old: str, new: str, desc: str):
    path = ROOT / relpath
    if not path.exists():
        raise RuntimeError(f"{relpath}: file tidak ditemukan. Jalankan script dari root repo.")

    text = path.read_text(encoding="utf-8")

    if old not in text:
        if new in text:
            print(f"[SKIP] {relpath}: {desc} (sudah diterapkan)")
            return
        raise RuntimeError(
            f"{relpath}: blok untuk '{desc}' tidak ditemukan.\n"
            "Repo mungkin sudah berubah. Hentikan agar tidak merusak file."
        )

    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    if relpath not in changed_files:
        changed_files.append(relpath)
    print(f"[OK]   {relpath}: {desc}")

def main():
    replace_once(
        ".env.example",
        '''MQTT_BROKER_URL="mqtt://broker.emqx.io:1883"
MQTT_TOPIC="digitaltwin/lokasi1/data"
# MQTT Connection Check Interval in seconds (range: 10 to 30 seconds)''',
        '''MQTT_BROKER_URL="mqtt://broker.emqx.io:1883"
MQTT_TOPIC="digitaltwin/lokasi1/data"
# Device heartbeat / online status topic
MQTT_STATUS_TOPIC="digitaltwin/lokasi1/status"
# MQTT Connection Check Interval in seconds (range: 10 to 30 seconds)''',
        "tambah MQTT_STATUS_TOPIC",
    )

    replace_once(
        "src/types.ts",
        '''  received_at?: string;
}
export type RaftingSafetyStatus = 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA';''',
        '''  received_at?: string;
}

// Heartbeat/status packet published by the physical IoT device.
// Example topic: digitaltwin/lokasi1/status
export interface DeviceStatus {
  device: string;
  location: string;
  message: 'online' | 'offline' | string;
  send_interval_sec: number;
  timestamp: string;
  connection: string;
  received_at?: string;
}

export type RaftingSafetyStatus = 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA';''',
        "tambah tipe DeviceStatus",
    )

    replace_once(
        "src/types.ts",
        '''  windExtremeMs: number; // e.g. 12 m/s''',
        '''  // Stored internally as m/s to preserve the MQTT/firmware contract.
  // UI converts this value to km/jam.
  windExtremeMs: number; // e.g. 10 m/s = 36 km/jam''',
        "jelaskan satuan internal threshold angin",
    )

    replace_once(
        "src/types.ts",
        '''  mqttConnected: boolean;
  mqttBroker: string;
  mqttTopic: string;
  connectionCheckIntervalSec: number;''',
        '''  mqttConnected: boolean;
  mqttBroker: string;
  mqttTopic: string;
  deviceOnline?: boolean;
  deviceId?: string;
  deviceLocation?: string;
  deviceConnection?: string;
  deviceLastSeen?: string;
  deviceStatusFreshnessSec?: number;
  deviceHeartbeatIntervalSec?: number;
  deviceStatusTimeoutSec?: number;
  deviceStatusTopic?: string;
  deviceStatusMessage?: string;
  connectionCheckIntervalSec: number;''',
        "tambah field heartbeat pada SystemStatus",
    )

    replace_once(
        "server.ts",
        '''import { RiverTelemetry, AlertEvent, ThresholdConfig, SystemSettings, SystemStatus } from './src/types';''',
        '''import { RiverTelemetry, DeviceStatus, AlertEvent, ThresholdConfig, SystemSettings, SystemStatus } from './src/types';''',
        "import DeviceStatus",
    )

    replace_once(
        "server.ts",
        '''dotenv.config();
const PORT = Number(process.env.PORT) || 10000;
const app = express();''',
        '''dotenv.config();
const PORT = Number(process.env.PORT) || 10000;
const DEVICE_STATUS_TOPIC = (process.env.MQTT_STATUS_TOPIC || 'digitaltwin/lokasi1/status').trim();
const app = express();''',
        "konfigurasi topic status device",
    )

    replace_once(
        "server.ts",
        '''let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;
// Settings with defaults''',
        '''let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;
let latestDeviceStatus: DeviceStatus | null = null;
let lastDeviceStatusReceivedAt = 0;
// Settings with defaults''',
        "state heartbeat device",
    )

    replace_once(
        "server.ts",
        '''function broadcastToClients(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
// Telegram Alert Dispatcher''',
        '''function broadcastToClients(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getDeviceStatusSnapshot() {
  const heartbeatIntervalSec = Math.max(
    1,
    Number(latestDeviceStatus?.send_interval_sec || 10),
  );
  const timeoutSec = Math.max(30, heartbeatIntervalSec * 3);
  const freshnessSec = lastDeviceStatusReceivedAt > 0
    ? Math.max(0, Math.round((Date.now() - lastDeviceStatusReceivedAt) / 1000))
    : undefined;
  const messageOnline = latestDeviceStatus?.message?.toLowerCase() === 'online';
  const deviceOnline = Boolean(
    messageOnline &&
    typeof freshnessSec === 'number' &&
    freshnessSec <= timeoutSec,
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
    let data: Partial<DeviceStatus>;
    if (typeof rawPayload === 'string') {
      data = JSON.parse(rawPayload);
    } else {
      data = rawPayload as Partial<DeviceStatus>;
    }

    if (!data || !data.device || !data.message) {
      console.warn('[MQTT STATUS] Invalid device status packet:', rawPayload);
      return;
    }

    latestDeviceStatus = {
      device: String(data.device),
      location: String(data.location || 'lokasi1'),
      message: String(data.message).toLowerCase(),
      send_interval_sec: Math.max(1, Number(data.send_interval_sec || 10)),
      timestamp: String(
        data.timestamp ||
        new Date().toISOString().replace('T', ' ').substring(0, 19),
      ),
      connection: String(data.connection || 'unknown'),
      received_at: new Date().toISOString(),
    };
    lastDeviceStatusReceivedAt = Date.now();

    const snapshot = getDeviceStatusSnapshot();
    console.log(
      `[MQTT DEVICE] ${latestDeviceStatus.device} | ${latestDeviceStatus.location} | ` +
      `${snapshot.deviceOnline ? 'ONLINE' : 'OFFLINE'} | ${latestDeviceStatus.connection}`,
    );
    broadcastToClients('device:status', snapshot);
  } catch (err) {
    console.error('[MQTT STATUS] Error processing device status:', err);
  }
}

// Telegram Alert Dispatcher''',
        "parser dan heartbeat status device",
    )

    replace_once(
        "server.ts",
        '''💨 *Kecepatan Angin*: \\`${details.wind_ms} m/s\\`''',
        '''💨 *Kecepatan Angin*: \\`${(details.wind_ms * 3.6).toFixed(1)} km/jam\\`''',
        "Telegram memakai km/jam",
    )

    replace_once(
        "server.ts",
        '''        message: `Kecepatan angin mencapai ${telemetry.wind_ms} m/s (${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam).`,
        metricValue: `${telemetry.wind_ms} m/s`,''',
        '''        message: `Kecepatan angin mencapai ${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam.`,
        metricValue: `${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam`,''',
        "alert angin awal memakai km/jam",
    )

    replace_once(
        "server.ts",
        '''        message: `Kondisi angin BERUBAH ke KENCANG! Kecepatan angin mencapai ${telemetry.wind_ms} m/s (${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam). Waspadai pohon tumbang di jalur arung jeram!`,
        metricValue: `${telemetry.wind_ms} m/s`,''',
        '''        message: `Kondisi angin BERUBAH ke KENCANG! Kecepatan angin mencapai ${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam. Waspadai pohon tumbang di jalur arung jeram!`,
        metricValue: `${(telemetry.wind_ms * 3.6).toFixed(1)} km/jam`,''',
        "alert perubahan angin memakai km/jam",
    )

    replace_once(
        "server.ts",
        '''  const healthStatus: 'optimal' | 'idle' | 'warning' | 'disconnected' = !isConnected
    ? 'disconnected'
    : sensorFreshnessSec <= currentSettings.connectionCheckIntervalSec * 2
    ? 'optimal'
    : 'idle';
  broadcastToClients('mqtt:status', {''',
        '''  const healthStatus: 'optimal' | 'idle' | 'warning' | 'disconnected' = !isConnected
    ? 'disconnected'
    : sensorFreshnessSec <= currentSettings.connectionCheckIntervalSec * 2
    ? 'optimal'
    : 'idle';
  const deviceStatusSnapshot = getDeviceStatusSnapshot();
  broadcastToClients('mqtt:status', {''',
        "hitung status heartbeat saat connection check",
    )

    replace_once(
        "server.ts",
        '''    lastSentTelegramWaterStatus: lastSentTelegramState.waterStatus || undefined,
  });
}
function startConnectionCheckTimer(intervalSec: number) {''',
        '''    lastSentTelegramWaterStatus: lastSentTelegramState.waterStatus || undefined,
  });
  // Device heartbeat is deliberately separate from broker connectivity.
  broadcastToClients('device:status', deviceStatusSnapshot);
}
function startConnectionCheckTimer(intervalSec: number) {''',
        "broadcast heartbeat berkala",
    )

    replace_once(
        "server.ts",
        '''      activeMqttClient?.subscribe(cleanTopic, { qos: 0 }, (err) => {
        if (err) {
          console.error('MQTT Subscription error:', err);
        } else {
          console.log(`MQTT Subscribed successfully to: ${cleanTopic}`);
        }
      });
      // Also subscribe to digitaltwin wildcard topics so all devices/nested data are captured''',
        '''      activeMqttClient?.subscribe(cleanTopic, { qos: 0 }, (err) => {
        if (err) {
          console.error('MQTT Subscription error:', err);
        } else {
          console.log(`MQTT Subscribed successfully to: ${cleanTopic}`);
        }
      });
      // Explicit device heartbeat/status subscription.
      activeMqttClient?.subscribe(DEVICE_STATUS_TOPIC, { qos: 0 }, (err) => {
        if (err) {
          console.error('MQTT Status Subscription error:', err);
        } else {
          console.log(`MQTT Subscribed successfully to device status: ${DEVICE_STATUS_TOPIC}`);
        }
      });
      // Also subscribe to digitaltwin wildcard topics so all devices/nested data are captured''',
        "subscribe topic status secara eksplisit",
    )

    replace_once(
        "server.ts",
        '''    activeMqttClient.on('message', (receivedTopic, payload) => {
      try {
        const str = payload.toString();
        processIncomingTelemetry(str);
      } catch (err) {
        console.error(`Error handling MQTT message on ${receivedTopic}:`, err);
      }
    });''',
        '''    activeMqttClient.on('message', async (receivedTopic, payload) => {
      try {
        const str = payload.toString();
        console.log(`[MQTT RX] ${receivedTopic}`);

        // Device heartbeat/status packets are NOT telemetry packets.
        if (receivedTopic === DEVICE_STATUS_TOPIC || receivedTopic.endsWith('/status')) {
          processIncomingDeviceStatus(str);
          return;
        }

        // Sensor telemetry.
        if (
          receivedTopic === currentSettings.mqttTopic ||
          receivedTopic.endsWith('/data') ||
          receivedTopic.startsWith('river/telemetry/')
        ) {
          await processIncomingTelemetry(str);
          return;
        }

        console.log(`[MQTT] Topic tidak dikenali, diabaikan: ${receivedTopic}`);
      } catch (err) {
        console.error(`Error handling MQTT message on ${receivedTopic}:`, err);
      }
    });''',
        "routing MQTT /data dan /status",
    )

    replace_once(
        "server.ts",
        '''        mqttConnected: activeMqttClient?.connected || false,
        mqttBroker: currentSettings.mqttBrokerUrl,
        mqttTopic: currentSettings.mqttTopic,
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,''',
        '''        mqttConnected: activeMqttClient?.connected || false,
        mqttBroker: currentSettings.mqttBrokerUrl,
        mqttTopic: currentSettings.mqttTopic,
        ...getDeviceStatusSnapshot(),
        connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,''',
        "heartbeat pada WebSocket init",
    )

    replace_once(
        "server.ts",
        '''    mqttConnected: isConnected,
    mqttBroker: currentSettings.mqttBrokerUrl,
    mqttTopic: currentSettings.mqttTopic,
    connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,''',
        '''    mqttConnected: isConnected,
    mqttBroker: currentSettings.mqttBrokerUrl,
    mqttTopic: currentSettings.mqttTopic,
    ...getDeviceStatusSnapshot(),
    connectionCheckIntervalSec: currentSettings.connectionCheckIntervalSec,''',
        "heartbeat pada /api/status",
    )

    replace_once(
        "server.ts",
        '''  res.json(status);
});
// 2. Latest Telemetry''',
        '''  res.json(status);
});

// Device heartbeat status endpoint (separate from MQTT broker status).
app.get('/api/device/status', (_req, res) => {
  res.json(getDeviceStatusSnapshot());
});

// 2. Latest Telemetry''',
        "endpoint /api/device/status",
    )

    replace_once(
        "server.ts",
        '''      'Wind_Speed_ms',
      'Temperature_C',''',
        '''      'Wind_Speed_ms',
      'Wind_Speed_kmh',
      'Temperature_C',''',
        "kolom CSV km/jam",
    )

    replace_once(
        "server.ts",
        '''      t.wind_ms,
      t.temperature_c,''',
        '''      t.wind_ms,
      Number((t.wind_ms * 3.6).toFixed(1)),
      t.temperature_c,''',
        "nilai CSV km/jam",
    )

    replace_once(
        "src/App.tsx",
        '''    mqttConnected: true,
    mqttBroker: 'mqtt://broker.emqx.io:1883',
    mqttTopic: 'digitaltwin/lokasi1/data',
    connectionCheckIntervalSec: 15,''',
        '''    mqttConnected: true,
    mqttBroker: 'mqtt://broker.emqx.io:1883',
    mqttTopic: 'digitaltwin/lokasi1/data',
    deviceOnline: false,
    deviceStatusTopic: 'digitaltwin/lokasi1/status',
    connectionCheckIntervalSec: 15,''',
        "default status device",
    )

    replace_once(
        "src/App.tsx",
        '''        ws.onopen = () => {
          setStatus((prev) => ({ ...prev, mqttConnected: true }));
        };''',
        '''        ws.onopen = () => {
          // WebSocket connected does not imply that the MQTT broker is connected.
          fetch('/api/status')
            .then((r) => r.json())
            .then((s) => setStatus(s))
            .catch(() => {});
        };''',
        "hindari false-positive MQTT dari WebSocket",
    )

    replace_once(
        "src/App.tsx",
        '''                lastSentTelegramWaterStatus: data.payload.lastSentTelegramWaterStatus || prev.lastSentTelegramWaterStatus,
              }));
            } else if (data.type === 'mongo:status') {''',
        '''                lastSentTelegramWaterStatus: data.payload.lastSentTelegramWaterStatus || prev.lastSentTelegramWaterStatus,
              }));
            } else if (data.type === 'device:status') {
              setStatus((prev) => ({
                ...prev,
                deviceOnline: data.payload.deviceOnline ?? prev.deviceOnline,
                deviceId: data.payload.deviceId ?? prev.deviceId,
                deviceLocation: data.payload.deviceLocation ?? prev.deviceLocation,
                deviceConnection: data.payload.deviceConnection ?? prev.deviceConnection,
                deviceLastSeen: data.payload.deviceLastSeen ?? prev.deviceLastSeen,
                deviceStatusFreshnessSec: data.payload.deviceStatusFreshnessSec ?? prev.deviceStatusFreshnessSec,
                deviceHeartbeatIntervalSec: data.payload.deviceHeartbeatIntervalSec ?? prev.deviceHeartbeatIntervalSec,
                deviceStatusTimeoutSec: data.payload.deviceStatusTimeoutSec ?? prev.deviceStatusTimeoutSec,
                deviceStatusTopic: data.payload.deviceStatusTopic ?? prev.deviceStatusTopic,
                deviceStatusMessage: data.payload.deviceStatusMessage ?? prev.deviceStatusMessage,
              }));
            } else if (data.type === 'mongo:status') {''',
        "terima WebSocket device:status",
    )

    replace_once(
        "src/components/Header.tsx",
        '''              <Radio className={`h-3.5 w-3.5 ${status.mqttConnected ? 'animate-pulse text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
              <span>MQTT: {status.mqttConnected ? `EMQX (${status.connectionCheckIntervalSec || 15}s)` : 'Reconnecting'}</span>
            </div>
            {/* MongoDB Atlas Badge */}''',
        '''              <Radio className={`h-3.5 w-3.5 ${status.mqttConnected ? 'animate-pulse text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
              <span>MQTT: {status.mqttConnected ? `EMQX (${status.connectionCheckIntervalSec || 15}s)` : 'Reconnecting'}</span>
            </div>
            {/* Physical IoT Device Heartbeat Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                status.deviceOnline
                  ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80'
                  : 'bg-rose-50/90 text-rose-700 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80'
              }`}
              title={
                `Device: ${status.deviceId || latest.device} | ` +
                `Status topic: ${status.deviceStatusTopic || 'digitaltwin/lokasi1/status'} | ` +
                `Connection: ${status.deviceConnection || '-'} | ` +
                `Last seen: ${status.deviceLastSeen || 'belum ada heartbeat'} | ` +
                `Freshness: ${status.deviceStatusFreshnessSec ?? '-'}s`
              }
            >
              <Wifi className={`h-3.5 w-3.5 ${status.deviceOnline ? 'text-emerald-600 animate-pulse' : 'text-rose-500'}`} />
              <span>
                Device: {status.deviceOnline ? 'Online' : 'Offline'}
                {status.deviceOnline && typeof status.deviceStatusFreshnessSec === 'number'
                  ? ` (${status.deviceStatusFreshnessSec}s)`
                  : ''}
              </span>
            </div>
            {/* MongoDB Atlas Badge */}''',
        "badge Device Online/Offline",
    )

    replace_once(
        "src/components/MetricCards.tsx",
        '''              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {telemetry.wind_ms}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">m/s</span>
              <span className="text-xs text-slate-400 ml-1">({(telemetry.wind_ms * 3.6).toFixed(1)} km/j)</span>''',
        '''              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {(telemetry.wind_ms * 3.6).toFixed(1)}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">km/jam</span>''',
        "kartu angin km/jam",
    )

    replace_once(
        "src/components/AnalyticsCharts.tsx",
        '''      wind_speed: item.wind_ms,''',
        '''      wind_speed: Number((item.wind_ms * 3.6).toFixed(1)),''',
        "data grafik angin km/jam",
    )

    replace_once(
        "src/components/AnalyticsCharts.tsx",
        '''              <YAxis yAxisId="wind" unit="m/s" tick={{ fontSize: 11 }} stroke="#0d9488" />''',
        '''              <YAxis yAxisId="wind" unit=" km/j" tick={{ fontSize: 11 }} stroke="#0d9488" />''',
        "sumbu grafik km/jam",
    )

    replace_once(
        "src/components/AnalyticsCharts.tsx",
        '''                y={thresholds.windExtremeMs}
                label={{ value: 'Angin Kencang (10 m/s)', fill: '#e11d48', fontSize: 10 }}''',
        '''                y={thresholds.windExtremeMs * 3.6}
                label={{ value: `Angin Kencang (${(thresholds.windExtremeMs * 3.6).toFixed(1)} km/jam)`, fill: '#e11d48', fontSize: 10 }}''',
        "garis threshold grafik km/jam",
    )

    replace_once(
        "src/components/AnalyticsCharts.tsx",
        '''              <Line yAxisId="wind" type="monotone" dataKey="wind_speed" name="Kecepatan Angin (m/s)" stroke="#0d9488" strokeWidth={2} dot={false} />''',
        '''              <Line yAxisId="wind" type="monotone" dataKey="wind_speed" name="Kecepatan Angin (km/jam)" stroke="#0d9488" strokeWidth={2} dot={false} />''',
        "legend grafik km/jam",
    )

    replace_once(
        "src/components/DataTable.tsx",
        '''              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Angin (m/s)</th>''',
        '''              <th className="py-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80">Angin (km/jam)</th>''',
        "header tabel angin km/jam",
    )

    replace_once(
        "src/components/DataTable.tsx",
        '''                      {row.wind_ms} m/s''',
        '''                      {(row.wind_ms * 3.6).toFixed(1)} km/jam''',
        "nilai tabel angin km/jam",
    )

    replace_once(
        "src/components/ConfigurationPage.tsx",
        '''                  Kecepatan Angin Maksimal (m/s)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={th.windExtremeMs || 10}
                    onChange={(e) => handleThresholdChange('windExtremeMs', parseFloat(e.target.value) || 10)}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                  <span className="text-xs text-slate-500">m/s</span>''',
        '''                  Kecepatan Angin Maksimal (km/jam)
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
                  <span className="text-xs text-slate-500">km/jam</span>''',
        "threshold konfigurasi dalam km/jam",
    )

    replace_once(
        "src/components/SettingsModal.tsx",
        '''                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Angin Kencang (m/s)</label>
                <input
                  type="number"
                  value={formData.thresholds.windExtremeMs}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, windExtremeMs: Number(e.target.value) }
                  })}''',
        '''                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Angin Kencang (km/jam)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={(formData.thresholds.windExtremeMs * 3.6).toFixed(1)}
                  onChange={(e) => setFormData({
                    ...formData,
                    thresholds: { ...formData.thresholds, windExtremeMs: Number(e.target.value) / 3.6 }
                  })}''',
        "threshold Settings dalam km/jam",
    )

    replace_once(
        "src/components/SimulatorModal.tsx",
        '''                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {formData.wind_ms} m/s
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={formData.wind_ms}
                onChange={(e) => setFormData({ ...formData, wind_ms: parseFloat(e.target.value) })}
                className="w-full accent-teal-600 cursor-pointer"
              />''',
        '''                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
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
              <p className="mt-1 text-[10px] text-slate-400">
                Tampilan menggunakan km/jam; payload MQTT tetap memakai field wind_ms (m/s) agar kompatibel dengan firmware.
              </p>''',
        "slider simulator memakai km/jam",
    )

    print("\nSelesai.")
    if changed_files:
        print("File yang diubah:")
        for f in changed_files:
            print(f"  - {f}")
    print("\nLangkah berikut:")
    print("  npm install")
    print("  npm run build")
    print("  git diff")
    print('  git add . && git commit -m "Fix IoT heartbeat status and wind display" && git push')
    print("\nRender environment:")
    print("  MQTT_TOPIC=digitaltwin/lokasi1/data")
    print("  MQTT_STATUS_TOPIC=digitaltwin/lokasi1/status")
    print("  NODE_ENV=production")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
