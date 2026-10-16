export function createRandomSecret(
  minNumber: number,
  maxNumber: number,
  random: () => number
): number {
  if (
    !Number.isInteger(minNumber) ||
    !Number.isInteger(maxNumber) ||
    minNumber >= maxNumber
  ) {
    throw new RangeError("Random secret bounds must be increasing integers.");
  }

  const randomValue = random();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("Random source must return a finite number in [0, 1). ");
  }

  return Math.floor(randomValue * (maxNumber - minNumber + 1)) + minNumber;
}
