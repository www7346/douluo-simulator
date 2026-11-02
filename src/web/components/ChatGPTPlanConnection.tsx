import {useEffect,useRef,useState} from 'react';
import type {ChatGPTAccount,DesktopChatGPT} from '../../shared/chatgpt-plan';
import {Button} from '../components';

export function ChatGPTPlanConnection({bridge,accountId,onSelect}:{bridge:DesktopChatGPT;accountId?:string;onSelect:(id?:string)=>void}){
 const [accounts,setAccounts]=useState<ChatGPTAccount[]>([]),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 const alive=useRef(true),running=useRef(false);
 useEffect(()=>{
  alive.current=true;
  bridge.accounts().then(list=>{if(alive.current)setAccounts(list);}).catch(()=>{if(alive.current)setNote('无法读取本机的 ChatGPT 连接。');});
  return ()=>{alive.current=false;if(running.current)void bridge.cancel();};
 },[bridge]);
 const active=accounts.find(p=>p.id===accountId);
 async function signIn(id?:string){
  if(running.current)return;running.current=true;setBusy(true);setNote('请在系统浏览器中完成授权。');
  try{
   const profile=await bridge.signIn(id);
   const list=await bridge.accounts();if(!alive.current)return;
   setAccounts(list);onSelect(profile.id);setNote(profile.sharing?'登录成功，请获取模型列表。':'已登录，请再次授权并允许使用 ChatGPT 套餐。');
  }catch(e){if(alive.current)setNote((e as Error).message.replace(/^.*Error: /,''));}
  finally{running.current=false;if(alive.current)setBusy(false);}
 }
 async function disconnect(){
  if(!active)return;setBusy(true);
  try{const {revoked}=await bridge.disconnect(active.id);const list=await bridge.accounts();if(!alive.current)return;
   setAccounts(list);onSelect(undefined);setNote(revoked?'已断开连接。':'本机已退出。远程撤销尚未确认，可到 ChatGPT 设置中断开。');
  }catch{if(alive.current)setNote('退出未完成，请重试。');}finally{if(alive.current)setBusy(false);}
 }
 return <section aria-label="ChatGPT 套餐连接">
  {accounts.length>0&&<label>ChatGPT 账号<select aria-label="ChatGPT 账号" value={accountId??''} disabled={busy} onChange={e=>{onSelect(e.target.value||undefined);setNote('');}}>
   <option value="">选择账号</option>{accounts.map(p=><option key={p.id} value={p.id}>{p.label}{p.email?' · '+p.email:''}{p.connected?'':' · 已退出'}</option>)}
  </select></label>}
  {active?.sharing?<p>正在使用 ChatGPT 套餐 · {active.email||active.label}</p>:<p>使用你在 ChatGPT 授权的套餐额度。</p>}
  <div className="field-actions">
   {!active?.sharing&&<Button disabled={busy} onClick={()=>void signIn(accountId)}>Continue with ChatGPT</Button>}
   {busy&&running.current&&<Button variant="ghost" onClick={()=>void bridge.cancel()}>取消登录</Button>}
   {active&&<Button disabled={busy} variant="secondary" onClick={()=>void signIn()}>添加其他账号</Button>}
   {active?.connected&&<><Button variant="secondary" onClick={()=>void bridge.usage()}>管理 ChatGPT 用量</Button><Button disabled={busy} variant="ghost" onClick={()=>void disconnect()}>退出此账号</Button></>}
  </div>{note&&<p role="status">{note}</p>}
 </section>;
}
