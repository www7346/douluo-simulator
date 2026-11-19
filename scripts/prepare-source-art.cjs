'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'build/web-art');
const files = path.join(out, 'files');
const index = require('../source-assets/asset-index.json');
const assets = process.env.DOULUO_ART_ROOT;
const placeholder = '/media/source-placeholder.svg';

fs.mkdirSync(files, {recursive: true});
fs.copyFileSync(path.join(root, 'source-assets/placeholder.svg'), path.join(files, path.basename(placeholder)));

for (const group of [index.images, index.portraits]) {
  for (const [key, url] of Object.entries(group)) {
    const source = assets && path.join(assets, url.slice(1));
    if (!source || !fs.existsSync(source)) {
      group[key] = placeholder;
      continue;
    }
    const name = url.startsWith('/media/')
      ? path.basename(url)
      : 'source-' + createHash('sha256').update(url).digest('hex').slice(0, 24) + path.extname(url);
    fs.copyFileSync(source, path.join(files, name));
    group[key] = '/media/' + name;
  }
}

fs.writeFileSync(path.join(out, 'asset-manifest.json'), JSON.stringify(index));
