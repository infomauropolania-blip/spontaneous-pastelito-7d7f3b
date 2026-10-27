import { membershipPool } from '../lib/memberships.mjs';
import { authorizedFlow, normalizeReceipts, persistReceipt, normalizeStop, normalizeRefunds, persistStop } from '../lib/shopify-receipts.mjs';
const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export default async function handler(req,context) {
  if (!authorizedFlow(req,process.env.ACADEMY_FLOW_SECRET)) return reply({error:'No autorizado.'},401);
  if(req.method !== 'POST') return reply({error:'Método no permitido.'},405);
  try {
    const declared=Number(req.headers.get('content-length')||0);
    if(declared>24000)return reply({error:'Evento demasiado grande.'},413);
    const text=await req.text();if(Buffer.byteLength(text)>24000)return reply({error:'Evento demasiado grande.'},413);
    let receipt,stopping;
    try{
      const event=JSON.parse(text);
      if(event.version===1 && event.shop==='peppos-coffee.myshopify.com' && event.topic==='ignored')return reply({accepted:true,ignored:true},202);
      stopping=['contract_cancel','refund'].includes(event.topic);
      receipt=stopping?(event.topic==='refund'?normalizeRefunds(event):[normalizeStop(event)]):normalizeReceipts(event);
    }catch{return reply({error:'Evento de pago inválido.'},400);}
    const db=membershipPool(context);if(!db)return reply({error:'Integración todavía no activada.'},503);
    let created=false;
    for(const item of receipt)created=(await (stopping?persistStop(db,item):persistReceipt(db,item))) || created;
    return reply({accepted:true,duplicate:!created},202);
  }catch{return reply({error:'No se pudo registrar el evento; reintentar.'},503);}
}
export const config={path:'/api/academy-shopify/flow'};
