import './story-action-choices.css';

export default function StoryActionChoices({options,draft,disabled,onChoose}:{options:string[];draft:string;disabled:boolean;onChoose:(text:string)=>void}){
 return <section className="story-action-choices" aria-label="选择下一步行动">
  <div className="story-action-choices__heading"><h3>接下来，做什么？</h3><span>点选填入输入框，可继续修改</span></div>
  <div className="story-action-choices__grid">
   {options.map((text,index)=><button key={index} type="button" className="story-action-choice" aria-pressed={draft===text} aria-controls="story-input" disabled={disabled} onClick={()=>onChoose(text)}>
    <span className="story-action-choice__number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
    <span className="story-action-choice__text">{text}</span>
    <span className="story-action-choice__mark" aria-hidden="true">{draft===text?'✓':'↗'}</span>
   </button>)}
  </div>
 </section>;
}
