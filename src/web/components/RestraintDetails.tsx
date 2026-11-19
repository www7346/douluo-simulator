import type {restraintPresentation} from '../../runtime/restraint-presentation';
export default function RestraintDetails({device}:{device:ReturnType<typeof restraintPresentation>}){
  return <section className="ability-details"><h4>{device.name}</h4><p>{device.conditions}</p>{device.realm?.permanent?<p>魂环绑定 · 永久席位</p>:<><p>最高可限制{device.maxLevel}级人物 · 基础挣脱难度{device.breakDifficulty} · {device.realm?'画境显化器具':device.capture?'可用于捕获':'用于捕获时需搭配其他工具'}{device.autoRelock?' · 可设定时重新锁定':''}</p><dl>{device.modes.map(mode=><div key={mode.id}><dt>{mode.name}</dt><dd>{mode.effects.length?<ul>{mode.effects.map((line,i)=><li key={i}>{line}。</li>)}</ul>:'解除这件器具施加的限制。'}</dd></div>)}</dl></>}</section>;
}
