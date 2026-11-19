import type {CSSProperties,InputHTMLAttributes} from 'react';

/** One native, keyboard-accessible slider; its painted track uses the same endpoints as its value. */
export default function RangeInput({min=0,max=100,value=0,className='',style,...props}:InputHTMLAttributes<HTMLInputElement>){
 const low=Number(min),high=Number(max),amount=Number(value);
 const percent=high>low?Math.max(0,Math.min(100,(amount-low)/(high-low)*100)):0;
 return <input {...props} type="range" min={min} max={max} value={value} className={`game-range ${className}`} style={{...style,'--range-fill':`${percent}%`} as CSSProperties}/>;
}
