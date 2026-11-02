import {assetUrl} from './asset-delivery';
import React, { createContext, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {createPortal} from 'react-dom';
import {ringDisplay} from '../shared/ring-display';
import SoulRingArt from './components/SoulRingArt';
import type { UiNotice } from './controller';
import UiIcon,{type UiIconName} from './components/UiIcon';

export function Button({variant = 'primary', className = '', icon,children,...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'ghost' | 'danger';icon?:UiIconName}) {
  return <button type="button" data-sound={variant==='ghost'?'back':'tap'} {...props} className={`button button--${variant} ${className}`}>{icon&&<UiIcon name={icon}/ >}{children}</button>;
}

export function Panel({children, className = '', title, eyebrow, actions,id}: {children: ReactNode; className?: string; title?: ReactNode; eyebrow?: string; actions?: ReactNode;id?:string}) {
  return <section id={id} className={`panel ${className}`}>{(title || eyebrow || actions) && <header className="panel__head"><div>{eyebrow && <small>{eyebrow}</small>}{title && <h2>{title}</h2>}</div>{actions}</header>}{children}</section>;
}

/** Explicit expandable action button; closing it preserves the form and its draft. */
export function ActionSection({title,children,defaultOpen=false,open:controlledOpen,onOpenChange,className='','data-testid':testId}:{title:ReactNode;children:ReactNode;defaultOpen?:boolean;open?:boolean;onOpenChange?:(open:boolean)=>void;className?:string;'data-testid'?:string}){
 const [internalOpen,setOpen]=useState(Boolean(defaultOpen)),open=controlledOpen??internalOpen,id=useId();return <section data-testid={testId} className={`action-section ${className}`}><Button variant="secondary" className="action-section__toggle" aria-expanded={open} aria-controls={id} onClick={()=>{const next=!open;setOpen(next);onOpenChange?.(next);}}><span>{title}</span><small>{open?'收起':'打开'}</small></Button><div id={id} hidden={!open} className="action-section__content">{children}</div></section>;
}

export function Progress({value = 0, maximum = 1, tone = 'gold', label}: {value?: number; maximum?: number; tone?: 'gold' | 'life' | 'soul'; label?: string}) {
  const percent = maximum > 0 ? Math.max(0, Math.min(100, value / maximum * 100)) : 0;
  return <div className="meter"><div className="meter__label"><span>{label}</span><span>{Math.round(value)} / {Math.round(maximum)}</span></div><div className="meter__track"><i className={`meter__fill meter__fill--${tone}`} style={{width: `${percent}%`}} /></div></div>;
}

export function EmptyState({title, children, action}: {title: string; children: ReactNode; action?: ReactNode}) {
  return <div className="empty-state"><span className="empty-state__glyph">◇</span><h2>{title}</h2><p>{children}</p>{action}</div>;
}

const modalStack:string[]=[];
const modalLayers=new Map<string,HTMLElement>();
function syncModalLayers(){modalStack.forEach((id,index)=>{const layer=modalLayers.get(id);if(layer)layer.style.zIndex=String(100+index);});}
let originalBodyOverflow='';
const ModalActionHost=createContext<HTMLDivElement|null>(null);

/** Keep a nested view's primary actions outside its modal's scrolling content. */
export function ModalActions({children,disabled=false}:{children:ReactNode;disabled?:boolean}) {
  const host=useContext(ModalActionHost);
  const actions=<div className={`modal-actions${host?' modal-actions--docked':''}`} inert={disabled||undefined}>{children}</div>;
  return host?createPortal(actions,host):actions;
}

/** Persistent workspace: no backdrop, outside-click handler, focus trap or implicit dismissal. */
export function WorkspacePage({children,onReturn}:{children:ReactNode;onReturn:()=>void}){
 const [host,setHost]=useState<HTMLDivElement|null>(null);
 return <section className="workspace-page"><header className="workspace-page__navigation"><Button variant="secondary" onClick={onReturn}>‹ 返回旅程</Button><span>工坊 · 商店 · 行囊</span></header><ModalActionHost.Provider value={host}><div className="workspace-page__content">{children}</div></ModalActionHost.Provider><div className="workspace-page__actions" ref={setHost}/></section>;
}

export function Modal({open, title, children, actions, onClose, className='',keepMounted=false,dismissOnBackdrop=false,activationKey}: {activationKey?:string;dismissOnBackdrop?:boolean;keepMounted?:boolean;className?:string;open: boolean; title: string; children: ReactNode; actions?: ReactNode; onClose: () => void}) {
  const heading = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef=useRef<HTMLElement>(null);
  const [actionHost,setActionHost]=useState<HTMLDivElement|null>(null);
  const closeHandler=useRef(onClose);
  closeHandler.current=onClose;
  useEffect(() => {
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    if(!modalStack.length)originalBodyOverflow=document.body.style.overflow;
    modalStack.push(heading);
    if(panelRef.current?.parentElement)modalLayers.set(heading,panelRef.current.parentElement);
    syncModalLayers();
    document.body.style.overflow='hidden';
    closeRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(modalStack.at(-1)!==heading)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeHandler.current();return}
      if(event.key!=='Tab')return;
      const items=Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')??[]).filter(element=>!element.closest('[inert]')&&element.getClientRects().length>0);
      const first=items[0],last=items.at(-1);
      if(!first){event.preventDefault();return}
      if(event.shiftKey&&(document.activeElement===first||!panelRef.current?.contains(document.activeElement))){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&(document.activeElement===last||!panelRef.current?.contains(document.activeElement))){event.preventDefault();first.focus()}
    };
    window.addEventListener('keydown',onKey,true);
    return()=>{window.removeEventListener('keydown',onKey,true);const index=modalStack.indexOf(heading);const wasTop=index===modalStack.length-1;if(index>=0)modalStack.splice(index,1);modalLayers.delete(heading);syncModalLayers();if(!modalStack.length)document.body.style.overflow=originalBodyOverflow;if(wasTop&&previous?.isConnected)previous.focus()};
  },[open,activationKey]);
  if (!open&&!keepMounted) return null;
  return createPortal(<div className="modal-backdrop" style={!open?{display:'none'}:undefined} inert={!open} aria-hidden={!open||undefined} role="presentation" onMouseDown={event => { if (dismissOnBackdrop&&event.target === event.currentTarget) onClose(); }}><section ref={panelRef} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={heading}><header><h2 id={heading}>{title}</h2><button ref={closeRef} className="icon-button" data-sound="back" onClick={onClose} aria-label="关闭"><UiIcon name="close"/></button></header><div className="modal__body"><ModalActionHost.Provider value={actionHost}>{children}</ModalActionHost.Provider></div><footer data-has-actions={actions?true:undefined}>{actions}<div className="modal__action-host" ref={setActionHost}/></footer></section></div>,document.body);
}

