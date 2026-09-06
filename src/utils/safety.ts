import { RiverTelemetry, RaftingAssessment, RaftingSafetyStatus, ThresholdConfig } from '../types';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  batteryCritPercent: 15,
  batteryLowPercent: 25,
  waterLevelWaspada: 2.0,
  waterLevelSiaga: 2.5,
  waterLevelBahaya: 3.2,
  rainExtreme1H: 20,
  rainExtreme24H: 50,
  windExtremeMs: 10,
};

export function assessRaftingSafety(
  telemetry: RiverTelemetry,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): RaftingAssessment {
  const level = telemetry.river_level_m;
  const rain1H = telemetry.rain_mm_1H;
  const rain24H = telemetry.rain_mm_24H;
  const wind = telemetry.wind_ms;

  const rainExtreme = rain1H >= thresholds.rainExtreme1H || rain24H >= thresholds.rainExtreme24H;
  const windExtreme = wind >= thresholds.windExtremeMs;

  // BAHAYA uses the configured water danger threshold. Rain/wind only have one
  // configurable extreme threshold, so they elevate the operational status to SIAGA
  // rather than relying on hidden hard-coded "critical" values.
  if (level >= thresholds.waterLevelBahaya) {
    return {
      status: 'BAHAYA',
      gradeText: 'Level V+ (Extreme Flood Danger)',
      recommendation: 'ARUNG JERAM DILARANG TOTAL! Evakuasi seluruh armada dan wisatawan dari bibir sungai. Potensi banjir bandang dan pusaran air mematikan!',
      color: 'text-rose-600 dark:text-rose-400',
      bgLight: 'bg-rose-50/90 dark:bg-rose-950/40',
      borderLight: 'border-rose-300 dark:border-rose-800',
      isRaftingAllowed: false,
      hazardNote: `Ketinggian air ${level.toFixed(2)}m (Ambang Bahaya: ${thresholds.waterLevelBahaya}m).`,
    };
  }

  // SIAGA follows only values that can be configured from the dashboard.
  if (level >= thresholds.waterLevelSiaga || rainExtreme || windExtreme) {
    const causes: string[] = [];
    if (level >= thresholds.waterLevelSiaga) causes.push(`air ${level.toFixed(2)}m ≥ ${thresholds.waterLevelSiaga}m`);
    if (rain1H >= thresholds.rainExtreme1H) causes.push(`hujan 1 jam ${rain1H}mm ≥ ${thresholds.rainExtreme1H}mm`);
    if (rain24H >= thresholds.rainExtreme24H) causes.push(`hujan 24 jam ${rain24H}mm ≥ ${thresholds.rainExtreme24H}mm`);
    if (windExtreme) causes.push(`angin ${(wind * 3.6).toFixed(1)} km/jam ≥ ${(thresholds.windExtremeMs * 3.6).toFixed(1)} km/jam`);
    return {
      status: 'SIAGA',
      gradeText: 'Level IV (High Risk / Extreme Weather)',
      recommendation: 'Tunda peluncuran trip arung jeram dan lakukan pemantauan ketat sampai parameter kembali di bawah ambang yang dikonfigurasi.',
      color: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-50/90 dark:bg-amber-950/40',
      borderLight: 'border-amber-300 dark:border-amber-800',
      isRaftingAllowed: false,
      hazardNote: causes.length ? `Pemicu: ${causes.join(' | ')}` : undefined,
    };
  }

  if (level >= thresholds.waterLevelWaspada) {
    return {
      status: 'WASPADA',
      gradeText: 'Level III (Moderate Rapids / Rapid Rise)',
      recommendation: 'Arung jeram diizinkan dengan pengawasan ketat. Wajib helm & life jacket bersertifikasi, skipper berpengalaman, dan pantau kenaikan air hulu setiap 10 menit.',
      color: 'text-amber-700 dark:text-amber-300',
      bgLight: 'bg-amber-50/60 dark:bg-amber-950/30',
      borderLight: 'border-amber-200 dark:border-amber-800/80',
      isRaftingAllowed: true,
      hazardNote: `Ketinggian air ${level.toFixed(2)}m telah melewati ambang waspada ${thresholds.waterLevelWaspada}m.`,
    };
  }

  return {
    status: 'AMAN',
    gradeText: 'Level I - II (Ideal & Safe Recreational Water)',
    recommendation: 'Kondisi air sungai sangat aman dan ideal untuk wisata keluarga dan pemula. Cuaca dan debit air terkendali.',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    borderLight: 'border-emerald-200 dark:border-emerald-800/80',
    isRaftingAllowed: true,
  };
}

export function formatUptime(uptimeMs: number): string {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}h ${hours}j ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}d`;
  }
  return `${minutes}m ${seconds}d`;
}

export function getSignalQuality(rssi: number): { label: string; percent: number; color: string } {
  if (rssi >= -50) return { label: 'Sangat Kuat', percent: 100, color: 'text-emerald-500' };
  if (rssi >= -70) return { label: 'Bagus', percent: 75, color: 'text-emerald-500' };
  if (rssi >= -85) return { label: 'Sedang', percent: 50, color: 'text-yellow-500' };
  if (rssi >= -100) return { label: 'Lemah', percent: 25, color: 'text-amber-500' };
  return { label: 'Sangat Lemah / Putus', percent: 10, color: 'text-red-500' };
}
