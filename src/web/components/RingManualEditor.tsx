import {Button} from '../components';
import {EffectEditor,JsonInput} from './EffectEditor';

/** Edits proposals only. Preview and adoption both go through the ring reviewer. */
export default function RingManualEditor({value,catalogue,disabled,onChange,onPreview,onClose}:{value:any;catalogue:any;disabled:boolean;onChange:(value:any)=>void;onPreview:()=>void;onClose:()=>void}){
 const effects=Object.fromEntries((catalogue.effects??[]).map((effect:any)=>[effect.id,effect]));
 const editSkill=(i:number,patch:any)=>onChange({...value,skills:value.skills.map((skill:any,j:number)=>i===j?{...skill,...patch}:skill)});
 return <section className="ring-manual-editor opening-workshop" aria-label="手动编辑魂技">
  <h3>手动编辑魂技</h3><p>草稿会自动保存。预览会检查来源、武魂能力、年限和点数；通过后才能采用。修改这里的名称与介绍会按你的填写保存。</p>
  <label>方案名称<input disabled={disabled} maxLength={30} value={value.name??''} onChange={e=>onChange({...value,name:e.target.value})}/></label>
  <label>方案介绍<textarea disabled={disabled} maxLength={600} value={value.description??''} onChange={e=>onChange({...value,description:e.target.value})}/></label>
  {(value.skills??[]).map((skill:any,i:number)=><fieldset key={i} disabled={disabled}><legend>第{i+1}项魂技</legend>
   <label>魂技名称<input maxLength={30} value={skill.name??''} onChange={e=>editSkill(i,{name:e.target.value})}/></label>
   <label>魂技介绍<textarea maxLength={2000} value={skill.description??''} onChange={e=>editSkill(i,{description:e.target.value})}/></label>
   <EffectEditor branches={(skill.requestedBranches??[]).map((b:any)=>{const {requestedEffects,requestedEffectIds,...rest}=b;return {...rest,nodes:requestedEffects??(requestedEffectIds??[]).map((id:string)=>[id,{}])};})} effects={effects} disabled={disabled} allowOptional={false} onChange={branches=>editSkill(i,{requestedBranches:branches.map(({nodes,...b}:any)=>({...b,optional:false,requestedEffects:nodes}))})}/>
   <label>冷却回合<input type="number" min={0} value={skill.cooldownTurns??0} onChange={e=>editSkill(i,{cooldownTurns:Number(e.target.value)})}/></label>
   <p>基础魂力消耗随实际效果计算；额外代价、维持费用和使用次数可在下方设置。</p>
   {(['requirements','resourceCosts','maintenanceCosts','usageRules','castModes','exchangeContracts'] as const).map((key,index)=><JsonInput key={key} label={['施放条件','额外施放代价','维持代价','使用次数限制','施放方式','条件与代价交换'][index]} value={skill[key]??(key==='usageRules'?{}:[])} disabled={disabled} onApply={v=>editSkill(i,{[key]:v})}/>)}
   <Button variant="ghost" disabled={disabled||value.skills.length===1} onClick={()=>onChange({...value,skills:value.skills.filter((_:any,j:number)=>i!==j)})}>移除这项魂技</Button>
  </fieldset>)}
  <Button variant="secondary" disabled={disabled||value.skills.length>=4} onClick={()=>onChange({...value,skills:[...value.skills,{name:'新魂技',description:'按所选效果施展魂技。',requestedBranches:[{id:'skill-'+crypto.randomUUID(),label:'主要效果',activation:'active',optional:false,requestedEffects:[]}]}]})}>添加魂技</Button>
  <p>当前年限最多承载{catalogue.ageRules?.maximumSkillCount??1}项魂技；开局是否需要提高年限会在预览时说明。</p>
  {catalogue.phase==='opening-history'&&<JsonInput label="魂兽来源设定" value={value.source??catalogue.currentDesign?.source??{name:catalogue.source.name,description:catalogue.source.description,years:catalogue.source.years,categories:[],attributes:[],channels:[]}} disabled={disabled} onApply={source=>onChange({...value,source})}/>}
  <div className="field-actions"><Button disabled={disabled} onClick={onPreview}>预览并检查点数</Button><Button variant="ghost" disabled={disabled} onClick={onClose}>收起编辑器</Button></div>
 </section>;
}
