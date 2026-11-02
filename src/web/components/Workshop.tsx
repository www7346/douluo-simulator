import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useResearchWorkspace} from '../use-research-workspace';
import {switchResearchCategory} from '../../runtime/research-workbench';
import ResearchWorkbench from './ResearchWorkbench';
import WorkshopBlueprints,{type WorkshopIndexQuery} from './WorkshopBlueprints';
import '../workshop.css';

const CATEGORIES=['丹药','毒药','魂导器','暗器','拘束器','情具'];

/** One workshop, two tasks. Both tasks share the category and current world. */
export default function Workshop({index,mode,onMode}:{index:WorkshopIndexQuery;mode:'design'|'craft';onMode:(mode:'design'|'craft')=>void}){
 const {view}=useGame(),workspace=useResearchWorkspace();
 const [category,setCategory]=useState(()=>mode==='craft'?'全部':workspace.draft.category),[selectedBlueprint,setSelectedBlueprint]=useState('');
 const selectDesignCategory=(next:string)=>{
  if(next!=='全部'&&next!=='情具'&&next!==workspace.draft.category)workspace.change(current=>switchResearchCategory(current,next));
 };
 const selectMode=(next:'design'|'craft')=>{
  if(next==='design'){
   if(category==='全部')setCategory(workspace.draft.category);
   else selectDesignCategory(category);
  }
  onMode(next);
 };
 const selectCategory=(next:string)=>{
  setCategory(next);setSelectedBlueprint('');
  if(mode==='design')selectDesignCategory(next);
 };
 const adopt=(id:string)=>{setSelectedBlueprint(id);onMode('craft');};
 return <section className="workshop-page" aria-label="工坊">
  <nav className="workshop-modes" aria-label="工坊功能"><Button variant={mode==='design'?'primary':'ghost'} aria-pressed={mode==='design'} disabled={view.busy} onClick={()=>selectMode('design')}>设计图纸</Button><Button variant={mode==='craft'?'primary':'ghost'} aria-pressed={mode==='craft'} disabled={view.busy} onClick={()=>selectMode('craft')}>按图制作</Button></nav>
  <nav className="atelier-categories" aria-label="作品类别">{CATEGORIES.map(value=><button key={value} aria-pressed={category===value} className={category===value?'is-active':''} disabled={view.busy} onClick={()=>selectCategory(value)}>{value}</button>)}</nav>
  {mode==='design'&&category!=='情具'?<ResearchWorkbench workspace={workspace} onBlueprint={adopt}/>:<WorkshopBlueprints index={index} category={category} selected={selectedBlueprint} onSelect={setSelectedBlueprint} design={mode==='design'} onAdopt={adopt} onShowAll={()=>selectCategory('全部')}/>}
 </section>;
}
