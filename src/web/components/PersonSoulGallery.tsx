import {useState} from 'react';
import {useServerQuery} from '../use-game-query';
import {Modal,SoulRing} from '../components';
import QueryStatus from './QueryStatus';
import SoulGallery from './SoulGallery';
import AbilityDetails from './AbilityDetails';
import SpiritIllustration from './SpiritIllustration';
export default function PersonSoulGallery({characterId,historical=false,archive:provided}:{characterId:string;historical?:boolean;archive?:any}){
 const query=useServerQuery<any>('presentation.archive',{characterId,...(historical?{scope:'historical-projection'}:{})},{enabled:!provided}),[ringId,setRingId]=useState(''),archive=provided??query.data,gallery=archive?.gallery,ring=gallery?.rings?.[ringId];
 if(!gallery)return <><QueryStatus query={query}/><p>{archive?.souls?.[0]?.name??'当前还没有可查看的武魂与技能资料。'}</p></>;
 if(gallery.presentationOnly){const soul=gallery.souls[0];return <section aria-label="武魂表象" className="ability-soul-summary"><SpiritIllustration soul={soul} slot="" className="spirit-illustration"/><div><h3>{soul.名称}</h3><p>{gallery.notice}</p></div></section>;}
 return <>{gallery.notice&&<p className="muted">{gallery.notice}</p>}<SoulGallery {...gallery} key={characterId} readOnly ringRecords={gallery.rings} onInspectRing={setRingId}/><Modal open={!!ring} title={ring?`第${ring.序号}魂环 · ${ring.年限}年`:'魂环'} onClose={()=>setRingId('')}><div className="ring-details"><div className="ring-details__art">{ring&&<SoulRing index={ring.序号} years={ring.年限} color={ring.颜色}/>}</div><div><p>魂环来源：{ring?.sourceName||'来源未明'}</p>{ring?.skills.map((skill:any)=><article key={skill.id}><h3>{skill.name??skill.名称}</h3><AbilityDetails skill={skill} showName={false}/></article>)}</div></div></Modal></>;
}
