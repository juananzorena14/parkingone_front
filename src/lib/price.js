// Coerce: maneja strings que vienen de MySQL (ej. "900.00")
const toNum = v => (v == null || v === '') ? null : Number(v);

export function isNight(now, start, end) {
  if (start == null || end == null) return false;
  const h = new Date(now).getHours();
  return start <= end ? (h >= start && h < end) : (h >= start || h < end);
}

/**
 * calcAmount(minutes, ratePlan, nowDate?)
 * - minutes: minutos de estadía (>=1)
 * - ratePlan: objeto con base, perHour, per15min, nightFlat, nightStartsAt, nightEndsAt, toleranceMin
 * - nowDate: Date opcional (por defecto Date.now())
 */
export function calcAmount(minutes, rp, now = new Date()) {
  if (!rp) return null;

  const toleranceMin = toNum(rp.toleranceMin) || 0;
  if (toleranceMin && minutes <= toleranceMin) return 0;

  const nightFlat = toNum(rp.nightFlat);
  const nightStartsAt = toNum(rp.nightStartsAt);
  const nightEndsAt   = toNum(rp.nightEndsAt);
  if (nightFlat && isNight(now, nightStartsAt, nightEndsAt)) return nightFlat;

  const base = toNum(rp.base) || 0;
  const perHour  = toNum(rp.perHour);
  const per15min = toNum(rp.per15min);

  let total = base;
  if (perHour)      total += Math.ceil(minutes / 60) * perHour;
  else if (per15min) total += Math.ceil(minutes / 15) * per15min;

  return total;
}
