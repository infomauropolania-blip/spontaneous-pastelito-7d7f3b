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

  function interpretEspresso(core, taste) {
    if (!core || !['untried', 'balanced', 'sour', 'bitter', 'uneven'].includes(taste)) return null;
    const measured = core.ratioState === 'correct' && core.timeState === 'correct';
    if (taste === 'untried') return {
      status: measured ? 'Objetivo medido · falta probar' : 'Medición para revisar · falta probar',
      title: 'Prueba la taza primero',
      explanation: 'El ratio y el tiempo describen esta preparación; aún no confirman el sabor.',
      nextAction: 'Prueba la taza y marca lo que percibes antes de decidir el siguiente ajuste.',
      color: '#f2c85b'
    };
    if (taste === 'balanced') return {
      status: measured ? 'Sabor confirmado' : 'Sabor agradable · registra la receta',
      title: 'Conserva y repite',
      explanation: 'Te gusta la taza. Anota sus valores y repítela para comprobar consistencia.',
      nextAction: 'Repite una extracción con la misma dosis, rendimiento y molienda.',
      color: '#b9d87b'
    };
    if (taste === 'uneven') return {
      status: 'Revisar uniformidad', title: 'Cuida la preparación',
      explanation: 'Acidez y sequedad juntas pueden tener varias causas; una distribución desigual es una posibilidad.',
      nextAction: 'Repite distribuyendo y compactando el café de forma uniforme; mantén el resto igual.', color: '#f2c85b'
    };
    if (taste === 'sour') return {
      status: 'Probar ajuste', title: 'Explora más desarrollo',
      explanation: 'La sensación ácida o poco desarrollada sugiere probar un pequeño cambio; no es un diagnóstico definitivo.',
      nextAction: core.ratioState === 'short' ? 'Extrae hasta el peso objetivo y vuelve a probar sin cambiar la molienda.' : 'Muele un paso más fino y vuelve a probar con el mismo rendimiento.',
      color: '#f2c85b'
    };
    return {
      status: 'Probar ajuste', title: 'Explora menos sequedad',
      explanation: 'La sensación amarga o seca invita a comparar un pequeño cambio; no es un diagnóstico definitivo.',
      nextAction: core.ratioState === 'long' ? 'Corta en el peso objetivo y vuelve a probar sin cambiar la molienda.' : 'Muele un paso más grueso y vuelve a probar con el mismo rendimiento.',
      color: '#7cb3c6'
    };
  }

  return { calculateShot, interpretEspresso, clamp };
}));
