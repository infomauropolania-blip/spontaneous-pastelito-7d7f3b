import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function worker() {
  const handlers={},stored=new Map();let requests=0;
  const cache={match:async r=>stored.get(r.url),put:async(r,value)=>stored.set(r.url,value)};
  runInNewContext(source,{URL,self:{location:{origin:'https://academy.test'},addEventListener:(name,fn)=>{handlers[name]=fn;}},
    caches:{open:async()=>cache,match:async r=>stored.get(r.url)},fetch:async()=>{requests++;return new Response('network');}});
  return {stored,get requests(){return requests;},async request(path,mode='cors',method='GET'){
    let response;handlers.fetch({request:{url:'https://academy.test'+path,method,mode},respondWith:r=>{response=r;}});
    return response?await response:undefined;
  }};
}
test('a cached versioned script opens without waiting for the network',async()=>{
  const w=worker(),path='/src/access.bundle.js?v=startup-20261027-1';
  w.stored.set('https://academy.test'+path,new Response('cached script'));
  assert.equal(await (await w.request(path)).text(),'cached script');assert.equal(w.requests,0);
});
test('uncached release assets are fetched and then reused locally',async()=>{
  const w=worker(),path='/src/styles.css?v=startup-20261027-1';
  assert.equal(await (await w.request(path)).text(),'network');
  assert.equal(await (await w.request(path)).text(),'network');assert.equal(w.requests,1);
});
test('authentication and paid membership checks never use the public asset cache',async()=>{
  const w=worker();for(const path of ['/api/academy/me','/.netlify/identity/user']) {
    w.stored.set('https://academy.test'+path,new Response('stale access'));
    assert.equal(await w.request(path),undefined);
  }
  assert.equal(await w.request('/api/academy/record','cors','POST'),undefined);assert.equal(w.requests,0);
});
test('navigation always requests the current page instead of returning an old screen',async()=>{
  const w=worker();w.stored.set('https://academy.test/',new Response('old page'));
  assert.equal(await (await w.request('/','navigate')).text(),'network');assert.equal(w.requests,1);
});
