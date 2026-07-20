import type { IntegrationEvent, IntegrationEventType } from '../../types';

const SUPPORTED_TYPES = new Set<IntegrationEventType>([
  'steps', 'active_energy_kcal', 'workout_minutes', 'workout', 'sleep_duration_hours',
  'sleep_score', 'sleep_latency_minutes', 'hrv_ms', 'recovery_score',
  'resting_heart_rate_bpm', 'weight_kg', 'body_fat_percent',
  'calorie_adherence_percent', 'macro_quality_score', 'meal_quality_score',
  'hydration_liters', 'mood_score', 'stress_score', 'meditation_minutes',
  'focus_minutes', 'therapy_session', 'glucose_mg_dl', 'blood_pressure_systolic',
  'blood_pressure_diastolic', 'spo2_percent',
]);

const aliases: Record<string, IntegrationEventType> = {
  steps: 'steps', step_count: 'steps', active_calories: 'active_energy_kcal', calories_burned: 'active_energy_kcal',
  active_energy_kcal: 'active_energy_kcal', workout_minutes: 'workout_minutes', exercise_minutes: 'workout_minutes',
  duration_minutes: 'workout_minutes', workout: 'workout', activity: 'workout',
  sleep_duration: 'sleep_duration_hours', sleep_hours: 'sleep_duration_hours', sleep_duration_hours: 'sleep_duration_hours', sleep_duration_minutes: 'sleep_duration_hours',
  sleep_score: 'sleep_score', sleep_quality: 'sleep_score', sleep_latency: 'sleep_latency_minutes',
  sleep_latency_minutes: 'sleep_latency_minutes', hrv: 'hrv_ms', hrv_ms: 'hrv_ms', rmssd: 'hrv_ms',
  readiness_score: 'recovery_score', recovery: 'recovery_score', recovery_score: 'recovery_score',
  resting_heart_rate: 'resting_heart_rate_bpm', resting_heart_rate_bpm: 'resting_heart_rate_bpm',
  weight: 'weight_kg', weight_kg: 'weight_kg', body_fat: 'body_fat_percent', body_fat_percent: 'body_fat_percent',
  calorie_adherence: 'calorie_adherence_percent', calorie_adherence_percent: 'calorie_adherence_percent',
  macro_quality: 'macro_quality_score', macro_quality_score: 'macro_quality_score', meal_quality: 'meal_quality_score',
  meal_quality_score: 'meal_quality_score', water: 'hydration_liters', hydration: 'hydration_liters',
  hydration_liters: 'hydration_liters', mood: 'mood_score', mood_score: 'mood_score', stress: 'stress_score',
  stress_score: 'stress_score', meditation: 'meditation_minutes', meditation_minutes: 'meditation_minutes',
  mindful_minutes: 'meditation_minutes', focus: 'focus_minutes', focus_minutes: 'focus_minutes',
  productive_minutes: 'focus_minutes', therapy: 'therapy_session', therapy_session: 'therapy_session',
  glucose: 'glucose_mg_dl', glucose_mg_dl: 'glucose_mg_dl', systolic: 'blood_pressure_systolic',
  blood_pressure_systolic: 'blood_pressure_systolic', diastolic: 'blood_pressure_diastolic',
  blood_pressure_diastolic: 'blood_pressure_diastolic', spo2: 'spo2_percent', spo2_percent: 'spo2_percent',
};

const timestampKeys = ['occurredat', 'occurred_at', 'timestamp', 'datetime', 'date_time', 'start_time', 'start', 'date', 'day'];
const cleanKey = (value: string) => value.trim().toLowerCase().replace(/[()%]/g, '').replace(/[\s./-]+/g, '_').replace(/^_+|_+$/g, '');

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(field); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); if (row.some((value) => value.trim())) rows.push(row); row = []; field = '';
    } else field += character;
  }
  row.push(field); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function timestampFor(row: Record<string, unknown>): string {
  const raw = timestampKeys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim());
  const date = raw ? new Date(String(raw)) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(raw)}`);
  return date.toISOString();
}

function numberValue(raw: unknown): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().replace(/\s/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/[^\d.+-]/g, '');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeValue(type: IntegrationEventType, value: number, sourceKey: string) {
  if (type === 'sleep_duration_hours' && (sourceKey.includes('minute') || value > 24)) return value / 60;
  if ((type === 'sleep_score' || type === 'recovery_score' || type === 'macro_quality_score' || type === 'meal_quality_score') && value >= 0 && value <= 10) return value * 10;
  if (type === 'workout' || type === 'therapy_session') return value > 0 ? 1 : 0;
  return value;
}

function rowsFromJson(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(rowsFromJson);
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  for (const key of ['events', 'data', 'records', 'observations', 'measurements']) {
    if (Array.isArray(object[key])) return rowsFromJson(object[key]);
  }
  return [object];
}

function eventsFromRows(rows: Record<string, unknown>[], providerId: string): IntegrationEvent[] {
  const events: IntegrationEvent[] = [];
  rows.forEach((sourceRow, rowIndex) => {
    const row = Object.fromEntries(Object.entries(sourceRow).map(([key, value]) => [cleanKey(key), value]));
    const occurredAt = timestampFor(row);
    const explicitTypeRaw = row.type ?? row.event_type ?? row.metric ?? row.data_type;
    const explicitType = explicitTypeRaw ? (aliases[cleanKey(String(explicitTypeRaw))] ?? cleanKey(String(explicitTypeRaw))) : undefined;
    const baseId = String(row.id ?? row.event_id ?? row.uuid ?? `${providerId}-${occurredAt}-${rowIndex}`);

    if (explicitType && SUPPORTED_TYPES.has(explicitType as IntegrationEventType)) {
      const value = numberValue(row.value ?? row.amount ?? row.score ?? row.duration);
      if (value !== undefined) {
        const type = explicitType as IntegrationEventType;
        events.push({ id: baseId, type, value: normalizeValue(type, value, cleanKey(String(explicitTypeRaw))), unit: String(row.unit ?? '') || undefined, occurredAt, payload: { sourceRow: rowIndex + 1 } });
      }
      return;
    }

    Object.entries(row).forEach(([key, raw]) => {
      const type = aliases[key];
      const value = numberValue(raw);
      if (!type || value === undefined) return;
      events.push({ id: `${baseId}-${type}`, type, value: normalizeValue(type, value, key), occurredAt, payload: { sourceColumn: key, sourceRow: rowIndex + 1 } });
    });
  });
  return events.filter((event) => Number.isFinite(event.value)).slice(0, 500);
}

export function parseIntegrationFile(text: string, fileName: string, providerId: string): IntegrationEvent[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('The selected file is empty.');
  let rows: Record<string, unknown>[];
  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    rows = rowsFromJson(JSON.parse(trimmed));
  } else {
    const parsed = csvRows(trimmed);
    if (parsed.length < 2) throw new Error('CSV needs a header row and at least one data row.');
    const headers = parsed[0].map(cleanKey);
    rows = parsed.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }
  const events = eventsFromRows(rows, providerId);
  if (!events.length) throw new Error('No supported tracking values were found. Use type,value,unit,occurred_at or a supported metric column.');
  return events;
}

export const INTEGRATION_IMPORT_EXAMPLE = `type,value,unit,occurred_at\nsleep_duration_hours,7.8,hours,2026-07-14T06:30:00Z\nmeditation_minutes,20,min,2026-07-14T07:00:00Z`;
