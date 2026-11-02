import {RETIRED_MODEL_TASK_IDS} from './retired-model-config';
import type {ModelProfile} from './model-gateway';
import {validateConnection,rejectInlineCredentials} from './model-protocol';
import {validateGeneration,validatePrompts,validateRequest,MODEL_TASKS} from './model-settings';

// Model input limit: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
// Applied only when selecting this preset; saved provider limits stay explicit.
// Native /v1beta stream route verified on this relay; /v1 native returns 405.
export const GEMINI_WRITER_PRESET={label:'Gemini 3.1 Pro 作家',baseUrl:'https://catiecli.sukaka.top/v1beta',model:'gcli-gemini-3.1-pro-preview',
 generation:{protocol:'gemini' as const,thinking:'default' as const,reasoningEffort:'low' as const,temperature:null,topP:null,topK:null,contextTokens:1048576,outputTokens:8192},
 connection:{auth:'bearer' as const,stream:true,jsonMode:'prompt' as const,extendedParameters:true}};

/** Public preferences contain only connection settings. Credentials use the
 * existing separate local key store under a non-colliding author identity. */
export function normalizeWriterProfile(ownerId:string,input:ModelProfile['writer']):ModelProfile['writer']{
 if(input===undefined)return undefined;
 if(!input||Object.hasOwn(input,'writer'))throw Error('作家连接不能嵌套其他连接');
 if(typeof input.baseUrl!=='string'||typeof input.model!=='string'||input.baseUrl.length>2048||input.model.length>160)throw Error('请检查作家地址和模型名');
 rejectInlineCredentials(input.baseUrl);validateRequest(input);validateGeneration(input.generation);
 const taskOverrides=structuredClone(input.taskOverrides??{});
 for(const [id,settings] of Object.entries(taskOverrides)){if(!MODEL_TASKS.some(task=>task.id===id)&&!RETIRED_MODEL_TASK_IDS.includes(id))throw Error('未知的模型用途');validateRequest(settings);validateGeneration({...input.generation,...settings});}
 return {id:ownerId+'-writer',label:input.label||'独立作家',baseUrl:input.baseUrl.trim(),model:input.model.trim(),connection:validateConnection(input.connection),
  generation:structuredClone(input.generation??{}),taskOverrides,promptOverrides:validatePrompts(input.promptOverrides),
  timeoutMs:input.timeoutMs,connectTimeoutMs:input.connectTimeoutMs,firstByteTimeoutMs:input.firstByteTimeoutMs,idleTimeoutMs:input.idleTimeoutMs,waitMode:input.waitMode,retryCount:input.retryCount,repairFormat:input.repairFormat};
}
