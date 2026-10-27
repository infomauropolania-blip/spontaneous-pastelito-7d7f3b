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
  if (!/^\d{5,30}$/.test(numericId(event.contractId))) throw new Error('Contrato inválido.');
  const start = new Date(event.billingDate);
  const end = new Date(event.nextBillingDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end - start > 40 * 86400000) throw new Error('Período inválido.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', day: '2-digit' }).formatToParts(end).map(p=>[p.type,p.value]));
  if (parts.day !== '01') throw new Error('La renovación debe ser el día 1.');
  if (!Array.isArray(event.items) || event.items.length > 100) throw new Error('Modalidad inválida.');
  const items = event.items.filter(item=>numericId(item.productId) === PRODUCT && VARIANTS[numericId(item.variantId || item.graphqlVariantId)]);
  if (items.length !== 1 || !Number.isInteger(Number(items[0].quantity)) || Number(items[0].quantity)<1 || Number(items[0].quantity)>1000) throw new Error('Cantidad de Academy inválida.');
  const plan = VARIANTS[numericId(items[0].variantId || items[0].graphqlVariantId)];
  const prize = Array.isArray(event.discountCodes) ? event.discountCodes.find(code=>prizePlan(code) === plan) : null;
  // Only the paid initial checkout may redeem one of our known prize codes.
  const source = event.topic === 'initial_paid' && prize ? 'gift' : 'paid';
  return { reference: source === 'gift' ? `shopify-prize:${prize}` : `shopify-order:${numericId(event.orderId)}:${numericId(items[0].variantId || items[0].graphqlVariantId)}`,
    customerHash: emailHash(event.customerEmail), plan, source, startsAt: start.toISOString(), expiresAt: source === 'gift' ? null : end.toISOString(),
    orderId: numericId(event.orderId), variantId: numericId(items[0].variantId || items[0].graphqlVariantId), contractId: numericId(event.contractId), quantity:Number(items[0].quantity) };
}
export function normalizeReceipts(event) {
  if(!Array.isArray(event?.items) || event.items.length>100)throw new Error('Modalidad inválida.');
  const byVariant=new Map();
  for(const item of event.items)if(numericId(item.productId)===PRODUCT && VARIANTS[numericId(item.variantId || item.graphqlVariantId)]) {
    const id=numericId(item.variantId || item.graphqlVariantId),old=byVariant.get(id);
    byVariant.set(id,{...item,quantity:Number(item.quantity)+(old?.quantity||0)});
  }
  if(!byVariant.size)throw new Error('Sin modalidad de Academy.');
  return [...byVariant.values()].map(item=>normalizeReceipt({...event,items:[item]}));
}
export async function persistReceipt(db, receipt) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    await lock(client,'contract:'+receipt.contractId);
    await lock(client,'order:'+receipt.orderId+':'+receipt.variantId);
    const result = await client.query(`INSERT INTO academy_purchase_receipts
      (external_reference,customer_hash,plan,source,starts_at,expires_at,order_id,variant_id,contract_id,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(external_reference) DO NOTHING`, [receipt.reference,receipt.customerHash,receipt.plan,receipt.source,receipt.startsAt,receipt.expiresAt,receipt.orderId,receipt.variantId,receipt.contractId,receipt.quantity]);
    const { rows } = await client.query('SELECT customer_hash,plan,source,order_id,contract_id FROM academy_purchase_receipts WHERE external_reference=$1',[receipt.reference]);
    if (rows[0]?.customer_hash !== receipt.customerHash || rows[0]?.plan !== receipt.plan || rows[0]?.source !== receipt.source
      || rows[0]?.order_id !== receipt.orderId || rows[0]?.contract_id !== receipt.contractId) throw new Error('El recibo pertenece a otra cuenta o modalidad.');
    const stop=await client.query(`SELECT reference FROM academy_shopify_stops WHERE
      (reference=$1 AND refunded_quantity >= $5) OR (reference=$2 AND EXISTS(SELECT 1 FROM academy_purchase_receipts WHERE contract_id=$3 AND variant_id=$4 AND source='gift'))`,
      ['order:'+receipt.orderId+':'+receipt.variantId,'contract:'+receipt.contractId,receipt.contractId,receipt.variantId,receipt.quantity]);
    if(stop.rows.length) {
      const revoked=stop.rows.some(s=>s.reference.startsWith('contract:'))
        ? await client.query(`UPDATE academy_purchase_receipts SET revoked_at=COALESCE(revoked_at,now()) WHERE contract_id=$1
          AND variant_id IN(SELECT variant_id FROM academy_purchase_receipts WHERE contract_id=$1 AND source='gift') RETURNING external_reference`,[receipt.contractId])
        : await client.query('UPDATE academy_purchase_receipts SET revoked_at=COALESCE(revoked_at,now()) WHERE external_reference=$1 RETURNING external_reference',[receipt.reference]);
      await revokeReferences(client,revoked.rows.map(r=>r.external_reference));
    }
    await client.query('COMMIT');return result.rowCount === 1;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
