import {CUES,DEFAULT_SOUND,MUSIC,validateSound,type SoundSettings,type MusicScene,type SoundCue} from './audio-settings';
import {prepareMusicBuffer} from './music-buffer';

type Voice={source:AudioBufferSourceNode;gain:GainNode;scene?:MusicScene};
/** One lazy audio graph for this page. It never changes gameplay or queues old cues. */
export class GameAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private musicBus:GainNode|null=null;
  private effectsBus:GainNode|null=null;
  private settings:SoundSettings={...DEFAULT_SOUND};
  private scene:MusicScene='cultivation';
  private current:Voice|null=null;
  private voices=new Set<Voice>();
  private buffers=new Map<string,Promise<AudioBuffer>>();
  private epoch=0;
  private cueEpoch=0;
  private hidden=false;
  private lastCue=new Map<SoundCue,number>();
  private status='点击页面后开启声音';
  private listeners=new Set<()=>void>();
  private stats={musicStarts:0,cues:0,failures:0};
  constructor(private createContext=()=>new AudioContext(),private request:typeof fetch=(...args)=>fetch(...args)){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)};};
  getStatus=()=>this.status;
  diagnostics=()=>({...this.stats,context:this.context?.state??'unstarted',scene:this.scene,activeMusic:[...this.voices].filter(v=>v.scene).length,activeEffects:[...this.voices].filter(v=>!v.scene).length,bufferCount:this.buffers.size,settings:{...this.settings}});
  private report(message:string){if(this.status===message)return;this.status=message;this.listeners.forEach(fn=>fn());}
  private ready(){return this.context?.state==='running'&&!this.hidden&&!this.settings.muted&&this.settings.master>0;}
  async unlock(){
    try{
      if(!this.context){const c=this.createContext();this.context=c;this.master=c.createGain();this.musicBus=c.createGain();this.effectsBus=c.createGain();this.musicBus.connect(this.master);this.effectsBus.connect(this.master);this.master.connect(c.destination);this.applyVolumes();}
      if(this.hidden)return;
      await this.context.resume();
      this.report(this.settings.muted?'已静音':'声音已开启');
      void this.syncMusic();
    }catch{this.report('声音暂未开启，可点击试听重试');}
  }
  configure(settings:SoundSettings){this.settings=validateSound(settings);this.applyVolumes();if(this.settings.muted||this.settings.master===0){this.stopEffects();this.stopMusic();this.report('已静音');}else {if(this.context)this.report(this.hidden?'已在后台暂停':'声音已开启');void this.syncMusic();}}
  private applyVolumes(){if(!this.context||!this.master||!this.musicBus||!this.effectsBus)return;const t=this.context.currentTime;for(const [node,value] of [[this.master,this.settings.muted?0:this.settings.master/100],[this.musicBus,this.settings.music/100],[this.effectsBus,this.settings.effects/100]] as const){node.gain.cancelScheduledValues(t);node.gain.setTargetAtTime(value,t,.035);}}
  setScene(scene:MusicScene){if(this.scene===scene)return;this.scene=scene;void this.syncMusic();}
  private async buffer(url:string){
    let cached=this.buffers.get(url);if(cached)return cached;
    const context=this.context!;
    cached=(async()=>{const response=await this.request(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('audio unavailable');const decoded=await context.decodeAudioData(await response.arrayBuffer());return Object.values(MUSIC).some(track=>track.url===url)?prepareMusicBuffer(decoded):decoded;})();
    this.buffers.set(url,cached);
    try{return await cached;}catch(error){this.buffers.delete(url);this.stats.failures++;throw error;}
  }
  private voice(buffer:AudioBuffer,bus:GainNode,scene?:MusicScene){const c=this.context!,source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=!!scene;source.connect(gain);gain.connect(bus);const voice={source,gain,scene};this.voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};return voice;}
  private stop(voice:Voice){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);}
  private stopMusic(){this.epoch++;for(const v of this.voices)if(v.scene)this.stop(v);this.current=null;}
  stopEffects(){this.cueEpoch++;for(const v of this.voices)if(!v.scene)this.stop(v);}
  async syncMusic(){
    if(!this.ready()||this.settings.music===0){this.stopMusic();return;}
    if(this.current?.scene===this.scene)return;
    const epoch=++this.epoch,scene=this.scene;
    try{
      const buffer=await this.buffer(MUSIC[scene].url);
      if(epoch!==this.epoch||!this.ready()||this.settings.music===0)return;
      const c=this.context!,next=this.voice(buffer,this.musicBus!,scene),old=this.current;
      // At most one retiring track during a crossfade, even when switching rapidly.
      for(const v of this.voices)if(v.scene&&v!==old&&v!==next)this.stop(v);
      next.gain.gain.setValueAtTime(0,c.currentTime);next.gain.gain.linearRampToValueAtTime(1,c.currentTime+.55);next.source.start();this.current=next;this.stats.musicStarts++;
      if(old){old.gain.gain.cancelScheduledValues(c.currentTime);old.gain.gain.setValueAtTime(old.gain.gain.value,c.currentTime);old.gain.gain.linearRampToValueAtTime(0,c.currentTime+.55);old.source.stop(c.currentTime+.56);}
    }catch{if(epoch===this.epoch)this.report('配乐暂未载入，游玩不受影响；可点击试听重试');}
  }
  async play(cue:SoundCue){
    if(!this.ready()||!this.settings.effects)return;
    const time=performance.now(),previous=this.lastCue.get(cue)??-Infinity;
    if(time-previous<110)return;this.lastCue.set(cue,time);
    const epoch=this.cueEpoch;
    try{const buffer=await this.buffer(`/audio/${cue}.wav`);if(epoch!==this.cueEpoch||!this.ready()||!this.settings.effects||performance.now()-time>650)return;
      const active=[...this.voices].filter(v=>!v.scene);if(active.length>=4)this.stop(active[0]);
      const voice=this.voice(buffer,this.effectsBus!);voice.source.start();this.stats.cues++;
    }catch{/* Optional sound must never interrupt a command. */}
  }
  setHidden(hidden:boolean){this.hidden=hidden;if(hidden){this.stopEffects();this.epoch++;void this.context?.suspend().catch(()=>{});this.report('已在后台暂停');}else if(this.context)void this.unlock();}
  attach(){
    const unlock=(e:Event)=>{if(e.isTrusted)void this.unlock();};
    const click=(e:Event)=>{if(!e.isTrusted)return;const button=(e.target as Element)?.closest?.('button,a.button');if(!button||button.hasAttribute('disabled')||button.getAttribute('aria-disabled')==='true'||button.getAttribute('data-sound')==='none')return;const requested=button.getAttribute('data-sound');void this.play(CUES.includes(requested as SoundCue)?requested as SoundCue:'tap');};
    const visibility=()=>this.setHidden(document.hidden);
    document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);visibility();
    return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);this.stopEffects();this.stopMusic();};
  }
}
export const gameAudio=new GameAudio();
