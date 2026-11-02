import {checkedStoryEntry} from './story-archive';
import {isPartyTurn} from './story-party-chat';
/** A journal edit is bound to the current revision and a complete frozen old public turn. */
export function checkedArchivedProseOriginal(state:any,input:any){
 const ledger=state.扩展?.story,active=ledger?.active;
 if(input.branchId!==ledger?.branchId||input.turn!==active?.number||active?.status!=='complete')throw Error('请先完成当前行动，再补写旧段正文。');
 const source=checkedStoryEntry(input.original);
 if(source.turn.number>=active.number||source.revision>state.系统.revision||source.turn.privatePersonId||isPartyTurn(source.turn))throw Error('只能补写当前旅程中已完成的旧公开段落。');
 return source;
}
