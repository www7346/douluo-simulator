/** Balance recordings once after decoding; soften the loop boundary without changing tempo. */
export function prepareMusicBuffer(buffer:AudioBuffer){
  let energy=0,peak=0,count=0;
  for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const samples=buffer.getChannelData(channel);count+=samples.length;
    for(const value of samples){energy+=value*value;peak=Math.max(peak,Math.abs(value));}
  }
  if(!peak||!count)return buffer;
  const gain=Math.min(.11/Math.sqrt(energy/count),.85/peak);
  for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const samples=buffer.getChannelData(channel),edge=Math.min(Math.round(buffer.sampleRate*.008),Math.floor(samples.length/2));
    for(let i=0;i<samples.length;i++)samples[i]*=gain*Math.min(1,i/Math.max(1,edge),(samples.length-1-i)/Math.max(1,edge));
  }
  return buffer;
}
