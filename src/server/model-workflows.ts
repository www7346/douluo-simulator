import {validateReplyTools} from '../runtime/model-reply-tools';
import {createHmac} from 'node:crypto';
import {runPersonGrowthWorkflow} from './person-growth-workflow';
import {runPersonConversationWorkflow} from './person-conversation-workflow';
import {pendingStoryPersonWorldWork} from '../runtime/person-world-work';
import {runPerformanceAgreementResponseWorkflow} from './person-performance-agreement-workflow';
import {runRestraintPermissionWorkflow} from './person-restraint-permission-workflow';
import {runDrugOfferWorkflow} from './person-drug-offer-workflow';
import {runAbilityUseWorkflow} from './person-ability-use-workflow';
import {runPersonRewriteWorkflow} from './person-rewrite-workflow';
import {runPersonChangeReactionWorkflow} from './person-change-reaction-workflow';
import {runRescueResponseWorkflow} from './person-rescue-workflow';
import {runDefeatDecisionWorkflow} from './person-defeat-workflow';
import {runCustodyDispositionWorkflow} from './person-custody-disposition-workflow';
import {runLootResponseWorkflow} from './person-loot-workflow';
import {pendingStoryCustodyMarket} from '../runtime/story-custody-market';
import {runCustodyAuctionDecisionWorkflow} from './person-custody-auction-workflow';
import {runCustodyTradeResponseWorkflow} from './person-custody-trade-workflow';
import {runGiftResponseWorkflow} from './person-gift-workflow';
import {runPersonExpeditionWorkflow} from './person-expedition-workflow';
import {runPersonResearchWorkflow} from './person-research-workflow';
import {runPersonWorldWorkflow} from './person-world-workflow';
import {runCooperationResponseWorkflow} from './person-cooperation-workflow';
import {validateGlobalPrompts,validateGlobalPromptPreset} from '../runtime/model-global-prompts';
import {normalizeModelLibrary} from '../runtime/model-library';
import {completeGeneratedCommand,generationCommand} from './character-generation';
import {verifyWorkflowTicket} from './workflow-ticket';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {validateStoryProseAttempt} from '../shared/story-prose-attempt';
import {validateWorkflowAttempt} from '../shared/workflow-attempt';
import {validateCreationAttempt} from '../shared/creation-attempt';
import {runNpcAutonomyWorkflow} from './npc-autonomy-workflow';
import {runStorySummary,runStoryStageSummary} from './story-summary-workflow';
import {requestCreationAdvice} from './creation-advisor';
import {requestItemAdvice} from './creation-item-advisor';
import {requestWorkshopAdvice} from './creation-workshop-advisor';
import {requestRingDesignAdvice} from './ring-design-advisor';
import {requestResearchDesignAdvice} from './research-design-workflow';
import {validateConnection,validateHeaders} from '../runtime/model-protocol';
import {rules} from '../rules';
import type {GameSnapshot} from '../runtime/contracts';
import {ModelGateway,ModelGatewayError,type ModelProfile,type ModelLog} from '../runtime/model-gateway';
import {validateGeneration,validatePrompts,validateRequest,MODEL_TASKS,resolveModelSettings} from '../runtime/model-settings';
import * as narrative from '../runtime/game-model-orchestrator';
import {CloudError} from '../cloud/protocol';
import {createProviderFetch} from './provider-fetch';
import {issueWorkflowTicket,stateFingerprint} from './workflow-ticket';
import {runStoryWorkflow,runCommitmentWorkflow,runBeliefWorkflow} from './story-workflows';
import {StoryWritingDiagnostics,type StoryWritingReviewer} from './story-writing-diagnostics';
import type {ModelCandidateRecord} from '../shared/model-evidence';
import {defaultModelRecoveryDirectory,hasPersistentModelRecovery,persistentWorkflowRecovery,type WorkflowRecovery} from './model-recovery-store';

