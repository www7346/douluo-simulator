import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
const stances={believes:'相信',doubts:'怀疑',uncertain:'不确定'};
function Statement({record,viewerId}:{record:any;viewerId:string}){
 const {view,controller}=useGame(),[reason,setReason]=useState('');
 const feedback=useActionFeedback();
 const decide=(stance:string)=>feedback.run(()=>controller.dispatch('character.assess-speech',{statementId:record.id,decision:{stance,reason:reason.trim()||stances[stance as keyof typeof stances]}}));
 return <article><ActionFeedback feedback={feedback}/><p>{record.speakerId===viewerId?'我说':`${record.speakerName??record.speakerId}说`}：“{record.text}”</p><p>已向{record.listenerId===viewerId?'我':record.listenerName??record.listenerId}说出，内容尚未证实。</p>
  {record.assessment&&<p>我的判断：{stances[record.assessment.stance as keyof typeof stances]}。{record.assessment.reason}</p>}
  {record.listenerId===viewerId&&!record.assessment&&<>{record.assessmentReason?<p>{record.assessmentReason}</p>:<><label>我的判断理由<textarea maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="field-actions">{Object.entries(stances).map(([stance,label])=><Button key={stance} variant="secondary" disabled={view.busy} onClick={()=>void decide(stance)}>{label}</Button>)}</div><p>这只是你心中的判断。</p></>}</>}
 </article>;
}
export default function WorldSpeechPanel({social}:{social:any}){
 if(!social?.speech?.length)return null;
 return <details><summary>发言与听闻</summary>{social.speech.slice(-20).reverse().map((r:any)=><Statement key={r.id} record={r} viewerId={social.viewerId}/>)}</details>;
}
