import {useState} from 'react';
import {Button,Modal,Progress} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import CharacterPortrait from './CharacterPortrait';
import {cooperationBases} from '../cooperation-presentation';

export default function CompanionPanel({dungeonId,characterId,label='雇佣',showUnavailable=false,onSelectPerson}:{dungeonId?:string;characterId?:string;label?:string;showUnavailable?:boolean;onSelectPerson?:(id:string,dungeonId?:string)=>void}) {
  const {state,view,controller}=useGame();
  const [open,setOpen]=useState(false);
  const facts=useServerQuery<any>('companion.roster',dungeonId?{dungeonId}:{},{enabled:open||Boolean(characterId)});
  const available=facts.data&&(facts.data.roster.some((item:any)=>item.characterId===characterId)||facts.data.contracts.some((item:any)=>item.characterId===characterId)||facts.data.members.some((item:any)=>item.personId===characterId));
  if(characterId&&!available)return showUnavailable?<><Button variant="secondary" disabled>{label}</Button>{!facts.data?<QueryStatus query={facts}/>:<p className="muted">此人目前没有可接受的付费同行报价；可以在交流中商量自愿同行。</p>}</>:null;
  const run=async(type:string,id:string,quoteId?:string)=>{try{await controller.dispatch(type,type==='companion.dismiss'?{agreementId:id}:{characterId:id,dungeonId:facts.data?.dungeonId,...(quoteId?{quoteId}:{})});}catch{}};
  const raw=facts.data,data=raw&&characterId?{...raw,roster:raw.roster.filter((item:any)=>item.characterId===characterId),contracts:raw.contracts.filter((item:any)=>item.characterId===characterId),members:raw.members.filter((item:any)=>item.personId===characterId)}:raw;
  const choose=(id:string)=>{setOpen(false);if(onSelectPerson)onSelectPerson(id,data?.dungeonId);else location.hash='/world?person='+encodeURIComponent(id);};
  return <><Button variant="secondary" disabled={view.busy} onClick={()=>setOpen(true)}>{label}</Button>
    <Modal className="companion-modal" open={open} title="同行与雇佣" onClose={()=>setOpen(false)}>
      <p>{characterId?'查看此人的同行安排与付费服务。':'选择人物，进入「互动」商量同行或接受雇佣报价。'}</p>
      {!characterId&&<div><p className="muted">查找新向导时，AI 会补全人物、武魂和魂技资料，完成后可查看名单。</p><Button variant="secondary" disabled={view.busy||!data||Boolean(data.reason)} onClick={()=>{setOpen(false);void controller.dispatch('companion.prepare-roster',{}).catch(()=>{});}}>查找当地向导</Button></div>}
      <details><summary>同行规则</summary><p>你和最多三名同伴组成四人小队。各类合作同行与雇佣共用名额；长期成员返程后仍在队内，离场也占一席。临时成员按约定远征结束同行。付费雇佣包含约定地点的一次远征，出发前取消全额退款；开始后撤离或失败即结束。切磋与赛事不带入同伴。</p></details>
      {!data?<QueryStatus query={facts}/>:<><p>本次前往：{data.dungeonName}</p><p><b>持有 {data.gold} 金魂币</b> · 同伴名额 {data.slots.length} / 3 人</p>
        <div className="companion-slots" aria-label="待出发队伍">{Array.from({length:3},(_,index)=>{const names=data.slots.map((item:any)=>item.name);return <span key={index}>{index+1} · {names[index]??'空位'}</span>;})}</div>
        {data.slots.length>3&&<p role="alert">首次免费护航将超出四人上限，请调整队伍或暂停护航后再出发。</p>}
        {characterId&&data.roster.some((item:any)=>item.free)&&data.guideChoice.status==='unused'&&<Button variant="secondary" disabled={view.busy||Boolean(data.reason)} onClick={()=>void controller.dispatch('companion.guide-choice',{enabled:data.guideChoice.enabled===false}).catch(()=>{})}>{data.guideChoice.enabled===false?'启用首次免费护航':'暂停首次免费护航'}</Button>}
        {!!data.members.length&&<><h3>合作同行</h3>{data.members.map((item:any)=><p key={item.membershipId}>{item.name} · {cooperationBases[item.basis]??'自愿合作'} · {item.membership==='ability'?'真身在外期间同行':item.membership==='long-term'?'长期成员':'本次临时同行'} · {item.present?'在场':'当前不在此处，仍占名额'} {!characterId?<Button variant="secondary" onClick={()=>choose(item.personId)}>查看人物互动</Button>:<Button variant="secondary" disabled={view.busy||Boolean(data.reason)} onClick={()=>void (item.membership==='ability'?controller.dispatch('world.intent',{type:'recall-resident',targetId:item.personId}):controller.dispatch('character.end-party',{characterId:item.personId,membershipId:item.membershipId})).catch(()=>{})}>{item.membership==='ability'?'召回画境':'结束同行'}</Button>}</p>)}</>}
        {data.freeGuide&&<p>玉小刚首次猎魂森林护航免费，占一席，并可在你倒下时救援一次。免费护航在其他副本不适用；付费服务不含救援。</p>}
        {data.reason&&<p role="status">{data.reason}</p>}
        {data.contracts.map((item:any)=><p key={item.agreementId}>{item.name} · 约定前往{item.dungeonName} · 已预付 {item.fee} 金魂币{!data.roster.some((entry:any)=>entry.characterId===item.characterId)&&(!characterId?<Button variant="secondary" onClick={()=>choose(item.characterId)}>查看人物互动</Button>:<Button variant="secondary" disabled={view.busy||Boolean(data.reason)} onClick={()=>void run('companion.dismiss',item.agreementId)}>取消雇佣 · 全额退款</Button>)}</p>)}
        <h3>{characterId?'此人的雇佣服务':'可雇佣人物'}</h3>{!data.roster.length&&<p className="muted">名单中暂没有可付费同行的职业人员，可查找当地向导，或前往城镇与猎魂入口。</p>}
        <div className="companion-grid">{[...data.roster].sort((a:any,b:any)=>Number(b.characterId===characterId)-Number(a.characterId===characterId)).map((item:any)=><article key={item.characterId} className="companion-card">
          <span className="companion-card__portrait"><CharacterPortrait state={state} figureUrl={view.figureUrl} person={item.portrait}/></span><div><h3>{item.name}</h3><p>{item.level} 级 · {item.soul}</p><p>{item.role} · {item.free?'首次免费':`${item.offer?.fee??item.fee} 金魂币`}</p>
            {item.offer&&!item.hired&&<small>议价报价 · 当日原地点有效，尚未付款</small>}
            {!characterId?<Button variant="secondary" onClick={()=>choose(item.characterId)}>查看人物互动</Button>:item.hired?<Button disabled={view.busy||Boolean(data.reason)} variant="secondary" onClick={()=>void run('companion.dismiss',data.contracts.find((c:any)=>c.characterId===item.characterId).agreementId)}>取消雇佣 · 全额退款</Button>:<Button disabled={view.busy||Boolean(item.reason)} onClick={()=>void run('companion.hire',item.characterId,item.offer?.id)}>{item.free?'已安排免费护航':item.offer?`接受报价 · 预付 ${item.offer.fee} 金魂币`:'雇佣'}</Button>}
            {item.reason&&!item.free&&!item.hired&&<small>{item.reason}</small>}</div></article>)}</div>
        {!!data.active.length&&<><h3>本次同行</h3>{data.active.map((item:any)=>{const unit=state.战斗单位.列表[item.unitId];return <div key={item.unitId}><b>{item.name}</b>{unit&&<Progress label={unit.资源.生命.当前>0?'生命':'已失去战斗能力'} value={unit.资源.生命.当前} maximum={unit.资源.生命.最大} tone="life"/>}</div>;})}</>}
      </>}
    </Modal></>;
}
