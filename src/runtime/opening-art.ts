import type {OpeningSceneFacts} from './opening-scene';

/** Illustration variants follow the recorded opening outfit, never a displayed name. */
export function openingCatFigure(facts:Pick<OpeningSceneFacts,'devices'>):string{
 const bound=facts.devices.some(device=>device.templateId==='rope'&&device.mode==='locked'&&device.binding?.part==='全身'&&device.binding.pose==='身前');
 return '/art/opening-figures-v2/cat-'+(bound?'bound':'free')+'.webp';
}
