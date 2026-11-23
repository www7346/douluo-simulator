'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {build} = require('esbuild');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'build/android');
const sdkVersion = '24.22.1-0';
const sdkDigest = 'd6fd9f610fe5d81fede8f0d400c5a62723247725a19831835f15abf4f0604250';
const abis = ['arm64-v8a', 'x86_64'];

async function matchingFiles(directory, name) {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  return (await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? matchingFiles(file, name) : entry.name === name ? [file] : [];
  }))).flat();
}

async function prepareNode() {
  const filename = `nodejs-mobile-android-${sdkVersion}.zip`;
  const zip = process.env.DOULUO_ANDROID_NODE_ZIP || path.join(out, filename);
  if (!process.env.DOULUO_ANDROID_NODE_ZIP && !await fs.stat(zip).catch(() => null)) {
    execFileSync('curl', ['-fL', '--retry', '3', '-o', zip + '.tmp',
      `https://github.com/fogtape/nodejs-mobile/releases/download/v${sdkVersion}/${filename}`], {stdio: 'inherit'});
    await fs.rename(zip + '.tmp', zip);
  }
  if (createHash('sha256').update(await fs.readFile(zip)).digest('hex') !== sdkDigest) {
    throw Error('Android Node SDK SHA-256 mismatch');
  }
  const extract = path.join(out, 'node-sdk');
  await fs.mkdir(extract, {recursive: true});
  execFileSync('tar', ['-xf', zip, '-C', extract], {stdio: 'inherit'});
  const header = (await matchingFiles(extract, 'node.h'))[0];
  if (!header) throw Error('Android Node SDK missing C++ headers');
  await fs.cp(path.dirname(header), path.join(out, 'node/include/node'), {recursive: true});
  const libraries = await matchingFiles(extract, 'libnode.so');
  for (const abi of abis) {
    const lib = libraries.find(file => file.split(path.sep).includes(abi));
    if (!lib) throw Error('Android Node SDK missing ' + abi);
    const target = path.join(out, 'node/lib', abi);
    await fs.mkdir(target, {recursive: true});
    await fs.copyFile(lib, path.join(target, 'libnode.so'));
  }
}

async function main() {
  const graphics = path.join(out, 'res/drawable-nodpi');
  await fs.mkdir(graphics, {recursive: true});
  await fs.copyFile(path.join(root, 'public/icons/icon-192.png'), path.join(graphics, 'douluo_icon.png'));
  const base = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const id = 'android-' + base.slice(0, 20);
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  execFileSync(process.execPath, [vite, 'build', '--mode', 'android', '--config', 'vite.config.mts'],
    {cwd: root, env: {...process.env, DOULUO_BUILD_ID: id}, stdio: 'inherit'});
  const wasmFile = require.resolve('highs/runtime');
  const wasm = await fs.readFile(wasmFile);
  const assets = path.join(out, 'assets');
  if (process.env.DOULUO_ART_ROOT) {
    const audio = path.join(process.env.DOULUO_ART_ROOT, 'audio');
    if (await fs.stat(audio).then(info => info.isDirectory(), () => false)) {
      await fs.cp(audio, path.join(assets, 'www/audio'), {recursive: true});
    }
  }
  const service = path.join(assets, 'service');
  await build({
    define: {__DOULUO_BLUEPRINT_WASM__: JSON.stringify(wasm.toString('base64'))},
    absWorkingDir: root,
    entryPoints: {
      'android-service': 'android/service.ts',
      'calculation-worker': 'src/server/calculation-worker.ts',
      'model-worker': 'src/server/model-worker.ts',
    },
    tsconfig: 'tsconfig.app.json', outdir: service, outExtension: {'.js': '.cjs'},
    platform: 'node', target: 'node24', format: 'cjs', bundle: true,
  });
  await fs.writeFile(path.join(service, 'version.json'), JSON.stringify({id, port: 18753}) + '\n');
  await fs.copyFile(path.join(path.dirname(wasmFile), '..', 'LICENSE'), path.join(assets, 'HiGHS-LICENSE'));
  await fs.copyFile(path.join(root, 'desktop/node-LICENSE'), path.join(assets, 'node-LICENSE'));
  await fs.writeFile(path.join(assets, 'android-runtime.txt'),
    `Node.js Mobile SDK ${sdkVersion}\nhttps://github.com/fogtape/nodejs-mobile/releases/tag/v${sdkVersion}\n`);
  if (!process.argv.includes('--assets-only')) await prepareNode();
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
