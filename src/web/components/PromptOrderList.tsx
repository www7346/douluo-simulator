import {useId,useRef,useState,type ReactNode} from 'react';

export default function PromptOrderList({items,selected,label,onSelect,onMove,onRemove,canRemove,onToggle,expandedContent}:{items:Array<{id:string;name:string;enabled?:boolean;detail?:string}>;selected?:string;label:string;onSelect:(id:string)=>void;onMove:(from:string,to:string)=>void;onRemove:(id:string)=>void;canRemove:(id:string)=>boolean;onToggle?:(id:string,enabled:boolean)=>void;expandedContent?:ReactNode}){
 const [dragging,setDragging]=useState(''),[over,setOver]=useState('');
 const contentId=useId();
 const drag=useRef<{id:string;over:string}|null>(null),list=useRef<HTMLOListElement>(null);
 const stop=()=>{drag.current=null;setDragging('');setOver('');};
 return <ol ref={list} className="writer-prompt-list" aria-label={label}>{items.map((item,index)=><li key={item.id} data-prompt-order-id={item.id} className={`${selected===item.id?'is-selected':''} ${dragging===item.id?'is-dragging':''} ${over===item.id&&over!==dragging?'is-drop-target':''}`}>
  <div className="writer-prompt-row">
  <button type="button" className="writer-prompt-handle" aria-label={`拖动排序：${item.name}`} title="拖动排序，也可用上下方向键" onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:item.id,over:item.id};setDragging(item.id);}}
   onPointerMove={e=>{if(!drag.current)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-prompt-order-id]');if(target&&list.current?.contains(target)){drag.current.over=target.dataset.promptOrderId!;setOver(drag.current.over);}}}
   onPointerUp={()=>{const current=drag.current;if(current)onMove(current.id,current.over);stop();}} onPointerCancel={stop} onLostPointerCapture={stop}
   onKeyDown={e=>{const direction=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;if(direction){e.preventDefault();if(items[index+direction])onMove(item.id,items[index+direction].id);}}}>⋮⋮</button>
  {onToggle&&<input type="checkbox" className="prompt-enabled" aria-label={`启用 ${item.name}`} checked={item.enabled!==false} onChange={e=>onToggle(item.id,e.target.checked)}/>}
  <button type="button" className="writer-prompt-select" aria-expanded={selected===item.id} aria-controls={selected===item.id?contentId:undefined} onClick={()=>onSelect(item.id)}><span aria-hidden="true">{selected===item.id?'▾':'▸'} </span><span>{index+1}.</span> {item.name}{item.detail&&<small>{item.detail}</small>}</button>
  <div className="writer-prompt-actions"><button type="button" aria-label={`上移 ${item.name}`} disabled={index===0} onClick={()=>onMove(item.id,items[index-1].id)}>↑</button><button type="button" aria-label={`下移 ${item.name}`} disabled={index===items.length-1} onClick={()=>onMove(item.id,items[index+1].id)}>↓</button>{canRemove(item.id)&&<button type="button" aria-label={`删除 ${item.name}`} onClick={()=>onRemove(item.id)}>删除</button>}</div>
  </div>
  {selected===item.id&&expandedContent&&<div id={contentId} className="writer-prompt-expanded">{expandedContent}</div>}
 </li>)}</ol>;
}
