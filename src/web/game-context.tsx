import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { WebGameController } from './controller';
import {hasChangedHumanBody} from '../shared/generic-human-art';

const GameContext = createContext<WebGameController | null>(null);

export function GameProvider({controller, children}: {controller: WebGameController; children: ReactNode}) {
  return <GameContext.Provider value={controller}>{children}</GameContext.Provider>;
}

export function useGameController(){
  const controller=useContext(GameContext);
  if(!controller)throw new Error('游戏控制器尚未装载');
  return controller;
}

export function useGame() {
  const controller=useGameController();
  const stored=useSyncExternalStore(controller.subscribe,controller.getScreenView,controller.getScreenView);
  const view=useMemo(()=>{
    const state=stored.snapshot.state as any,p=state.人物?.列表?.[state.角色?.主控单位ID],ext=p?.扩展;
    const changed=hasChangedHumanBody(p);
    const avatarUrl=ext?.currentAvatar||ext?.currentFigure||(changed?'':stored.avatarUrl),figureUrl=ext?.currentFigure||(changed?'':stored.figureUrl);
    return avatarUrl===stored.avatarUrl&&figureUrl===stored.figureUrl?stored:{...stored,avatarUrl,figureUrl};
  },[stored]);
  return {controller, view, snapshot: view.snapshot, state: view.snapshot.state as any};
}
