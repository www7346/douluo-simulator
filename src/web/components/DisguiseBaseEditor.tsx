export default function DisguiseBaseEditor({value,onChange,disabled=false}:{value:any;onChange:(value:any)=>void;disabled?:boolean}){
 const mask=value.伪装模板,change=(patch:any)=>onChange({...value,...patch}),appearance=(patch:any)=>change({伪装模板:{...mask,...patch}});
 const option=(key:string,label:string,templateKey?:string)=> <label className="toggle-row"><input type="checkbox" checked={!!value[key]} disabled={disabled} onChange={event=>{
  const enabled=event.target.checked,next={...mask};if(templateKey){if(enabled)next[templateKey]=next[templateKey]??(templateKey==='声音'?'与原本不同的声线。':'朦胧的武魂轮廓。');else delete next[templateKey];}
  change({[key]:enabled,伪装模板:next});
 }}/>{label}</label>;
 return <div className="disguise-base-editor" aria-label="伪装本能设定">
  <p>改变仪容与对外形象，实际身体、属性和武魂保持原状。变更用途会按完整效果重新计价。</p>
  <label>伪装方式<select value={value.伪装方式} disabled={disabled} onChange={event=>change({伪装方式:event.target.value})}><option value="幻象">幻象伪装</option><option value="高级拟态">高级拟态</option></select></label>
  <label>对外称呼<input value={mask.公开名??''} disabled={disabled} maxLength={180} onChange={event=>{const next={...mask};if(event.target.value.trim())next.公开名=event.target.value;else delete next.公开名;change({伪装模板:next});}}/></label>
  <label>外貌性别<select value={mask.公开性别??'不变'} disabled={disabled} onChange={event=>appearance({公开性别:event.target.value})}><option value="不变">沿用当前性别仪容</option><option value="男">男性仪容</option><option value="女">女性仪容</option></select></label>
  <label>外貌描述<textarea value={mask.外貌} maxLength={1200} disabled={disabled} onChange={event=>appearance({外貌:event.target.value})}/></label>
  <label>持续分钟<input type="number" min={1} max={10080} value={value.持续分钟} disabled={disabled} onChange={event=>change({持续方式:'世界分钟',持续分钟:Number(event.target.value)})}/></label>
  {option('掩饰声音','掩饰声线','声音')}{value.掩饰声音&&<label>声线描述<input value={mask.声音??''} disabled={disabled} maxLength={1200} onChange={event=>appearance({声音:event.target.value})}/></label>}
  {option('掩饰魂息','掩饰魂力气息')}{option('武魂伪装','伪装武魂表象','武魂表象')}
  {value.武魂伪装&&<label>对外武魂表象<input value={mask.武魂表象??''} disabled={disabled} maxLength={1200} onChange={event=>appearance({武魂表象:event.target.value})}/></label>}
 </div>;
}
