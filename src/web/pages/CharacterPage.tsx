import CharacterInspection from '../components/CharacterInspection';
import StatusEscapeActions from '../components/StatusEscapeActions';
import ResidentRealmPanel from '../components/ResidentRealmPanel';
import {personAgePresentation} from '../../shared/person-age-presentation';
import {OpeningRecall} from '../components/BackgroundPrologue';
import WornRestraints from '../components/WornRestraints';
import IntimatePanel from '../components/IntimatePanel';
import DeviceOperationsPanel from '../components/DeviceOperationsPanel';
import PersonalFieldAbilities from '../components/PersonalFieldAbilities';
import PersonRewritePanel from '../components/PersonRewritePanel';
import {assetUrl} from '../asset-delivery';
import {itemArtwork} from '../../runtime/generated-art';
import {atlas} from '../illustration-catalog';
import AppearanceEditor from '../components/AppearanceEditor';
import SoulGallery from '../components/SoulGallery';
import {unitFigure} from '../fantasy-art';
import {PortraitImage} from '../components/PortraitArt';
import { useState,useEffect } from 'react';
import {useServerQuery} from '../use-game-query';
import type {CharacterSheetSection} from '../../shared/snapshot-query-policy';
import QueryStatus from '../components/QueryStatus';
import { ActionSection, Button, EmptyState, Modal, Panel, Progress, SoulRing } from '../components';
import GradeBadge from '../components/GradeBadge';
import { useGame } from '../game-context';
import {travelerArt} from '../scene-navigation';
import {playerText,skillName} from '../../runtime/player-text';

import AbilityDetails from '../components/AbilityDetails';
import ItemDetails,{ItemActionDialog} from '../components/ItemDetails';