export const WORKFLOW_KINDS=['person-growth','person-conversation','person-performance-agreement','research-advice','ring-advice','person-change-reaction','person-rewrite','generation','generation-repair','generation-rebuild','list','test','generation-test','draft','advice','creation-advice','creation-item-advice','creation-workshop-advice','room','world-people','person-room','person-ring-naming','person-ring-choice','person-research-naming','person-research-choice','ring-skills','ring-item','research','title','combat','story-host','story-social','person-defeat','person-custody-disposition','person-restraint-permission','person-ability-use','person-drug-offer','person-rescue-response','person-custody-auction','person-custody-trade','person-gift','person-cooperation','person-loot','story-autonomy','story-belief','story-writer','story-rewrite','story-summary','story-stage-summary'] as const;
export function validateWorkflow(input:any) {
  if(!WORKFLOW_KINDS.includes(input?.kind)||!Number.isSafeInteger(input.revision)||input.revision<0||!input.input||typeof input.input!=='object'||Array.isArray(input.input))throw new CloudError('invalid-workflow','不支持这项生成任务');
  if(input.local===true){if(!['room','research'].includes(input.kind))throw new CloudError('invalid-workflow','这项任务需要模型服务');return;}
  const profile=input.profile as ModelProfile;
  if(profile?.transport!==undefined&&!['browser','server'].includes(profile.transport))throw new CloudError('invalid-model','模型连接方式无效');
  const chatgpt=profile?.channelMode==='chatgpt';
  if(chatgpt&&(profile.transport!=='browser'||profile.baseUrl!=='https://api.openai.com/v1'))throw new CloudError('invalid-model','ChatGPT 套餐须通过桌面版官方连接使用');
  if(!chatgpt&&profile?.transport==='browser'&&profile.generation?.protocol&&!['auto','compatible','deepseek'].includes(profile.generation.protocol))throw new CloudError('invalid-model','本地连接请选择 OpenAI兼容协议');
  if(profile?.modelLibrary)for(const model of profile.modelLibrary){if((model as any).modelLibrary||(model as any).writer)throw new CloudError('invalid-model','模型库不能嵌套');validateWorkflow({...input,profile:{...model,apiKey:model.apiKey??''}});}
  if(profile?.writer){
    if(Object.hasOwn(profile.writer,'writer'))throw new CloudError('invalid-model','作家连接不能嵌套其他连接');
    validateWorkflow({...input,profile:{...profile.writer,apiKey:profile.writer.apiKey??''}});
  }
  if(!profile||typeof profile.apiKey!=='string'||profile.apiKey.length>4096||typeof profile.baseUrl!=='string'||profile.baseUrl.length>2048||typeof profile.model!=='string'||profile.model.length>160)throw new CloudError('invalid-model','请检查模型地址、密钥和模型名');
  try {
    if(profile.modelLibrary)normalizeModelLibrary(profile);validateConnection(profile.connection);validateHeaders(profile.credentialHeaders);validateRequest(profile);validateGeneration(profile.generation);validatePrompts(profile.promptOverrides);validateGlobalPrompts(profile.globalPrompts);validateReplyTools(profile.replyTools);validateGlobalPromptPreset(profile.globalPromptPreset);
    for(const task of ['',...MODEL_TASKS.map(t=>t.id)]) {
      const settings=resolveModelSettings(profile,task);
      if(settings.timeoutMs>1200000||settings.firstByteTimeoutMs>600000||settings.connectTimeoutMs>120000||settings.idleTimeoutMs>300000||settings.retryCount>2||settings.outputTokens!>32768||settings.contextTokens>1048576)throw new Error('云端单次等待最多20分钟、连接2分钟、首包10分钟、接收5分钟、重试2次，输出最多32768 Token、上下文最多1048576 Token');
    }
  }catch(error){throw new CloudError('invalid-model',String((error as Error).message));}
}

