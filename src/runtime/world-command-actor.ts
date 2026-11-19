import {CommandRejectedError} from './contracts';

/** Player commands and their previews use the same actor authority. */
export function assertWorldCommandActor(state:any,intent:Record<string,unknown>) {
  for(const key of ['actorId','entityId'])if(intent[key]&&intent[key]!==state.角色.主控单位ID)throw new CommandRejectedError('command-actor','不能直接替其他人物执行个人操作');
}
