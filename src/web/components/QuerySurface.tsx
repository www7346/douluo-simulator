import type {ReactNode} from 'react';
import QueryStatus from './QueryStatus';

/** Keep the mounted map/camera while a new revision loads; stale controls cannot receive input. */
export default function QuerySurface({query,children}:{query:{loading:boolean;error?:string;retry:()=>void};children:ReactNode}) {
  const pending=query.loading||Boolean(query.error);
  return <><QueryStatus query={query}/><div style={{display:'contents'}} inert={pending||undefined} aria-busy={pending}>{children}</div></>;
}
