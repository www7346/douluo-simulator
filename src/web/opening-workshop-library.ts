import {WORKSHOP_CATEGORIES} from '../shared/opening-workshop-advice';
export const OPENING_WORKSHOP_LIBRARY_KEY='douluo.opening-workshop.library.v1';
export interface WorkshopWork {id:string;createdAt:string;updatedAt:string;design:Record<string,any>}
export interface WorkshopLibrary {kind:'douluo-opening-workshop';version:1;works:WorkshopWork[]}
type LocalStore=Pick<Storage,'getItem'|'setItem'>;
const copy=<T,>(value:T):T=>structuredClone(value);
const validDesign=(d:any)=>d&&typeof d==='object'&&!Array.isArray(d)&&WORKSHOP_CATEGORIES.includes(d.category)&&typeof d.name==='string'&&d.definition&&typeof d.definition==='object';
export function freshWorkshopDesign(design:Record<string,any>):Record<string,any>{if(!validDesign(design))throw Error('作品缺少类别、名称或实际能力设计');return {...copy(design),id:crypto.randomUUID(),adopted:false};}
export function emptyWorkshopLibrary():WorkshopLibrary{return {kind:'douluo-opening-workshop',version:1,works:[]};}
export function parseWorkshopLibrary(text:string):WorkshopLibrary {
 if(text.length>4*1024*1024)throw Error('作品文件超过本机作品库的保存容量');
 let value:any;try{value=JSON.parse(text);}catch{throw Error('作品文件不是完整的JSON');}
 if(validDesign(value))return {kind:'douluo-opening-workshop',version:1,works:[{id:crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),design:{...copy(value),adopted:false}}]};
 if(value?.kind!=='douluo-opening-workshop'||value.version!==1||!Array.isArray(value.works)||value.works.length>128||value.works.some((work:any)=>typeof work?.id!=='string'||!work.id||!validDesign(work.design)||!Number.isFinite(Date.parse(work.createdAt))||!Number.isFinite(Date.parse(work.updatedAt))))throw Error('这份作品库的格式或版本不完整');
 if(new Set(value.works.map((work:any)=>work.id)).size!==value.works.length)throw Error('作品编号重复，请导出原作品后分别导入');
 return {...emptyWorkshopLibrary(),works:value.works.map((work:WorkshopWork)=>({...copy(work),design:{...copy(work.design),adopted:false}}))};
}
export function loadWorkshopLibrary(storage:LocalStore):WorkshopLibrary {const text=storage.getItem(OPENING_WORKSHOP_LIBRARY_KEY);return text===null?emptyWorkshopLibrary():parseWorkshopLibrary(text);}
export function saveWorkshopLibrary(storage:LocalStore,library:WorkshopLibrary){const text=JSON.stringify(library);parseWorkshopLibrary(text);try{storage.setItem(OPENING_WORKSHOP_LIBRARY_KEY,text);}catch{throw Error('本机作品库没有保存成功，请先导出作品文件；当前开局设计仍保留在草稿中');}}
export function addWorkshopWork(library:WorkshopLibrary,design:Record<string,any>):WorkshopLibrary {
 if(library.works.length>=128)throw Error('本机作品库已满，请先导出并整理作品');const now=new Date().toISOString();
 return {...emptyWorkshopLibrary(),works:[...copy(library.works),{id:crypto.randomUUID(),createdAt:now,updatedAt:now,design:{...freshWorkshopDesign(design),adopted:false}}]};
}
/** Revalidate every imported design against the current server before changing the library. */
export async function importWorkshopWorks(library:WorkshopLibrary,text:string,check:(design:Record<string,any>)=>Promise<{pass:boolean;errors?:string[];design:Record<string,any>}>):Promise<WorkshopLibrary>{
 const incoming=parseWorkshopLibrary(text),accepted:Record<string,any>[]=[];
 if(library.works.length+incoming.works.length>128)throw Error('导入后超过本机作品库容量，请先导出并整理作品');
 for(const [index,work] of incoming.works.entries()){const result=await check({...copy(work.design),adopted:false});if(!result.pass)throw Error(`第${index+1}件「${work.design.name}」尚未通过当前规则：${result.errors?.join('；')??'请调整设计'}`);accepted.push(result.design);}
 return accepted.reduce<WorkshopLibrary>((next,design)=>addWorkshopWork(next,design),library);
}
