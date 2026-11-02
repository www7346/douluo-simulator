/* Public resources only. No API, save, upload or model response enters these caches. */
const BUILD = __CLOUD_VERSION__;
const FILES = __CLOUD_FILES__;
const PREFIX = 'douluo-cloud-resources-';
const SHELL = PREFIX + BUILD + '-shell', VISITED = PREFIX + BUILD + '-visited';
const MAX_BYTES = 64 * 1024 * 1024, MAX_FILES = 320;
const allowed = new Map(FILES.map(file => [file.path, file]));
const essential = FILES.filter(file => file.shell);
let writes = Promise.resolve();
async function checked(response, file) {
  const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (response.status !== 200 || response.redirected || !file.mime.includes(mime)) throw Error('Invalid public resource');
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== file.bytes) throw Error('Incomplete public resource');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  if (digest !== file.hash) throw Error('Public resource hash mismatch');
  return response;
}
function download(file) {return fetch(new Request(new URL(file.path,self.location.origin),{cache:'no-store',credentials:'omit',redirect:'error'})).then(response=>checked(response,file));}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(SHELL);
  try {for(const file of essential)await cache.put(file.path,await download(file));}
  catch(error){await caches.delete(SHELL);throw error;}
  // A new version waits until the player has saved and left every game tab.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(clients.every(client=>new URL(client.url).pathname==='/update.html')){
    for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==SHELL&&key!==VISITED)await caches.delete(key);
  }
})()));
async function remember(file,response){
  const cache=await caches.open(file.shell?SHELL:VISITED);
  if(!file.shell){
    const entries=await cache.keys();
    const sizes=entries.map(entry=>({entry,bytes:allowed.get(new URL(entry.url).pathname)?.bytes??MAX_BYTES}));
    let total=sizes.reduce((n,entry)=>n+entry.bytes,0),count=sizes.length;
    for(const old of sizes){if(total+file.bytes<=MAX_BYTES&&count<MAX_FILES)break;await cache.delete(old.entry);total-=old.bytes;count--;}
    if(file.bytes>MAX_BYTES)return;
  }
  await cache.put(file.path,response);
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.search||request.headers.has('range')||request.headers.has('authorization'))return;
  const path=request.mode==='navigate'&&['/','/index.html'].includes(url.pathname)?'/index.html':url.pathname;
  const file=allowed.get(path);if(!file||(request.mode==='navigate'&&path!=='/index.html'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(file.shell?SHELL:VISITED),cached=await cache.match(file.path);
    if(cached)return cached;
    try{
      const response=await download(file);
      const copy=response.clone();writes=writes.then(()=>remember(file,copy)).catch(()=>{});event.waitUntil(writes);
      return response;
    }catch{return Response.error();}
  })());
});
self.addEventListener('message',event=>{
  const reply=value=>(event.ports?.[0]??event.source)?.postMessage(value);
  if(event.data?.type==='DOULUO_OFFLINE_STATUS')reply({type:'DOULUO_OFFLINE_STATUS',build:BUILD,assets:essential.length});
  if(event.data?.type==='DOULUO_ACTIVATE'&&event.data.build===BUILD)event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if(clients.some(client=>new URL(client.url).pathname!=='/update.html')){reply({blocked:true});return;}
    reply({accepted:true});await self.skipWaiting();
  })());
});
