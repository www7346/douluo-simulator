/** One conservative estimate for preflight and actual requests; not a provider tokenizer. */
export function modelContextBudget(messages:ReadonlyArray<{content:string;tool_calls?:unknown;providerContent?:unknown}>,contextTokens:number,outputTokens:number|null,prefill?:string){
 const bytes=(text:string)=>new TextEncoder().encode(text).length;
 const messagesInput=messages.map((m,index)=>({index,estimatedTokens:bytes(m.content)+16+(m.tool_calls?bytes(JSON.stringify(m.tool_calls)):m.providerContent?bytes(JSON.stringify(m.providerContent)):0)}));
 const prefillInput=prefill===undefined?0:bytes(prefill)+16;
 const estimatedInput=messagesInput.reduce((n,m)=>n+m.estimatedTokens,0)+prefillInput,outputReserve=outputTokens??0,total=estimatedInput+outputReserve;
 return {estimatedInput,outputReserve,total,capacity:contextTokens,remaining:contextTokens-total,exceeded:total>contextTokens,messages:messagesInput,prefillInput,outputLimitConfigured:outputTokens!==null,estimateMethod:'UTF-8字节数加消息余量（保守上界）'};
}
