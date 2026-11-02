import {SHARED_ART} from '../../runtime/shared-art';
import {assetUrl} from '../asset-delivery';
import {useEffect,useMemo,useRef,useState} from 'react';
import displayLabels from '../../shared/display-labels.json';
import {CHARACTER_FIGURES,GENERIC_FIGURES} from '../character-figure-catalog';
import {useGame} from '../game-context';
import {Button,ModalActions} from '../components';
import {avatarCrop,dragAvatarCrop,zoomAvatarCrop,encodeAppearance,readAppearanceImage} from '../appearance-image';
import {figureAvatarControls} from '../figure-portraits';

const BANDS:Record<string,string>={child:'儿童',teen:'少年',adult:'成年',mature:'中年'};
const library=[...new Map([...Object.entries({...CHARACTER_FIGURES,...GENERIC_FIGURES}).map(([id,art])=>{
  const person=(displayLabels.people as Record<string,{name:string;stage:string}>)[id];
  return {id,...art,name:person?.name??`${id.includes('female')?'女':'男'}${BANDS[art.band]??''}旅者`,stage:person?.stage||BANDS[art.band]};
}),...SHARED_ART.map(art=>({id:art.key,src:art.src,name:art.label,stage:'恩赐与启程'}))].map(item=>[item.id,item] as const)).values()];

