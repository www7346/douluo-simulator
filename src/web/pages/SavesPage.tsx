import {downloadPrepared,downloadJson} from '../file-transfer';
import {inspectSave,importSummary} from '../save-import';
import type {FullSaveBundle} from '../../shared/save-bundle';
import DiagnosticExportButton from '../components/DiagnosticExportButton';
import {assetUrl} from '../asset-delivery';
import {playReturnRoute} from '../../runtime/play-scene';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ActionSection,Button,Modal,Panel} from '../components';
import {useGame} from '../game-context';
import {describeError} from '../error-text';
import {journeyAction} from '../scene-navigation';
import type {SaveListing} from '../../runtime/save-parts';
import type {PageId} from '../App';
const saveImage=(record?:SaveListing)=>/forest|grove|jungle/.test(record?.locationId??'')?'/art/fantasy-v3/forest.png':'/art/fantasy-v3/garden.png';

export default function SavesPage({onNavigate}:{onNavigate:(page:PageId)=>void}) {
  const {controller,view,state}=useGame();
  const [profiles,setProfiles]=useState<SaveListing[]>([]),[slots,setSlots]=useState<SaveListing[]>([]),[backups,setBackups]=useState<SaveListing[]>([]);
  const [message,setMessage]=useState('每次行动完成后自动保存，也可随时保存到手动存档位。');
  const [pending,setPending]=useState(false);
  const [rejectedResults,setRejectedResults]=useState(0);
  const [confirm,setConfirm]=useState<{title:string;body:string;action:()=>Promise<void>}|null>(null);
  const [importOpen,setImportOpen]=useState(false),[importText,setImportText]=useState(''),[importFile,setImportFile]=useState(''),[readingFile,setReadingFile]=useState(false);
  const [preview,setPreview]=useState<FullSaveBundle|null>(null);
  const importAttempt=useRef(0),importRead=useRef<AbortController|null>(null);
  useEffect(()=>()=>{importAttempt.current++;importRead.current?.abort();},[]);
  const closeImport=()=>{importRead.current?.abort();importAttempt.current++;setReadingFile(false);setImportText('');setImportFile('');setPreview(null);setImportOpen(false);};
  const inspect=async(input:File|string)=>{importRead.current?.abort();const abort=new AbortController();importRead.current=abort;const attempt=++importAttempt.current;setPreview(null);if(typeof input!=='string'){setImportText('');setImportFile(input.name);}setReadingFile(true);setMessage('正在读取存档…');try{const bundle=await inspectSave(input,abort.signal);if(attempt!==importAttempt.current)return;setPreview(bundle);setMessage('已核对文件，可以导入为新世界。');}catch(error){if(attempt===importAttempt.current)setMessage(describeError(error));}finally{if(attempt===importAttempt.current)setReadingFile(false);}};
  const refresh=useCallback(async()=>{const data=await controller.saveMenu();setProfiles(data.profiles);setSlots(data.slots);setBackups(data.backups);setRejectedResults(data.rejectedResults);},[controller]);
  useEffect(()=>{void refresh().catch(e=>setMessage(describeError(e)));},[refresh,view.profileId,view.sessionId,view.snapshot.revision]);
  const run=async(action:()=>Promise<void>,success='操作完成')=>{setPending(true);try{await action();await refresh();setConfirm(null);setMessage(success);}catch(e){setMessage(describeError(e));}finally{setPending(false);}};
  const resume=()=>onNavigate(journeyAction(controller.getView().snapshot.state).page);
  const load=async(record:SaveListing)=>{if(record.slotId===view.profileId)await controller.switchProfile(record.slotId);else await controller.loadSlot(record.slotId);resume();};
  const exportRead=useRef<AbortController|null>(null);
  useEffect(()=>()=>exportRead.current?.abort(),[]);
  const download=async(slotId:string)=>{
    exportRead.current?.abort();
    const abort=new AbortController();exportRead.current=abort;
    const label=profiles.find(profile=>profile.slotId===slotId)?.label??view.profileLabel;
    try{const file=await controller.exportSaveFile(slotId,`斗罗大陆-${label}.json`,abort.signal);abort.signal.throwIfAborted();downloadPrepared(file);}
    finally{if(exportRead.current===abort)exportRead.current=null;}
  };
  const busy=pending||view.busy,localBusy=pending,auto=slots.find(s=>s.slotId===view.profileId);
  const manualIds=[1,2,3].map(i=>`${view.profileId}:manual:${i}`);
  const world=profiles.find(profile=>profile.slotId===view.profileId);
  const removeWorld=(record:SaveListing)=>setConfirm({title:'删除整个世界',body:`将永久删除“${record.label}”中的角色、全部手动与自动存档、草稿及恢复备份。其他世界不受影响。`,action:()=>controller.deleteWorld(record.slotId)});
  const remove=(record:SaveListing)=>setConfirm({title:record.slotId===view.profileId?'删除自动存档':'删除存档',body:`将删除“${record.slotId===view.profileId?'自动存档':record.label}”及其恢复备份。其他存档位置会保留，此操作无法撤销。`,action:()=>controller.deleteSave(record.slotId)});
  return <div className="menu-page saves-page"><div className="menu-page__top"><Button variant="ghost" onClick={()=>onNavigate('home')}>← 返回首页</Button>{state?.角色?.主控单位ID&&<Button variant="ghost" onClick={()=>{location.hash=playReturnRoute(state,location.hash);}}>返回旅程</Button>}<Button variant="ghost" onClick={()=>onNavigate('system')}>设置</Button></div><section className="page-heading"><span className="eyebrow">保存你的冒险故事</span><h1>读取存档</h1></section>
    {view.loadError&&<p className="diagnostic-message" role="alert">{view.loadError}</p>}
    <p className="diagnostic-message" role="status">{message}</p>{rejectedResults>0&&<p className="diagnostic-message"><Button variant="ghost" disabled={localBusy} onClick={()=>void run(async()=>{await downloadJson(await controller.exportRejectedResults(),'斗罗大陆-未采用的结果.json');},'未采用的结果已导出')}>导出未采用的结果（{rejectedResults}）</Button></p>}<div className="save-browser">
    <aside className="world-list" aria-label="世界列表"><h2>世界</h2>{profiles.map(profile=><div key={profile.slotId}><button className={view.profileId===profile.slotId?'world-choice is-active':'world-choice'} disabled={busy||!profile.current} onClick={()=>void run(()=>controller.switchProfile(profile.slotId),'已选择世界，可读取下方存档')}><img src={assetUrl(saveImage(profile))} alt=""/><strong>{profile.label}</strong><span>{profile.summary}</span>{!profile.current&&<small>旧版 · 仅可查看和导出备份</small>}<small>{view.profileId===profile.slotId?'当前世界':new Date(profile.updatedAt).toLocaleString()}</small></button><Button variant="ghost" disabled={localBusy||profile.autosaveEmpty&&profile.current} onClick={()=>void run(()=>download(profile.slotId),'该世界本地存档已导出')}>导出这个世界</Button><DiagnosticExportButton worldId={profile.slotId}/><Button variant="danger" aria-label={`删除世界：${profile.label}`} disabled={busy} onClick={()=>removeWorld(profile)}>删除这个世界</Button></div>)}{!profiles.length&&<p>还没有故事。回到首页开启你的第一段旅程。</p>}<Button variant="secondary" onClick={()=>onNavigate('home')}>开启新的故事</Button></aside>
    <div><Panel title={world?.label ?? '选择一个世界'} eyebrow="世界内的存档" actions={world&&<Button variant="danger" disabled={busy} onClick={()=>removeWorld(world)}>删除世界</Button>}>
      {world?<div className="save-position-grid" role="group" aria-label="所选世界的存档">
        <article className="save-position save-position--auto"><img src={assetUrl(saveImage(auto))} alt=""/><small>自动存档</small><h3>{auto?auto.summary:'空存档'}</h3><p>{auto&&!auto.autosaveEmpty?new Date(auto.updatedAt).toLocaleString():'行动完成后自动保存'}</p><div className="field-actions"><Button disabled={busy||!auto||auto.autosaveEmpty} onClick={()=>auto&&void run(()=>load(auto))}>读取自动存档</Button><Button variant="ghost" disabled={busy||!auto||auto.autosaveEmpty} onClick={()=>auto&&remove(auto)}>删除</Button></div></article>
        {manualIds.map((id,index)=>{const record=slots.find(s=>s.slotId===id);return <article key={id} className="save-position" data-testid={`manual-position-${index+1}`}><img src={assetUrl(saveImage(record))} alt="" className={record?'':'is-empty'}/><small>手动存档 {index+1}</small><h3>{record?record.summary:'空存档位'}</h3><p>{record?new Date(record.updatedAt).toLocaleString():'将当前旅程保存在这里'}</p><div className="field-actions"><Button disabled={busy||!auto||auto.autosaveEmpty} onClick={()=>record?setConfirm({title:'覆盖手动存档',body:`用当前进度替换手动存档 ${index+1}。`,action:()=>controller.saveManualSlot(index+1)}):void run(()=>controller.saveManualSlot(index+1),'手动存档已保存')}>{record?'覆盖':'保存'}</Button><Button variant="secondary" disabled={busy||!record} onClick={()=>record&&void run(()=>load(record))}>读取</Button><Button variant="ghost" disabled={busy||!record} onClick={()=>record&&remove(record)}>删除</Button></div></article>;})}
      </div>:<p>请先选择一个世界，再查看其中的存档。</p>}
    </Panel>
    <Panel title="备份与导入"><div className="field-actions">{world&&<Button variant="secondary" disabled={localBusy||!auto||auto.autosaveEmpty} onClick={()=>void run(()=>download(view.profileId),'完整存档已导出')}>导出完整存档</Button>}<Button variant="ghost" disabled={busy} onClick={()=>setImportOpen(true)}>导入存档</Button></div><p className="muted">旅程保存在这台设备上，换设备前请先导出完整存档。较大的文件会无损压缩，可直接在这里导入。</p>{world&&<ActionSection title={<>恢复备份（{backups.length}）</>}><div className="save-list">{backups.map(record=><article key={record.id}><span><b>{record.recoveryLabel ?? '近期进度'}</b><small>{record.summary} · {new Date(record.createdAt!).toLocaleString()}</small></span><Button variant="ghost" disabled={busy} onClick={()=>void run(async()=>{await controller.restoreBackup(record.id!);resume();})}>恢复</Button></article>)}</div></ActionSection>}</Panel></div></div>
    <Modal open={!!confirm} title={confirm?.title ?? ''} onClose={()=>{if(!pending)setConfirm(null);}} actions={<><Button variant="ghost" disabled={pending} onClick={()=>setConfirm(null)}>取消</Button><Button variant="danger" disabled={pending} onClick={()=>confirm&&void run(confirm.action,`${confirm.title}完成`)}>确认{confirm?.title}</Button></>}><p>{confirm?.body}</p>{pending&&<p role="status">正在处理…</p>}</Modal>
    <Modal open={importOpen} title="导入完整存档" onClose={()=>{if(!pending)closeImport();}} actions={<><Button variant="ghost" disabled={pending} onClick={closeImport}>取消</Button><Button disabled={pending||readingFile||(!preview&&!importText.trim())} onClick={()=>preview?void run(async()=>{await controller.importAsNewWorld(preview);closeImport();},'已导入新世界'):void inspect(importText)}>{preview?'确认导入':'核对存档'}</Button></>}><p>导入后会在世界列表中新增一项。{preview&&<strong className="import-summary"> {importSummary(preview)}</strong>}</p><label>选择存档文件<input type="file" disabled={pending} accept="application/json,application/gzip,.json,.json.gz,.gz" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void inspect(file);}}/></label>{importFile?<p>已选择：{importFile} <Button variant="ghost" disabled={pending||readingFile} onClick={()=>{importAttempt.current++;setPreview(null);setImportFile('');setImportText('');}}>改用粘贴内容</Button></p>:<textarea className="import-area" aria-label="存档内容" disabled={pending||readingFile} value={importText} onChange={e=>{setPreview(null);setImportText(e.target.value);}} placeholder="或粘贴完整存档内容"/>}<p role="status">{message}</p></Modal>
  </div>;
}
