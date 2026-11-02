import {CollarMark,type CollarAppearance} from './BoundPortrait';
import {assetUrl} from '../asset-delivery';
import type {PortraitArt} from '../../runtime/visual-identity';
import {Avatar} from '../components';
import {PortraitImage} from './PortraitArt';
import {figurePortrait} from '../figure-portraits';

/** Small battle portraits share one source order and one centered crop. */
export default function BattleUnitPortrait({name,avatarUrl='',portrait,figure,appearance}:{appearance?:CollarAppearance|null;name:string;avatarUrl?:string;portrait?:PortraitArt|null;figure?:string|PortraitArt|null}) {
 const head=typeof figure==='string'?figurePortrait(figure):null;
 // Only explicitly reviewed figure crops replace atlas art. Uploaded avatars still win.
 const art=head??portrait;
 return <span className="battle-unit-portrait">{avatarUrl?<img className="battle-unit-portrait__avatar" src={assetUrl(avatarUrl)} alt={name}/>:art?<PortraitImage art={art} name={name} fit="slice"/>:typeof figure==='string'?<img className="battle-unit-portrait__fallback" src={assetUrl(figure)} alt={name}/>:figure?<PortraitImage art={figure} name={name} fit="slice"/>:<Avatar name={name}/>} {appearance&&<CollarMark appearance={appearance}/>}</span>;
}
