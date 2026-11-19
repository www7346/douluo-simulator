import type {PortraitArt} from '../runtime/visual-identity';

/** Crop coordinates refer to the original image, not a guessed equal-cell grid. */
export function portraitGeometry(art:PortraitArt){
 const inset=art.inset??0;
 const crop=art.crop??{x:(art.cell%art.columns+inset)/art.columns,y:(Math.floor(art.cell/art.columns)+inset)/art.rows,width:(1-inset*2)/art.columns,height:(1-inset*2)/art.rows};
 const aspect=art.sourceAspect??art.columns/art.rows;
 const width=crop.width*aspect,height=crop.height,side=Math.max(width,height);
 const x=(side-width)/2,y=(side-height)/2;
 return {viewBox:`0 0 ${side} ${side}`,clip:{x,y,width,height},image:{x:x-crop.x*aspect,y:y-crop.y,width:aspect,height:1}};
}
