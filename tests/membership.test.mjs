import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { NetlifyDB } from '@netlify/database-dev';
import pg from 'pg';
import { resolveAccess, calendarBillingNotice } from '../src/academy-plans.mjs';
import { giftGrant, revokeGift, getGrants, membershipPool } from '../netlify/lib/memberships.mjs';
const now=new Date('2026-10-27T18:00:00Z');
const paid={plan:'home',source:'paid',startsAt:'2026-10-01T00:00:00Z',expiresAt:'2026-11-01T00:00:00Z',revokedAt:null};
test('Home can calibrate but cannot save or track; choice is not a grant',()=>{
 assert.equal(resolveAccess({requestedPlan:'professional'},[],now).allowed,false);
 const a=resolveAccess({commercial:true},[paid],now);assert.equal(a.allowed,true);assert.equal(a.canSave,false);assert.equal(a.canHistory,false);
});
test('expired, future, malformed, revoked and unknown grants fail closed',()=>{
 for(const grant of [{...paid,expiresAt:now.toISOString()},{...paid,startsAt:'2026-12-01T00:00:00Z'},{...paid,expiresAt:null},{...paid,revokedAt:now.toISOString()},{...paid,plan:'admin'},{...paid,startsAt:'wrong'}]) assert.equal(resolveAccess(null,[grant],now).allowed,false);
});
test('indefinite gift and paid access remain independent',()=>{
 const gift={...paid,plan:'professional',source:'gift',expiresAt:null};assert.equal(resolveAccess(null,[paid,gift],now).canSave,true);
 assert.equal(resolveAccess(null,[paid,{...gift,revokedAt:now.toISOString()}],now).plan,'home');
});
test('preserve existing clients, do not treat new commercial approval as payment',()=>{
 assert.equal(resolveAccess({status:'approved'},[],now).legacy,true);
 assert.equal(resolveAccess({status:'approved',commercial:true},[],now).allowed,false);
 assert.equal(resolveAccess({status:'revoked'},[],now).allowed,false);
 assert.equal(resolveAccess({status:'revoked',commercial:true},[paid],now).allowed,false);
});
test('full initial charge, next first in Madrid, year rollover',()=>{
 assert.equal(calendarBillingNotice(now).nextRenewalDay,'2026-11-01');
 assert.equal(calendarBillingNotice(new Date('2026-12-31T22:59:00Z')).nextRenewalDay,'2027-01-01');
 assert.equal(calendarBillingNotice(new Date('2026-12-31T23:01:00Z')).nextRenewalDay,'2027-02-01');
 assert.equal(calendarBillingNotice(now).initialCharge,'full');
});
let engine,db,handler,currentUser;const objects=new Map();const context={deploy:{context:'deploy-preview',id:'membership-tests'}};
before(async()=>{
 process.env.ACADEMY_PRIZE_CODES=JSON.stringify({'TEST-HOME-PRIZE':'home','TEST-PRO-PRIZE':'professional'});
 engine=new NetlifyDB();const url=await engine.start();db=new pg.Pool({connectionString:url});
 const migrations=new URL('../netlify/database/migrations/',import.meta.url);
 for(const name of (await readdir(migrations)).filter(n=>n.endsWith('.sql')).sort())await db.query(await readFile(new URL(name,migrations),'utf8'));
 process.env.ACADEMY_MEMBERSHIPS_ENABLED='true';process.env.ACADEMY_DATABASE_URL=url;process.env.ACADEMY_DATABASE_ENVIRONMENT=context.deploy.id;
 mock.module('@netlify/identity',{namedExports:{getUser:async()=>currentUser,admin:{getUser:async()=>currentUser},verifyRequestOrigin:()=>{}}});
 const store={get:async(key)=>objects.get(key)||null,setJSON:async(key,value)=>{objects.set(key,value)},list:async()=>({blobs:[]})};
 mock.module('@netlify/blobs',{namedExports:{getStore:()=>store,getDeployStore:()=>store}});
 ({default:handler}=await import('../netlify/functions/academy.mjs'));
});
after(async()=>{await membershipPool(context)?.end();await db?.end();await engine?.stop();});
test('concurrent gift redemption is idempotent and bound to one user',async()=>{
 const input={userId:'home-user-12345',plan:'home',reference:'shopify-code:test-home',actor:'test'};
 const ids=await Promise.all([giftGrant(db,input),giftGrant(db,input)]);assert.equal(ids[0],ids[1]);
 assert.equal((await db.query('SELECT * FROM academy_access_audit')).rows.length,1);
 await assert.rejects(giftGrant(db,{...input,userId:'other-user-12345'}));
 assert.equal((await getGrants(db,input.userId)).length,1);await revokeGift(db,ids[0],'test');
 assert.equal(resolveAccess(null,await getGrants(db,input.userId),now).allowed,false);
});
test('API refuses Home save/history and isolates professional recipes',async()=>{
 currentUser={id:'home-api-user-123',confirmedAt:'2026-01-01'};
 await giftGrant(db,{userId:currentUser.id,plan:'home',reference:'shopify-code:api-home',actor:'test'});
 objects.set('profiles/'+currentUser.id,{id:currentUser.id,commercial:true,status:'pending'});
 const call=async(action,method='GET',body)=>handler(new Request('https://academy.example/api/academy/'+action,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{...context,params:{action:action.split('?')[0]}});
 assert.equal((await call('record','POST',{record:{type:'espresso',coffeeName:'Test'}})).status,403);assert.equal((await call('history')).status,403);
 assert.equal((await (await call('me')).json()).access.plan,'home');
 currentUser={id:'professional-user-123',confirmedAt:'2026-01-01'};await giftGrant(db,{userId:currentUser.id,plan:'professional',reference:'shopify-code:api-pro',actor:'test'});
 assert.equal((await call('record','POST',{record:{type:'espresso',coffeeName:'Test',localId:'foreign-local'}})).status,201);
 assert.equal((await (await call('history')).json()).records.length,1);
 currentUser={id:'another-pro-user-123',confirmedAt:'2026-01-01'};await giftGrant(db,{userId:currentUser.id,plan:'professional',reference:'shopify-code:other-pro',actor:'test'});
 assert.equal((await (await call('history')).json()).records.length,0);
 assert.equal((await call('gift-grant','POST',{userId:currentUser.id,plan:'professional'})).status,403);
 currentUser=null;assert.equal((await call('me')).status,401);
});
test('preview rejects production DB marker',()=>{process.env.ACADEMY_DATABASE_ENVIRONMENT='production';assert.throws(()=>membershipPool(context),/entorno/);process.env.ACADEMY_DATABASE_ENVIRONMENT=context.deploy.id;});

const { normalizeReceipt, normalizeReceipts, normalizePaidOrders, normalizeRefunds, persistReceipt, claimReceipts, authorizedFlow, normalizeStop, persistStop } = await import('../netlify/lib/shopify-receipts.mjs');
const receiptEvent={version:1,shop:'peppos-coffee.myshopify.com',topic:'billing_success',customerEmail:'paid@example.invalid',orderId:'123456789',contractId:'888888888',paymentStatus:'SUCCESS',billingDate:'2026-10-01T08:00:00Z',nextBillingDate:'2026-11-01T09:00:00Z',currency:'EUR',items:[{productId:'gid://shopify/Product/16413096051075',variantId:63157065908611,quantity:1}]};
test('native paid-order batches retain separate contracts and reject any unpaid or foreign entry',()=>{
 const second={...receiptEvent,contractId:'888888889',items:[{...receiptEvent.items[0],variantId:63157080621443}]};
 const batch={version:1,shop:receiptEvent.shop,topic:'paid_orders',receipts:[receiptEvent,second]};
 assert.deepEqual(normalizePaidOrders(batch).map(r=>[r.plan,r.contractId]),[['home','888888888'],['professional','888888889']]);
 assert.equal(normalizePaidOrders({...batch,receipts:[receiptEvent,{...receiptEvent,items:[{...receiptEvent.items[0],quantity:2}]}]})[0].quantity,3);
 for(const bad of [{...batch,receipts:[]},{...batch,receipts:[receiptEvent,{...second,paymentStatus:'FAILED'}]},{...batch,receipts:[{...receiptEvent,shop:'other.myshopify.com'}]}])assert.throws(()=>normalizePaidOrders(bad));
 assert.throws(()=>normalizePaidOrders({...batch,receipts:[receiptEvent,{...receiptEvent,customerEmail:'different@example.invalid'}]}));
});
test('Flow rejects unsigned, wrong-shop, unpaid and unrelated-product events',()=>{
 assert.equal(authorizedFlow(new Request('https://academy.test'),''),false);
 assert.equal(authorizedFlow(new Request('https://academy.test',{headers:{Authorization:'Bearer '+ 's'.repeat(40)}}),'s'.repeat(40)),true);
 for(const bad of [{...receiptEvent,shop:'attacker.myshopify.com'},{...receiptEvent,paymentStatus:'FAILED'},{...receiptEvent,items:[{productId:'123',variantId:63157065908611,quantity:1}]},{...receiptEvent,nextBillingDate:'2026-11-03T09:00:00Z'}]) assert.throws(()=>normalizeReceipt(bad));
});
test('paid receipts are idempotent and only the matching confirmed account can claim',async()=>{
 const receipt=normalizeReceipt(receiptEvent);assert.equal(await persistReceipt(db,receipt),true);assert.equal(await persistReceipt(db,receipt),false);
 await claimReceipts(db,{id:'wrong-email-user',email:'other@example.invalid',confirmedAt:'2026-01-01'});
 assert.equal((await getGrants(db,'wrong-email-user')).length,0);
 await claimReceipts(db,{id:'unconfirmed-user',email:'paid@example.invalid'});
 assert.equal((await getGrants(db,'unconfirmed-user')).length,0);
 const user={id:'paid-correct-user',email:'PAID@example.invalid',confirmedAt:'2026-01-01'};
 await Promise.all([claimReceipts(db,user),claimReceipts(db,user)]);
 assert.equal((await getGrants(db,user.id)).length,1);
 await assert.rejects(claimReceipts(db,{...user,id:'different-account'}));
});
test('known prize creates an indefinite gift; the same code cannot go to a second account',async()=>{
 const event={...receiptEvent,topic:'initial_paid',paymentStatus:'PAID',orderId:'222222222',discountCodes:['TEST-HOME-PRIZE']};
 const gift=normalizeReceipt(event);assert.equal(gift.source,'gift');assert.equal(gift.expiresAt,null);
 await persistReceipt(db,gift);
 await assert.rejects(persistReceipt(db,normalizeReceipt({...event,customerEmail:'someoneelse@example.invalid',orderId:'333333333'})));
});
test('paid cancellation preserves paid period; a refund revokes only its order',async()=>{
 const user={id:'lifecycle-paid-user',email:'lifecycle@example.invalid',confirmedAt:'2026-01-01'};
 const event={...receiptEvent,customerEmail:user.email,orderId:'444444444',contractId:'444444444'};
 await persistReceipt(db,normalizeReceipt(event));await claimReceipts(db,user);
 await persistStop(db,normalizeStop({...event,topic:'contract_cancel'}));
 assert.equal(resolveAccess(null,await getGrants(db,user.id),now).allowed,true);
 const refund=normalizeStop({...event,topic:'refund'});assert.equal(await persistStop(db,refund),true);
 assert.equal(await persistStop(db,refund),false);
 assert.equal(resolveAccess(null,await getGrants(db,user.id),now).allowed,false);
 await claimReceipts(db,user);assert.equal((await getGrants(db,user.id)).length,1);
});
test('refund arriving before payment prevents later activation',async()=>{
 const user={id:'early-refund-user',email:'early-refund@example.invalid',confirmedAt:'2026-01-01'};
 const event={...receiptEvent,customerEmail:user.email,orderId:'555555555',contractId:'555555555'};
 await persistStop(db,normalizeStop({...event,topic:'refund'}));await persistReceipt(db,normalizeReceipt(event));
 await claimReceipts(db,user);assert.equal((await getGrants(db,user.id)).length,0);
});
test('cancelling a prize contract removes its renewals while preserving an independent payment',async()=>{
 process.env.ACADEMY_PRIZE_CODES=JSON.stringify({'TEST-SECOND-PRIZE':'home'});
 const user={id:'cancelled-prize-user',email:'cancelled-prize@example.invalid',confirmedAt:'2026-01-01'};
 const event={...receiptEvent,customerEmail:user.email,orderId:'666666660',contractId:'666666666',topic:'initial_paid',paymentStatus:'PAID',discountCodes:['TEST-SECOND-PRIZE']};
 await persistReceipt(db,normalizeReceipt(event));
 await persistReceipt(db,normalizeReceipt({...event,orderId:'666666661',topic:'billing_success',paymentStatus:'SUCCESS'}));
 await persistReceipt(db,normalizeReceipt({...receiptEvent,customerEmail:user.email,orderId:'777777777',contractId:'777777777'}));
 await claimReceipts(db,user);assert.equal((await getGrants(db,user.id)).length,3);
 await persistStop(db,normalizeStop({...event,topic:'contract_cancel'}));
 assert.equal((await getGrants(db,user.id)).filter(g=>!g.revokedAt).length,1);
});
test('unrelated Flow events are acknowledged without access and still require authentication',async()=>{
 const {default:receiver}=await import('../netlify/functions/academy-shopify-flow.mjs');
 process.env.ACADEMY_FLOW_SECRET='test-only-private-key-'.repeat(3);
 const body=JSON.stringify({version:1,shop:'peppos-coffee.myshopify.com',topic:'ignored'});
 assert.equal((await receiver(new Request('https://academy.test/api/academy-shopify/flow',{method:'POST',body}),context)).status,401);
 const r=await receiver(new Request('https://academy.test/api/academy-shopify/flow',{method:'POST',headers:{Authorization:'Bearer '+process.env.ACADEMY_FLOW_SECRET},body}),context);
 assert.equal(r.status,202);assert.equal((await r.json()).ignored,true);
});
test('cumulative partial refunds retain access until every purchased unit is refunded',async()=>{
 const user={id:'partial-refund-user',email:'partial@example.invalid',confirmedAt:'2026-01-01'};
 const item={...receiptEvent.items[0],quantity:2};
 const event={...receiptEvent,customerEmail:user.email,orderId:'881111111',contractId:'881111111',items:[item]};
 await persistReceipt(db,normalizeReceipt(event));await claimReceipts(db,user);
 await persistStop(db,normalizeRefunds({...event,topic:'refund',items:[{...item,quantity:1}]})[0]);
 assert.equal(resolveAccess(null,await getGrants(db,user.id),now).allowed,true);
 const full=normalizeRefunds({...event,topic:'refund',items:[{...item,quantity:1},{...item,quantity:1}]})[0];
 assert.equal(await persistStop(db,full),true);assert.equal(await persistStop(db,full),false);
 assert.equal(resolveAccess(null,await getGrants(db,user.id),now).allowed,false);
});
test('mixed contract cancellation revokes gifted Home while retaining paid professional access',async()=>{
 process.env.ACADEMY_PRIZE_CODES=JSON.stringify({'TEST-MIXED-PRIZE':'home'});
 const user={id:'mixed-contract-user',email:'mixed@example.invalid',confirmedAt:'2026-01-01'};
 const event={...receiptEvent,customerEmail:user.email,orderId:'882222222',contractId:'882222222',topic:'initial_paid',paymentStatus:'PAID',discountCodes:['TEST-MIXED-PRIZE'],items:[receiptEvent.items[0],{...receiptEvent.items[0],variantId:63157080621443},{productId:'99999',variantId:'99999',quantity:1}]};
 const receipts=normalizeReceipts(event);assert.equal(receipts.length,2);
 for(const receipt of receipts)await persistReceipt(db,receipt);
 await claimReceipts(db,user);await persistStop(db,normalizeStop({...event,topic:'contract_cancel'}));
 const active=(await getGrants(db,user.id)).filter(g=>!g.revokedAt);
 assert.equal(active.length,1);assert.equal(active[0].plan,'professional');
 assert.equal(resolveAccess(null,active,now).canSave,true);
});
