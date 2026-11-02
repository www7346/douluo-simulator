import {useState,type ReactNode} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import PersonDossier from './PersonDossier';

/** Every resident portrait opens the same dossier, initially on Status. */
export default function PersonLink({personId,children,className,label}:{personId:string;children:ReactNode;className?:string;label?:string}){
 const {state}=useGame(),[open,setOpen]=useState(false),query=useServerQuery<any>('scene.person',{characterId:personId},{enabled:open});
 return <><button type="button" className={className??'person-portrait-link'} aria-label={label??`查看${state.人物.列表[personId]?.name??'人物'}的状态`} onClick={()=>setOpen(true)}>{children}</button>
 <Modal open={open} title={query.data?.name??'人物资料'} className="modal--person" onClose={()=>setOpen(false)}><QueryStatus query={query}/>{query.data&&<PersonDossier person={query.data} state={state} onReturn={()=>setOpen(false)} actions={<Button variant="secondary" onClick={()=>setOpen(false)}>返回</Button>}/>}</Modal></>;
}
