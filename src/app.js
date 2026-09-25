const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = 'pepos-dial-in-records-v1';
const SETTINGS_KEY = 'pepos-dial-in-settings-v1';
const FILTER_SETTINGS_KEY = 'peppos-dial-in-filter-settings-v1';
const EXPERIENCE_KEY = 'peppos-academy-experience-v1';
const METHOD_KEY = 'peppos-academy-selected-method-v1';
const { calculateShot, interpretEspresso, clamp } = window.PepposCalculator;
const { METHODS, calculateFilter } = window.PepposFilterCalculator;
const { methods: MANUAL_METHODS, evaluateManual } = window.PepposManual;
const { search: searchMachines, exact: exactMachine } = window.PepposMachines;
let activeMethod = 'espresso';

function setExperience(mode) {
  const selected = mode === 'professional' ? 'professional' : 'home';
  document.body.dataset.experience = selected;
  $$('.experience-switch button[data-experience]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.experience === selected)));
  localStorage.setItem(EXPERIENCE_KEY, selected);
}
$$('.experience-switch button[data-experience]').forEach((button) => button.addEventListener('click', () => setExperience(button.dataset.experience)));
setExperience(localStorage.getItem(EXPERIENCE_KEY));

const fields = {
  ratio: $('#targetRatio'),
  dose: $('#dose'),
  yield: $('#yieldWeight'),
  time: $('#actualTime'),
  minTime: $('#minTime'),
  maxTime: $('#maxTime')
};

const format = (value, decimals = 1) => Number(value).toLocaleString('es-ES', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals
});

const readNumber = (input) => Number.parseFloat(String(input.value).replace(',', '.'));
const filterFields = {
  method: $('#filterMethod'), ratio: $('#filterTargetRatio'), dose: $('#filterDose'),
  water: $('#filterWater'), time: $('#filterTime'), taste: $('#filterTaste'), strength: $('#filterStrength')
};

function currentFilterResult() {
  return calculateFilter({
    method: filterFields.method.value,
    targetRatio: readNumber(filterFields.ratio), dose: readNumber(filterFields.dose),
    water: readNumber(filterFields.water), time: filterFields.time.value ? readNumber(filterFields.time) : null,
    taste: filterFields.taste.value, strength: filterFields.strength.value
  });
}

function renderFilter() {
  const result = currentFilterResult();
  if (!result) {
    $('#filterStatus').textContent = 'Revisa los valores';
    return;
  }
  $('#filterStatus').textContent = result.status;
  $('#filterStatus').style.background = result.statusColor;
  $('#filterActualRatio').textContent = `1:${format(result.actualRatio, 1)}`;
  $('#filterTargetText').textContent = `Objetivo 1:${format(result.targetRatio, 1)}`;
  $('#filterTargetWater').textContent = format(result.targetWater, 0);
  $('#filterWaterGuidance').textContent = result.waterGuidance;
  $('#filterGrindTitle').textContent = result.grindTitle;
  $('#filterGrindDescription').textContent = result.grindDescription;
  $('#filterReference').textContent = result.reference;
  $('#filterDirectionIcon').className = `direction-icon ${result.direction}`;
  $('#filterDirectionIcon').style.setProperty('--status-color', result.statusColor);
  $('#filterActionList').replaceChildren(...result.actions.map((action, index) => {
    const li = document.createElement('li');
    const number = document.createElement('span'); number.textContent = String(index + 1);
    const paragraph = document.createElement('p'); paragraph.textContent = action;
    li.append(number, paragraph);
    return li;
  }));
  $$('#filterRatioPresets button').forEach((button) => button.classList.toggle('active', Math.abs(Number(button.dataset.filterRatio) - result.targetRatio) < .05));
  localStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(Object.fromEntries(Object.entries(filterFields).map(([key, input]) => [key, input.value]))));
}

