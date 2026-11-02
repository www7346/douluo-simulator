import {vertexProject,VERTEX_MODEL_CATALOG} from './model-providers';
/** Browser wire data contains model I/O only, never a game command or snapshot. */
export const BROWSER_MODEL_PROTOCOL='douluo-browser-model/1';
export const BROWSER_REQUEST_LIMIT=16*1024*1024;
export const BROWSER_RESPONSE_LIMIT=8*1024*1024;
export const BROWSER_CHUNK_LIMIT=24*1024;
export function browserBaseUrl(input:unknown):string {
 if(typeof input!=='string'||input.length>2048)throw Error('请填写完整的模型接口地址');
 const u=new URL(input.trim());
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash||u.search)throw Error('模型地址只填写 HTTP 或 HTTPS 接口，不包含密钥或查询参数');
 u.pathname=u.pathname.replace(/\/+$/,'').replace(/\/(?:chat\/completions|models)$/,'')||'/v1';
 return u.toString().replace(/\/$/,'');
}
export function browserRequestPath(base:string,input:string,method:string):string {
 const root=new URL(browserBaseUrl(base)),u=new URL(input);
 if(u.origin!==root.origin||u.username||u.password||u.hash)throw Error('只能连接玩家填写的模型服务');
 if(method==='GET'&&u.pathname===VERTEX_MODEL_CATALOG&&vertexProject(root.href)&&
    [...u.searchParams.keys()].every(k=>k==='pageToken'||k==='fields')&&u.searchParams.get('fields')==='nextPageToken,publisherModels(name)')return u.pathname+u.search;
 const prefix=root.pathname.replace(/\/$/,''),suffix=u.pathname.slice(prefix.length);
 if(root.href==='https://api.openai.com/v1'&&method==='POST'&&u.pathname==='/v1/responses'&&!u.search)return u.pathname;
 if(!u.pathname.startsWith(prefix+'/')||!(method==='GET'&&suffix==='/models'||method==='POST'&&suffix==='/chat/completions'))throw Error('本地连接仅支持兼容接口的模型列表和聊天生成');
 if([...u.searchParams.keys()].some(k=>!['after_id','pageToken'].includes(k))||method==='POST'&&u.search)throw Error('本地模型请求参数无效');
 return u.pathname+u.search;
}
export interface BrowserModelTask {id:string;lease:string;method:'GET'|'POST';path:string;body:string|null}
export interface BrowserModelEvent {id:string;lease:string;sequence:number;kind:'connected'|'headers'|'chunk'|'end'|'error';status?:number;headers?:Record<string,string>;chunk?:string;message?:string}
export const BROWSER_FAILURES=[
 '浏览器未能读取模型服务响应，请检查网络、网站跨域许可和证书',
 '浏览器未允许访问本机或局域网，请在网站权限中允许后重试',
 '请使用 HTTPS 游戏页面连接本机或局域网模型',
 '模型答复超过接收上限，请降低输出上限后重试',
 '模型连接已经断开，请重新连接后重试',
] as const;
export function validateModelTransport(input:unknown):'browser'|'server'|undefined {
 if(input===undefined)return undefined;
 if(input!=='browser'&&input!=='server')throw Error('模型连接方式无效');
 return input;
}
export function localAddressSpace(base:string):'local'|'loopback'|undefined {
 const u=new URL(base),h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(h==='localhost'||h.endsWith('.localhost')||h==='::1'||/^127\./.test(h))return 'loopback';
 const ip=h.split('.').map(Number);
 if(h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.lan')||/^f[cd][0-9a-f]{2}:/.test(h)||/^fe[89ab][0-9a-f]:/.test(h)||ip.length===4&&ip.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(ip[0]===10||ip[0]===192&&ip[1]===168||ip[0]===172&&ip[1]>=16&&ip[1]<=31||ip[0]===169&&ip[1]===254))return 'local';
 return undefined;
}
const PUBLIC_HOSTS=new Set(['api.deepseek.com','api.openai.com','api.anthropic.com','generativelanguage.googleapis.com','api.x.ai','ark.cn-beijing.volces.com','ark.cn-shanghai.volces.com','open.bigmodel.cn','api.z.ai','api.moonshot.cn','api.moonshot.ai','opencode.ai']);
export function modelRoute(profile:{baseUrl:string;transport?:'browser'|'server'}):'browser'|'server' {
 if(profile.transport)return profile.transport;
 const u=new URL(profile.baseUrl);return u.protocol==='https:'&&PUBLIC_HOSTS.has(u.hostname)?'server':'browser';
}
