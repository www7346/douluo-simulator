import type {modelContextBudget} from '../../shared/model-context';
import type {StoryBudgetSource} from '../../runtime/story-prompt-budget';

export default function StoryContextBudget({budget}:{budget:ReturnType<typeof modelContextBudget>&{advisory:boolean;sources:StoryBudgetSource[]}}){
 return <section aria-label="本回合上下文占用">
  <p>输入估算 {budget.estimatedInput.toLocaleString()} · 输出预留 {budget.outputReserve.toLocaleString()} · {budget.advisory?'参考容量':'设定容量'} {budget.capacity.toLocaleString()}</p>
  <p>{!budget.advisory&&(budget.exceeded?`超出容量 ${(-budget.remaining).toLocaleString()}。`:`剩余容量 ${budget.remaining.toLocaleString()}。`)}按消息长度保守估算，计费量可查看服务返回的 Token 用量。</p>
  <ul>{budget.sources.map(source=><li key={source.id}>{source.label}：约 {source.estimatedTokens.toLocaleString()}{source.editable?'（可在偏好中编辑）':''}</li>)}</ul>
  <p className="muted">计入消息开销、旧记忆和重复发送的内容。可调整输出长度与上下文容量，或编辑、停用占用较多的模块。</p>
  {!budget.outputLimitConfigured&&<p>尚未设置输出长度上限，当前没有为回复预留容量。</p>}
 </section>;
}
