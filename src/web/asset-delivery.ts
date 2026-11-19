import type {PortraitArt} from '../runtime/visual-identity';

interface AssetManifest {images:Record<string,string>;portraits:Record<string,string>}
declare const __WEB_ART_MANIFEST__:AssetManifest|undefined;
const manifest:AssetManifest=typeof __WEB_ART_MANIFEST__==='undefined'?{images:{},portraits:{}}:__WEB_ART_MANIFEST__!;
/** Logical artwork IDs remain unchanged, including reviewed portrait crop lookup. */
export function assetUrl(source:string):string{return manifest.images[source]??source;}
export function portraitAssetKey(art:PortraitArt):string {
  const pad=art.inset??0,crop=art.crop??{x:(art.cell%art.columns+pad)/art.columns,y:(Math.floor(art.cell/art.columns)+pad)/art.rows,width:(1-pad*2)/art.columns,height:(1-pad*2)/art.rows};
  return art.src+'#'+[crop.x,crop.y,crop.width,crop.height].map(n=>Number(n.toFixed(8))).join(',');
}
export function portraitAsset(art:PortraitArt):string|undefined{return manifest.portraits[portraitAssetKey(art)];}
