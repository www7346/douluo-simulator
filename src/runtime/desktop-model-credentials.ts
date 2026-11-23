import {credentialScope,rejectInlineCredentials} from './model-protocol';
import {androidCredentials} from './android-platform';

export interface CredentialValues {apiKey:string;credentialHeaders:Record<string,string>}
export interface CredentialOwner {id:string;baseUrl:string;transport?:'browser'|'server'}
export type CredentialWrite=CredentialOwner&CredentialValues;
export interface DesktopCredentials {
  importVertex?(id:string,location:string):Promise<{baseUrl:string;credential:string;project:string}|null>;
  seal(profiles:CredentialWrite[]):Promise<{profiles:(CredentialValues&{id:string})[];created:string[]}>;
  resolve(profile:CredentialWrite):Promise<CredentialValues>;
  forget(refs:string[]):Promise<void>;
}
const refPattern=/^douluo-credential-v1:(disk|session):[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function credentialRef(value:string){return refPattern.exec(value)?.[1];}
export function scopeCredentialWrite(profile:CredentialWrite):CredentialWrite{
  rejectInlineCredentials(profile.baseUrl);
  return {...profile,baseUrl:credentialScope(profile.baseUrl)};
}
export function nativeModelCredentials(){
  const desktop=typeof window==='undefined'?undefined:window.douluoDesktop;
  if(desktop&&!desktop.credentials)throw Error('请重新启动桌面版以使用 Windows 加密凭据');
  return desktop?.credentials??androidCredentials;
}
export async function requestCredentials<T extends CredentialOwner&{apiKey?:string;credentialHeaders?:Record<string,string>}>(profile:T):Promise<T>{
  const apiKey=profile.apiKey??'',credentialHeaders=profile.credentialHeaders??{};
  if(![apiKey,...Object.values(credentialHeaders)].some(credentialRef))return profile;
  const bridge=nativeModelCredentials();
  if(!bridge)throw Error('此模型凭据只能在保存它的设备上使用，请在本机重新填写');
  return {...profile,...await bridge.resolve(scopeCredentialWrite({id:profile.id,baseUrl:profile.baseUrl,transport:profile.transport,apiKey,credentialHeaders}))};
}
