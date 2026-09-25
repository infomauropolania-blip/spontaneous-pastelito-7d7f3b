import { getUser, verifyRequestOrigin } from '@netlify/identity';
import { getStore, getDeployStore } from '@netlify/blobs';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { cleanText, dayInMadrid, groupDaily, normalizeRecord, publicProfile, validDay } from '../../src/academy-access-core.mjs';

const store = () => Netlify.context?.deploy?.context === 'production'
  ? getStore({ name: 'peppos-academy-v1', consistency: 'strong' })
  : getDeployStore({ name: 'peppos-academy-v1', consistency: 'strong' });
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (message, status = 400) => json({ error: message }, status);
function bridgeAdmin(req) {
  const secret = String(process.env.ACADEMY_BRIDGE_SECRET || '');
  const token = String(req.headers.get('authorization') || '').replace(/^Bearer /i, '');
  return secret.length >= 32 && token.length === secret.length
    && timingSafeEqual(Buffer.from(secret), Buffer.from(token));
}
const profileKey = (id) => `profiles/${id}`;
const recordKey = (record) => `records/${record.day}/${record.localId}/${record.id}`;
const localKey = (id) => `locals/${id}`;
async function read(key) { return store().get(key, { type: 'json' }); }
async function write(key, value) { return store().setJSON(key, value); }
async function list(prefix) {
  const result = await store().list({ prefix });
  return (await Promise.all(result.blobs.map((item) => read(item.key)))).filter(Boolean);
}
async function requestBody(req) {
  try { return await req.json(); } catch { return {}; }
}

export default async function handler(req, context) {
  try {
    const action = context.params.action;
    const method = req.method.toUpperCase();
    const isAdmin = bridgeAdmin(req);
    if (!isAdmin && !['GET', 'HEAD'].includes(method)) verifyRequestOrigin(req);
    const user = isAdmin ? null : await getUser();
    if (!isAdmin && (!user || !user.emailVerified)) return error('Confirma tu correo e inicia sesión.', 401);
    const profile = user ? await read(profileKey(user.id)) : null;

    if (action === 'me' && method === 'GET') return json({ user: { id: user.id, email: user.email }, profile: publicProfile(profile) });

    if (action === 'request' && method === 'POST') {
      if (profile?.status === 'approved') return error('Tu acceso ya está aprobado.', 409);
      const data = await requestBody(req);
      const name = cleanText(data.name, 100);
      const requestedLocal = cleanText(data.local, 100);
      if (name.length < 2 || requestedLocal.length < 2) return error('Indica tu nombre y el local.');
      const next = { id: user.id, email: user.email, name, requestedLocal, localId: null, localName: null, status: 'pending', requestedAt: new Date().toISOString(), reviewedAt: null };
      await write(profileKey(user.id), next);
      return json({ profile: publicProfile(next) }, 201);
    }

    if (action === 'locals' && method === 'GET') {
      if (!isAdmin) return error('Acceso de administración requerido.', 403);
      return json({ locals: (await list('locals/')).sort((a,b) => a.name.localeCompare(b.name, 'es')) });
    }
    if (action === 'profiles' && method === 'GET') {
      if (!isAdmin) return error('Acceso de administración requerido.', 403);
      return json({ profiles: (await list('profiles/')).map(publicProfile).sort((a,b) => String(b.requestedAt).localeCompare(String(a.requestedAt))) });
    }
    if (action === 'review' && method === 'POST') {
      if (!isAdmin) return error('Acceso de administración requerido.', 403);
      const data = await requestBody(req);
      const targetId = String(data.userId || '');
      if (!/^[\w-]{10,100}$/.test(targetId)) return error('Persona inválida.');
      const target = await read(profileKey(targetId));
      if (!target) return error('Solicitud no encontrada.', 404);
      const status = String(data.status || '');
      if (!['approved', 'revoked'].includes(status)) return error('Estado inválido.');
      let local = null;
      if (status === 'approved') {
        const localId = String(data.localId || '');
        const localName = cleanText(data.localName, 100);
        if (!/^[\w-]{1,100}$/.test(localId) || localName.length < 2) return error('Elige un local válido de Gestión.');
        local = { id: localId, name: localName, active: true };
        await write(localKey(local.id), local);
      }
      const next = { ...target, status, localId: local?.id || target.localId || null, localName: local?.name || target.localName || null, reviewedAt: new Date().toISOString(), reviewedBy: 'Gestión' };
      await write(profileKey(targetId), next);
      return json({ profile: publicProfile(next) });
    }

    if (action === 'record' && method === 'POST') {
      if (profile?.status !== 'approved' || !profile.localId) return error('Tu acceso sigue pendiente o ha sido retirado.', 403);
      const local = await read(localKey(profile.localId));
      if (!local?.active) return error('El local ya no está activo.', 403);
      const data = await requestBody(req);
      const normalized = normalizeRecord(data.record);
      const createdAt = new Date();
      const record = { ...normalized, id: randomUUID(), day: dayInMadrid(createdAt), createdAt: createdAt.toISOString(), userId: user.id, userName: profile.name, localId: local.id, localName: local.name };
      await write(recordKey(record), record);
      return json({ record }, 201);
    }
    if (action === 'history' && method === 'GET') {
      const url = new URL(req.url);
      const day = url.searchParams.get('day') || dayInMadrid();
      if (!validDay(day)) return error('Fecha inválida.');
      if (isAdmin) {
        const [records, locals] = await Promise.all([list(`records/${day}/`), list('locals/')]);
        return json({ day, groups: groupDaily(records, locals) });
      }
      if (profile?.status !== 'approved' || !profile.localId) return error('Tu acceso sigue pendiente o ha sido retirado.', 403);
      const records = await list(`records/${day}/${profile.localId}/`);
      return json({ day, records: records.filter((record) => record.userId === user.id).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
    }
    return error('Ruta no encontrada.', 404);
  } catch (cause) {
    if (cause?.status === 403) return error('Solicitud no autorizada.', 403);
    if (cause?.message?.startsWith('Valor inválido') || ['Falta el registro.', 'El registro es demasiado grande.', 'Método de calibración inválido.', 'Indica el café.'].includes(cause?.message)) return error(cause.message);
    console.error('Academy API failed', cause);
    return error('No se pudo completar la operación.', 500);
  }
}

export const config = { path: '/api/academy/:action' };
