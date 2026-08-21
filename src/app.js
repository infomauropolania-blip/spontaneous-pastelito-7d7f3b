const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = 'pepos-dial-in-records-v1';
const SETTINGS_KEY = 'pepos-dial-in-settings-v1';
const { calculateShot, clamp } = window.PepposCalculator;

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
  let grindTitle = 'Mantén el punto';
  let grindDescription = 'El flujo estimado está dentro de la ventana objetivo.';
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

  $('#actualRatioDisplay').textContent = `1:${format(result.actualRatio, 2)}`;
  $('#ratioDeltaDisplay').textContent = `Objetivo 1:${format(result.targetRatio, 2)}`;
  $('#targetYieldDisplay').textContent = format(result.targetYield, 1);
  $('#yieldInstruction').textContent = result.yieldInstruction;
  $('#grindTitle').textContent = result.grindTitle;
  $('#grindDescription').textContent = result.grindDescription;
  $('#projectedTimeDisplay').textContent = `${format(result.projectedTime, 1)} s`;
  $('#yieldDeltaDisplay').textContent = `${result.yieldDelta > 0 ? '+' : ''}${format(result.yieldDelta, 1)} g`;
  $('#overallStatus').textContent = result.overallStatus;
  $('#overallStatus').style.background = result.statusColor;
  $('#timeRangeSummary').textContent = `${format(result.minTime, 0)}–${format(result.maxTime, 0)} s`;

  const gauge = $('#ratioGauge');
  gauge.style.setProperty('--progress', clamp(50 + result.ratioDeltaPercent * 1.8, 8, 92));
  gauge.style.setProperty('--status-color', result.statusColor);
  const direction = $('#directionIcon');
  direction.className = `direction-icon ${result.direction}`;
  direction.style.setProperty('--status-color', result.statusColor);

  const list = $('#actionList');
  list.innerHTML = `
    <li><span>1</span><p>Mantén la dosis en <strong>${format(result.dose, 1)} g</strong>.</p></li>
    <li><span>2</span><p>Detén la extracción en <strong>${format(result.targetYield, 1)} g</strong>.</p></li>
    <li><span>3</span><p>${result.grindAction}</p></li>`;
  $('#cautionText').hidden = result.ratioState === 'correct';

  $$('#ratioPresets button').forEach((button) => {
    button.classList.toggle('active', Math.abs(Number(button.dataset.ratio) - result.targetRatio) < 0.01);
  });
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
}

$('#saveButton').addEventListener('click', () => {
  const result = calculate();
  if (!result) return showToast('Revisa los valores de la receta');
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    client: $('#clientName').value.trim() || 'Sin cliente',
    machine: $('#machineName').value.trim(),
    grinder: $('#grinderName').value.trim(),
    notes: $('#coffeeNotes').value.trim(),
    ...result
  };
  setRecords([record, ...getRecords()].slice(0, 100));
  showToast('Calibración guardada');
});

function renderHistory() {
  const records = getRecords();
  $('#emptyHistory').hidden = records.length > 0;
  $('#exportButton').hidden = records.length === 0;
  $('#historyList').innerHTML = records.map((record) => `
    <article class="history-item">
      <div class="history-main">
        <h3>${escapeHtml(record.client)}</h3>
        <p>${escapeHtml([record.machine, record.grinder, record.notes].filter(Boolean).join(' · ') || new Date(record.createdAt).toLocaleString('es-ES'))}</p>
      </div>
      <div class="history-metric"><span>Receta</span><strong>${format(record.dose, 1)} → ${format(record.actualYield, 1)} g</strong></div>
      <div class="history-metric"><span>Ratio</span><strong>1:${format(record.actualRatio, 2)}</strong></div>
      <div class="history-metric"><span>Tiempo</span><strong>${format(record.actualTime, 1)} s</strong></div>
      <button class="delete-button" type="button" data-delete-id="${record.id}" title="Eliminar registro" aria-label="Eliminar registro de ${escapeHtml(record.client)}">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg>
      </button>
    </article>`).join('');
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
  const headers = ['Fecha', 'Cliente', 'Máquina', 'Molinillo', 'Café/notas', 'Dosis g', 'Bebida g', 'Ratio objetivo', 'Ratio real', 'Tiempo s', 'Tiempo estimado objetivo s', 'Diagnóstico'];
  const rows = getRecords().map((r) => [r.createdAt, r.client, r.machine, r.grinder, r.notes, r.dose, r.actualYield, r.targetRatio, r.actualRatio.toFixed(2), r.actualTime, r.projectedTime.toFixed(1), r.grindTitle]);
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
render();
renderHistory();
updateNetworkStatus();
