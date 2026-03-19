/**
 * UTC-safe time formatters for slot/appointment display.
 *
 * Slot start/end times are stored and returned as UTC ISO-8601 strings where
 * the time component represents the *doctor's local intended time* (e.g. the
 * doctor configured "09:00" availability which is stored as "09:00 UTC").
 * Parsing them with dayjs() or new Date() without UTC disambiguation would
 * shift the displayed time into the visitor's browser timezone (e.g. IST
 * UTC+5:30 would show 09:00 UTC as 14:30 IST).
 *
 * All helpers here extract the UTC hour/minute directly so the displayed time
 * always matches what the doctor configured.
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** "9:00 AM" */
export function utcTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ap}`;
}

/** "Mar 23, 09:00" */
export function utcDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${mon} ${day}, ${h}:${m}`;
}

/** "Mar 23, 2026 09:00" */
export function utcDateTimeLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${mon} ${day}, ${year} ${h}:${m}`;
}

/** "Mar 23, 2026" */
export function utcDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${mon} ${day}, ${year}`;
}

/** "YYYY-MM-DD" in UTC – useful for date-only comparisons */
export function utcDateStr(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}