export default function AppearanceEditor({defaultFigure=''}:{defaultFigure?:string}) {
  const {controller,view}=useGame();
  const [kind,setKind]=useState<'avatar'|'figure'>('figure'),[query,setQuery]=useState(''),[page,setPage]=useState(0);
  const [source,setSource]=useState<Blob|null>(null),[size,setSize]=useState<{width:number;height:number}|null>(null);
  const [framing,setFraming]=useState({zoom:1,x:50,y:0}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const {zoom,x,y}=framing;
  const preview=useMemo(()=>source?URL.createObjectURL(source):'',[source]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const filtered=library.filter(item=>`${item.name} ${item.stage}`.includes(query));
  const crop=size?avatarCrop(size.width,size.height,zoom,x,y):null;
  const drag=useRef<{id:number;left:number;top:number;x:number;y:number;width:number}|null>(null);
  const previewElement=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=previewElement.current;if(!element||!source||kind!=='avatar'||busy||!size)return;
    const wheel=(event:WheelEvent)=>{
      if(!event.deltaY)return;event.preventDefault();drag.current=null;
      const rect=element.getBoundingClientRect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
      setFraming(current=>zoomAvatarCrop(size.width,size.height,current.zoom,current.x,current.y,delta,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height));
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return ()=>element.removeEventListener('wheel',wheel);
  },[source,kind,busy,size]);
  const cropStyle=crop&&size?{width:`${size.width/crop.side*100}%`,height:`${size.height/crop.side*100}%`,left:`${-crop.x/crop.side*100}%`,top:`${-crop.y/crop.side*100}%`}:undefined;
  const select=async(input:Blob|string)=>{
    const session=view.sessionId;setBusy(true);setError('');
    try{const blob=typeof input==='string'?await fetch(assetUrl(input)).then(r=>{if(!r.ok)throw new Error('素材读取失败');return r.blob();}):input;
      const bitmap=await readAppearanceImage(blob);const dimensions={width:bitmap.width,height:bitmap.height};bitmap.close();
      if(controller.getView().sessionId!==session)return;
      const framing=typeof input==='string'?figureAvatarControls(input):{zoom:1,x:50,y:0};
      setSource(blob);setSize(dimensions);setFraming(framing);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const save=async(reset=false)=>{
    const session=view.sessionId;if(!source&&!reset)return;setBusy(true);setError('');
    try{const record=reset?null:await encodeAppearance(source!,kind,zoom,x,y);
      if(controller.getView().sessionId!==session)return;
      if(kind==='avatar')await controller.savePlayerAvatar(record);else await controller.savePlayerFigure(record);
      setSource(null);setSize(null);controller.notify(`${kind==='avatar'?'头像':'立绘'}已${reset?'恢复默认':'保存'}`,'success');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  return <div className="appearance-editor">
    <nav className="appearance-tabs" aria-label="形象类型">{(['figure','avatar'] as const).map(value=><Button key={value} variant={kind===value?'primary':'secondary'} disabled={busy} onClick={()=>{setKind(value);setSource(null);setSize(null);setError('');}}>{value==='figure'?'战斗与档案立绘':'人物头像'}</Button>)}</nav>
    <p>头像用于小图与行动顺序；立绘用于人物档案和战场。两者独立保存，随存档导出。</p>
    <div className="appearance-workspace"><section className="appearance-preview-pane">
      <div ref={previewElement} className={`appearance-preview appearance-preview--${kind}${source?' is-cropping':''}`}
        onPointerDown={event=>{if(!source||kind!=='avatar'||busy||!size)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,left:event.clientX,top:event.clientY,x,y,width:event.currentTarget.getBoundingClientRect().width};}}
        onPointerMove={event=>{const start=drag.current;if(!start||start.id!==event.pointerId||!size)return;const next=dragAvatarCrop(size.width,size.height,zoom,start.x,start.y,event.clientX-start.left,event.clientY-start.top,start.width);setFraming(current=>({...current,...next}));}}
        onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onDragStart={event=>event.preventDefault()}>
        {preview||(kind==='avatar'?view.avatarUrl:view.figureUrl||defaultFigure)?<img src={assetUrl(preview||(kind==='avatar'?view.avatarUrl:view.figureUrl||defaultFigure))} alt={kind==='avatar'?'头像构图预览':'立绘预览'} style={source&&kind==='avatar'?cropStyle:undefined}/>:<span>尚未选择{kind==='avatar'?'头像':'立绘'}</span>}
      </div>
      <label className="appearance-upload">导入自己的{kind==='avatar'?'头像':'立绘'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void select(file);e.target.value='';}}/></label>
      {kind==='avatar'&&(view.figureUrl||defaultFigure)&&<Button variant="secondary" disabled={busy} onClick={()=>void select(view.figureUrl||defaultFigure)}>从当前立绘选取头像</Button>}
      {source&&kind==='avatar'&&<Button variant="ghost" disabled={busy} onClick={()=>setFraming({zoom:1,x:50,y:0})}>重置裁切</Button>}
      <ModalActions>{source&&<Button disabled={busy} onClick={()=>void save()}>{busy?'保存中…':`保存这幅${kind==='avatar'?'头像':'立绘'}`}</Button>}
      <Button variant="ghost" disabled={busy||!(kind==='avatar'?view.avatarUrl:view.figureUrl)} onClick={()=>void save(true)}>恢复默认{kind==='avatar'?'头像':'立绘'}</Button></ModalActions>
      <small>{kind==='figure'?'透明背景图片可保留轮廓，整幅按比例显示。':'拖动图片调整位置，在预览图上滚动鼠标滚轮缩放，按预览保存为方形头像。'}</small>
      {error&&<p role="alert">{error}</p>}
    </section><section className="appearance-library"><h3>从已有素材中选择</h3><input aria-label="搜索角色形象" placeholder="搜索角色、恩赐或素材名称" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
      <div className="appearance-library__grid">{filtered.slice(page*12,page*12+12).map(item=><button key={item.id} disabled={busy} onClick={()=>void select(item.src)} aria-label={`选择${item.name} · ${item.stage}`}><img src={assetUrl(item.src)} alt="" loading="lazy"/><strong>{item.name}</strong><small>{item.stage}</small></button>)}</div>
      {!filtered.length&&<p>没有匹配的素材，可以导入自己的图片。</p>}
      <footer><Button variant="ghost" disabled={page===0||busy} onClick={()=>setPage(v=>v-1)}>上一页</Button><span>{page+1} / {Math.max(1,Math.ceil(filtered.length/12))}</span><Button variant="ghost" disabled={(page+1)*12>=filtered.length||busy} onClick={()=>setPage(v=>v+1)}>下一页</Button></footer>
    </section></div>
  </div>;
}
