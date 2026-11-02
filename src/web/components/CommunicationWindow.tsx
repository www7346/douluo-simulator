import {useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Modal} from '../components';
import UiIcon from './UiIcon';
import './communication-window.css';

export default function CommunicationWindow({open,unread,onOpen,onClose,children,activationKey}:{activationKey?:string;open:boolean;unread:number;onOpen:()=>void;onClose:()=>void;children:ReactNode}){
 const launcher=useRef<HTMLButtonElement>(null);
 const close=()=>{onClose();launcher.current?.focus({preventScroll:true});};
 return <>{createPortal(<button ref={launcher} className="communication-launcher" aria-label={`魂导通讯${unread?` · ${unread} 条新消息`:''}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>open?close():onOpen()}><UiIcon name="chat"/><span>通讯</span>{unread>0&&<small>{unread>99?'99+':unread}</small>}</button>,document.body)}<Modal open={open} keepMounted activationKey={activationKey} title="魂导通讯" className="communication-dialog" onClose={close}>{children}</Modal></>;
}
