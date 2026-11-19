import {Button} from '../components';
import {useGame} from '../game-context';

export default function ConnectionNotice({onOpenSaves}:{onOpenSaves:()=>void}){
  const {view,controller}=useGame();
  if(!view.connectionError)return null;
  return <div className="model-task connection-notice" role="alert">
    <span>{view.connectionError}</span>
    <Button disabled={!controller.canReconnect()} onClick={()=>void controller.reconnect()}>{view.reconnecting?'正在重新连接…':'重新连接'}</Button>
    <Button variant="ghost" onClick={onOpenSaves}>打开本机存档</Button>
  </div>;
}
