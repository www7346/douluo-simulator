import './person-presentation-core.js';
/** Read-only projection shared with the private rules; no execution or mutation. */
export const personPresentation=(globalThis as any).SoulPersonPresentation as {
 presentation:(state:any,id:string,observerId?:string)=>any;
 viewPerson:(state:any,person:any,observerId?:string)=>any;
 viewCarrier:(state:any,id:string,observerId?:string)=>any;
};
