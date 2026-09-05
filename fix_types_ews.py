#!/usr/bin/env python3
# Perbaikan khusus src/types.ts agar kompatibel dengan apply_ews_fix.py
# Jalankan dari root repo EWS-DigitTwin.

from pathlib import Path
import re
import sys

path = Path("src/types.ts")
if not path.exists():
    print("ERROR: src/types.ts tidak ditemukan. Jalankan dari root repo EWS-DigitTwin.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")
original = text

device_block = """// Heartbeat/status packet published by the physical IoT device.
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

"""

# 1) DeviceStatus
if "export interface DeviceStatus" not in text:
    markers = [
        "export type RaftingSafetyStatus",
        "export interface AlertEvent",
        "export interface ThresholdConfig",
        "export interface SystemSettings",
        "export interface SystemStatus",
    ]
    inserted = False
    for marker in markers:
        pos = text.find(marker)
        if pos != -1:
            text = text[:pos] + device_block + text[pos:]
            inserted = True
            print(f"[OK] DeviceStatus ditambahkan sebelum: {marker}")
            break

    if not inserted:
        # Fallback: cari akhir interface RiverTelemetry dengan brace matching sederhana.
        start = text.find("export interface RiverTelemetry")
        if start == -1:
            print("ERROR: interface RiverTelemetry tidak ditemukan.")
            sys.exit(1)

        brace_start = text.find("{", start)
        if brace_start == -1:
            print("ERROR: pembuka RiverTelemetry tidak ditemukan.")
            sys.exit(1)

        depth = 0
        end = None
        for i in range(brace_start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

        if end is None:
            print("ERROR: penutup RiverTelemetry tidak ditemukan.")
            sys.exit(1)

        text = text[:end] + "\n\n" + device_block + text[end:].lstrip("\n")
        print("[OK] DeviceStatus ditambahkan setelah RiverTelemetry")
else:
    print("[SKIP] DeviceStatus sudah ada")

# 2) Komentar windExtremeMs, dibuat sama dengan yang diharapkan updater utama.
expected_wind = """  // Stored internally as m/s to preserve the MQTT/firmware contract.
  // UI converts this value to km/jam.
  windExtremeMs: number; // e.g. 10 m/s = 36 km/jam"""

if expected_wind not in text:
    pattern = r'^[ \t]*windExtremeMs\s*:\s*number\s*;[^\n]*$'
    match = re.search(pattern, text, flags=re.MULTILINE)
    if match:
        text = text[:match.start()] + expected_wind + text[match.end():]
        print("[OK] windExtremeMs distandarkan")
    else:
        print("[WARN] windExtremeMs tidak ditemukan; dilewati")
else:
    print("[SKIP] windExtremeMs sudah sesuai")

# 3) Field device di SystemStatus
device_fields = """  mqttConnected: boolean;
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
  connectionCheckIntervalSec: number;"""

if "deviceOnline?: boolean;" not in text:
    # Pertama coba pola lengkap yang umum.
    pattern = (
        r'^[ \t]*mqttConnected\s*:\s*boolean\s*;\s*\n'
        r'^[ \t]*mqttBroker\s*:\s*string\s*;\s*\n'
        r'^[ \t]*mqttTopic\s*:\s*string\s*;\s*\n'
        r'^[ \t]*connectionCheckIntervalSec\s*:\s*number\s*;'
    )
    match = re.search(pattern, text, flags=re.MULTILINE)
    if match:
        text = text[:match.start()] + device_fields + text[match.end():]
        print("[OK] field heartbeat ditambahkan ke SystemStatus")
    else:
        # Fallback: sisipkan setelah mqttTopic di dalam SystemStatus.
        sys_pos = text.find("export interface SystemStatus")
        if sys_pos == -1:
            print("[ERROR] SystemStatus tidak ditemukan.")
            sys.exit(1)

        topic_match = re.search(r'^[ \t]*mqttTopic\s*:\s*string\s*;\s*$', text[sys_pos:], flags=re.MULTILINE)
        if not topic_match:
            print("[ERROR] mqttTopic di SystemStatus tidak ditemukan.")
            sys.exit(1)

        abs_end = sys_pos + topic_match.end()
        extra = """
  deviceOnline?: boolean;
  deviceId?: string;
  deviceLocation?: string;
  deviceConnection?: string;
  deviceLastSeen?: string;
  deviceStatusFreshnessSec?: number;
  deviceHeartbeatIntervalSec?: number;
  deviceStatusTimeoutSec?: number;
  deviceStatusTopic?: string;
  deviceStatusMessage?: string;"""
        text = text[:abs_end] + extra + text[abs_end:]
        print("[OK] field heartbeat disisipkan setelah mqttTopic")
else:
    print("[SKIP] field heartbeat sudah ada")

if text != original:
    backup = path.with_suffix(".ts.before-device-fix")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
        print(f"[BACKUP] {backup}")
    path.write_text(text, encoding="utf-8")
    print("[DONE] src/types.ts sudah diperbaiki.")
else:
    print("[DONE] Tidak ada perubahan yang diperlukan.")

print("""
LANJUTKAN:
1. Jalankan kembali:
   python apply_ews_fix.py

2. Jika selesai tanpa ERROR:
   npm run build

3. Jika build sukses:
   git diff
   git add .
   git commit -m "Fix IoT heartbeat status and wind display"
   git push
""")
