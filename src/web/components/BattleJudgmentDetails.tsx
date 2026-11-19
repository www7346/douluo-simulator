import {battleAdjudication} from '../../runtime/battle-adjudication';

export default function BattleJudgmentDetails({receipt,state}:{receipt:Record<string,any>;state:any}){
  return <details className="combat-judgment"><summary>查看判定过程</summary><div>
    {battleAdjudication(receipt,state).map((section,index)=><section key={index}>
      <h3>{section.title}</h3><ul>{section.lines.map((line,lineIndex)=><li key={lineIndex}>{line}</li>)}</ul>
    </section>)}
  </div></details>;
}
