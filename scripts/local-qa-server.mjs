// Local fixture server ONLY. Not copied into dist or deployed to Netlify.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)).replace(/\/$/,'');
const user={id:'qa-user-123456',email:'qa@example.invalid',confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{full_name:'Barista de prueba'}};
const token=()=>`header.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.signature`;
createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 const cookies=String(req.headers.cookie||'');const plan=url.searchParams.get('qa')||(/qa_plan=professional/.test(cookies)?'professional':'home');
 res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/'&&url.searchParams.has('qa'))res.setHeader('Set-Cookie',[`nf_jwt=${token()}; Path=/`,`nf_refresh=qa-refresh; Path=/`,`qa_plan=${plan}; Path=/`]);
 if(url.pathname.startsWith('/.netlify/identity')){
  res.setHeader('Content-Type','application/json');
  return res.end(JSON.stringify(url.pathname.endsWith('/token')?{access_token:token(),refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer'}:user));
 }
 if(url.pathname==='/api/academy/me'){
  res.setHeader('Content-Type','application/json');
  return res.end(JSON.stringify({user:{id:user.id,email:user.email},profile:{status:'pending',commercial:true},access:{allowed:true,plan,name:plan==='professional'?'Barista profesional':'Barista en casa',canSave:plan==='professional',canHistory:plan==='professional',legacy:false,source:'gift'}}));
 }
 if(url.pathname==='/api/academy/history'){
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({records:[]}));
 }
 const name=url.pathname==='/'?'/index.html':url.pathname;const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+'/'))throw Error();
 const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':file.endsWith('.jpeg')?'image/jpeg':'application/json');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
}).listen(4317,'127.0.0.1',()=>console.log('Local QA at http://127.0.0.1:4317/?qa=home'));
