/**
 * Firebase Realtime Database service.
 *
 * Location: backend/src/services/firebase-service.ts
 *
 * All Firebase read/write operations are centralised here. Controllers call
 * these functions and never touch the `database` reference directly.
 *
 * Database paths:
 *   bus_logs/               – pushed telemetry entries (card taps, GPS, counts, emergencies)
 *   emergency_alerts/       – pushed emergency alert entries
 *   gps_tracking/{bus_id}  – latest GPS snapshot per bus (set/overwrite)
 *   passenger_statistics/{bus_id} – latest passenger stats per bus (set/overwrite)
 */

import { getDatabase } from "../config/firebase.js";
import type { DataSnapshot } from "firebase-admin/database";
import type {
  BusLog,
  EmergencyAlert,
  GpsTracking,
  PassengerStatistics,
  SaveTelemetryPayload,
  SaveRfidTapPayload,
  SaveGpsPayload,
  SavePassengerCountPayload,
  SaveEmergencyPayload,
} from "../types/firebase.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

function isoNow(): string {
  return new Date().toISOString();
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Push a general telemetry event to bus_logs/.
 * Returns the auto-generated Firebase push key.
 */
export async function saveBusLog(payload: SaveTelemetryPayload): Promise<string> {
  const db = getDatabase();
  const entry: BusLog = {
    event_type: payload.event_type,
    passenger_count: payload.passenger_count,
    latitude: payload.latitude,
    longitude: payload.longitude,
    bus_id: payload.bus_id,
    route_id: payload.route_id,
    card_uid: payload.card_uid,
    timestamp: payload.timestamp ?? nowTs(),
    created_at: isoNow(),
  };

  // Remove undefined keys so Firebase doesn't store null values
  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined),
  );

  const ref = await db.ref("bus_logs").push(clean);
  return ref.key!;
}

/**
 * Push an RFID card tap event to bus_logs/ with event_type = "card_tap".
 */
export async function saveRfidTap(payload: SaveRfidTapPayload): Promise<string> {
  return saveBusLog({
    ...payload,
    event_type: "card_tap",
  });
}

/**
 * Set the latest GPS coordinates for a bus in gps_tracking/{bus_id}.
 * Overwrites the previous value — only the latest fix is kept.
 */
export async function saveGpsCoordinates(payload: SaveGpsPayload): Promise<void> {
  const db = getDatabase();
  const entry: GpsTracking = {
    bus_id: payload.bus_id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed,
    heading: payload.heading,
    timestamp: payload.timestamp ?? nowTs(),
    updated_at: isoNow(),
  };

  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined),
  );

  await db.ref(`gps_tracking/${payload.bus_id}`).set(clean);
}

/**
 * Set the latest passenger statistics for a bus in passenger_statistics/{bus_id}.
 * Calculates occupancy percentage automatically.
 */
export async function savePassengerCount(payload: SavePassengerCountPayload): Promise<void> {
  const db = getDatabase();
  const occupancyPct = payload.capacity > 0
    ? Math.min(100, Math.round((payload.current_count / payload.capacity) * 100))
    : 0;

  const entry: PassengerStatistics = {
    bus_id: payload.bus_id,
    current_count: payload.current_count,
    capacity: payload.capacity,
    occupancy_pct: occupancyPct,
    peak_count: payload.peak_count,
    total_boardings: payload.total_boardings,
    timestamp: payload.timestamp ?? nowTs(),
    updated_at: isoNow(),
  };

  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined),
  );

  await db.ref(`passenger_statistics/${payload.bus_id}`).set(clean);

  // Also push to bus_logs for the event feed
  await saveBusLog({
    event_type: "passenger_count",
    bus_id: payload.bus_id,
    passenger_count: payload.current_count,
    timestamp: payload.timestamp,
  });
}

/**
 * Push an emergency alert to emergency_alerts/.
 * Returns the auto-generated Firebase push key.
 */
export async function saveEmergencyAlert(payload: SaveEmergencyPayload): Promise<string> {
  const db = getDatabase();
  const entry: EmergencyAlert = {
    bus_id: payload.bus_id,
    severity: payload.severity,
    message: payload.message,
    latitude: payload.latitude,
    longitude: payload.longitude,
    timestamp: payload.timestamp ?? nowTs(),
    acknowledged: false,
    created_at: isoNow(),
  };

  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined),
  );

  const ref = await db.ref("emergency_alerts").push(clean);

  // Mirror to bus_logs for unified event feed
  await saveBusLog({
    event_type: "emergency",
    bus_id: payload.bus_id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    timestamp: payload.timestamp,
  });

  return ref.key!;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Fetch all telemetry records from bus_logs/, ordered by timestamp descending.
 * Limits to the most recent 200 entries to keep response size reasonable.
 */
export async function getAllTelemetry(limit = 200): Promise<BusLog[]> {
  const db = getDatabase();
  const snapshot = await db
    .ref("bus_logs")
    .orderByChild("timestamp")
    .limitToLast(limit)
    .get();

  if (!snapshot.exists()) return [];

  const records: BusLog[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    records.push({ ...(child.val() as BusLog) });
    return false;
  });

  // Return newest first
  return records.reverse();
}

/**
 * Fetch the latest GPS + passenger status for a specific bus.
 */
export async function getLatestBusStatus(busId: string): Promise<{
  gps: GpsTracking | null;
  passengers: PassengerStatistics | null;
}> {
  const db = getDatabase();
  const [gpsSnap, passSnap] = await Promise.all([
    db.ref(`gps_tracking/${busId}`).get(),
    db.ref(`passenger_statistics/${busId}`).get(),
  ]);

  return {
    gps: gpsSnap.exists() ? (gpsSnap.val() as GpsTracking) : null,
    passengers: passSnap.exists() ? (passSnap.val() as PassengerStatistics) : null,
  };
}

/**
 * Fetch all emergency alerts, newest first.
 * Optionally filter by acknowledged status.
 */
export async function getEmergencyAlerts(
  onlyUnacknowledged = false,
): Promise<EmergencyAlert[]> {
  const db = getDatabase();
  const snapshot = await db
    .ref("emergency_alerts")
    .orderByChild("timestamp")
    .limitToLast(100)
    .get();

  if (!snapshot.exists()) return [];

  const alerts: EmergencyAlert[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    const alert = child.val() as EmergencyAlert;
    if (!onlyUnacknowledged || !alert.acknowledged) {
      alerts.push(alert);
    }
    return false;
  });

  return alerts.reverse();
}

/**
 * Fetch passenger statistics for a specific bus.
 */
export async function getPassengerStatistics(
  busId: string,
): Promise<PassengerStatistics | null> {
  const db = getDatabase();
  const snapshot = await db.ref(`passenger_statistics/${busId}`).get();
  return snapshot.exists() ? (snapshot.val() as PassengerStatistics) : null;
}

/**
 * Acknowledge an emergency alert (mark as handled by operator).
 */
export async function acknowledgeEmergencyAlert(alertKey: string): Promise<void> {
  const db = getDatabase();
  await db.ref(`emergency_alerts/${alertKey}`).update({
    acknowledged: true,
    acknowledged_at: isoNow(),
  });
}
