import {playerDescription} from '../../runtime/player-copy';
export default function RingLore({lore}:{lore:any}) {
 if(!lore)return null;
 return <section className="ring-lore"><p>{playerDescription(lore.description)}</p><dl className="relic-facts"><div><dt>来源</dt><dd>{lore.origin}</dd></div><div><dt>年限</dt><dd>{lore.years} 年</dd></div><div><dt>属性</dt><dd>{lore.attributes.length?lore.attributes.join('、'):lore.attuned?'随所选武魂契合':'尚未显露'}</dd></div><div><dt>能力方向</dt><dd>{lore.channels.length?lore.channels.join('、'):lore.attuned?'随所选武魂显现':'尚未显露'}</dd></div></dl><p className="muted">这些是魂环蕴藏的力量方向；吸收后获得的魂技，以你选定的领悟为准。</p></section>;
}
