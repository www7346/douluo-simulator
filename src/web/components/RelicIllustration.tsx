import {itemArtwork} from '../../runtime/generated-art';
import {PortraitImage} from './PortraitArt';

/** All inventory surfaces pass the actual item; names only provide accessible text. */
export default function RelicIllustration({kind,name='',large=false,item}:{kind:string;name?:string;large?:boolean;item?:any}) {
 return <PortraitImage art={itemArtwork(item,kind)} name={name||kind} className={`relic-art generated-art${large?' relic-art--large':''}`}/>;
}
