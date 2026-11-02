interface InventoryViewMemory {category:string;search:string;selected:string;page:number;scroll:number}
export function readWorkspaceView(scope:string,tab:string):InventoryViewMemory{
 try{const value=JSON.parse(sessionStorage.getItem(`douluo:workspace-view:${scope}:${tab}`)??'null');if(value&&typeof value.category==='string'&&typeof value.search==='string'&&value.search.length<=400&&typeof value.selected==='string'&&value.selected.length<=200&&Number.isSafeInteger(value.page)&&value.page>=0&&Number.isFinite(value.scroll)&&value.scroll>=0)return value;}catch{}
 return {category:'全部',search:'',selected:'',page:0,scroll:0};
}
export function saveWorkspaceView(scope:string,tab:string,value:InventoryViewMemory){try{sessionStorage.setItem(`douluo:workspace-view:${scope}:${tab}`,JSON.stringify(value));}catch{/* Optional view position never blocks game saves. */}}
