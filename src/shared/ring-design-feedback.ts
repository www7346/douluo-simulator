/** Player-facing feedback derives from rule diagnostics, never from the model's assurance. */
export function ringDesignFeedback(value:any){
 const diagnostics=(Array.isArray(value?.diagnostics)?value.diagnostics:[]).filter((d:any)=>d&&typeof d.message==='string');
 const allowed=['ready','needs-martial-soul','unsupported','blocked','incomplete'];
 let status=allowed.includes(value?.summary?.status)?value.summary.status:
  diagnostics.some((d:any)=>d.kind==='unsupported')?'unsupported':diagnostics.some((d:any)=>d.kind==='martial-soul')?'needs-martial-soul':diagnostics.some((d:any)=>['source','constraint'].includes(d.kind))?'blocked':value?.pass===true?'ready':'incomplete';
 const hasReadyProposal=Array.isArray(value?.proposals)&&value.proposals.some((p:any)=>p?.pass===true&&(!p.summary?.status||p.summary.status==='ready'));
 if(status==='ready'&&(value?.pass===false||diagnostics.length&&!hasReadyProposal))status='incomplete';
 const title:Record<string,string>={ready:'实际来源与魂技已通过核验', 'needs-martial-soul':'需要补充武魂能力',unsupported:'这项底层效果尚未实现',blocked:'实际条件还需调整',incomplete:'本次设计尚未完成'};
 const labels:Record<string,string>={'martial-soul':'武魂缺项',source:'来源缺项',unsupported:'底层未支持',constraint:'实际限制',generation:'提案需修正'};
 const visibleMessage=(d:any)=>d.kind==='generation'&&['unknown-parameter','effect-parameters','unknown-effect','proposal-schema'].includes(d.code)?`主持人尚未完整配置${d.effectName?`「${d.effectName}」`:'这项能力'}，原构想已保留，请重试设计。`:d.message;
 const rows=diagnostics.map((d:any)=>({kind:d.kind,code:d.code,label:labels[d.kind]??'设计反馈',message:visibleMessage(d),effectName:typeof d.effectName==='string'?d.effectName:'',
  channels:(Array.isArray(d.missingChannels)?d.missingChannels:[]).map((c:any)=>`${c.name}${Number.isFinite(c.cost)?`（${c.cost}点）`:''}`),
  attributeLabel:d.attributeMode==='any'?'所需属性至少补充其中一种':'所需属性',
  attributes:(Array.isArray(d.missingAttributes)?d.missingAttributes:[]).map((a:any)=>`${a.name}${Number.isFinite(a.minimumInvestment)?`（至少投入${a.minimumInvestment}点）`:''}`)}));
 const legacyReasons=rows.length?[]:(Array.isArray(value?.reasons)?value.reasons.filter((x:any)=>typeof x==='string'):[]);
 return {status,title:status==='ready'&&hasReadyProposal&&value.proposals.some((p:any)=>!p.pass)?'部分魂技方案已通过核验':title[status],message:status==='incomplete'&&diagnostics.length?diagnostics.map(visibleMessage).join('；'):typeof value?.summary?.message==='string'?value.summary.message:'',rows,legacyReasons,
  canAdopt:value?.pass===true&&status==='ready'&&!diagnostics.length,
  needsMartialSoul:status==='needs-martial-soul'||diagnostics.some((d:any)=>d.kind==='martial-soul'),
  contactAuthor:status==='unsupported'||diagnostics.some((d:any)=>d.kind==='unsupported')};
}

/** Keep the player's original request and supplements, without the host's replies. */
export function ringDesignRequestText(discussion:any):string {
 const inputs=(discussion?.exchanges??[]).map((e:any)=>e.input);
 for(const next of [discussion?.pending?.input?.description,discussion?.request])if(typeof next==='string'&&next.trim()&&inputs.at(-1)!==next)inputs.push(next);
 return inputs.filter((s:any)=>typeof s==='string'&&s.trim()).join('\n\n');
}

export function ringDesignContinuationRequest(discussion:any):string {
 return discussion?.request?.trim()||discussion?.exchanges?.at(-1)?.input||discussion?.pending?.input?.description||'';
}

/** Only aggregate new rule-review results; the saved old answer stays untouched. */
export function recheckedRingDesignAnswer(answer:any,reviews:any[]){
 if(!Array.isArray(answer?.proposals)||reviews.length!==answer.proposals.length||!reviews.length)throw Error('原方案数量已改变，请保留讨论后重新核对');
 const diagnostics=reviews.flatMap(r=>Array.isArray(r.diagnostics)?r.diagnostics:[]),ready=reviews.filter(r=>ringDesignFeedback(r).canAdopt).length;
 const summary=ready?{status:'ready',message:`已按当前设定重新核验，${ready}份方案可以采用。`}:{status:ringDesignFeedback({diagnostics}).status,message:'已按当前设定重新核验，请处理以下实际缺项；原构想已保留。'};
 return {...structuredClone(answer),needsRecheck:false,proposals:structuredClone(reviews),diagnostics:structuredClone(diagnostics),summary};
}

/** Explicit editing consent only. This never marks a review as passed. */
export function unlockRingDesignAnswer(answer:any){
 const next=structuredClone(answer);if(!Array.isArray(next?.proposals))throw Error('原方案尚未完整，请保留构想后继续设计');
 for(const plan of next.proposals)if(plan.proposal)delete plan.proposal.sourceLocked;
 return {...next,needsRecheck:true};
}
