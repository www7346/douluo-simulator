import type {ModelProfile} from './model-gateway';

/** Request-only projection: saved preset alternatives and editor provenance are not execution inputs. */
export function modelTransportProfile(profile:ModelProfile):ModelProfile {
 const {globalPromptPreset:_saved,...active}=profile;
 return {...active,...(profile.globalPrompts?{globalPrompts:profile.globalPrompts.map(({source:_source,...part})=>part)}:{}),
  ...(profile.writer?{writer:modelTransportProfile(profile.writer as ModelProfile)}:{})};
}
