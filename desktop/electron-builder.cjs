'use strict';
module.exports={
  appId:'com.douluo.simulator',productName:'斗罗大陆：武魂模拟器',
  executableName:'DouluoSimulator',
  directories:{output:'../build/windows'},
  electronDist:'node_modules/electron/dist',
  files:['main.cjs','preload.cjs','updater.cjs','update-install.cjs','model-credentials.cjs','chatgpt-plan.cjs','package.json'],
  extraResources:[{from:'../build/desktop',to:'game'},{from:'../LICENSE',to:'licenses/GPL-3.0.txt'},{from:'SOURCE-NOTICE.txt',to:'licenses/SOURCE-NOTICE.txt'}],
  asar:true,
  win:{target:[{target:'nsis',arch:['x64']}],icon:'../public/icons/icon-512.png',signAndEditExecutable:true,...(process.env.DOULUO_UPDATE_PUBLISHER?{publisherName:process.env.DOULUO_UPDATE_PUBLISHER,forceCodeSigning:true}:{})},
  nsis:{oneClick:true,perMachine:false,deleteAppDataOnUninstall:false,artifactName:'Douluo-Setup-${version}-x64.exe'},
  publish:{provider:'generic',url:process.env.DOULUO_UPDATE_PRIMARY||'https://douluo.it.com/updates/windows/x64/stable/'}
};
