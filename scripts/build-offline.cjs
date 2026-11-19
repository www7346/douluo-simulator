const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../dist');
const types={'.html':['text/html'],'.js':['text/javascript','application/javascript'],'.css':['text/css'],'.json':['application/json'],'.webmanifest':['application/manifest+json','application/json'],'.png':['image/png'],'.webp':['image/webp'],'.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.svg':['image/svg+xml'],'.woff2':['font/woff2'],'.woff':['font/woff'],'.ico':['image/x-icon','image/vnd.microsoft.icon']};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
Object.assign(types,{'.mp3':['audio/mpeg'],'.ogg':['audio/ogg'],'.wav':['audio/wav','audio/x-wav']});
function filesAt(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesAt(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
const indexFile=path.join(root,'index.html');
fs.writeFileSync(indexFile,fs.readFileSync(indexFile,'utf8').replace(/<meta name="douluo-build" content="[^"]*">/g,''));
const files=filesAt(root).filter(file=>!['sw.js','version.json','update.html'].includes(path.basename(file))&&types[path.extname(file)]).sort().map(file=>({path:'/'+path.relative(root,file).split(path.sep).join('/'),mime:types[path.extname(file)],hash:digest(fs.readFileSync(file))}));
if(!files.some(file=>file.path==='/index.html')||!files.some(file=>file.path.endsWith('.js')))throw Error('Build the application before its offline package');
const template=fs.readFileSync(path.join(__dirname,'service-worker.template.js'),'utf8');
const build=digest(JSON.stringify({files,template,update:fs.readFileSync(path.join(__dirname,'update.html'),'utf8')})).slice(0,20);
fs.writeFileSync(indexFile,fs.readFileSync(indexFile,'utf8').replace('</head>',`<meta name="douluo-build" content="${build}"></head>`));
files.find(file=>file.path==='/index.html').hash=digest(fs.readFileSync(indexFile));
fs.writeFileSync(path.join(root,'version.json'),JSON.stringify({app:'douluo-independent-web',build,files:files.length}));
fs.copyFileSync(path.join(__dirname,'update.html'),path.join(root,'update.html'));
fs.writeFileSync(path.join(root,'sw.js.tmp'),template.replace('__BUILD_ID__',build).replace('__PRECACHE_FILES__',JSON.stringify(files)));
fs.renameSync(path.join(root,'sw.js.tmp'),path.join(root,'sw.js'));
console.log(`Offline package ${build}: ${files.length} verified build files`);
