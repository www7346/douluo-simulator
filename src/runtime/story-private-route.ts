import {rules} from '../rules';
import {resolveStoryPersonName,storyNameKey} from './story-person-names';
import {checkPrivateRouteRequest} from '../shared/story-private-route';

/** Resolve only known people or the existing catalogue's actual local people, never create a stranger. */
export function resolvePrivateRoute(state:any,request:any,input:string){
 const value=checkPrivateRouteRequest(request,input),resolved=resolveStoryPersonName(state,value.name),matches=[...resolved.matches] as {id:string;name:string;canonicalId?:string}[];
 for(const p of rules.arena.worldCharacterRecords(state) as any[]){
  const id=rules.arena.persistentCharacterId(p.id);
  if(p.kind!=='soul-beast'&&!state.人物.列表[id]&&storyNameKey(p.name)===storyNameKey(value.name)&&rules.arena.worldCharacterLocation(state,p.id)===state.地图.当前地点ID)matches.push({id,name:p.name,canonicalId:p.id});
 }
 if(matches.length!==1)throw Error(matches.length?'这个私聊称呼对应多个人物，请先明确对象':'没有与这段私聊称呼对应的已知人物，请先明确对象');
 return {...matches[0],...value};
}
