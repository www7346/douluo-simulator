export interface ModelTaskView { id: string; label: string; startedAt: number;phase?:string }

export class TaskCancelledError extends Error {
  constructor(message = '本次构思已取消，已有进度仍保留') {
    super(message);
    this.name = 'TaskCancelledError';
  }
}

/** Stop observing this page without cancelling the owned remote generation. */
export class ModelObservationDetachedError extends TaskCancelledError {
  constructor(){super('已保留原任务，可重新连接后继续取回');this.name='ModelObservationDetachedError';}
}
export const isModelObservationDetached=(error:unknown)=>error instanceof ModelObservationDetachedError||(error as any)?.name==='ModelObservationDetachedError';

export const isTaskCancelled = (error: unknown) => error instanceof TaskCancelledError
  || (error as {kind?: string})?.kind === 'cancelled'||(error as {code?:string})?.code==='cancelled';

/** A single player-visible task owns its context and signal until settled. */
export class ModelTaskRunner {
  #active: {view: ModelTaskView; abort: AbortController} | null = null;
  constructor(private readonly onChange: (task: ModelTaskView | null) => void) {}

  progress(phase:string):void {if(this.#active){this.#active.view={...this.#active.view,phase};this.onChange(this.#active.view);}}

  cancel(expectedId?:string,reason?:unknown): void {
    const task = this.#active;
    if (!task||expectedId&&task.view.id!==expectedId) return;
    this.#active = null;
    task.abort.abort(reason);
    this.onChange(null);
  }

  detach(expectedId?:string):void {this.cancel(expectedId,new ModelObservationDetachedError());}

  async run<T>(label: string, currentContext: () => string, request: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.#active) throw new Error('已有一项构思正在进行，请等待完成或先取消');
    const context = currentContext();
    const task = {view:{id:crypto.randomUUID(),label,startedAt:Date.now()},abort:new AbortController()};
    this.#active = task;
    this.onChange(task.view);
    let onAbort = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(isModelObservationDetached(task.abort.signal.reason)?task.abort.signal.reason:new TaskCancelledError());
      task.abort.signal.addEventListener('abort',onAbort,{once:true});
    });
    try {
      const result = await Promise.race([request(task.abort.signal),cancelled]);
      if (task.abort.signal.aborted || this.#active !== task || context !== currentContext()) {
        throw new TaskCancelledError('当前旅程已变化，请继续当前进度');
      }
      return result;
    } finally {
      task.abort.signal.removeEventListener('abort',onAbort);
      if (this.#active === task) { this.#active = null; this.onChange(null); }
    }
  }
}
