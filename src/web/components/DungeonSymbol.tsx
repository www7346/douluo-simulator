import {assetUrl} from '../asset-delivery';
export type DungeonSymbolKind='普通战斗'|'精英战斗'|'首领战斗'|'宝箱'|'火堆'|'completed'|'escape';

// Optical crops of one painted sheet; shared by route nodes, legend and room actions.
const crops:Record<Exclude<DungeonSymbolKind,'completed'>,string>={
 '普通战斗':'76 76 398 398',
 '精英战斗':'562 68 412 412',
 '首领战斗':'1064 60 410 410',
 '火堆':'64 524 420 420',
 '宝箱':'562 540 412 412',
 escape:'1080 530 410 410',
};
export default function DungeonSymbol({kind,className=''}:{kind:DungeonSymbolKind;className?:string}){
 if(kind==='completed')return <svg className={`dungeon-symbol dungeon-symbol--check ${className}`} viewBox="0 0 48 50" aria-hidden="true" focusable="false"><path d="M6 23 17 32 40 9 43 12 18 41 3 27Z"/></svg>;
 return <svg className={`dungeon-symbol dungeon-symbol--painted ${className}`} viewBox={crops[kind]} aria-hidden="true" focusable="false"><image href={assetUrl("/art/fantasy-v4/dungeon-emblems-v2.png")} width="1536" height="1024"/></svg>;
}

export function DungeonShortcutSymbol({kind}:{kind:string}){
 const path=kind==='person'?'M24 3 32 9 31 22 27 28 21 28 17 22 16 9ZM19 12 24 15 29 12 27 20 24 24 21 20ZM13 20 18 30 24 35 30 30 35 20 44 26 40 39 31 43 24 40 17 43 8 39 4 26ZM15 29 12 37 20 39 19 34ZM33 29 29 34 28 39 36 37Z':
  kind==='ring'?'M21 2H27L29 8 35 11 41 10 45 17 40 22V27L45 31 41 38 35 37 29 40 27 46H21L19 40 13 37 7 38 3 31 8 27V22L3 17 7 10 13 11 19 8ZM24 10A14 14 0 1 0 24 38 14 14 0 1 0 24 10ZM24 14 32 24 24 34 16 24ZM24 18 20 24 24 29 28 24Z':
  kind==='bag'?'M17 5C17 1 31 1 31 5V11H40L44 20 41 43H7L4 20 8 11H17ZM20 6V11H28V6ZM9 14 7 21 20 26V22H28V26L41 21 38 14ZM10 25 11 39H37L39 25 29 29V33H19V29ZM22 24V30H26V24ZM11 16H14V22H11ZM34 16H37V22H34Z':
  'M25 2C21 12 35 14 33 24 31 32 21 34 17 29 24 31 29 26 26 22 23 19 18 17 18 11 18 6 21 3 25 2ZM35 8C46 17 46 31 35 35 36 27 43 25 35 8ZM11 12C13 22 6 23 9 32 3 29 1 19 11 12ZM15 32C23 38 31 38 38 30L42 37 35 44 27 40 24 46 20 40 13 44 5 37 10 32ZM15 36 13 39 19 37ZM29 38 35 40 35 36Z';
 return <svg className="dungeon-shortcut-symbol" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d={path} fill="currentColor" fillRule="evenodd"/></svg>;
}
