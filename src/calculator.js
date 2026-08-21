(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PepposCalculator = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function calculateShot(input) {
    const { targetRatio, dose, actualYield, actualTime, minTime, maxTime } = input;
    if (![targetRatio, dose, actualYield, actualTime, minTime, maxTime].every(Number.isFinite)
      || targetRatio <= 0 || dose <= 0 || actualYield <= 0 || actualTime <= 0 || minTime >= maxTime) {
      return null;
    }

    const targetYield = dose * targetRatio;
    const actualRatio = actualYield / dose;
    const yieldDelta = actualYield - targetYield;
    const ratioDeltaPercent = ((actualRatio - targetRatio) / targetRatio) * 100;
    const projectedTime = actualTime * (targetYield / actualYield);
    const ratioTolerance = Math.max(0.5, targetYield * 0.02);
    const ratioState = Math.abs(yieldDelta) <= ratioTolerance ? 'correct' : yieldDelta < 0 ? 'short' : 'long';
    const timeState = projectedTime < minTime ? 'fast' : projectedTime > maxTime ? 'slow' : 'correct';

    return { targetYield, actualRatio, yieldDelta, ratioDeltaPercent, projectedTime, ratioState, timeState };
  }

  return { calculateShot, clamp };
}));
