type Anchor={node:Node;key?:string;path:number[];textOffset?:number;top:number};
type Position={top:number;anchors:Anchor[];height:number;width:number;total:number};
const KEY='data-reading-key';

function anchorNode(history:HTMLElement,node:Node,textOffset?:number):Anchor|undefined{
 const element=node.nodeType===3?node.parentElement:node as HTMLElement;
 if(!element||!history.contains(element))return;
 const root=element.closest<HTMLElement>(`[${KEY}]`),path:number[]=[];
 if(root){let child:Node=node;while(child!==root&&child.parentNode){path.unshift(Array.prototype.indexOf.call(child.parentNode.childNodes,child));child=child.parentNode;}}
 const anchor:Anchor={node,key:root?.getAttribute(KEY)??undefined,path,textOffset,top:0};
 const top=anchorTop(history,anchor);if(top===undefined)return;
 anchor.top=top;return anchor;
}
function resolveNode(history:HTMLElement,anchor:Anchor):Node|undefined{
 if(history.contains(anchor.node))return anchor.node;
 if(!anchor.key)return;
 let node:Node|undefined=[...history.querySelectorAll<HTMLElement>(`[${KEY}]`)].find(element=>element.getAttribute(KEY)===anchor.key);
 for(const index of anchor.path)node=node?.childNodes[index];
 return node;
}
function anchorTop(history:HTMLElement,anchor:Anchor):number|undefined{
 const node=resolveNode(history,anchor);if(!node)return;
 let rect:DOMRect|undefined;
 if(anchor.textOffset!==undefined&&node.nodeType===3){
  const length=node.textContent?.length??0;if(!length)return;
  const range=history.ownerDocument.createRange(),offset=Math.min(anchor.textOffset,length-1);
  range.setStart(node,offset);range.setEnd(node,offset+1);rect=range.getClientRects()[0];
 }else rect=(node as HTMLElement).getClientRects()[0];
 if(!rect||!rect.height)return;
 return rect.top-history.getBoundingClientRect().top;
}
function nestedScroller(history:HTMLElement,element:Element):HTMLElement|undefined{
 let current:HTMLElement|null=element as HTMLElement,outermost:HTMLElement|undefined;
 while(current&&current!==history){
  if(current.scrollHeight>current.clientHeight+1&&/auto|scroll/.test(history.ownerDocument.defaultView?.getComputedStyle(current).overflowY??''))outermost=current;
  current=current.parentElement;
 }
 return outermost;
}
function captureAnchors(history:HTMLElement):Anchor[]{
 const document=history.ownerDocument,rect=history.getBoundingClientRect(),view=document.defaultView;
 const y=Math.max(rect.top,0)+12,bottom=Math.min(rect.bottom,view?.innerHeight??rect.bottom),anchors:Anchor[]=[];
 let visibleElement:Element|undefined;
 if(y>=bottom)return anchors;
 // Keep a text position through wrapping changes; fall back to a surviving block
 // when that text is collapsed, replaced or its conversation is remounted.
 const caretDocument=document as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
 for(const fraction of [.5,.25,.75]){
  const x=rect.left+rect.width*fraction,element=document.elementFromPoint?.(x,y);
  if(!element||!history.contains(element))continue;
  visibleElement=element;
  const nested=nestedScroller(history,element);
  if(nested){const anchor=anchorNode(history,nested);if(anchor)anchors.push(anchor);break;}
  const caret=caretDocument.caretPositionFromPoint?.(x,y),range=caret?undefined:caretDocument.caretRangeFromPoint?.(x,y);
  const node=caret?.offsetNode??range?.startContainer,offset=caret?.offset??range?.startOffset;
  if(node?.nodeType===3){const anchor=anchorNode(history,node,offset);if(anchor&&anchor.top>=-2&&anchor.top<bottom-rect.top){anchors.push(anchor);break;}}
 }
 const selector='p,.story-chat__prose,.story-inline-card,summary,.private-message__bubble,.party-chat__bubble,article,section';
 const closest=visibleElement?.closest<HTMLElement>(selector);
 const block=closest&&history.contains(closest)?closest:[...history.querySelectorAll<HTMLElement>(selector)].find(element=>{const box=element.getBoundingClientRect();return box.height&&box.bottom>y&&box.top<bottom;});
 if(block){const anchor=anchorNode(history,block);if(anchor)anchors.push(anchor);const root=block.closest<HTMLElement>(`[${KEY}]`);if(root&&root!==block){const fallback=anchorNode(history,root);if(fallback)anchors.push(fallback);}}
 return anchors;
}

/** A transcript has two distinct intentions: follow its end, or keep reading a place. */
export class ReadingScroll{
 private history:HTMLElement|null=null;
 private position:Position={top:0,anchors:[],height:0,width:0,total:0};
 private expectedTop:number|undefined;
 following=true;
 onFollowChange?: (following:boolean)=>void;
 constructor(private threshold=32){}
 attach(history:HTMLElement){this.history=history;this.restore();}
 detach(history:HTMLElement){if(this.history===history)this.history=null;}
 private visible(){return !!this.history&&this.history.clientHeight>0&&this.history.getClientRects().length>0;}
 private remember(){if(this.visible()){const history=this.history!;this.position={top:history.scrollTop,anchors:this.following?[]:captureAnchors(history),height:history.clientHeight,width:history.clientWidth,total:history.scrollHeight};}}
 private move(top:number){const history=this.history!;const target=Math.max(0,Math.min(top,history.scrollHeight-history.clientHeight));if(Math.abs(history.scrollTop-target)>.5){history.scrollTop=target;this.expectedTop=history.scrollTop;}}
 private notify(){this.onFollowChange?.(this.following);}
 /** Only genuine movement changes the reading intention; a restoration must not re-enable follow. */
 onScroll(){
  if(!this.visible())return;
  const history=this.history!;
  // Browsers may dispatch scroll after clamping a resized/collapsed viewport.
  // That is a layout consequence, not a request to abandon the saved anchor.
  if(history.clientHeight!==this.position.height||history.clientWidth!==this.position.width||history.scrollHeight!==this.position.total){this.expectedTop=undefined;this.restore();return;}
  if(this.expectedTop!==undefined&&Math.abs(history.scrollTop-this.expectedTop)<1){this.expectedTop=undefined;this.remember();return;}
  this.expectedTop=undefined;
  this.following=history.scrollHeight-history.scrollTop-history.clientHeight<this.threshold;
  this.remember();this.notify();
 }
 capture(){this.remember();}
 restore(){
  if(!this.visible())return;
  const history=this.history!;
  if(this.following)this.move(history.scrollHeight);
  else{
   const anchor=this.position.anchors.map(anchor=>({anchor,top:anchorTop(history,anchor)})).find(value=>value.top!==undefined);
   this.move(anchor?history.scrollTop+anchor.top!-anchor.anchor.top:this.position.top);
  }
  this.remember();this.notify();
 }
 latest(){this.following=true;this.restore();}
 /** Explicit, one-time navigation. Passive resizes subsequently preserve this place. */
 reveal(element:HTMLElement,offset=12){
  if(!this.visible()||!this.history!.contains(element))return;
  const history=this.history!;
  this.move(history.scrollTop+element.getBoundingClientRect().top-history.getBoundingClientRect().top-offset);
  this.following=history.scrollHeight-history.scrollTop-history.clientHeight<this.threshold;
  this.remember();this.notify();
 }
}
