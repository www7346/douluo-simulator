'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {setTimeout: wait} = require('node:timers/promises');
const makeBattleFixture = require('./smoke-battle.cjs');

const app = 'com.douluosimulator.game';
const port = '18754';
let socket;
let sequence = 0;
const calls = new Map();
const adb = (...args) => execFileSync('adb', args, {encoding: 'utf8'}).trim();

async function until(check, label) {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Wait for the emulator, renderer, or action to finish.
    }
    await wait(1000);
  }
  throw Error('Timed out waiting for ' + label);
}

async function open() {
  adb('shell', 'am', 'start', '-W', '-n', app + '/.GameActivity');
  const pid = await until(() => adb('shell', 'pidof', '-s', app), 'app process');
  adb('forward', 'tcp:' + port, 'localabstract:webview_devtools_remote_' + pid);
  const target = await until(async () => {
    const result = await fetch('http://127.0.0.1:' + port + '/json', {signal: AbortSignal.timeout(2000)});
    return (await result.json()).find(page => page.url.startsWith('http://127.0.0.1:18753/index.html'));
  }, 'local WebView');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  socket.addEventListener('message', message => {
    const result = JSON.parse(message.data);
    calls.get(result.id)?.(result);
  });
  await until(() => evaluate('!!document.querySelector(\'[data-testid="new-story"]\')'), 'game home');
}

function evaluate(expression) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      calls.delete(id);
      reject(Error('WebView did not respond'));
    }, 15000);
    calls.set(id, reply => {
      clearTimeout(timer);
      calls.delete(id);
      if (reply.error || reply.result.exceptionDetails) reject(Error('WebView evaluation failed: ' +
        (reply.result?.exceptionDetails?.exception?.description || reply.error?.message || 'unknown error')));
      else resolve(reply.result.result.value);
    });
    socket.send(JSON.stringify({id, method: 'Runtime.evaluate', params: {expression, awaitPromise: true, returnByValue: true}}));
  });
}

async function main() {
  const credentialOwner = {id: 'smoke', baseUrl: 'https://api.deepseek.com', transport: 'server',
    apiKey: 'test-credential', credentialHeaders: {}};
  adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
  assert.equal(adb('shell', 'settings', 'get', 'global', 'airplane_mode_on'), '1');
  await open();
  assert.equal(await evaluate('typeof crypto.randomUUID'), 'function');
  assert.equal(await evaluate("fetch('/api/health').then(r=>r.status)"), 403);
  const health = await evaluate("fetch('/api/health',{headers:{'X-Douluo-Device-Key':DouluoAndroidNative.accessKey()}}).then(r=>r.json())");
  assert.equal(health.ready, true);
  console.log('Android health verified in airplane mode');
  const wasmReady = await evaluate(`(async()=>{
    const headers = {'Content-Type':'application/json','X-Douluo-Device-Key':DouluoAndroidNative.accessKey(),
      'X-Douluo-Protocol':${JSON.stringify(health.protocol)},'X-Douluo-Build':${JSON.stringify(health.buildId)}};
    const send=(path,payload)=>fetch('/api/'+path,{method:'POST',headers,body:JSON.stringify(payload)});
    const opened=await send('session',{worldId:'profile-android-emulator-wasm'});
    if(!opened.ok)return false;
    const {token,snapshot}=await opened.json();
    headers.Authorization='Bearer '+token;
    try {
      const reply=await send('query',{name:'world.blank',input:{type:'blueprint.craft'},revision:snapshot.revision});
      return reply.ok&&(await reply.json()).revision===0;
    } finally {
      await send('close',{});
    }
  })()`);
  assert.equal(wasmReady, true);
  console.log('HiGHS WebAssembly initialized inside the embedded Android worker');
  const {worldId,snapshot,command,player,foe,expected} = makeBattleFixture();
  const settled = await evaluate(`(async()=>{
    const headers = {'Content-Type':'application/json','X-Douluo-Device-Key':DouluoAndroidNative.accessKey(),
      'X-Douluo-Protocol':${JSON.stringify(health.protocol)},'X-Douluo-Build':${JSON.stringify(health.buildId)}};
    const send=async(path,payload)=>{
      const response=await fetch('/api/'+path,{method:'POST',headers,body:JSON.stringify(payload)});
      if(!response.ok)throw Error('Android battle check '+path+': '+response.status);
      return response.json();
    };
    const opened=await send('session',${JSON.stringify({worldId,snapshot})});
    headers.Authorization='Bearer '+opened.token;
    try {
      let receipt=await send('command',${JSON.stringify(command)});
      for(let attempt=0;receipt.calculationPending||receipt.status==='running';attempt++){
        if(attempt>=30)throw Error('Android battle calculation timed out');
        await new Promise(resolve=>setTimeout(resolve,250));
        receipt=await send('calculation',{operationId:${JSON.stringify(command.id)}});
      }
      receipt=receipt.receipt??receipt;
      await send('ack',{resultId:receipt.resultId,revision:receipt.delta.revision});
      const state=(await send('sync',{})).snapshot.state;
      return [state.战斗,state.战斗单位.列表[${JSON.stringify(player)}],state.战斗单位.列表[${JSON.stringify(foe)}]];
    } finally {
      await send('close',{});
    }
  })()`);
  assert.deepEqual(settled, expected);
  console.log('Android and Windows rule engines settled the same portable battle fixture identically');

  const protectedCredential = await evaluate(`JSON.parse(DouluoAndroidNative.credentials('seal',
    JSON.stringify([${JSON.stringify(credentialOwner)}]))).value`);
  assert.match(protectedCredential.profiles[0].apiKey, /^douluo-credential-v1:disk:/);
  await evaluate('document.querySelector(\'[data-testid="new-story"]\').click()');
  await until(() => evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='创建世界与角色')?.disabled===false`), 'world creation dialog');
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='创建世界与角色').click()`);
  await until(() => evaluate("location.hash.includes('creation')"), 'new world creation');
  await until(() => evaluate('!!document.querySelector(\'[data-testid="creation-quick"]\')'), 'rule-validated character creation');
  await until(() => evaluate('document.querySelector(\'[data-testid="confirm-creation"]\')?.disabled===false'), 'ready opening');
  await evaluate('document.querySelector(\'[data-testid="confirm-creation"]\').click()');
  await until(() => evaluate("location.hash && !location.hash.includes('creation')"), 'offline journey');
  socket.close();
  adb('shell', 'am', 'force-stop', app);
  await open();

  await evaluate("location.hash='#/saves'");
  await until(() => evaluate("document.querySelector('.world-choice.is-active')?.textContent.includes('新的旅程')"), 'world saved across process restart');
  const protectedOwner = {...credentialOwner, apiKey: protectedCredential.profiles[0].apiKey};
  const restored = await evaluate(`JSON.parse(DouluoAndroidNative.credentials('resolve', JSON.stringify(${JSON.stringify(protectedOwner)}))).value`);
  assert.equal(restored.apiKey, credentialOwner.apiKey);
  await evaluate(`DouluoAndroidNative.credentials('forget', JSON.stringify(${JSON.stringify(protectedCredential.created)}))`);
  console.log('IndexedDB world and Android Keystore credential survived force stop');
}

main().catch(error => {
  console.error(error.message);
  try { console.error(adb('logcat', '-d', '-s', 'DouluoRuntime', 'AndroidRuntime', 'chromium')); } catch {}
  process.exitCode = 1;
}).finally(() => {
  socket?.close();
  try { adb('forward', '--remove', 'tcp:' + port); } catch {}
  adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable');
});
