import pg from 'pg';
import { getConnectionString } from '@netlify/database';
import { randomUUID } from 'node:crypto';
let pool;
export function membershipPool(context) {
  if (process.env.ACADEMY_MEMBERSHIPS_ENABLED !== 'true') return null;
  // Netlify injects its branch-specific connection; never export it to a file.
  if (process.env.ACADEMY_DATABASE_PROVIDER === 'netlify') {
    pool ??= new pg.Pool({ connectionString: getConnectionString(), max: 3, connectionTimeoutMillis: 5000 });
    return pool;
  }
  // An explicit environment marker prevents a custom preview from using the live DB.
  const marker = context.deploy.context === 'production' ? 'production' : context.deploy.id;
  if (!process.env.ACADEMY_DATABASE_URL || process.env.ACADEMY_DATABASE_ENVIRONMENT !== marker) {
    throw new Error('El acceso comercial todavía no está configurado en este entorno.');
  }
  pool ??= new pg.Pool({ connectionString: process.env.ACADEMY_DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
  return pool;
}
export async function getGrants(db, userId) {
  if (!db) return [];
  const { rows } = await db.query('SELECT id, plan, source, starts_at AS "startsAt", expires_at AS "expiresAt", revoked_at AS "revokedAt" FROM academy_access_grants WHERE user_id = $1', [userId]);
  return rows.map(r => ({...r, startsAt: r.startsAt.toISOString(), expiresAt: r.expiresAt?.toISOString() ?? null, revokedAt: r.revokedAt?.toISOString() ?? null}));
}
export async function giftGrant(db, { userId, plan, reference, actor }) {
  if (!['home', 'professional'].includes(plan) || !/^[\w-]{10,100}$/.test(userId)
      || typeof reference !== 'string' || !/^[\w:-]{8,160}$/.test(reference)) throw new Error('Invitación inválida.');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO academy_access_grants
      (id, user_id, plan, source, external_reference, created_by) VALUES ($1,$2,$3,'gift',$4,$5)
      ON CONFLICT (external_reference) DO NOTHING RETURNING id`, [randomUUID(),userId,plan,reference,actor]);
    if (result.rows.length) await client.query('INSERT INTO academy_access_audit (id,grant_id,action,actor) VALUES ($1,$2,\'grant\',$3)',[randomUUID(),result.rows[0].id,actor]);
    const { rows } = await client.query('SELECT id, user_id, plan FROM academy_access_grants WHERE external_reference=$1', [reference]);
    if (rows[0]?.user_id !== userId || rows[0]?.plan !== plan) throw new Error('La invitación ya pertenece a otra cuenta o modalidad.');
    await client.query('COMMIT');
    return rows[0].id;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function revokeGift(db, id, actor) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invitación inválida.');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("UPDATE academy_access_grants SET revoked_at=now() WHERE id=$1 AND source='gift' AND revoked_at IS NULL RETURNING id",[id]);
    if (rows.length) await client.query("INSERT INTO academy_access_audit (id,grant_id,action,actor) VALUES ($1,$2,'revoke',$3)",[randomUUID(),id,actor]);
    await client.query('COMMIT'); return rows.length > 0;
  } catch(e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