/** Used in the private model worker. Network waits never occupy a calculation slot. */
export async function runModelWorkflow(snapshot:GameSnapshot,worldId:string,request:any,secret:string,signal:AbortSignal,observe:(log:ModelLog)=>void,fetcher?:typeof fetch,reviewer?:StoryWritingReviewer,candidateSink?:(record:ModelCandidateRecord)=>void,recovery?:WorkflowRecovery,browserFetch?:typeof fetch):Promise<any> {
  validateWorkflow(request);
  const state=snapshot.state as any,input=request.input,kind=request.kind;
  validateWorkflowAttempt(state,request);
  validateStoryProseAttempt(state,kind,input,input?.proseAttemptId===undefined?undefined:pendingStoryCustodyMarket(state),pendingStoryPersonWorldWork(state).length>0);
  validateCreationAttempt(state,kind,input);
  recovery??=!fetcher&&!request.local&&hasPersistentModelRecovery(kind)?persistentWorkflowRecovery(defaultModelRecoveryDirectory(),worldId,snapshot,request):undefined;
  const providerFetch=fetcher??(request.local?undefined:createProviderFetch());
  const guardedFetch:typeof fetch=async(url,init)=>{
    try{
      recovery?.beforeRequest();
      if(typeof (init as any)?.providerBrowserToken==='string'){
        if(!browserFetch)throw new CloudError('browser-offline','浏览器模型连接不可用，请重新连接',503);
        return await browserFetch(url,init);
      }
      if(String(url).startsWith('https://opencode.ai/inference/go/')){
        const ledger=state.扩展?.story,turn=ledger?.active;
        const channel=kind.startsWith('story-')?(turn?.privatePersonId??(turn?.partyChat?'party':'story')):kind;
        const session=createHmac('sha256',secret).update(JSON.stringify([worldId,ledger?.branchId,channel])).digest('hex');
        const headers=new Headers(init?.headers);
        headers.set('user-agent','Douluo-Simulator/1');
        headers.set('x-opencode-session',session);
        return await providerFetch!(url,{...init,headers});
      }
      return await providerFetch!(url,init);
    }catch(error){
      if(error instanceof CloudError)throw new ModelGatewayError(error.code as any,error.message,{cause:error});
      throw error;
    }
  };
  const writing=(kind==='story-writer'||kind==='story-rewrite')?new StoryWritingDiagnostics(observe,reviewer):undefined;
  const gateway=request.local?null:new ModelGateway(request.profile,guardedFetch,log=>{writing?.capture(log);observe(log);},candidateSink,recovery?.budget??new ModelRecoveryBudget());
  const complete=async(result:any)=>{
    if(!result.ticket||!gateway)return result;
    const command=verifyWorkflowTicket(secret,worldId,snapshot,result.ticket);
    const completionStarted=performance.now();
    const generated=await completeGeneratedCommand(snapshot,worldId,{...command,id:`generation:${stateFingerprint(snapshot).slice(0,32)}:${kind}`,expectedRevision:snapshot.revision},gateway,secret,signal,{persist:!fetcher});
    return {...result,ticket:generated.ticket,timings:{...result.timings,generationCompletionMs:performance.now()-completionStarted}};
  };
  const apply=async(type:string,payload:Record<string,any>,value?:any)=>complete({ticket:issueWorkflowTicket(secret,worldId,snapshot,{type,payload}),...(value===undefined?{}:{value})});
  switch(kind){
    case 'ring-advice':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','魂环或人物设定已改变，请按当前进度继续讨论',409);
      if(input.target?.kind==='opening'&&state.角色?.已建立)throw new CloudError('stale-workflow','人物已经启程，请在实际魂环入口继续设计',409);
      return {value:await requestRingDesignAdvice(gateway!,state,input,signal,recovery?.designProgress)};
    case 'research-advice':
      if(request.revision!==snapshot.revision||!state.角色?.已建立)throw new CloudError('stale-workflow','人物或材料已经改变，请按当前进度继续设计',409);
      return {value:await requestResearchDesignAdvice(gateway!,state,input,signal,recovery?.designProgress)};
    case 'person-change-reaction':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物察觉的变化与当前进度不一致',409);
      return complete(await runPersonChangeReactionWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'creation-workshop-advice':
      if(request.revision!==snapshot.revision||state.角色?.已建立)throw new CloudError('stale-workflow','角色创建状态已改变，请重新打开草稿',409);
      return {value:await requestWorkshopAdvice(gateway!,input.config,input.designId,input.description,signal,input.exchanges,input.proposal)};
    case 'person-rewrite':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','改造期间相关人物已经变化',409);
      return complete(await runPersonRewriteWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'generation': {
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物创建期间进度已经改变',409);
      const command=generationCommand(snapshot,String(input.type??''),input.payload??{},String(input.commandId??''));
      return completeGeneratedCommand(snapshot,worldId,command,gateway!,secret,signal,{persist:!fetcher,preserveCommandIdentity:true});
    }
    case 'generation-rebuild': {
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物重建期间进度已经改变',409);
      return completeGeneratedCommand(snapshot,worldId,{type:'generation.rebuild-service',id:`service-rebuild:${stateFingerprint(snapshot).slice(0,40)}`,expectedRevision:snapshot.revision,payload:{personIds:input.personIds}},gateway!,secret,signal,{persist:!fetcher,repairIds:input.personIds});
    }
    case 'generation-repair': {
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物修复期间进度已经改变',409);
      return completeGeneratedCommand(snapshot,worldId,{type:'generation.repair-preview',id:`repair:${stateFingerprint(snapshot).slice(0,40)}`,expectedRevision:snapshot.revision,payload:{}},gateway!,secret,signal,{persist:!fetcher,repairIds:input.personIds});
    }
    case 'creation-advice':
      if(request.revision!==snapshot.revision||state.角色?.已建立)throw new CloudError('stale-workflow','角色创建状态已改变，请重新打开草稿',409);
      return {value:await requestCreationAdvice(gateway!,input.config,input.description,signal,input.exchanges,input.proposal,input.reserveSouls)};
    case 'creation-item-advice':
      if(request.revision!==snapshot.revision||state.角色?.已建立)throw new CloudError('stale-workflow','角色创建状态已改变，请重新打开草稿',409);
      return {value:await requestItemAdvice(gateway!,input.config,input.description,signal,input.exchanges,input.proposal)};
    case 'story-stage-summary':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','阶段记忆与当前进度不一致',409);
      return runStoryStageSummary(snapshot,worldId,input,gateway!,secret,signal);
    case 'story-summary':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','摘要与当前进度不一致',409);
      return runStorySummary(snapshot,worldId,input,gateway!,secret,signal);
    case 'story-belief':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','听闻判断与当前进度不一致',409);
      return complete(await runBeliefWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-loot':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','分配提议与当前进度不一致',409);
      return complete(await runLootResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-research-naming':case 'person-research-choice':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物研发期间世界已经变化',409);
      return complete(await runPersonResearchWorkflow(snapshot,worldId,kind,input,gateway!,secret,signal));
    case 'person-room':case 'person-ring-naming':case 'person-ring-choice':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物所在现场与原请求已经变化',409);
      return complete(await runPersonExpeditionWorkflow(snapshot,worldId,kind,input,gateway!,secret,signal));
    case 'world-people':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物待办与当前进度不一致',409);
      return complete(await runPersonWorldWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-growth':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','成长请求与当前进度不一致',409);
      return complete(await runPersonGrowthWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-conversation':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物会话与当前进度不一致',409);
      return complete(await runPersonConversationWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-performance-agreement':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','协议与当前进度不一致',409);
      return complete(await runPerformanceAgreementResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-cooperation':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','合作提议与当前进度不一致',409);
      return complete(await runCooperationResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-defeat':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物战败处置与当前进度不一致',409);
      return complete(await runDefeatDecisionWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-restraint-permission':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','佩戴者与原装配条件已变化',409);
      return complete(await runRestraintPermissionWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-drug-offer':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','药物宣称与人物现场已变化',409);
      return complete(await runDrugOfferWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-ability-use':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','施用请求与本人状态已经变化',409);
      return complete(await runAbilityUseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-rescue-response':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','受援者与原撤离提议已变化',409);
      return complete(await runRescueResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-custody-disposition':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','囚禁情况已变化，请重新选择操作',409);
      return complete(await runCustodyDispositionWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-custody-auction':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','现场竞价与当前进度不一致',409);
      return complete(await runCustodyAuctionDecisionWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-custody-trade':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','交接报价与当前进度不一致',409);
      return complete(await runCustodyTradeResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'person-gift':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','赠物承诺与当前进度不一致',409);
      return complete(await runGiftResponseWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'story-autonomy':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','人物打算与当前进度不一致',409);
      return complete(await runNpcAutonomyWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'story-social':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','约定回应与当前进度不一致',409);
      return complete(await runCommitmentWorkflow(snapshot,worldId,input,gateway!,secret,signal));
    case 'story-host':case 'story-writer':case 'story-rewrite':
      if(request.revision!==snapshot.revision)throw new CloudError('stale-workflow','叙事请求与当前进度不一致',409);
      try{const result=await complete(await runStoryWorkflow(snapshot,worldId,kind,input,gateway!,secret,signal,writing,{store:recovery?.sectionProgress,authorStore:recovery?.authorProgress,beforeRequest:recovery?.beforeRequest},!fetcher));writing?.finish();return result;}
      catch(error){writing?.fail(signal.aborted);throw error;}
    case 'list':return {value:await gateway!.listModels(signal)};
    case 'test':return {value:await gateway!.testConnection(signal)};
    case 'generation-test':{
      if(!MODEL_TASKS.some(t=>t.id===input.task))throw new CloudError('invalid-workflow','请选择游戏中的模型用途');
      return {value:await gateway!.testGeneration(input.task,signal)};
    }
    case 'draft':return {value:await narrative.requestMartialSoulDraft(gateway!,String(input.description??''),{budget:input.budget,draftId:input.draftId,signal})};
    case 'advice':return {value:await narrative.requestMartialSoulAdvice(gateway!,String(input.description??''),{budget:input.budget,draftId:input.draftId,session:input.session,currentDraft:input.currentDraft,peerSouls:input.peerSouls,signal})};
    case 'room':{
      const source=state.远征?.当前?.currentRoom?.narrativeRequest;
      if(!source)throw new CloudError('invalid-workflow','当前房间没有等待描述的内容');
      const result=gateway?await narrative.requestExpeditionNarrative(gateway,source,signal):rules.expedition.deterministicNarrativeFixture(source);
      return apply('expedition.resolve-narrative',{narrative:result});
    }
    case 'ring-skills':{
      const own=rules.cycle.pendingRingSkillChoice(state,String(input.pendingId??''));if(!own)throw new CloudError('invalid-workflow','没有本人可命名的魂技候选');
      const result=await narrative.requestRingSkillNarrative(gateway!,state,String(input.pendingId??''),signal);
      return apply('ring.name-choices',{pendingId:own.id,mechanicsHash:own.mechanicsHash,candidates:result.candidates});
    }
    case 'ring-item':{
      const itemId=String(input.itemId??''),pendingId=state.物品.实例[itemId]?.payload?.ringPreparation?.pendingId;
      const mechanicsHash=state.魂环.待选择[pendingId]?.mechanicsHash;
      if(!mechanicsHash)throw new CloudError('invalid-workflow','没有找到这枚魂环的待选方案');
      return apply('ring.item.name-source',{itemId,mechanicsHash,narrative:await narrative.requestRingItemNarrative(gateway!,state,itemId,signal)});
    }
    case 'research':{
      const pending=state.研发?.待处理?.[String(input.pendingId??'')];
      if(!pending||pending.actorId!==state.角色.主控单位ID||(pending.status!=='awaiting-llm'&&!pending.pendingNamingIds?.length))throw new CloudError('invalid-workflow','没有等待命名的研发候选');
      const result=gateway&&!pending.mechanicCandidates.every((candidate:any)=>Boolean(candidate.presetId))?await narrative.requestResearchNarrative(gateway,pending,signal):rules.expedition.deterministicResearchNarrativeFixture(pending);
      return apply('research.resolve',{pendingId:input.pendingId,candidates:result});
    }
    case 'title':{
      const value=await narrative.requestTitleProposal(gateway!,state,String(input.unitId??''),signal);
      return apply('title.register',{unitId:input.unitId,...value},value);
    }
    case 'combat':{
      const actorId=state.战斗?.当前行动单位ID;
      if(state.战斗?.状态!=='进行中'||!actorId||state.战斗.扩展?.成员?.[actorId]?.controller==='player')throw new CloudError('invalid-workflow','当前没有等待行动的对手');
      const intent=await rules.combat.chooseLlmIntent(state,actorId,`cloud-ai:${snapshot.revision}:${actorId}`,
        (context:any,providerSignal:AbortSignal)=>narrative.requestCombatDecision(gateway!,context,AbortSignal.any([signal,providerSignal])),
        {enabled:true,actorIds:[actorId],timeoutMs:gateway!.settings('combat-intent').timeoutMs,signal});
      signal.throwIfAborted();return apply('battle.action',intent);
    }
    default:throw new CloudError('invalid-workflow','不支持这项生成任务');
  }
}
