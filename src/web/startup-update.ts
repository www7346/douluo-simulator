// Called once, before mounting the game. Never watches focus, timers or gameplay.
const serverBuild=/^(?:cloud-[a-f0-9]{20}|review-[a-f0-9]{24})$/;
export async function startupUpdateTarget(pageBuild:string,hash:string,request:typeof fetch=fetch):Promise<string|null>{
 if(hash==='#/saves?recovery=1')return null; // Explicit local-save recovery must work even if a new shell cannot download.
 if(!serverBuild.test(pageBuild))return null;
 try {
  const response=await request('/version.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  const next=await response.json();
  if(next.app!=='douluo-independent-web'||next.delivery!=='cloud'||!serverBuild.test(next.build)||next.build===pageBuild)return null;
  return '/update.html?return='+encodeURIComponent(hash||'#/home');
 }catch{return null;} // Offline users must still be able to view/export local saves.
}
