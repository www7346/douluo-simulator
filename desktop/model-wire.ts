import {randomUUID} from 'node:crypto';
import {lookup} from 'node:dns';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {BlockList,isIP} from 'node:net';
import {Readable,Transform} from 'node:stream';
import {browserRequestPath,BROWSER_REQUEST_LIMIT,BROWSER_RESPONSE_LIMIT} from '../src/shared/browser-model-transport';
import {publicProviderAddress} from '../src/server/provider-fetch';
import {onlyProxyAddresses} from '../src/server/provider-dns';

const local=new BlockList();
for(const [range,mask] of [['127.0.0.0',8],['10.0.0.0',8],['172.16.0.0',12],['192.168.0.0',16],['100.64.0.0',10]] as const)local.addSubnet(range,mask,'ipv4');
local.addAddress('::1','ipv6');local.addSubnet('fc00::',7,'ipv6');
const allowed=(address:string)=>isIP(address)!==0&&(publicProviderAddress(address)||local.check(address,isIP(address)===6?'ipv6':'ipv4'));
const denied=/^(host|connection|proxy-.*|cookie|origin|referer|forwarded|x-forwarded-.*|x-real-ip|upgrade|te|trailer|transfer-encoding|content-length|expect|accept-encoding|sec-.*|x-douluo-.*)$/i;

export function modelWire(backendPort:()=>Promise<number>){
  const permits=new Map<string,{url:URL;method:string;expires:number}>();
  function authorize(base:string,target:string,method:string){
    browserRequestPath(base,target,method);
    const url=new URL(target),host=url.hostname.replace(/^\[|\]$/g,'');
    if(isIP(host)&&!allowed(host))throw Error('此地址不支持模型连接');
    const now=Date.now();
    for(const [id,x] of permits)if(x.expires<now)permits.delete(id);
    if(permits.size>=32)throw Error('正在连接的模型过多');
    const id=randomUUID();permits.set(id,{url,method,expires:now+30000});return '/desktop-model/'+id;
  }
  async function send(request:Request){
    const id=new URL(request.url).pathname.slice('/desktop-model/'.length),permit=permits.get(id);
    permits.delete(id);
    if(!permit||permit.method!==request.method||Date.now()>permit.expires)return new Response(null,{status:403});
    const {url}=permit;
    if(Number(url.port||(url.protocol==='http:'?80:443))===await backendPort())return new Response(null,{status:403});
    const body=request.body?Buffer.from(await request.arrayBuffer()):undefined;
    if((body?.length??0)>BROWSER_REQUEST_LIMIT)return new Response(null,{status:413});
    const headers=Object.fromEntries([...request.headers].filter(([name])=>!denied.test(name)));
    const transport=url.protocol==='https:'?httpsRequest:httpRequest;
    return new Promise<Response>((resolve,reject)=>{
      const req=transport(url,{agent:false,method:permit.method,headers,signal:request.signal,
        lookup(hostname,options,callback){
          lookup(hostname,{all:true,verbatim:true},(error,values)=>{
            // A player's transparent DNS proxy accepts the synthetic address and
            // routes by hostname. Require TLS against the original name; literals
            // were already rejected in authorize and redirects remain forbidden.
            const proxy=!error&&url.protocol==='https:'&&!isIP(hostname)&&onlyProxyAddresses(values);
            const addresses=values?.filter(x=>proxy||allowed(x.address))??[];
            if(error||!addresses.length||addresses.length!==values.length){(callback as any)(error??Error('模型服务域名无法使用'));return;}
            if((options as any).all)(callback as any)(null,addresses);
            else (callback as any)(null,addresses[0].address,addresses[0].family);
          });
        }},res=>{
          const status=res.statusCode??502;
          if(status>=300&&status<400){res.destroy();resolve(new Response(null,{status:400}));return;}
          const safe=new Headers();
          for(const name of ['content-type','retry-after'])if(res.headers[name])safe.set(name,String(res.headers[name]));
          if([204,205,304].includes(status)){res.resume();resolve(new Response(null,{status,headers:safe}));return;}
          let size=0;
          const limit=new Transform({transform(chunk,_,done){size+=chunk.length;if(size>BROWSER_RESPONSE_LIMIT)done(Error('模型回复超过上限'));else done(null,chunk);}});
          res.on('error',e=>limit.destroy(e));limit.on('close',()=>res.destroy());res.pipe(limit);
          resolve(new Response(Readable.toWeb(limit) as ReadableStream<Uint8Array>,{status,headers:safe}));
        });
      req.on('error',reject);req.end(body);
    });
  }
  return {authorize,send};
}
