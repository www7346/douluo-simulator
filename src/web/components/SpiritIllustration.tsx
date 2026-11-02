import {assetUrl} from '../asset-delivery';
import {martialSoulArtwork} from '../../runtime/generated-art';
import {artwork} from '../../runtime/art-catalog';
import {playerSoulImageSlot} from '../../runtime/soul-images';
import {useGame} from '../game-context';
import {PortraitImage} from './PortraitArt';

export default function SpiritIllustration({soul,slot,className=''}:{soul:any;slot?:string;className?:string}){
 const {state,view}=useGame();
 const image=view.soulImages[slot??playerSoulImageSlot(state,soul.id)],name=soul.name??soul.名称??'武魂';
 if(image?.kind==='upload')return <img src={assetUrl(image.url)} alt={name} className={`portrait-art spirit-upload ${className}`}/>;
 return <PortraitImage art={image?.kind==='preset'?artwork(image.key):martialSoulArtwork(soul)} name={name} className={className}/>;
}
