(function(root){
  'use strict';
  const keys=Object.freeze([
    'player.woman.v4.1','player.woman.v4.2','player.woman.v4.5',
    'player.woman.v4.6','player.woman.v4.9','player.woman.v4.10',
    'opening.figure.wen','opening.figure.gu','opening.figure.qi','opening.figure.jiang',
    'player.traveler-female-teen-v3','player.traveler-male-teen-v3'
  ]);
  if(typeof module!=='undefined'&&module.exports)module.exports=keys;
  if(root)root.SoulBackgroundFigureKeys=keys;
})(typeof globalThis!=='undefined'?globalThis:this);