const sections: Record<string, CharacterSheetSection> = {
  状态:'status', 武魂与技能:'abilities', 魂骨:'bones', 装备:'equipment', 称号:'title', 天赋:'talents',
};
const TABS = Object.keys(sections);
function downloadJson(serialized: string, name: string): void {
  const url = URL.createObjectURL(new Blob([serialized], {type: 'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function CharacterPage({onOpenRealm,onArrange}:{onOpenRealm?:(soulId:string,personId?:string)=>void;onArrange?:(text?:string)=>void}={}) {
  const {controller, state, view} = useGame();
  const [appearanceOpen,setAppearanceOpen]=useState(false);
  const [otherRealm,setOtherRealm]=useState<string|null>(null);
  const [fieldAbilityChoice,setFieldAbilityChoice]=useState<Record<string,unknown>>({});
  useEffect(()=>setFieldAbilityChoice({}),[view.sessionId]);
  const [tab, setTab] = useState(()=>{const requested=new URLSearchParams(location.hash.split('?')[1]??'').get('tab')??'';return TABS.includes(requested)?requested:'状态';});
  const [inspectedRing, setInspectedRing] = useState<string | null>(null);
  const [inspectedItem,setInspectedItem]=useState<string|null>(null);
  const [pendingBone, setPendingBone] = useState<any | null>(null);
  const [titleDraft, setTitleDraft] = useState({title: '', epithet: ''});
  const [confirmTitle, setConfirmTitle] = useState<'candidate' | 'custom' | null>(null);
  const playerId = state?.角色?.主控单位ID;
  const facts = useServerQuery<any>('presentation.character', {section:sections[tab]}, {enabled:Boolean(playerId)});
  if (!playerId) return <EmptyState title="尚未建立魂师">完成觉醒后，角色状态会在此展开。</EmptyState>;

  const pageFacts=facts.data;
  const person = state.人物?.列表?.[playerId];
  const unit = state.战斗单位?.列表?.[playerId];
  const growth = state.成长?.列表?.[playerId];
  const souls = (growth?.武魂ID列表 ?? []).map((id: string) => state.武魂?.列表?.[id]).filter(Boolean);
  const otherRealms=(state.扩展?.residentRealms?.records??[]).filter((r:any)=>r.ownerId===playerId&&r.profileId==='ability-realm-v1'&&r.endedAt===undefined);
  const currentOther=otherRealms.find((r:any)=>r.id===otherRealm);
  const items = tab === '装备' || tab === '魂骨' ? Object.values(state.物品?.实例 ?? {}) as any[] : [];
  const ownedIds = new Set(pageFacts?.ownedIds);
  const owned = items.filter(item => ownedIds.has(item.id));
  const bones = owned.filter(item => item.type === '魂骨');
  const rings = souls.flatMap((soul: any) => (soul.魂环ID列表 ?? []).map((id: string) => state.魂环?.列表?.[id]).filter(Boolean));
  const titleEligibility = pageFacts?.titleEligibility;
  const currentCandidate = growth?.封号?.候选;
  const place = {location:state.地图?.地点?.[person.locationId]};
  const activeSoul = state.武魂?.列表?.[growth?.激活武魂ID];
  const selectedRing = inspectedRing ? state.魂环?.列表?.[inspectedRing] : null;
  const ringSkills = (selectedRing?.魂技ID列表 ?? []).map((id:string)=>state.技能?.列表?.[id]).filter(Boolean);
  const ringBeast = state.魂兽档案?.列表?.[selectedRing?.来源魂兽档案ID];
  const run = async (type: string, payload: Record<string, unknown> = {}) => { try { await controller.dispatch(type, payload); } catch {} };

  const registerTitle = async () => {
    await run('title.register', {unitId: playerId, title: titleDraft.title, epithet: titleDraft.epithet});
    setConfirmTitle(null);
  };
  const finalizeTitle = async () => {
    if (confirmTitle === 'custom') await run('title.confirm', {unitId: playerId, mode: 'custom', title: titleDraft.title, epithet: titleDraft.epithet});
    else await run('title.confirm', {unitId: playerId});
    setConfirmTitle(null);
  };
  const generateTitle = async () => {
    try {
      const proposal = await controller.proposeTitle(playerId);
      setTitleDraft(proposal);
    } catch {}
  };

  return <><div className={`soul-archive${tab === '状态' ? ' soul-archive--profile' : tab==='武魂与技能'?' soul-archive--abilities':''}`}>
    <header className="soul-archive__heading"><span className="eyebrow">大陆纪行 · 人物卷</span><h1>人物档案</h1><p>{place.location?.name} · {person.identity}</p></header>
    <PersonRewritePanel/>
    <nav className="archive-tabs" aria-label="角色资料">{TABS.map((item,index)=><button key={item} className={tab===item?'is-active':''} aria-current={tab===item?'page':undefined} onClick={()=>setTab(item)}><span>{['壹','贰','叁','肆','伍','陆','柒'][index]}</span>{item}</button>)}</nav>
    <div className="archive-layout"><aside className="archive-player"><Button variant="secondary" className="appearance-launch" onClick={()=>setAppearanceOpen(true)}>头像与立绘</Button><div className="archive-player__art"><img src={assetUrl(unitFigure(state,playerId,view.figureUrl)||travelerArt(person.gender))} alt={playerText(person.name,state,'旅者')}/></div><h2>{playerText(person.name,state,'旅者')} <small>{growth.魂力等级}级</small></h2><Progress label="生命" value={unit.资源.生命.当前} maximum={unit.资源.生命.最大} tone="life"/><Progress label="魂力" value={unit.资源.魂力.当前} maximum={unit.资源.魂力.最大} tone="soul"/><p>{playerText(person.appearance,state,'行于长风，心向光明。')}</p></aside><div className="archive-main">
    <QueryStatus query={facts}/>
    {pageFacts && <>
    {tab==='状态'&&<OpeningRecall/>}
    {tab==='状态'&&<><div className="inspection-identity"><strong>{person.occupation} · {growth.魂力等级}级</strong><span>{playerText(activeSoul?.名称,state,'武魂已觉醒')} · {person.gender} · {personAgePresentation(person).label}</span><span>{place.location?.name} · {pageFacts.activityLabel} · {pageFacts.currency}</span></div><CharacterInspection facts={pageFacts.inspection} self/><StatusEscapeActions facts={pageFacts.selfStatus}/></>}
    <Modal open={Boolean(inspectedItem)} title="装具详情" onClose={()=>setInspectedItem(null)}><ItemDetails item={state.物品.实例[inspectedItem??'']}/></Modal>
    <section className="archive-content">
      {tab==='装备'&&<><Panel title="拘束器装备栏">{pageFacts.wornRestraints.length?<WornRestraints devices={pageFacts.wornRestraints}/>:<p>未佩戴拘束器。</p>}<a className="button button--secondary" href="#/inventory?tab=items">从行囊选择拘束器</a></Panel><IntimatePanel/><ActionSection title="锁具与器体操作"><DeviceOperationsPanel/></ActionSection></>}
      {pageFacts.selfCondensation?.visible&&<Panel title="本源凝环"><p>{pageFacts.selfCondensation.reasons.join('；')||`以自身本源凝聚第${pageFacts.selfCondensation.ordinal}枚魂环。`}</p><Button disabled={view.busy||!pageFacts.selfCondensation.pass} onClick={()=>void run('ring.self-condense',{martialSoulId:pageFacts.selfCondensation.martialSoulId})}>自主凝环</Button></Panel>}{tab === '武魂与技能' && <><PersonalFieldAbilities key={view.sessionId} choice={fieldAbilityChoice} onChoice={setFieldAbilityChoice}/>{otherRealms.length>0&&<ActionSection title="已取得的收容空间"><div className="field-actions">{otherRealms.map((r:any)=><Button key={r.id} variant="secondary" onClick={()=>setOtherRealm(r.id)}>{r.name||'收容空间'}</Button>)}</div></ActionSection>}<SoulGallery onOpenRealm={onOpenRealm} catalog={pageFacts.catalog} souls={souls} onInspectRing={setInspectedRing} onExport={soul=>{void controller.exportMartialSoul(soul).then(serialized=>downloadJson(serialized,`douluo-soul-${soul.名称}.json`)).catch(error=>controller.notify(error.message,'danger'));}}/></>}
      {tab === '天赋' && <Panel title="长久天赋" eyebrow="与你相伴的禀赋"><div className="lasting-talents">{pageFacts.talents.map(({id,name,description}:any)=><article key={id}><PortraitImage art={atlas("fates",["ring-choice","craft-choice","reroll"].indexOf(id),3,2)} name={name}/><div><h3>{name}</h3><p>{description}</p></div></article>)}</div>{!pageFacts.talents.length&&<p className="muted">未选择长久天赋。</p>}</Panel>}
      {tab === '魂骨' && <div className="soul-display"><Panel title="七个魂骨槽"><div className="equipment-slots">{Object.entries(state.装备?.配置?.[playerId]?.soulBoneSlots ?? {}).map(([slot, itemId]) => <div key={slot}><span>{slot}</span><b>{itemId ? pageFacts.itemNames?.[itemId as string] ?? state.物品?.实例?.[itemId as string]?.name ?? itemId : '未融合'}</b></div>)}</div></Panel><Panel title="魂骨记录"><div className="record-list">{bones.map(item => <article key={item.id}><PortraitImage art={itemArtwork(item)} name={item.name} className="generated-art generated-art--small"/><span><b className="grade-name" data-grade={pageFacts.itemGrades[item.id]?.id}>{playerText(pageFacts.itemNames?.[item.id]??item.name,state,'魂骨')}</b><GradeBadge grade={pageFacts.itemGrades[item.id]}/><small>{item.payload?.years ?? 0}年 · {item.payload?.activeSkills?.length ?? 0}个魂骨技能</small></span><Button variant="ghost" onClick={()=>setInspectedItem(item.id)}>查看详情</Button>{item.扩展?.integrated ? <span>已融合 · {item.payload?.slot}</span> : <Button variant="secondary" disabled={Boolean(item.payload?.expeditionTemporary) || view.busy} onClick={() => setPendingBone(item)}>融合</Button>}</article>)}{!bones.length && <p className="muted">尚未获得魂骨。</p>}</div></Panel></div>}
      {tab === '装备' && <Panel title="魂导器装备栏"><div className="character-equipment-slots">{Object.entries(state.装备.配置[playerId]?.slots??{}).map(([slot,itemId])=>{const item=state.物品.实例[itemId as string];return <button key={slot} disabled={!item} onClick={()=>setInspectedItem(item.id)}><span>{slot}</span>{item?<><PortraitImage art={itemArtwork(item)} name={item.name}/><strong>{playerText(item.name,state)}</strong></>:<small>空装备位</small>}</button>;})}</div><h3>可供选择的随身装具</h3><div className="record-list">{owned.filter(item=>item.type==='魂导器').map(item=><article key={item.id}><span><b className="grade-name" data-grade={pageFacts.itemGrades[item.id]?.id}>{playerText(item.name,state,'魂导器')}</b><GradeBadge grade={pageFacts.itemGrades[item.id]}/><small>{playerText(item.扩展?.描述,state,'随身装具')}</small></span><Button variant="ghost" onClick={()=>setInspectedItem(item.id)}>查看详情</Button></article>)}</div><a className="text-link" href="#/inventory">前往行囊管理装备</a></Panel>}
      {tab === '称号' && <Panel title={growth.封号?.封号 ? `${growth.封号.封号}斗罗` : growth.封号?.状态} eyebrow={titleEligibility.pass ? '封号资格已满足' : '封号资格'}><p className="title-poem">{playerText(growth.封号?.诗号,state,'九环之后，才是铸名之时。')}</p>{!titleEligibility.pass && <p className="muted">{titleEligibility.reasons.join('；')}</p>}{titleEligibility.pass && !growth.封号?.封号 && <div className="form-grid"><label>封号<input maxLength={8} value={titleDraft.title} onChange={event => setTitleDraft({...titleDraft, title: event.target.value})} placeholder={currentCandidate?.封号 || '1至8字，不含“斗罗”'} /></label><label>诗号或介绍<input value={titleDraft.epithet} onChange={event => setTitleDraft({...titleDraft, epithet: event.target.value})} placeholder={currentCandidate?.诗号 || '4至120字'} /></label><div className="field-actions"><Button variant="secondary" disabled={!view.modelEnabled || view.busy} onClick={() => void generateTitle()} data-testid="generate-title">请顾问拟定封号</Button><Button variant="secondary" onClick={() => void registerTitle()}>保留手写候选</Button>{currentCandidate?.封号 && <Button onClick={() => setConfirmTitle('candidate')}>确认候选“{currentCandidate.封号}”</Button>}<Button disabled={!titleDraft.title.trim() || titleDraft.epithet.trim().length < 4} onClick={() => setConfirmTitle('custom')}>直接确认自定封号</Button></div></div>}</Panel>}
    </section></>}</div></div>
    <Modal open={Boolean(currentOther)} title={currentOther?.name??'收容空间'} className="realm-scroll-dialog" onClose={()=>setOtherRealm(null)}>{currentOther&&<ResidentRealmPanel realmId={currentOther.id} onArrange={onArrange?text=>{setOtherRealm(null);onArrange(text);}:undefined}/>}</Modal>
    <Modal open={Boolean(selectedRing)} title={ringSkills[0]?skillName(ringSkills[0],state):`${selectedRing?.年限 ?? 0}年魂环`} onClose={()=>setInspectedRing(null)}><div className="ring-details"><div className="ring-details__art"><SoulRing index={selectedRing?.序号 ?? 1} years={selectedRing?.年限 ?? 0} color={selectedRing?.颜色} /></div><div><span className="eyebrow">{selectedRing?.颜色}魂环 · {selectedRing?.年限档}</span><h3>{selectedRing?.年限} 年</h3><p className="muted">魂环来源：{playerText(ringBeast?.名称 ?? ringBeast?.name,state,'旅途中的魂兽')}</p>{ringSkills.map((skill:any)=><article key={skill.id}><h3>{skillName(skill,state,'魂环魂技')}</h3><AbilityDetails skill={skill} showName={false}/></article>)}</div></div></Modal>
    <Modal open={appearanceOpen} title="头像与立绘" className="appearance-modal" onClose={()=>setAppearanceOpen(false)}><AppearanceEditor defaultFigure={unitFigure(state,playerId)||travelerArt(person.gender)}/></Modal>
    {pendingBone&&<ItemActionDialog intent={{type:'fuse-soul-bone',entityId:playerId,itemId:pendingBone.id}} onClose={()=>setPendingBone(null)}/>}
    <Modal open={Boolean(confirmTitle)} title="确认封号" onClose={() => setConfirmTitle(null)} actions={<><Button variant="ghost" onClick={() => setConfirmTitle(null)}>返回</Button><Button onClick={() => void finalizeTitle()}>刻入档案</Button></>}><p>封号确认后将写入当前角色档案。{confirmTitle === 'custom' ? `本次使用自定封号“${titleDraft.title}”。` : `本次使用已暂存候选“${currentCandidate?.封号 ?? ''}”。`}</p></Modal>
  </div></>;
}
