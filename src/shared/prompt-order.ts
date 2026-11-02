export function movePromptItem<T extends {id:string}>(parts:T[],fromId:string,toId:string):T[]{
 const from=parts.findIndex(part=>part.id===fromId),to=parts.findIndex(part=>part.id===toId);
 if(from<0||to<0||from===to)return parts;
 const next=[...parts];next.splice(to,0,next.splice(from,1)[0]);return next;
}
