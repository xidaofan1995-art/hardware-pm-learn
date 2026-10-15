// Run: node tests/integrity.cjs. No dependencies or installed plugins.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');const context=vm.createContext({});
for(const file of ['js/data.js','js/answers.js',...fs.readdirSync(path.join(root,'js/pdf-answers')).map(x=>'js/pdf-answers/'+x),'js/source-data.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const {seed,answers,entries}=vm.runInContext('({seed:SEED_DATA,answers:ANSWER_DATA.byQuestion,entries:SOURCE_ENTRIES})',context);
const qs=[];for(const ch of seed.chapters)ch.topics.forEach((tp,t)=>tp.questions.forEach((text,q)=>qs.push({id:`${ch.id}-${t}-${q}`,no:`${ch.id}.${t+1}.${q+1}`,text})));
assert.equal(qs.length,720);assert.equal(entries.length,720);assert.equal(new Set(entries.map(e=>e.id)).size,720);assert.equal(new Set(entries.map(e=>e.no)).size,720);
const md=fs.readFileSync(path.join(root,'sources/interview-full.md'),'utf8');const manifest=JSON.parse(fs.readFileSync(path.join(root,'sources/manifest.json')));
assert.equal(crypto.createHash('sha256').update(md).digest('hex'),manifest.markdownSha256);
let chars=0;for(const q of qs){const e=entries.find(e=>e.id===q.id);assert.equal(e.no,q.no);assert.equal(e.text,q.text);assert.deepEqual(Object.keys(e.sections),['题目解读','知识点','答案','拓展思考']);const a=e.sections['答案'];assert(a.length>100);assert(!/[.…]$/.test(a));assert.equal(answers[q.id].split('\n').slice(1).join('\n'),a);assert(!answers[q.id].split('\n')[0].includes('精炼'));for(const s of Object.values(e.sections))assert(md.includes(s));chars+=a.length;}
assert.equal(chars,manifest.answerCharacters);
assert.equal(entries.find(e=>e.no==='1.5.5').sections['答案'].length,666);assert.equal(entries.find(e=>e.no==='18.8.5').sections['答案'].length,970);
assert(entries.find(e=>e.no==='1.5.5').sections['答案'].endsWith('对，以提高预测的准确性。'));
assert(entries.find(e=>e.no==='18.8.5').sections['答案'].endsWith('防止同类问题再次发生。'));
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');const assets=[...sw.matchAll(/^  "(.+)"[,]?$/gm)].map(m=>m[1]);for(const a of assets)assert(fs.existsSync(path.join(root,a)),`Missing cached asset ${a}`);for(const a of ['source.html','js/source-data.js','sources/interview-full.md'])assert(assets.includes('./'+a));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="([^"?#]+)"/g))if(!/^https?:/.test(m[1]))assert(fs.existsSync(path.join(root,m[1])));assert(!html.includes('js/pdf-full/'));
assert(fs.readFileSync(path.join(root,'js/app.js'),'utf8').includes('const STORE_KEY = "hpm-garden-v1"'));
console.log(JSON.stringify({questions:qs.length,fullAnswers:720,sourceSections:720*4,answerCharacters:chars,cachedAssets:assets.length,markdownSha256:manifest.markdownSha256,passed:true},null,2));
