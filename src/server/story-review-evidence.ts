import {writingFactAt,type StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import {projectCommerceWritingFacts} from '../runtime/story-commerce-reading';

const escape=(key:string)=>key.replace(/~/g,'~0').replace(/\//g,'~1');
const evidenceCache=new WeakMap<StoryWritingPackage,{facts:any;paths:Map<string,string>}>();
/** Request-local annotations only. Values and ordering are exactly the author's selected facts.
 * The map stays in code; the reviewer selects a nearby record ID rather than counting paths.
 */
export function storyReviewEvidence(p:StoryWritingPackage){
 const cached=Object.isFrozen(p)&&Object.isFrozen(p.facts)?evidenceCache.get(p):undefined;if(cached)return cached;
 const paths=new Map<string,string>();let ordinal=0;
 const visit=(value:any,path:string,arrayItem=false):any=>{
  if(Array.isArray(value))return value.map((v,i)=>visit(v,`${path}/${i}`,true));
  if(!value||typeof value!=='object')return value;
  if(Object.hasOwn(value,'$evidence'))throw Error('事实资料与审阅展示标识冲突');
  // Reference complete records: domain sections, collection entries, performed
  // action facts and compiled statements. Nested coordinates, numeric containers
  // and implementation metadata remain unchanged inside their enclosing record.
  const depth=path.split('/').length-1;
  const record=depth>=1&&depth<=2||arrayItem||/^\/events\/\d+\/facts$/.test(path)
   ||typeof value.statement==='string'||typeof value.fact==='string'
   ||typeof value.reference==='string'&&typeof value.name==='string';
  const id=record?`e${p.id.slice(0,8)}.${(++ordinal).toString(36)}`:null;
  if(id)paths.set(id,path);
  return {...(id?{$evidence:id}:{}),...Object.fromEntries(Object.entries(value).map(([key,v])=>[key,visit(v,`${path}/${escape(key)}`)]))};
 };
 const facts=projectCommerceWritingFacts(visit(selectStoryWritingView(p,false).facts,'')),visible=new Set<string>();
 // Use exactly the author's selected authority view. A candidate may claim an
 // unrequested state change, so requested action names cannot prove that an
 // existing domain is irrelevant. Repair references read the same view too.
 const collect=(value:any):void=>{if(!value||typeof value!=='object')return;if(typeof value.$evidence==='string')visible.add(value.$evidence);for(const child of Object.values(value))collect(child);};collect(facts);
 for(const id of paths.keys())if(!visible.has(id))paths.delete(id);
 const result={facts,paths};if(Object.isFrozen(p)&&Object.isFrozen(p.facts))evidenceCache.set(p,result);return result;
}

/** Repairs receive exactly the selected record the reviewer saw, without removed catalogues. */
export function storyReviewFactAt(p:StoryWritingPackage,path:string){return writingFactAt({...p,facts:selectStoryWritingView(p).facts},path);}
