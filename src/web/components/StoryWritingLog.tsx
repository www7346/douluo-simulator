const outcomes:Record<string,string>={completed:'正文生成完成',failed:'正文尚未完成',cancelled:'正文生成已取消'};
export function StoryWritingLog({detail}:{detail:any}){
 const record=detail?.storyWriting;if(!record)return null;
 const usage=(value:any,hasAttempts:boolean)=>!hasAttempts?'尚未发出请求':value?`已报告输入 ${value.reportedInputTokens}、输出 ${value.reportedOutputTokens} Token；${value.attemptsMissingUsage?`${value.attemptsMissingUsage} 次尝试缺少完整用量，统计不完整`:'已收到这些尝试的完整用量'}`:'用量尚未报告';
 return <section aria-label="正文生成记录">
  <p><strong>{outcomes[record.outcome]??'正文生成记录'}</strong> · 耗时 {((detail.elapsedMs??0)/1000).toFixed(1)} 秒</p>
  <p>作者请求 {record.authorRequests??record.calls?.length??0} 次 · 实际请求 {record.networkAttempts??0} 次</p>
  <p>全部请求：{usage(record.usage,record.networkAttempts>0)}。</p>
  {['failed','cancelled'].includes(record.outcome)&&<p>行动已结算，可回到故事区续写本段。</p>}
  <p className="muted">Token 用量由模型服务返回。</p>
 </section>;
}
