import {useState} from 'react';
import {Button} from '../components';
import {useGameController} from '../game-context';
import {getVersionStatus} from '../offline-support';
import {describeError} from '../error-text';
import {downloadPlainJson} from '../file-transfer';

export default function DiagnosticExportButton({worldId}:{worldId?:string}){
 const controller=useGameController();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async()=>{setBusy(true);setError('');try{
  const json=await controller.exportDiagnostics(worldId,getVersionStatus());
  await downloadPlainJson(json,'斗罗大陆-故障诊断.json');
 }catch(error){setError(describeError(error));}finally{setBusy(false);}};
 return <><Button variant="secondary" disabled={busy} onClick={()=>void download()}>{busy?'正在收集诊断…':'导出故障诊断'}</Button>{error&&<span role="alert">{error}</span>}</>;
}
