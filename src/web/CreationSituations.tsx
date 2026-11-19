import {useCreationCatalog} from './creation-context';
import {Button} from './components';
export function CreationSituations({selection=[],onChange,disabled=false}:{selection:any[];onChange:(v:any[])=>void;disabled?:boolean}){
 const catalog=useCreationCatalog();
 return <section className="creation-situations" aria-label="开局处境"><h3>从怎样的处境启程</h3><p>可自由组合，也可以全部不选。每项只选一种收益；基础120点不变，处境补偿最多{catalog.situationPointCap}点。保证金会从盘缠扣除。</p><div className="creation-situations__cards">
 {Object.values(catalog.situations).map((d:any)=>{const value=selection.find(v=>v.id===d.id);return <article key={d.id} className={value?'is-selected':''}><h4>{d.name}</h4><p>{d.description}</p><p>下一步：{d.next}</p><Button disabled={disabled} onClick={()=>onChange(value?selection.filter(v=>v.id!==d.id):[...selection,{id:d.id,benefit:'story',contactName:d.contact}])}>{value?'取消这项处境':'选择这项处境'}</Button>{value&&<><label>收益方式<select disabled={disabled} value={value.benefit} onChange={e=>onChange(selection.map(v=>v.id===d.id?{...v,benefit:e.target.value}:v))}><option value="story">故事内收益</option><option value="points">资质补偿 +{d.points}点</option></select></label><p>{value.benefit==='points'?d.pointBenefit:d.storyBenefit}</p><label>联系人姓名<input disabled={disabled} maxLength={20} value={value.contactName??d.contact} onChange={e=>onChange(selection.map(v=>v.id===d.id?{...v,contactName:e.target.value}:v))}/></label></>}</article>})}</div></section>;
}
export function CreationSituationSummary({selection}:{selection:any[]}){
 const catalog=useCreationCatalog();
 if(!selection.length)return null;
 return <section className="opening-summary"><h3>已选处境</h3>{selection.map(v=>{const d=catalog.situations[v.id];return <p key={v.id}><strong>{d.name} · {v.contactName??d.contact}</strong>：{v.benefit==='points'?d.pointBenefit:d.storyBenefit} {d.description}</p>})}</section>;
}
