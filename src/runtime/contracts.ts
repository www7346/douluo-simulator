export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export function isAutomaticBattleCommand(type:string):type is 'battle.auto-step'|'battle.auto-until-player'{
  return type==='battle.auto-step'||type==='battle.auto-until-player';
}

export interface GameCommand<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: string;
  expectedRevision: number;
  payload: TPayload;
}

export interface GameEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  commandId: string;
  revision: number;
  type: string;
  occurredAt: string;
  summary: string;
  payload: TPayload;
  sequence?: number;
  audienceIds?: string[];
  parentEventId?: string;
  battleView?: {before:import('./player-presentation').BattleViewFrame;after:import('./player-presentation').BattleViewFrame};
}

export interface GameSnapshot<TState = unknown> {
  schemaVersion: 19;
  rulesetVersion: string;
  revision: number;
  savedAt: string;
  state: TState;
}

export interface TransactionResult<TState = unknown> {
  snapshot: GameSnapshot<TState>;
  events: GameEvent[];
  idempotent: boolean;
}

export class CommandRejectedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CommandRejectedError';
    this.code = code;
  }
}
