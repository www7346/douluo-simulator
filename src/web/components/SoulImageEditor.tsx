import {assetUrl} from '../asset-delivery';
import {useEffect,useMemo,useState} from 'react';
import {artwork} from '../../runtime/art-catalog';
import {martialSoulArtwork,skillArtwork} from '../../runtime/generated-art';
import {useGame} from '../game-context';
import {Button,ModalActions} from '../components';
import {encodeAppearance,readAppearanceImage} from '../appearance-image';
import {SOUL_IMAGE_GROUPS,SOUL_IMAGE_LIBRARY} from '../soul-image-library';
import {PortraitImage} from './PortraitArt';

export default function SoulImageEditor({soul,slot,onSaved}:{soul:any;slot:string;onSaved:()=>void}){
  const {controller,view}=useGame();
  const isSkill=slot.startsWith('skill:'),label=isSkill?'魂技':'武魂';
  const [group,setGroup]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0);
  const [selected,setSelected]=useState(''),[source,setSource]=useState<Blob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const preview=useMemo(()=>source?URL.createObjectURL(source):'',[source]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  const current=view.soulImages[slot],filtered=SOUL_IMAGE_LIBRARY.filter(a=>(!group||a.domain===group)&&a.label.includes(query.trim()));
  const uploaded=preview||(!selected&&current?.kind==='upload'?current.url:'');
  const art=selected?artwork(selected):current?.kind==='preset'?artwork(current.key):isSkill?skillArtwork(soul):martialSoulArtwork(soul);
  const upload=async(file:File)=>{
    const session=view.sessionId;setBusy(true);setError('');
    try{const bitmap=await readAppearanceImage(file);bitmap.close();if(controller.getView().sessionId===session){setSource(file);setSelected('');}}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  const save=async(reset=false)=>{
    const session=view.sessionId;setBusy(true);setError('');
    try{
      const image=reset?null:source?{kind:'upload' as const,image:await encodeAppearance(source,'figure')}:selected?{kind:'preset' as const,key:selected}:undefined;
      if(image===undefined||controller.getView().sessionId!==session)return;
      await controller.saveSoulImage(slot,image);
      if(controller.getView().sessionId!==session)return;
      controller.notify(reset?'已恢复自动配图':label+'图片已保存','success');onSaved();
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  return <div className="appearance-editor soul-image-editor">
    <p>{isSkill?'魂技':'第 '+slot+' 武魂'} · {soul.名称||soul.name||'未命名'}。图片随这份旅程保存。</p>
    <div className="appearance-workspace"><section className="appearance-preview-pane">
      <div className="appearance-preview soul-image-preview">{uploaded?<img src={assetUrl(uploaded)} alt={label+'图片预览'}/>:<PortraitImage art={art} name={label+'图片预览'}/>}</div>
      <label className="appearance-upload">上传自己的{label}图片<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/></label>
      <small>PNG、JPG 或 WebP，原图不超过 20 MB。保留整幅比例和透明背景。</small>
      <ModalActions><Button disabled={busy||(!selected&&!source)} onClick={()=>void save()}>{busy?'正在处理…':'使用这张图片'}</Button>
      <Button variant="ghost" disabled={busy||!current} onClick={()=>void save(true)}>恢复自动配图</Button></ModalActions>
      {error&&<p role="alert">{error}</p>}
    </section><section className="appearance-library"><h3>从预设图片中选择</h3>
      <div className="soul-image-filters"><select aria-label={label+'图片分类'} value={group} disabled={busy} onChange={e=>{setGroup(e.target.value);setPage(0)}}><option value="">全部图片</option>{Object.entries(SOUL_IMAGE_GROUPS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><input aria-label={'搜索'+label+'图片'} placeholder="搜索：天使、剑、狼…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></div>
      <div className="appearance-library__grid soul-image-grid">{filtered.slice(page*12,page*12+12).map(item=><button type="button" key={item.key} aria-label={`选择${item.label}图片`} aria-pressed={selected===item.key} disabled={busy} onClick={()=>{setSelected(item.key);setSource(null);setError('')}}><PortraitImage art={item} name={item.label}/><strong>{item.label}</strong></button>)}</div>
      {!filtered.length&&<p>没有找到匹配图片，可以换个分类或上传自己的图片。</p>}
      <footer><Button variant="ghost" disabled={busy||page===0} onClick={()=>setPage(v=>v-1)}>上一页</Button><span>{page+1} / {Math.max(1,Math.ceil(filtered.length/12))}</span><Button variant="ghost" disabled={busy||(page+1)*12>=filtered.length} onClick={()=>setPage(v=>v+1)}>下一页</Button></footer>
    </section></div>
  </div>;
}
