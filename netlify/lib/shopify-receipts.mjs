import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const SHOP = 'peppos-coffee.myshopify.com';
const PRODUCT = '16413096051075';
const VARIANTS = { '63157065908611': 'home', '63157080621443': 'professional' };
function prizePlan(code) {
  // Prize codes are commercial secrets, never publish them in the repository.
  try {
    const prizes = JSON.parse(process.env.ACADEMY_PRIZE_CODES || '{}');
    return Object.hasOwn(prizes, code) && ['home', 'professional'].includes(prizes[code]) ? prizes[code] : null;
  } catch { return null; }
}
const numericId = value => String(value || '').split('/').at(-1);
export const emailHash = value => createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex');
export function authorizedFlow(req, secret) {
  const supplied = String(req.headers.get('authorization') || '').replace(/^Bearer /, '');
  return Boolean(secret && Buffer.byteLength(secret) >= 32 && Buffer.byteLength(supplied) === Buffer.byteLength(secret)
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(secret)));
}
export function normalizeReceipt(event) {
  if (event?.version !== 1 || event.shop !== SHOP || event.currency !== 'EUR') throw new Error('Evento de tienda inválido.');
  if (!['billing_success', 'initial_paid'].includes(event.topic) || event.topic === 'billing_success' && event.paymentStatus !== 'SUCCESS'
      || event.topic === 'initial_paid' && event.paymentStatus !== 'PAID') throw new Error('El pago no está confirmado.');
  if (!/^\S+@\S+\.\S+$/.test(event.customerEmail || '') || !/^\d{5,30}$/.test(numericId(event.orderId))) throw new Error('Cuenta o pedido inválido.');
  const start = new Date(event.billingDate);
  const end = new Date(event.nextBillingDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end - start > 40 * 86400000) throw new Error('Período inválido.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', day: '2-digit' }).formatToParts(end).map(p=>[p.type,p.value]));
  if (parts.day !== '01') throw new Error('La renovación debe ser el día 1.');
  if (!Array.isArray(event.items) || event.items.length > 100) throw new Error('Modalidad inválida.');
  const items = event.items.filter(item=>numericId(item.productId) === PRODUCT && VARIANTS[numericId(item.variantId || item.graphqlVariantId)]);
  if (items.length !== 1 || Number(items[0].quantity) !== 1) throw new Error('El pedido debe contener una sola modalidad de Academy.');
  const plan = VARIANTS[numericId(items[0].variantId || items[0].graphqlVariantId)];
  const prize = Array.isArray(event.discountCodes) ? event.discountCodes.find(code=>prizePlan(code) === plan) : null;
  // Only the paid initial checkout may redeem one of our known prize codes.
  const source = event.topic === 'initial_paid' && prize ? 'gift' : 'paid';
  return { reference: source === 'gift' ? `shopify-prize:${prize}` : `shopify-order:${numericId(event.orderId)}:${numericId(items[0].variantId || items[0].graphqlVariantId)}`,
    customerHash: emailHash(event.customerEmail), plan, source, startsAt: start.toISOString(), expiresAt: source === 'gift' ? null : end.toISOString() };
}
export async function persistReceipt(db, receipt) {
  const result = await db.query(`INSERT INTO academy_purchase_receipts
    (external_reference,customer_hash,plan,source,starts_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(external_reference) DO NOTHING`, [receipt.reference,receipt.customerHash,receipt.plan,receipt.source,receipt.startsAt,receipt.expiresAt]);
  const { rows } = await db.query('SELECT customer_hash,plan,source FROM academy_purchase_receipts WHERE external_reference=$1',[receipt.reference]);
  if (rows[0]?.customer_hash !== receipt.customerHash || rows[0]?.plan !== receipt.plan || rows[0]?.source !== receipt.source) throw new Error('El recibo pertenece a otra cuenta o modalidad.');
  return result.rowCount === 1;
}
export async function claimReceipts(db, user) {
  if (!db || !user?.confirmedAt || !user.email) return;
  const hash=emailHash(user.email); const client=await db.connect();
  try {
    await client.query('BEGIN');
    const receipts=await client.query('SELECT * FROM academy_purchase_receipts WHERE customer_hash=$1',[hash]);
    if (!receipts.rows.length) { await client.query('COMMIT'); return; }
    await client.query('INSERT INTO academy_customer_bindings(customer_hash,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[hash,user.id]);
    const binding=await client.query('SELECT user_id FROM academy_customer_bindings WHERE customer_hash=$1 FOR UPDATE',[hash]);
    if (binding.rows[0]?.user_id !== user.id) throw new Error('La compra ya está vinculada a otra cuenta.');
    for (const r of receipts.rows) {
      const created=await client.query(`INSERT INTO academy_access_grants(id,user_id,plan,source,starts_at,expires_at,external_reference,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,'verified-shopify-flow') ON CONFLICT(external_reference) DO NOTHING RETURNING id`,[randomUUID(),user.id,r.plan,r.source,r.starts_at,r.expires_at,r.external_reference]);
      if (created.rows.length) await client.query("INSERT INTO academy_access_audit(id,grant_id,action,actor) VALUES($1,$2,'grant','verified-shopify-flow')",[randomUUID(),created.rows[0].id]);
    }
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
