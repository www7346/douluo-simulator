import {Button,ModalActions} from '../components';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';

export function RewardBreakdown({reward}:{reward:any}) {
  const quantity=(value:number)=>Number(value).toLocaleString('zh-CN');
  return <div className="competition-reward-details">
    <dl className="competition-reward-totals"><div><dt>金币</dt><dd>{quantity(reward.gold)}</dd></div><div><dt>经验</dt><dd>{quantity(reward.experience)}</dd></div></dl>
    {reward.prizeExperience!==null&&reward.combatExperience!==null&&<p className="muted">名次奖励经验 {quantity(reward.prizeExperience)} ＋ 实战经验 {quantity(reward.combatExperience)}</p>}
    {!reward.newBest&&<p>未超过本赛场、本等级组的历史最佳，无新增金币和档位奖品{reward.experience>0?'，本届仍获得实战经验。':'。'}</p>}
    {reward.experienceSuppressed&&<p>角色已死亡，本届不获得经验。</p>}
    {reward.items.map((item:any)=><article className="competition-prize-item" key={item.id}>
      <h4>{item.name} <small>× {quantity(item.quantity)}</small></h4>
      {item.unavailable?<p>这件奖品已不在当前物品记录中，发放时的详细属性未保存。</p>:<>
        {item.currentDetails&&<p className="muted">以下为这件物品当前的详情；本届发放时的原始属性未单独保存。</p>}
        <p className="competition-prize-meta">{[item.type,item.quality,item.form,item.slot,item.years?`${quantity(item.years)} 年`:''].filter(Boolean).join(' · ')}</p>
        {item.modifiers.length>0&&<dl className="competition-prize-attributes">{item.modifiers.map((row:any,index:number)=><div key={index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
        {item.abilities.map((ability:any,index:number)=><div className="competition-prize-ability" key={index}><strong>{ability.name} · {ability.activation}</strong>{ability.activation!=='被动'&&<p>魂力消耗 {quantity(ability.cost)}{ability.cooldown>0&&` · 冷却 ${ability.cooldown} 回合`}</p>}<ul>{ability.effects.map((effect:any,i:number)=><li key={i}>{effect.name}{effect.values.length>0&&`：${effect.values.join(' · ')}`}</li>)}</ul></div>)}
        {item.ring&&<div><p>来源：{item.ring.origin}</p><p>属性：{item.ring.attributes.join('、')||'吸收时选择'}</p><p>可选方向：{item.ring.channels.join('、')||'吸收时查看'}</p><p>适用于 {item.ring.divisionLevel} 级、第 {item.ring.ringOrdinal} 魂环；吸收仍需满足经验、环位与承载要求，魂技在吸收时选择。</p></div>}
      </>}
    </article>)}
    {reward.materials.length>0&&<section className="competition-prize-materials"><h4>材料明细 <small>共 {quantity(reward.materials.reduce((sum:number,row:any)=>sum+row.quantity,0))} 份</small></h4><ul>{reward.materials.map((row:any,index:number)=><li key={index}><span>{row.name}</span><strong>× {quantity(row.quantity)}</strong></li>)}</ul></section>}
    {reward.newBest&&!reward.items.length&&!reward.materials.length&&<p>本档位没有可发放的物品或整份材料。</p>}
  </div>;
}

export default function CompetitionRewards({historyId='',onOpenInventory}:{historyId?:string;onOpenInventory?:()=>void}) {
  const query=useServerQuery<any>('scene.competition-rewards',{historyId}),data=query.data;
  if(!data)return <><QueryStatus query={query}/>{!query.loading&&!query.error&&<p>未找到这届赛事的奖励记录。</p>}</>;
  if(data.reward)return <section className="competition-result" data-testid="competition-reward"><small>奖励已发放</small><h3>{data.placement} · {data.wins} 胜</h3><RewardBreakdown reward={data.reward}/>{data.reward.materials.length>0&&<p>材料已收入材料库。</p>}{data.reward.items.length>0&&<p>奖品已发放至行囊。</p>}{onOpenInventory&&<ModalActions disabled={query.loading||Boolean(query.error)}><Button onClick={onOpenInventory}>查看行囊奖品</Button></ModalActions>}</section>;
  return <><p>按最终名次发放，只补发超过本赛场、本等级组历史最佳的部分。以下显示本届各名次可获得的奖品；各名次的主奖种类可能不同。</p>{data.previews.map((reward:any)=><section className="competition-prize-pool" key={reward.placement}><h3>{reward.placement}</h3><RewardBreakdown reward={reward}/></section>)}<p>本届结束后，奖品收入行囊，材料收入材料库。</p></>;
}