const manualMethod = $('#manualMethod');
Object.entries(MANUAL_METHODS).forEach(([key, guide]) => {
  if (key === 'ristretto') return;
  const option = document.createElement('option');
  option.value = key;
  option.textContent = guide.name;
  manualMethod.append(option);
});
const savedMethod = localStorage.getItem(METHOD_KEY);
manualMethod.value = savedMethod && savedMethod !== 'ristretto' && MANUAL_METHODS[savedMethod] ? savedMethod : 'espresso';

function addManualField({ id, label, type = 'number', value = '', min = 0, max, step = 'any', options }) {
  const wrapper = document.createElement('label');
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = options ? document.createElement('select') : document.createElement('input');
  input.id = id;
  if (options) {
    options.forEach(([optionValue, text]) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = text;
      input.append(option);
    });
  } else {
    input.type = type;
    if (type === 'number') {
      input.inputMode = 'decimal';
      input.min = min;
      if (max != null) input.max = max;
      input.step = step;
    }
    if (type === 'checkbox') input.checked = Boolean(value);
    else input.value = value;
  }
  wrapper.append(caption, input);
  $('#manualFields').append(wrapper);
  return input;
}

function manualValue(id) {
  const input = $(`#${id}`);
  return input?.type === 'checkbox' ? input.checked : input?.value;
}

function currentManualResult() {
  const method = manualMethod.value;
  const guide = MANUAL_METHODS[method];
  if (!guide || guide.kind === 'espresso' || guide.kind === 'filter') return null;
  return evaluateManual({
    method, taste: $('#manualTaste').value, strength: $('#manualStrength').value,
    dose: Number(String(manualValue('manualDose')).replace(',', '.')),
    water: Number(String(manualValue('manualWater')).replace(',', '.')),
    targetRatio: Number(String(manualValue('manualRatio')).replace(',', '.')),
    time: Number(String(manualValue('manualTime')).replace(',', '.')),
    brewStyle: manualValue('manualBrewStyle'),
    dilution: Number(String(manualValue('manualDilution')).replace(',', '.')),
    waterToValve: manualValue('manualWaterToValve'), basketLevel: manualValue('manualBasketLevel'),
    heat: manualValue('manualHeat'), model: manualValue('manualModel'),
    waterVolume: Number(String(manualValue('manualVolume')).replace(',', '.')),
    targetVolume: manualValue('manualTargetVolume') ? Number(String(manualValue('manualTargetVolume')).replace(',', '.')) : null,
    strengthSetting: manualValue('manualStrengthSetting'), grinderSetting: manualValue('manualGrinderSetting')
  });
}

function renderManualFeedback() {
  const dilution = $('#manualDilution');
  if (dilution) dilution.closest('label').hidden = manualValue('manualBrewStyle') === 'ready';
  const result = currentManualResult();
  $('#manualFeedbackTitle').textContent = result?.title || 'Revisa la receta';
  $('#manualFeedbackText').textContent = result?.advice || 'Completa los valores positivos para obtener una orientación.';
  $('#manualTargetText').textContent = result?.targetText || '';
}

