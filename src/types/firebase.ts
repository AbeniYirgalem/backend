/**
 * Firebase data structure TypeScript interfaces.
 *
 * Location: backend/src/types/firebase.ts
 *
 * These interfaces describe the shape of documents stored in Firebase
 * Realtime Database, matching the ESP32 telemetry payload format.
 */

/** Telemetry event type identifiers sent by the ESP32 device */
export type EventType =
  | "card_tap"
  | "gps_update"
  | "passenger_count"
  | "emergency"
  | "heartbeat";

/**
 * bus_logs/{pushId}
 *
 * A single bus telemetry log entry. The ESP32 may send all fields
 * at once or only a subset depending on the event type.
 */
export interface BusLog {
  event_type: EventType;
  /** RFID card UID — present for card_tap events */
  card_uid?: string;
  /** Current passenger count on the bus */
  passenger_count?: number;
  /** GPS latitude */
  latitude?: number;
  /** GPS longitude */
  longitude?: number;
  /** Bus identifier (plate number or internal ID) */
  bus_id?: string;
  /** Route identifier */
  route_id?: string;
  /** Unix timestamp (seconds) */
  timestamp: number;
  /** Human-readable ISO timestamp — added by server */
  created_at?: string;
}

/**
 * emergency_alerts/{pushId}
 *
 * An emergency alert raised by the driver or detected by the system.
 */
export interface EmergencyAlert {
  bus_id: string;
  /** Alert severity */
  severity: "low" | "medium" | "high" | "critical";
  /** Short description of the emergency */
  message: string;
  latitude?: number;
  longitude?: number;
  /** Unix timestamp */
  timestamp: number;
  /** Whether the alert has been acknowledged by an operator */
  acknowledged: boolean;
  created_at?: string;
}

/**
 * gps_tracking/{bus_id}
 *
 * Latest GPS snapshot for a specific bus. Overwritten on each update.
 */
export interface GpsTracking {
  bus_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  /** Unix timestamp of the last GPS fix */
  timestamp: number;
  updated_at?: string;
}

/**
 * passenger_statistics/{bus_id}
 *
 * Rolling passenger count statistics for a specific bus.
 */
export interface PassengerStatistics {
  bus_id: string;
  current_count: number;
  /** Maximum capacity of the bus */
  capacity: number;
  /** Occupancy as a percentage 0–100 */
  occupancy_pct: number;
  /** Peak passenger count observed during this trip */
  peak_count?: number;
  /** Total boarding events since trip start */
  total_boardings?: number;
  timestamp: number;
  updated_at?: string;
}

/** Payload accepted by POST /api/firebase/telemetry */
export interface SaveTelemetryPayload {
  event_type: EventType;
  card_uid?: string;
  passenger_count?: number;
  latitude?: number;
  longitude?: number;
  bus_id?: string;
  route_id?: string;
  timestamp?: number;
}

/** Payload accepted by POST /api/firebase/rfid-tap */
export interface SaveRfidTapPayload {
  card_uid: string;
  bus_id?: string;
  route_id?: string;
  passenger_count?: number;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
}

/** Payload accepted by POST /api/firebase/gps */
export interface SaveGpsPayload {
  bus_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
}

/** Payload accepted by POST /api/firebase/passenger-count */
export interface SavePassengerCountPayload {
  bus_id: string;
  current_count: number;
  capacity: number;
  peak_count?: number;
  total_boardings?: number;
  timestamp?: number;
}

/** Payload accepted by POST /api/firebase/emergency */
export interface SaveEmergencyPayload {
  bus_id: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
}
