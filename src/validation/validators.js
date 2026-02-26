export const isFiniteNumber = (...values) => values.every(Number.isFinite);
export const isPositive = (...values) => values.every((v) => v > 0);

export const validateRunning = ({ distance, duration, cadence }) => {
  if (
    !isFiniteNumber(distance, duration, cadence) ||
    !isPositive(distance, duration, cadence)
  ) {
    return {
      valid: false,
      message: 'Running inputs must be positive numbers!',
    };
  }
  return { valid: true };
};

export const validateCycling = ({ distance, duration, elevation }) => {
  if (
    !isFiniteNumber(distance, duration, elevation) ||
    !isPositive(distance, duration)
  ) {
    return {
      valid: false,
      message: 'Cycling distance and duration must be positive numbers!',
    };
  }
  return { valid: true };
};

export const VALIDATORS = {
  running: validateRunning,
  cycling: validateCycling,
};
