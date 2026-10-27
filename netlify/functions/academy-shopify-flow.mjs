import { membershipPool } from '../lib/memberships.mjs';
import { authorizedFlow, normalizeReceipt, persistReceipt } from '../lib/shopify-receipts.mjs';
const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export default async function handler(req,context) {
  if (!authorizedFlow(req,process.env.ACADEMY_FLOW_SECRET)) return reply({error:'No autorizado.'},401);
  if(req.method !== 'POST') return reply({error:'Método no permitido.'},405);
  try {
    const declared=Number(req.headers.get('content-length')||0);
    if(declared>24000)return reply({error:'Evento demasiado grande.'},413);
    const text=await req.text();if(Buffer.byteLength(text)>24000)return reply({error:'Evento demasiado grande.'},413);
    let receipt;
    try{receipt=normalizeReceipt(JSON.parse(text));}catch{return reply({error:'Evento de pago inválido.'},400);}
    const db=membershipPool(context);if(!db)return reply({error:'Integración todavía no activada.'},503);
    const created=await persistReceipt(db,receipt);
    return reply({accepted:true,duplicate:!created},202);
  }catch{return reply({error:'No se pudo registrar el evento; reintentar.'},503);}
}
export const config={path:'/api/academy-shopify/flow'};
