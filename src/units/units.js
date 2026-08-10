export const KM_PER_MILE = 1.609344;
export const METRES_PER_FOOT = 0.3048;

export const DEFAULT_UNITS = 'metric';

/**
 * Workouts are always stored in kilometres and metres. A unit system is a
 * display and input adapter over that canonical form — nothing here is ever
 * persisted, so switching systems can never alter stored data.
 */
export const UNIT_SYSTEMS = {
  metric: {
    key: 'metric',
    distanceUnit: 'km',
    elevationUnit: 'm',
    paceUnit: 'min/km',
    speedUnit: 'km/h',
    distanceFromKm: (km) => km,
    distanceToKm: (value) => value,
    elevationFromMetres: (metres) => metres,
    elevationToMetres: (value) => value,
  },
  imperial: {
    key: 'imperial',
    distanceUnit: 'mi',
    elevationUnit: 'ft',
    paceUnit: 'min/mi',
    speedUnit: 'mph',
    distanceFromKm: (km) => km / KM_PER_MILE,
    distanceToKm: (value) => value * KM_PER_MILE,
    elevationFromMetres: (metres) => metres / METRES_PER_FOOT,
    elevationToMetres: (value) => value * METRES_PER_FOOT,
  },
};

export function unitSystem(key) {
  return UNIT_SYSTEMS[key] ?? UNIT_SYSTEMS[DEFAULT_UNITS];
}

/** Trims float noise without printing a decimal point on whole numbers. */
export function formatNumber(value, decimals = 1) {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(decimals);
}
