export interface RiverTelemetry {
  device: string;
  location: string;
  fw_version: string;
  connection: string;
  timestamp: string;
  send_interval_sec: number;
  uptime_ms: number;
  rain_mm_1H: number;
  rain_mm_24H: number;
  wind_ms: number;
  temperature_c: number;
  humidity_percent: number;
  river_level_m: number;
  battery_voltage_v: number;
  battery_percent: number;
  battery_status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'FULL' | string;
  wifi_rssi: number;
  gsm_signal: number;
  _id?: string;
  received_at?: string;
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

export type RaftingSafetyStatus = 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA';

export interface RaftingAssessment {
  status: RaftingSafetyStatus;
  gradeText: string;
  recommendation: string;
  color: string;
  bgLight: string;
  borderLight: string;
  isRaftingAllowed: boolean;
  hazardNote?: string;
}

export interface ThresholdConfig {
  batteryCritPercent: number; // e.g. 15%
  batteryLowPercent: number; // e.g. 25%
  waterLevelWaspada: number; // e.g. 2.0 m
  waterLevelSiaga: number; // e.g. 2.5 m
  waterLevelBahaya: number; // e.g. 3.2 m
  rainExtreme1H: number; // e.g. 25 mm/h
  rainExtreme24H: number; // e.g. 60 mm/24h
  // Stored internally as m/s to preserve the MQTT/firmware contract.
  // UI converts this value to km/jam.
  windExtremeMs: number; // e.g. 10 m/s = 36 km/jam
}

export interface SystemSettings {
  mqttBrokerUrl: string;
  mqttTopic: string;
  connectionCheckIntervalSec: number; // 10 to 30 seconds
  dbSaveIntervalMin: number; // e.g. 5 minutes for database storage
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  soundAlertEnabled: boolean;
  pushAlertEnabled: boolean;
  mongoUri: string;
  thresholds: ThresholdConfig;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  type: 'battery' | 'water_level' | 'rain' | 'wind' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metricValue?: number | string;
  dispatchedTelegram: boolean;
  dispatchedPush: boolean;
}

export interface SystemStatus {
  mqttConnected: boolean;
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
  devicePresenceSource?: 'telemetry' | 'status';
  deviceDataIntervalSec?: number;
  deviceDataTopic?: string;
  lastDeviceEventAt?: string;
  lastDeviceEventMessage?: string;
  connectionCheckIntervalSec: number;
  lastConnectionCheckTime?: string;
  connectionHealth?: 'optimal' | 'idle' | 'warning' | 'disconnected';
  dbSaveIntervalMin: number;
  lastDbSaveTime?: string;
  totalDbSnapshotsSaved?: number;
  mongoConnected: boolean;
  mongoDatabaseName?: string;
  telegramConfigured: boolean;
  telegramDeduplicationActive?: boolean;
  totalTelegramDispatched?: number;
  totalDuplicateAlertsSuppressed?: number;
  lastSentTelegramWaterStatus?: string;
  lastPacketTime: string | null;
  totalPacketsReceived: number;
  activeClientsCount: number;
  uptimeSeconds: number;
}
