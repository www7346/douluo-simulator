import {useState} from 'react';
import {Button} from '../components';
import {useGameController} from '../game-context';
import {getVersionStatus} from '../offline-support';
import {describeError} from '../error-text';

export default function DiagnosticExportButton({worldId}:{worldId?:string}){
 const controller=useGameController();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async()=>{setBusy(true);setError('');try{
  const json=await controller.exportDiagnostics(worldId,getVersionStatus());
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='斗罗大陆-故障诊断.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){setError(describeError(error));}finally{setBusy(false);}};
 return <><Button variant="secondary" disabled={busy} onClick={()=>void download()}>{busy?'正在收集诊断…':'导出故障诊断'}</Button>{error&&<span role="alert">{error}</span>}</>;
}
