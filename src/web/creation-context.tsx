import {createContext,useContext,type ReactNode} from 'react';
import {useServerQuery} from './use-game-query';

const CatalogContext=createContext<Record<string,any>|null>(null);
export function CreationCatalog({value,children}:{value:Record<string,any>;children:ReactNode}){return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;}
export function useCreationCatalog(){const value=useContext(CatalogContext);if(!value)throw new Error('觉醒资料尚未读取');return value;}
export function useCreationPreview(config:Record<string,any>,enabled=true){
  return useServerQuery<any>('creation.preview',{config},{delay:120,keepPrevious:true,enabled});
}
