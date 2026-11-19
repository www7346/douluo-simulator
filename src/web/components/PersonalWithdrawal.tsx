import {useServerQuery} from '../use-game-query';
import {useGame} from '../game-context';
import {Button} from '../components';
export default function PersonalWithdrawal(){
 const {controller,state,view}=useGame(),q=useServerQuery('expedition.personal-withdrawal',{}, {enabled:!!state.角色?.主控单位ID});
 if(!q.data)return null;
 return <section className="field-actions" aria-label="个人撤出远征"><p>你已离开队伍，仍停留在原探索区域。</p><Button disabled={view.busy||!q.data.available} onClick={()=>void controller.dispatch('expedition.withdraw-personally',{agreementId:q.data.agreementId}).catch(()=>undefined)}>自行返回入口</Button>{q.data.reason&&<small>{q.data.reason}</small>}</section>;
}
