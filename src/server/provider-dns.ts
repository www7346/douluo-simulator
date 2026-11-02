import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {modelRoute} from '../shared/browser-model-transport';
import {PROVIDER_PRESETS} from '../shared/model-providers';
import {CloudError} from '../cloud/protocol';

export type ProviderResolver=(hostname:string)=>Promise<{address:string;family:number}[]>;

const proxyAddresses=new BlockList();
const presetHosts=new Set(PROVIDER_PRESETS.map(p=>new URL(p.url).hostname));
proxyAddresses.addSubnet('198.18.0.0',15,'ipv4');
proxyAddresses.addSubnet('2001:2::',48,'ipv6');

/** A synthetic answer must be unambiguous. Real LAN, metadata and mixed answers
 * remain subject to their normal destination checks. */
export function onlyProxyAddresses(answers:Awaited<ReturnType<ProviderResolver>>):boolean {
  return answers.length>0&&answers.every(({address,family})=>isIP(address)===family&&
    (family===4||family===6)&&proxyAddresses.check(address,family===4?'ipv4':'ipv6'));
}

/** Optional host configuration for environments whose OS DNS returns proxy fake IPs.
 * Only the operator selects this resolver; no model profile can change it.
 * Responses still pass the public-address check and are pinned to the TLS socket.
 */
export function providerResolver(mode=process.env.DOULUO_MODEL_DNS??'system',fetcher:typeof fetch=fetch,system:ProviderResolver=hostname=>lookup(hostname,{all:true,verbatim:true})):ProviderResolver {
  if(mode==='system')return system;
  if(mode==='desktop-auto')return async hostname=>{
    const addresses=await system(hostname);
    if(!onlyProxyAddresses(addresses)||isIP(hostname)||(!presetHosts.has(hostname)&&modelRoute({baseUrl:'https://'+hostname})!=='server'))return addresses;
    // Only known public providers go to public DNS. Requests contain no model
    // messages or credentials, and resolveProviderUrl still verifies the result.
    return providerResolver('alidns',fetcher)(hostname);
  };
  if(mode!=='alidns')throw new CloudError('provider-dns','模型域名解析配置无效');
  return async hostname=>{
    try {
      const records=await Promise.all([1,28].map(async type=>{
        const url=new URL('https://dns.alidns.com/resolve');url.searchParams.set('name',hostname);url.searchParams.set('type',String(type));
        const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(4500),headers:{accept:'application/dns-json'}});
        if(!response.ok||!response.body)throw Error();
        const reader=response.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];
        try {for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16384)throw Error();chunks.push(value);}}
        finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
        const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(data.Status!==0||data.TC||!data.Question||Array.isArray(data.Question)||String(data.Question.name).replace(/\.$/,'').toLowerCase()!==hostname.toLowerCase()||data.Question.type!==type)throw Error();
        const answers=data.Answer??[];if(!Array.isArray(answers)||answers.length>128)throw Error();
        return answers.filter((entry:any)=>entry.type===1||entry.type===28).map((entry:any)=>{
          const family=isIP(entry.data);if(family!==(entry.type===1?4:6))throw Error();return {address:entry.data as string,family};
        });
      }));
      return records.flat();
    }catch{throw new CloudError('provider-dns','模型域名解析未完成，请稍后重试');}
  };
}