const lock=(db,reference)=>db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[reference]);
async function revokeReferences(client,references) {
  if(!references.length)return;
  const revoked=await client.query('UPDATE academy_access_grants SET revoked_at=now() WHERE external_reference=ANY($1::text[]) AND revoked_at IS NULL RETURNING id',[references]);
  for(const grant of revoked.rows)await client.query("INSERT INTO academy_access_audit(id,grant_id,action,actor) VALUES($1,$2,'revoke','verified-shopify-flow')",[randomUUID(),grant.id]);
}
export function normalizeStop(event) {
  if(event?.version!==1 || event.shop!==SHOP || event.currency!=='EUR') throw new Error('Evento inválido.');
  if(event.topic==='contract_cancel' && /^\d{5,30}$/.test(numericId(event.contractId)))
    return {kind:'contract_cancel',reference:'contract:'+numericId(event.contractId),contractId:numericId(event.contractId)};
  if(event.topic==='refund' && /^\d{5,30}$/.test(numericId(event.orderId)) && Array.isArray(event.items)) {
    const items=event.items.filter(i=>numericId(i.productId)===PRODUCT && VARIANTS[numericId(i.variantId)] && Number(i.quantity)>=1);
    if(items.length!==1)throw new Error('Reembolso sin modalidad de Academy.');
    if(!Number.isInteger(Number(items[0].quantity)) || Number(items[0].quantity)>1000)throw new Error('Cantidad de reembolso inválida.');
    return {kind:'refund',reference:'order:'+numericId(event.orderId)+':'+numericId(items[0].variantId),orderId:numericId(event.orderId),variantId:numericId(items[0].variantId),quantity:Number(items[0].quantity)};
  }
  throw new Error('Evento inválido.');
}
export function normalizeRefunds(event) {
  if(!Array.isArray(event?.items) || event.items.length>100)throw new Error('Reembolso inválido.');
  const byVariant=new Map();
  for(const item of event.items)if(numericId(item.productId)===PRODUCT && VARIANTS[numericId(item.variantId)]) {
    const id=numericId(item.variantId),old=byVariant.get(id);
    byVariant.set(id,{...item,quantity:Number(item.quantity)+(old?.quantity||0)});
  }
  if(!byVariant.size)throw new Error('Sin reembolso de Academy.');
  return [...byVariant.values()].map(item=>normalizeStop({...event,items:[item]}));
}
export async function persistStop(db, stop) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');await lock(client,stop.reference);
    const inserted=await client.query(`INSERT INTO academy_shopify_stops(reference,kind,refunded_quantity) VALUES($1,$2,$3)
      ON CONFLICT(reference) DO UPDATE SET refunded_quantity=EXCLUDED.refunded_quantity
      WHERE academy_shopify_stops.kind='refund' AND EXCLUDED.refunded_quantity>academy_shopify_stops.refunded_quantity`,[stop.reference,stop.kind,stop.quantity||1]);
    // A paid cancellation preserves the period already purchased. A cancelled
    // prize contract revokes that prize and its zero-value renewal receipts.
    const result=stop.kind==='refund'
      ? await client.query(`UPDATE academy_purchase_receipts SET revoked_at=COALESCE(revoked_at,now()) WHERE order_id=$1 AND variant_id=$2
          AND quantity <= (SELECT refunded_quantity FROM academy_shopify_stops WHERE reference=$3) RETURNING external_reference`,[stop.orderId,stop.variantId,stop.reference])
      : await client.query(`UPDATE academy_purchase_receipts SET revoked_at=COALESCE(revoked_at,now()) WHERE contract_id=$1
        AND variant_id IN(SELECT variant_id FROM academy_purchase_receipts WHERE contract_id=$1 AND source='gift') RETURNING external_reference`,[stop.contractId]);
    const references=result.rows.map(r=>r.external_reference);
    await revokeReferences(client,references);
    await client.query('COMMIT');return inserted.rowCount===1;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function claimReceipts(db, user) {
  if (!db || !user?.confirmedAt || !user.email) return;
  const hash=emailHash(user.email); const client=await db.connect();
  try {
    await client.query('BEGIN');
    const receipts=await client.query('SELECT * FROM academy_purchase_receipts WHERE customer_hash=$1 AND revoked_at IS NULL ORDER BY external_reference FOR UPDATE',[hash]);
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
