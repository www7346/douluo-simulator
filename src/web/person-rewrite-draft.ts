import type {GameDatabase} from '../runtime/storage';
import type {JsonValue} from '../runtime/contracts';

/** Domain identifiers can contain long status names. Only their full scoped
 * identity becomes a settings key; the grant itself stays unchanged. */
export async function personRewriteDraftStore<T extends JsonValue>(database:GameDatabase,worldId:string,grantId:string){
 const bytes=new TextEncoder().encode(JSON.stringify([worldId,grantId]));
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('');
 const key='person-rewrite:'+digest;
 return {
  key,patchId:'manual:'+digest,
  async load():Promise<T|null>{const saved=await database.getSetting<{version:number;draft:T}>(key);return saved?.version===1?saved.draft:null;},
  save:(draft:T)=>database.putSetting(key,{version:1,draft}),
  clear:()=>database.putSetting(key,null),
 };
}
