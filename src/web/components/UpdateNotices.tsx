import {useEffect,useState} from 'react';
import {Button,Modal,Panel} from '../components';
import {UPDATE_NOTICES,UPDATE_ROADMAP,NOTICE_READ_KEY,latestPopupNotice,popupNoticeRead,type UpdateNotice} from '../update-notices';

function NoticeBody({notice}:{notice:UpdateNotice}) {return <article><p className="eyebrow">{notice.date} · {notice.status==='draft'?'开发中':'已更新'}</p><h2>{notice.title}</h2><ul>{notice.changes.map(line=><li key={line}>{line}</li>)}</ul></article>;}
function Roadmap(){return <section><h2>下一步更新计划</h2><p>接下来将继续完善以下内容。</p><ul>{UPDATE_ROADMAP.map(line=><li key={line}>{line}</li>)}</ul></section>;}
export function UpdatesPage({onReturn}:{onReturn:()=>void}) {return <Panel title="更新公告"><Button variant="secondary" onClick={onReturn}>返回原页面</Button><div className="update-notices">{UPDATE_NOTICES.map(notice=><NoticeBody key={notice.id} notice={notice}/>)}<Roadmap/></div></Panel>;}
export function UpdateNoticePopup({safe,onOpen}:{safe:boolean;onOpen:()=>void}) {
 const latest=latestPopupNotice(import.meta.env.DEV);
 const [open,setOpen]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  if(!safe||!latest||dismissed)return;
  const timer=setInterval(()=>{
   if(document.querySelector('[role="dialog"]'))return;
   try{if(popupNoticeRead(latest.id,localStorage.getItem(NOTICE_READ_KEY))){setDismissed(true);return;}}catch{}
   setOpen(true);
  },500);
  return()=>clearInterval(timer);
 },[safe,latest?.id,dismissed]);
 const close=()=>{if(latest)try{localStorage.setItem(NOTICE_READ_KEY,latest.id);}catch{}setOpen(false);setDismissed(true);};
 return latest?<Modal open={open&&safe} title="更新公告" onClose={close} actions={<><Button variant="secondary" onClick={()=>{close();onOpen();}}>查看全部公告与计划</Button><Button onClick={close}>知道了</Button></>}><div className="update-notices"><NoticeBody notice={latest}/><Roadmap/></div></Modal>:null;
}
