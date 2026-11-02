import {battleAftermathCommand} from '../runtime/journey-status';
import {hasPendingBattleControl} from '../shared/person-cooperation';
import {describeError} from './error-text';

interface BattleHost {
  state(): any;
  command(type: string, payload?: Record<string, unknown>, interactive?: boolean, takeover?: AbortSignal): Promise<unknown>;
  work(delta: number): void;
  error(battleId: string, message: string): void;
}

type Flight = {kind: 'opponents' | 'automatic' | 'pause'; done: Promise<void>};

// A session owns one runner. Replacing the session retires it before any new
// snapshot becomes visible. The current durable command can finish on its owner.
export class BattleProgression {
  #flight: Flight | null = null;
  #retired = false;
  #batch?: AbortController;
  paused = false;

  constructor(private host: BattleHost) {}

  get running(){return this.#flight?.done;}
  get automatic(){return this.#flight?.kind === 'automatic' ? this.#flight.done : undefined;}
  retire(){this.#retired = true; this.paused = true; this.#batch?.abort();}

  #start(kind: Flight['kind'], run: () => Promise<void>): Promise<void> {
    if(this.#retired)return Promise.resolve();
    if(this.#flight)return this.#flight.done;
    // Publish ownership before callbacks notify UI subscribers synchronously.
    const done = Promise.resolve().then(() => {
      if(!this.#retired)return run();
    }).finally(() => {
      if(this.#flight?.done === done)this.#flight = null;
    });
    this.#flight = {kind, done};
    return done;
  }

  opponents(decide?: () => Promise<unknown>, story = false): Promise<void> {
    const battleId = this.host.state().战斗?.id;
    return this.#start('opponents', async () => {
      for(let step = 0; step < 48 && !this.#retired; step++){
        const state = this.host.state(), battle = state.战斗;
        if(battle?.id !== battleId || battle?.状态 !== '进行中')return;
        const actor = battle.当前行动单位ID;
        if(!actor)return;
        const controlled = hasPendingBattleControl(state, actor);
        if(battle.扩展?.成员?.[actor]?.controller === 'player' && !controlled)return;
        if(!decide || controlled){
          await this.host.command('battle.auto-until-player', story ? {limit:48} : {}, !story);
          if(!decide)return;
        }else{
          await decide();
        }
      }
      if(!this.#retired)throw Error('对手行动暂时无法继续，请返回战场重试。');
    });
  }

  async advance(): Promise<void> {
    if(this.#retired)return;
    const battleId = this.host.state().战斗?.id;
    while(this.#flight){
      if(this.#flight.kind === 'automatic')return this.#flight.done;
      await this.#flight.done;
      if(this.#retired || this.host.state().战斗?.id !== battleId)return;
    }
    return this.#start('automatic', async () => {
      this.host.work(1);
      try{
        while(!this.#retired){
          const state = this.host.state(), battle = state.战斗;
          if(!battle || battle.id !== battleId)return;
          if(battle.状态 !== '进行中'){
            const aftermath = battleAftermathCommand(state);
            if(aftermath)await this.host.command(aftermath);
            return;
          }
          if(!battle.扩展?.automation?.enabled)return;
          if(this.paused){await this.host.command('battle.set-automatic', {enabled:false});return;}
          const continuation = state.扩展?.story?.active?.continuation;
          const pointed = continuation?.battleId === battleId && continuation.plan.segments[continuation.nextStep]?.action.kind === 'battle-action';
          if(pointed && battle.当前行动单位ID === state.角色.主控单位ID)return;
          const prior = Object.keys(battle.扩展.已结算行动).length;
          this.#batch = new AbortController();
          try{
            await this.host.command(pointed ? 'battle.auto-until-player' : 'battle.auto-step',
              {limit:pointed ? 48 : 8}, false, this.#batch.signal);
          }finally{this.#batch = undefined;}
          if(this.#retired)return;
          const next = this.host.state().战斗;
          if(next?.id !== battleId)return;
          if(this.paused)continue;
          if(next.状态 === '进行中' && Object.keys(next.扩展.已结算行动).length === prior){
            await this.host.command('battle.set-automatic', {enabled:false});
            if(!this.#retired)this.host.error(battleId, '交战已暂停，请处理当前待办后继续。');
            return;
          }
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
      }catch(error){
        if(!this.#retired && this.host.state().战斗?.id === battleId)this.host.error(battleId, describeError(error));
        throw error;
      }finally{this.host.work(-1);}
    });
  }

  async pause(): Promise<void> {
    this.paused = true;
    this.#batch?.abort();
    const battleId = this.host.state().战斗?.id;
    await this.running;
    if(this.#retired)return;
    const battle = this.host.state().战斗;
    if(battle?.id === battleId && battle?.状态 === '进行中' && (battle.扩展?.automation?.enabled || battle.扩展?.automation?.waitingStoryTurn)){
      await this.#start('pause', () => this.host.command('battle.set-automatic', {enabled:false}).then(() => {}));
    }
  }
}
