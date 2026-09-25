export const ACADEMY_TIME_ZONE = 'Europe/Madrid';

export function dayInMadrid(value = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ACADEMY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(value);
}

export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function cleanText(value, max = 100) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function publicProfile(profile) {
  if (!profile) return null;
  const { id, email, name, requestedLocal, localId, localName, status, requestedAt, reviewedAt } = profile;
  return { id, email, name, requestedLocal, localId, localName, status, requestedAt, reviewedAt };
}

export function normalizeRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Falta el registro.');
  if (JSON.stringify(input).length > 12000) throw new Error('El registro es demasiado grande.');
  const type = ['espresso', 'filter', 'manual'].includes(input.type) ? input.type : null;
  if (!type) throw new Error('Método de calibración inválido.');
  const coffeeName = cleanText(input.coffeeName, 100);
  if (!coffeeName) throw new Error('Indica el café.');
  const allowed = ['process','client','machine','grinder','notes','methodName','taste','sensoryAdvice','lot','roastDate','flavorGoal','waterTemperature','grindNote','techniqueNote','kind','strengthSetting','grinderSetting','model','brewStyle','timeUnit','strength','grindTitle','title'];
  const numeric = ['dose','actualYield','water','targetRatio','actualRatio','actualTime','time','waterVolume','targetVolume','dilution','projectedTime'];
  const record = { type, coffeeName };
  for (const key of allowed) if (input[key] != null) record[key] = cleanText(input[key], key === 'notes' || key === 'techniqueNote' ? 250 : 120);
  for (const key of numeric) if (input[key] != null && input[key] !== '') {
    const value = Number(input[key]);
    if (!Number.isFinite(value) || Math.abs(value) > 100000) throw new Error(`Valor inválido: ${key}.`);
    record[key] = value;
  }
  return record;
}

export function groupDaily(records, locals = []) {
  const groups = new Map(locals.map(({ id, name }) => [id, { id, name, people: new Map(), count: 0 }]));
  for (const record of records) {
    const id = record.localId;
    if (!groups.has(id)) groups.set(id, { id, name: record.localName || 'Local', people: new Map(), count: 0 });
    const group = groups.get(id);
    group.count++;
    if (!group.people.has(record.userId)) group.people.set(record.userId, { id: record.userId, name: record.userName || 'Persona', records: [] });
    group.people.get(record.userId).records.push(record);
  }
  return [...groups.values()].map(({ people, ...group }) => ({ ...group, people: [...people.values()].map((person) => ({ ...person, records: person.records.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))) })) }));
}
