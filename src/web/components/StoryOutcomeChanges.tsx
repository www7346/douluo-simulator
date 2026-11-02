import {storyResourceChanges} from '../../shared/story-result-changes';
import {playerText} from '../../runtime/player-text';
import type {StoryTurn} from '../../runtime/story-turns';
/** Only compares the frozen before/after observations; never runs a settlement. */
export default function StoryOutcomeChanges({turn,state}:{turn:StoryTurn;state:any}){
 const changes=storyResourceChanges(turn).filter(row=>row.field!=='控制命令来源');
 if(!changes.length)return null;
 return <section className="story-outcome-changes" aria-label="本次资源变化"><strong>本次资源变化与收获</strong><ul>{changes.map((row,index)=><li key={index}>{playerText(row.statement,state)}</li>)}</ul></section>;
}