export function ToastRegion({notices, dismiss}: {notices: UiNotice[]; dismiss: (id: string) => void}) {
  return <div className="toasts" aria-live="polite" aria-relevant="additions">{notices.map(notice => <button key={notice.id} className={`toast toast--${notice.tone}`} onClick={() => dismiss(notice.id)}>{notice.message}</button>)}</div>;
}

export function LoadingPanel({label}: {label: string}) { return <div className="loading-panel" role="status"><span className="loading-ring" /><p>{label}</p></div>; }
export function Avatar({name, large = false, imageUrl = ''}: {name: string; large?: boolean; imageUrl?: string}) { return <div className={large ? 'avatar avatar--large' : 'avatar'} aria-label={`${name}头像`}>{imageUrl ? <img src={assetUrl(imageUrl)} alt="" /> : <span>{name?.slice(0, 1) || '魂'}</span>}</div>; }
export function SoulRing({index, years, active,color}: {index: number; years: number; active?: boolean;color?:string}) {
  const tier = ringDisplay(years,color);
  return <div className={`soul-ring soul-ring-palette${active ? ' is-active' : ''}`} data-tier={tier.名称} data-color={tier.颜色} title={`${years}年魂环 · ${tier.颜色}色 · 第${index}魂环`}><SoulRingArt tier={tier.名称}/><span>{tier.颜色==='淡金'?'淡金':tier.名称}</span></div>;
}
export function SoulRingHalo({years}: {years?: number}) {
  const tier = ringDisplay(years ?? 1);
  return <div className="ring-inspection__halo soul-ring-palette" data-tier={tier.名称} aria-hidden="true"><div className="ring-inspection__plane"><SoulRingArt tier={tier.名称}/></div><span>{years == null ? '待鉴定' : tier.名称}</span></div>;
}
export function StatTile({label, value, hint}: {label: string; value: ReactNode; hint?: string}) { return <div className="stat-tile"><small>{label}</small><strong>{value}</strong>{hint && <span>{hint}</span>}</div>; }