function renderMachineLookup() {
  const query = $('#manualModel').value.trim();
  const selected = exactMachine(query);
  const matches = $('#machineMatches');
  const panel = $('#machineGuide');
  const available = query ? searchMachines(query) : [];
  matches.replaceChildren(...available.map((machine) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${machine.brand} · ${machine.model}`;
    button.setAttribute('aria-pressed', String(selected?.id === machine.id));
    button.addEventListener('click', () => {
      $('#manualModel').value = `${machine.brand} ${machine.model}`;
      renderMachineLookup();
      renderManualFeedback();
    });
    return button;
  }));
  panel.replaceChildren();
  const heading = document.createElement('h4');
  if (!selected) {
    const strengthInput = $('#manualStrengthSetting');
    if (strengthInput?.value === 'no-disponible') strengthInput.value = 'media';
    heading.textContent = query ? 'Modelo sin guía específica' : 'Elige una máquina';
    const info = document.createElement('p');
    info.textContent = query
      ? 'Comprueba la referencia exacta. Puedes seguir la receta general, pero los controles de tu máquina deben consultarse en su manual.'
      : 'Escribe una marca o referencia para encontrar tu máquina. Si no aparece, usa la receta general.';
    panel.append(heading, info);
    return;
  }
  heading.textContent = `${selected.brand} · ${selected.model}${selected.partial ? ' · guía en preparación' : ''}`;
  const strengthInput = $('#manualStrengthSetting');
  if (strengthInput) {
    if (selected.id === 'cecotec-cube') strengthInput.value = 'no-disponible';
    else if (strengthInput.value === 'no-disponible') strengthInput.value = 'media';
  }
  const list = document.createElement('ol');
  list.replaceChildren(...selected.steps.map((step) => {
    const item = document.createElement('li'); item.textContent = step; return item;
  }));
  const note = document.createElement('p'); note.textContent = selected.note;
  const source = document.createElement('a');
  source.href = selected.source; source.target = '_blank'; source.rel = 'noopener noreferrer';
  source.textContent = 'Ver documentación oficial';
  panel.append(heading, list, note, source);
  if (selected.extraSource) {
    const extra = document.createElement('a');
    extra.href = selected.extraSource; extra.target = '_blank'; extra.rel = 'noopener noreferrer';
    extra.textContent = 'Ver cómo guardar el volumen de la taza';
    panel.append(extra);
  }
}

$('#manualModel').addEventListener('input', renderMachineLookup);

function renderManualMethod() {
  const guide = MANUAL_METHODS[manualMethod.value];
  if (!guide) return;
  localStorage.setItem(METHOD_KEY, manualMethod.value);
  activeMethod = guide.kind === 'espresso' ? 'espresso' : guide.kind === 'filter' ? 'filter' : 'manual';
  $('#espressoWorkspace').hidden = activeMethod !== 'espresso';
  $('#filterWorkspace').hidden = activeMethod !== 'filter';
  $('#manualLayout').classList.toggle('linked-method', activeMethod !== 'manual');
  $('#methodIntro').textContent = 'Recetas paso a paso para preparar, probar y guardar tu café.';
  $('#manualRecipeTitle').textContent = guide.name;
  $('#manualRecipeLead').textContent = guide.lead;
  $('#manualRecipeNote').textContent = guide.note;
  $('#manualRecipeSource').href = guide.source;
  $('#manualRecipeSource').textContent = 'Consultar fuente original (puede estar en inglés)';
  $('#manualRecipeMetrics').replaceChildren(...guide.metrics.map((metric) => {
    const item = document.createElement('span'); item.textContent = metric; return item;
  }));
  $('#manualRecipeSteps').replaceChildren(...guide.steps.map((step) => {
    const item = document.createElement('li'); item.textContent = step; return item;
  }));
  const linked = guide.kind === 'espresso' || guide.kind === 'filter';
  $('#manualForm').hidden = linked;
  $('#machineLookup').hidden = guide.kind !== 'superauto';
  $('#manualFields').replaceChildren();
  if (linked) {
    if (guide.kind === 'filter' && filterFields.method.value !== guide.filterMethod) {
      filterFields.method.value = guide.filterMethod;
      const defaults = METHODS[guide.filterMethod];
      filterFields.dose.value = defaults.dose;
      filterFields.water.value = defaults.water;
      filterFields.ratio.value = defaults.ratio.toFixed(1);
      filterFields.time.value = defaults.time;
    }
    if (guide.kind === 'filter') renderFilter();
    else render();
    return;
  }
  $('#manualCalibrationIntro').textContent = guide.kind === 'superauto'
    ? 'Anota lo que salió en la taza, el volumen que buscas y cómo sabe. Cambia un ajuste cada vez.'
    : 'Cambia los valores de tu prueba y marca cómo sabe. La orientación se actualiza al momento.';
  if (guide.kind === 'ratio' || guide.kind === 'cold') {
    const defaults = guide.defaults;
    if (guide.kind === 'cold') addManualField({ id: 'manualBrewStyle', label: 'Tipo de preparación', options: [['concentrate', 'Concentrado para diluir'], ['ready', 'Listo para tomar']] });
    addManualField({ id: 'manualDose', label: 'Café · g', value: defaults.dose, step: '.1' });
    addManualField({ id: 'manualWater', label: 'Agua usada · g', value: defaults.water, step: '1' });
    addManualField({ id: 'manualRatio', label: 'Ratio deseado · 1:x', value: defaults.ratio.toFixed(1), step: '.1' });
    addManualField({ id: 'manualTime', label: `Tiempo de contacto · ${defaults.timeUnit}`, value: defaults.time, step: '.5' });
    if (guide.kind === 'cold') addManualField({ id: 'manualDilution', label: 'Dilución al servir · partes de agua/leche por parte de concentrado', value: 2, step: '.5' });
  } else if (guide.kind === 'moka') {
    addManualField({ id: 'manualWaterToValve', label: 'Agua por debajo de la válvula', type: 'checkbox', value: true });
    addManualField({ id: 'manualBasketLevel', label: 'Cestillo lleno, sin prensar', type: 'checkbox', value: true });
    addManualField({ id: 'manualHeat', label: 'Calor usado', options: [['low', 'Bajo'], ['medium', 'Medio'], ['high', 'Alto']] });
  } else {
    renderMachineLookup();
    const strengthInput = addManualField({ id: 'manualStrengthSetting', label: 'Intensidad en la máquina', options: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['no-disponible', 'No disponible en este modelo']] });
    strengthInput.value = 'alta';
    addManualField({ id: 'manualVolume', label: 'Volumen obtenido en taza · ml', value: 40, max: 500, step: '1' });
    addManualField({ id: 'manualTargetVolume', label: 'Volumen deseado en taza · ml', value: '', max: 500, step: '1' });
    addManualField({ id: 'manualGrinderSetting', label: 'Punto de molienda de la máquina', type: 'text', value: '' });
  }
  renderManualFeedback();
}

manualMethod.addEventListener('change', renderManualMethod);
$('#manualForm').addEventListener('submit', (event) => event.preventDefault());
$('#manualForm').addEventListener('input', renderManualFeedback);
$('#manualForm').addEventListener('change', renderManualFeedback);
$$('.back-to-method').forEach((button) => button.addEventListener('click', () => {
  manualMethod.scrollIntoView({ behavior: 'smooth', block: 'center' });
  manualMethod.focus({ preventScroll: true });
}));

Object.values(filterFields).forEach((input) => input.addEventListener('input', renderFilter));
filterFields.method.addEventListener('change', () => {
  const guide = METHODS[filterFields.method.value];
  filterFields.dose.value = guide.dose;
  filterFields.water.value = guide.water;
  filterFields.ratio.value = guide.ratio.toFixed(1);
  filterFields.time.value = guide.time;
  renderFilter();
});
$$('#filterRatioPresets button').forEach((button) => button.addEventListener('click', () => {
  filterFields.ratio.value = button.dataset.filterRatio;
  renderFilter();
}));

function calculate() {
  const targetRatio = readNumber(fields.ratio);
  const dose = readNumber(fields.dose);
  const actualYield = readNumber(fields.yield);
  const actualTime = readNumber(fields.time);
  const minTime = readNumber(fields.minTime);
  const maxTime = readNumber(fields.maxTime);

  const core = calculateShot({ targetRatio, dose, actualYield, actualTime, minTime, maxTime });
  if (!core) return null;
  const { targetYield, actualRatio, yieldDelta, ratioDeltaPercent, projectedTime, ratioState, timeState } = core;

  let direction = 'steady';
  let grindTitle = 'Flujo dentro de ventana';
  let grindDescription = 'El flujo estimado está dentro de la ventana objetivo. Falta probar la taza.';
  let statusColor = '#b9d87b';
  let grindAction = 'Mantén el ajuste actual del molinillo.';

  if (timeState === 'fast') {
    const difference = minTime - projectedTime;
    direction = 'up';
    grindTitle = 'Muele más fino';
    grindDescription = `Llegarías al peso objetivo ${format(difference, 1)} s antes de la ventana.`;
    statusColor = '#f2c85b';
    grindAction = `Cierra el punto del molinillo ${difference > 6 ? 'en un ajuste moderado' : 'ligeramente'} y purga una dosis.`;
  } else if (timeState === 'slow') {
    const difference = projectedTime - maxTime;
    direction = 'down';
    grindTitle = 'Muele más grueso';
    grindDescription = `Llegarías al peso objetivo ${format(difference, 1)} s después de la ventana.`;
    statusColor = '#7cb3c6';
    grindAction = `Abre el punto del molinillo ${difference > 6 ? 'en un ajuste moderado' : 'ligeramente'} y purga una dosis.`;
  } else if (ratioState !== 'correct') {
    statusColor = '#f2c85b';
  }

  const ratioLabel = ratioState === 'correct' ? 'Ratio correcto' : ratioState === 'short' ? 'Ratio corto' : 'Ratio largo';
  const flowLabel = timeState === 'fast' ? 'Flujo rápido' : 'Flujo lento';
  const overallStatus = ratioState === 'correct' && timeState === 'correct'
    ? 'En punto'
    : timeState === 'correct'
      ? ratioLabel
      : ratioState === 'correct'
        ? flowLabel
        : `${ratioLabel} · ${timeState === 'fast' ? 'rápido' : 'lento'}`;
  const yieldInstruction = ratioState === 'correct'
    ? 'El rendimiento coincide con la receta.'
    : ratioState === 'short'
      ? `Faltaron ${format(Math.abs(yieldDelta), 1)} g de bebida.`
      : `Sobran ${format(Math.abs(yieldDelta), 1)} g de bebida.`;

  return { targetRatio, dose, actualYield, actualTime, minTime, maxTime, targetYield, actualRatio, yieldDelta, ratioDeltaPercent, projectedTime, ratioState, timeState, direction, grindTitle, grindDescription, grindAction, statusColor, overallStatus, yieldInstruction };
}

function render() {
  const result = calculate();
  if (!result) return;
  const tasting = interpretEspresso(result, $('#espressoTaste').value);

  $('#actualRatioDisplay').textContent = `1:${format(result.actualRatio, 2)}`;
  $('#ratioDeltaDisplay').textContent = `Objetivo 1:${format(result.targetRatio, 2)}`;
  $('#targetYieldDisplay').textContent = format(result.targetYield, 1);
  $('#yieldInstruction').textContent = result.yieldInstruction;
  $('#grindTitle').textContent = result.grindTitle;
  $('#grindDescription').textContent = result.grindDescription;
  $('#projectedTimeDisplay').textContent = `${format(result.projectedTime, 1)} s`;
  $('#yieldDeltaDisplay').textContent = `${result.yieldDelta > 0 ? '+' : ''}${format(result.yieldDelta, 1)} g`;
  $('#overallStatus').textContent = tasting.status;
  $('#overallStatus').style.background = tasting.color;
  $('#espressoTasteTitle').textContent = tasting.title;
  $('#espressoTasteExplanation').textContent = tasting.explanation;
  $('#espressoNextAction').textContent = tasting.nextAction;
  $('#timeRangeSummary').textContent = `${format(result.minTime, 0)}–${format(result.maxTime, 0)} s`;

  const gauge = $('#ratioGauge');
  gauge.style.setProperty('--progress', clamp(50 + result.ratioDeltaPercent * 1.8, 8, 92));
  gauge.style.setProperty('--status-color', result.statusColor);
  const direction = $('#directionIcon');
  direction.className = `direction-icon ${result.direction}`;
  direction.style.setProperty('--status-color', result.statusColor);

  const list = $('#actionList');
  const actions = [`Mantén la dosis en ${format(result.dose, 1)} g.`, `Detén la extracción en ${format(result.targetYield, 1)} g.`, tasting.nextAction];
  list.replaceChildren(...actions.map((action, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span'); number.textContent = String(index + 1);
    const paragraph = document.createElement('p'); paragraph.textContent = action;
    item.append(number, paragraph);
    return item;
  }));

  $$('#ratioPresets button').forEach((button) => {
    button.classList.toggle('active', Math.abs(Number(button.dataset.ratio) - result.targetRatio) < 0.01);
  });
  if (!$('#compareLastText').hidden) renderComparison();
  saveSettings();
}

function saveSettings() {
  const settings = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value]));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function restoreSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!settings) return;
    Object.entries(fields).forEach(([key, input]) => {
      if (settings[key] !== undefined) input.value = settings[key];
    });
  } catch { /* Keep defaults if local storage is malformed. */ }
}

Object.values(fields).forEach((input) => input.addEventListener('input', render));
$('#espressoTaste').addEventListener('change', render);
$$('#ratioPresets button').forEach((button) => button.addEventListener('click', () => {
  fields.ratio.value = button.dataset.ratio;
  render();
}));

$('#resetButton').addEventListener('click', () => {
  fields.ratio.value = '2.0';
  fields.dose.value = '18.0';
  fields.yield.value = '36.0';
  fields.time.value = '30.0';
  fields.minTime.value = '25';
  fields.maxTime.value = '35';
  $('#espressoTaste').value = 'untried';
  render();
  showToast('Receta reiniciada');
});

let timerStart = null;
let timerInterval = null;
$('#timerButton').addEventListener('click', () => {
  const button = $('#timerButton');
  if (!timerStart) {
    timerStart = performance.now();
    button.classList.add('running');
    button.setAttribute('aria-pressed', 'true');
    timerInterval = window.setInterval(() => {
      const elapsed = (performance.now() - timerStart) / 1000;
      fields.time.value = elapsed.toFixed(1);
      $('#timerLabel').textContent = `${format(elapsed, 1)} s · Parar`;
      render();
    }, 100);
  } else {
    clearInterval(timerInterval);
    timerStart = null;
    button.classList.remove('running');
    button.setAttribute('aria-pressed', 'false');
    $('#timerLabel').textContent = 'Repetir tiempo';
    render();
  }
});

function getRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function setRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  renderHistory();
  if (!$('#compareLastText').hidden) renderComparison();
}

function renderComparison() {
  const output = $('#compareLastText');
  const coffee = $('#coffeeName').value.trim().toLocaleLowerCase('es');
  const local = $('#clientName').value.trim().toLocaleLowerCase('es');
  if (!coffee || !local) {
    output.textContent = 'Escribe el nombre del café y el cliente o local en la ficha de guardado para comparar solo sus registros.';
    return;
  }
  const previous = getRecords().find((record) =>
    (!record.type || record.type === 'espresso') &&
    String(record.coffeeName || '').trim().toLocaleLowerCase('es') === coffee &&
    String(record.client || 'Sin cliente').trim().toLocaleLowerCase('es') === local);
  if (!previous) {
    output.textContent = 'Aún no hay un espresso guardado con este café y este cliente o local.';
    return;
  }
  const current = calculate();
  if (!current) { output.textContent = 'Revisa los valores actuales antes de comparar.'; return; }
  const priorTaste = { untried: 'sin probar', balanced: 'equilibrada', sour: 'ácida', bitter: 'amarga/seca', uneven: 'irregular' }[previous.taste] || 'sin valoración sensorial';
  const currentTaste = { untried: 'sin probar', balanced: 'equilibrada', sour: 'ácida', bitter: 'amarga/seca', uneven: 'irregular' }[$('#espressoTaste').value];
  output.textContent = `Último registro ${new Date(previous.createdAt).toLocaleDateString('es-ES')}: ${format(previous.dose, 1)} g → ${format(previous.actualYield, 1)} g en ${format(previous.actualTime, 1)} s; taza ${priorTaste}. Ahora: ${format(current.dose, 1)} g → ${format(current.actualYield, 1)} g en ${format(current.actualTime, 1)} s; taza ${currentTaste}. Compara el sabor antes de decidir otro cambio.`;
}

$('#compareLastButton').addEventListener('click', () => {
  const output = $('#compareLastText');
  output.hidden = !output.hidden;
  $('#compareLastButton').setAttribute('aria-expanded', String(!output.hidden));
  if (!output.hidden) renderComparison();
});
['#coffeeName', '#clientName'].forEach((selector) => $(selector).addEventListener('input', () => {
  if (!$('#compareLastText').hidden) renderComparison();
}));

$('#saveButton').addEventListener('click', () => {
  const result = activeMethod === 'manual' ? currentManualResult() : activeMethod === 'filter' ? currentFilterResult() : calculate();
  if (!result) return showToast('Revisa los valores de la receta');
  const coffeeName = $('#coffeeName').value.trim();
  if (!coffeeName) {
    $('#coffeeName').focus();
    return showToast('Escribe el nombre del café para guardar la receta');
  }
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    type: activeMethod,
    coffeeName,
    process: $('#coffeeProcess').value,
    client: $('#clientName').value.trim() || 'Sin cliente',
    machine: $('#machineName').value.trim(),
    grinder: $('#grinderName').value.trim(),
    notes: $('#coffeeNotes').value.trim(),
    ...result,
    ...(activeMethod === 'espresso' ? { taste: $('#espressoTaste').value, sensoryAdvice: interpretEspresso(result, $('#espressoTaste').value).nextAction } : {}),
    ...(activeMethod === 'espresso' ? { lot: $('#espressoLot').value.trim(), roastDate: $('#espressoRoastDate').value, flavorGoal: $('#espressoFlavorGoal').value.trim() } : {}),
    ...(activeMethod === 'espresso' ? { methodName: Math.abs(result.targetRatio - 1.5) < .01 ? 'Ristretto' : 'Espresso' } : {}),
    ...(activeMethod === 'manual' ? {
      waterTemperature: $('#manualTemperature').value,
      grindNote: $('#manualGrindNote').value.trim(),
      techniqueNote: $('#manualTechniqueNote').value.trim()
    } : {})
  };
  setRecords([record, ...getRecords()].slice(0, 100));
  showToast('Calibración guardada');
});

function renderHistory() {
  const records = getRecords();
  $('#emptyHistory').hidden = records.length > 0;
  $('#exportButton').hidden = records.length === 0;
  $('#historyList').innerHTML = records.map((record) => {
    const methodName = record.type === 'manual' ? record.methodName || 'Manual' : record.type === 'filter' ? record.methodName || 'Filtro' : record.methodName || 'Espresso';
    const recipe = record.type === 'manual'
      ? record.kind === 'moka' ? 'Agua bajo válvula · cestillo sin prensar'
        : record.kind === 'superauto' ? `${Number.isFinite(Number(record.waterVolume)) ? format(record.waterVolume, 0) : '—'} ml · ${record.strengthSetting || 'intensidad sin indicar'}`
          : `${Number.isFinite(Number(record.dose)) ? format(record.dose, 1) : '—'} g / ${Number.isFinite(Number(record.water)) ? format(record.water, 0) : '—'} g`
      : record.type === 'filter' ? `${format(record.dose, 1)} g / ${format(record.water, 0)} g`
        : `${format(record.dose, 1)} → ${format(record.actualYield, 1)} g`;
    const ratio = Number.isFinite(Number(record.actualRatio)) && record.actualRatio != null ? `1:${format(record.actualRatio, 2)}` : '—';
    const time = record.type === 'manual' ? record.time == null ? '—' : `${format(record.time, 1)} ${record.timeUnit || 'min'}`
      : record.type === 'filter' ? record.time == null ? '—' : `${format(record.time, 0)} s`
        : `${format(record.actualTime, 1)} s`;
    const processLabel = { washed: 'Lavado', honey: 'Honey', natural: 'Natural', cofermented: 'Cofermentado', other: 'Otro' }[record.process] || '';
    const description = [record.coffeeName, processLabel, record.lot, record.flavorGoal, record.machine, record.grinder, record.notes, record.techniqueNote].filter(Boolean).join(' · ') || new Date(record.createdAt).toLocaleString('es-ES');
    return `
    <article class="history-item">
      <div class="history-main">
        <h3>${escapeHtml(record.client)} <small>· ${escapeHtml(methodName)}</small></h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="history-metric"><span>Receta</span><strong>${escapeHtml(recipe)}</strong></div>
      <div class="history-metric"><span>Ratio</span><strong>${escapeHtml(ratio)}</strong></div>
      <div class="history-metric"><span>Tiempo</span><strong>${escapeHtml(time)}</strong></div>
      <button class="delete-button" type="button" data-delete-id="${escapeHtml(record.id)}" title="Eliminar registro" aria-label="Eliminar registro de ${escapeHtml(record.client)}">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg>
      </button>
    </article>`;
  }).join('');
  $$('[data-delete-id]').forEach((button) => button.addEventListener('click', () => {
    setRecords(getRecords().filter((record) => record.id !== button.dataset.deleteId));
    showToast('Registro eliminado');
  }));
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

$('#historyButton').addEventListener('click', () => $('#history').scrollIntoView({ behavior: 'smooth' }));

$('#exportButton').addEventListener('click', () => {
  const headers = ['Fecha', 'Cliente', 'Método', 'Café', 'Proceso', 'Lote u origen', 'Fecha tueste', 'Sabor buscado', 'Máquina', 'Molinillo', 'Notas', 'Dosis g', 'Bebida espresso g', 'Agua g', 'Ratio objetivo', 'Ratio real', 'Tiempo', 'Unidad tiempo', 'Tiempo estimado espresso s', 'Sabor', 'Intensidad', 'Diagnóstico', 'Temperatura °C', 'Molienda/técnica', 'Observaciones', 'Tipo cold brew', 'Dilución', 'Modelo superautomática', 'Intensidad máquina', 'Volumen ml', 'Ajuste molino'];
  const rows = getRecords().map((r) => [r.createdAt, r.client, r.type === 'manual' ? r.methodName || 'Manual' : r.type === 'filter' ? r.methodName || 'Filtro' : r.methodName || 'Espresso', r.coffeeName || '', r.process || '', r.lot || '', r.roastDate || '', r.flavorGoal || '', r.machine, r.grinder, r.notes, r.dose ?? '', r.actualYield ?? '', r.water ?? '', r.targetRatio ?? '', r.actualRatio == null ? '' : Number(r.actualRatio).toFixed(2), r.type === 'espresso' || !r.type ? r.actualTime ?? '' : r.time ?? '', r.type === 'manual' ? r.timeUnit || '' : 's', r.projectedTime == null ? '' : Number(r.projectedTime).toFixed(1), r.taste ?? '', r.strength ?? '', r.grindTitle || r.title || '', r.waterTemperature || '', r.grindNote || '', r.techniqueNote || '', r.brewStyle || '', r.dilution ?? '', r.model || '', r.strengthSetting || '', r.waterVolume ?? '', r.grinderSetting || '']);
  const csv = [headers, ...rows].map((row) => row.map((cell) => {
    const raw = String(cell ?? '');
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `peppos-calibraciones-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Historial exportado');
});

let toastTimeout;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function updateNetworkStatus() {
  const label = $('#networkStatus span');
  label.textContent = navigator.onLine ? 'Con conexión' : 'Offline listo';
  $('#networkStatus i').style.background = navigator.onLine ? '#b9d87b' : '#f2c85b';
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

let installPrompt;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('#installButton').hidden = false;
});
$('#installButton').addEventListener('click', async () => {
  if (!installPrompt) return showToast('Usa “Añadir a pantalla de inicio” en tu navegador');
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('#installButton').hidden = true;
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));

restoreSettings();
try {
  const filterSettings = JSON.parse(localStorage.getItem(FILTER_SETTINGS_KEY));
  if (filterSettings && typeof filterSettings === 'object') Object.entries(filterFields).forEach(([key, input]) => {
    if (filterSettings[key] !== undefined) input.value = filterSettings[key];
  });
} catch { /* Keep filter defaults if storage is malformed. */ }
render();
renderFilter();
renderManualMethod();
renderHistory();
updateNetworkStatus();
