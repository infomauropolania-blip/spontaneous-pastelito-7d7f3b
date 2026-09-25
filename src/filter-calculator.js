(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PepposFilterCalculator = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const METHODS = {
    v60: {
      name: 'V60', dose: 15, water: 250, ratio: 250 / 15, time: 180,
      reference: 'Punto de partida: 15 g de café, 250 g de agua y molienda media-fina. Un vertido de unos 3 min es orientativo; manda el sabor.',
      technique: 'Mantén constantes el vertido, la agitación, el agua y el filtro al comparar pruebas.'
    },
    chemex: {
      name: 'Chemex', dose: 30, water: 500, ratio: 500 / 30, time: 270,
      reference: 'Punto de partida: 30 g de café y 500 g de agua. Chemex recomienda molienda media-gruesa y humedecer todo el café antes del vertido.',
      technique: 'Si el filtrado se atasca, comprueba también que el papel no tape el canal de aire del vertedor.'
    },
    siphon: {
      name: 'Sifón', dose: 23, water: 350, ratio: 350 / 23, time: 120,
      reference: 'Punto de partida: 23 g de café y 350 g de agua. En sifón, registra la duración de contacto y repite la misma agitación.',
      technique: 'En sifón, el tiempo de contacto y la agitación influyen mucho: repite el mismo proceso antes de atribuir el cambio a la molienda.'
    }
  };

  function calculateFilter(input) {
    const { method, dose, water, targetRatio, time, taste, strength } = input;
    const guide = METHODS[method];
    if (!guide || ![dose, water, targetRatio].every(Number.isFinite) || dose <= 0 || water <= 0 || targetRatio < 10 || targetRatio > 22 || (time != null && (!Number.isFinite(time) || time < 0))) return null;
    if (!['balanced', 'sour', 'bitter', 'uneven'].includes(taste) || !['balanced', 'weak', 'strong'].includes(strength)) return null;

    const targetWater = dose * targetRatio;
    const actualRatio = water / dose;
    const waterDelta = water - targetWater;
    const ratioOff = Math.abs(waterDelta) > Math.max(5, targetWater * .02);
    let direction = 'steady';
    let grindTitle = 'Mantén la molienda';
    let grindDescription = 'El sabor parece equilibrado. Repite la misma receta antes de cambiar el molinillo.';
    let status = 'Sabor equilibrado';
    let statusColor = '#b9d87b';
    let grindAction = 'Conserva la molienda y repite la preparación.';

    if (taste === 'sour') {
      direction = 'up';
      grindTitle = 'Prueba un poco más fino';
      grindDescription = 'La acidez vegetal o el sabor poco desarrollado pueden indicar poca extracción. Ajusta un paso pequeño y vuelve a probar.';
      status = 'Revisar extracción';
      statusColor = '#f2c85b';
      grindAction = 'Si el ratio ya coincide, muele ligeramente más fino y compara el sabor.';
    } else if (taste === 'bitter') {
      direction = 'down';
      grindTitle = 'Prueba un poco más grueso';
      grindDescription = 'El amargor seco o la astringencia pueden indicar extracción excesiva. Abre un paso pequeño y vuelve a probar.';
      status = 'Revisar extracción';
      statusColor = '#7cb3c6';
      grindAction = 'Si el ratio ya coincide, muele ligeramente más grueso y compara el sabor.';
    } else if (taste === 'uneven') {
      grindTitle = 'Revisa la uniformidad';
      grindDescription = 'Ácido y amargo a la vez puede indicar extracción desigual. Revisa vertido, agitación y filtro antes de mover el molinillo.';
      status = 'Extracción desigual';
      statusColor = '#f2c85b';
      grindAction = 'Repite con vertido y agitación constantes; decide la molienda después de probar.';
    } else if (strength !== 'balanced') {
      grindTitle = 'Ajusta la intensidad';
      grindDescription = strength === 'weak'
        ? 'Si el sabor es agradable pero ligero, prueba menos agua por la misma dosis antes de cambiar la molienda.'
        : 'Si el sabor es agradable pero intenso, prueba más agua por la misma dosis antes de cambiar la molienda.';
      status = 'Ajustar intensidad';
      statusColor = '#f2c85b';
      grindAction = 'Cambia el ratio de agua y café; mantén la molienda para poder comparar.';
    }

    const waterGuidance = ratioOff
      ? waterDelta < 0 ? `Has usado ${Math.abs(waterDelta).toFixed(0)} g menos agua que el objetivo.` : `Has usado ${waterDelta.toFixed(0)} g más agua que el objetivo.`
      : 'El agua usada coincide aproximadamente con el ratio objetivo.';
    const actions = [
      ratioOff ? `Vuelve al ratio elegido: ${targetWater.toFixed(0)} g de agua para ${dose.toFixed(1)} g de café.` : `Mantén ${dose.toFixed(1)} g de café y ${water.toFixed(0)} g de agua.`,
      grindAction,
      guide.technique
    ];
    return { method, methodName: guide.name, dose, water, targetRatio, time, taste, strength, targetWater, actualRatio, waterDelta, ratioOff, direction, grindTitle, grindDescription, grindAction, status, statusColor, waterGuidance, actions, reference: guide.reference };
  }

  return { METHODS, calculateFilter };
}));
