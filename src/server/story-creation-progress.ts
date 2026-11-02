import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {defaultModelRecoveryDirectory} from './model-recovery-store';
import type {HostCatalogProgress} from './story-host-catalog';

/** Freeze the accepted host plan and each specialist draft before a later
 * creation stage runs. This stores authored outputs, never provider settings. */
export function storyCreationProgress(scope:unknown,persist:boolean){
 const directory=join(defaultModelRecoveryDirectory(),'story-creation');
 const path=join(directory,createHash('sha256').update(JSON.stringify(scope)).digest('hex')+'.json');
 const data:{version:1;requested?:any;catalog?:HostCatalogProgress;correctionUsed?:boolean;supplement?:any;supplementReserved?:string;drafts:Record<string,any>}=persist&&existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{version:1,drafts:{}};
 if(data.version!==1||!data.drafts)throw Error('故事人物创建检查点无效');
 return {data,save(){if(!persist)return;mkdirSync(directory,{recursive:true});const temporary=path+'.'+randomUUID()+'.tmp';writeFileSync(temporary,JSON.stringify(data),'utf8');renameSync(temporary,path);}};
}
