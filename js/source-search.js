'use strict';
const SOURCE_PAGE_SIZE = 20;
const sourceQuery = document.getElementById('source-query');
const sourceChapter = document.getElementById('source-chapter');
const sourceResults = document.getElementById('source-results');
let sourcePage = 0;
const sourceIndex = SOURCE_ENTRIES.map(entry => ({entry, text:[entry.no,entry.id,entry.text,entry.chTitle,entry.topic,...Object.values(entry.sections)].join('\n').replace(/\s+/g,'').toLocaleLowerCase()}));
const chapters = new Map(SOURCE_ENTRIES.map(e => [e.id.split('-')[0],e.chTitle]));
chapters.forEach((title,id) => {const option=document.createElement('option');option.value=id;option.textContent=`${id}. ${title}`;sourceChapter.append(option);});
function sourceTokens(query) { return query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean); }
function findSourceEntries(query,chapter) {
 const tokens=sourceTokens(query);
 return sourceIndex.filter(({entry,text}) => (!chapter||entry.id.split('-')[0]===chapter)&&tokens.every(token => /^\d+([.-]\d+){2}$/.test(token)?entry.no===token||entry.id===token:text.includes(token))).map(x=>x.entry);
}
function highlighted(text,tokens) {
 const fragment=document.createDocumentFragment();
 if(!tokens.length){fragment.append(document.createTextNode(text));return fragment;}
 const pattern=tokens.map(s=>Array.from(s).map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*')).sort((a,b)=>b.length-a.length).join('|');
 const regex=new RegExp(pattern,'gi');let at=0;
 for(const match of text.matchAll(regex)){fragment.append(document.createTextNode(text.slice(at,match.index)));const mark=document.createElement('mark');mark.textContent=match[0];fragment.append(mark);at=match.index+match[0].length;}
 fragment.append(document.createTextNode(text.slice(at)));return fragment;
}
function syncSourceUrl(){const params=new URLSearchParams();if(sourceQuery.value.trim())params.set('q',sourceQuery.value.trim());if(sourceChapter.value)params.set('chapter',sourceChapter.value);if(sourcePage)params.set('page',sourcePage+1);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
function renderSource(){
 const matches=findSourceEntries(sourceQuery.value,sourceChapter.value),tokens=sourceTokens(sourceQuery.value);
 const pages=Math.max(1,Math.ceil(matches.length/SOURCE_PAGE_SIZE));sourcePage=Math.min(Math.max(0,sourcePage),pages-1);sourceResults.replaceChildren();
 document.getElementById('source-count').textContent=`找到 ${matches.length} 题 / 全部 ${SOURCE_ENTRIES.length} 题`;
 for(const entry of matches.slice(sourcePage*SOURCE_PAGE_SIZE,(sourcePage+1)*SOURCE_PAGE_SIZE)){
  const details=document.createElement('details');details.className='card source-entry';details.id='q-'+entry.no;
  const summary=document.createElement('summary');summary.append(highlighted(`${entry.no} ${entry.text}`,tokens));details.append(summary);
  const meta=document.createElement('p');meta.className='source-meta';meta.textContent=`${entry.chTitle} / ${entry.topic} · PDF P${entry.page}–${entry.endPage}`;details.append(meta);
  const bodyText=Object.values(entry.sections).join('\n').replace(/\s+/g,'');const lower=bodyText.toLocaleLowerCase();const offsets=tokens.map(t=>lower.indexOf(t)).filter(i=>i>=0);const at=offsets.length?Math.max(0,Math.min(...offsets)-40):0;
  const preview=document.createElement('p');preview.className='source-preview';preview.append(highlighted((at?'…':'')+bodyText.slice(at,at+150)+(at+150<bodyText.length?'…':''),tokens));details.append(preview);
  let loaded=false;details.addEventListener('toggle',()=>{if(!details.open||loaded)return;loaded=true;for(const [title,text] of Object.entries(entry.sections)){const h=document.createElement('h3');h.textContent=title;const body=document.createElement('div');body.className='source-body';body.dataset.section=title;body.append(highlighted(text,tokens));details.append(h,body);}const link=document.createElement('a');link.textContent='本题检索链接';link.href='source.html?q='+encodeURIComponent(entry.no);details.append(link);});
  sourceResults.append(details);
  if(matches.length===1)details.open=true;
 }
 if(!matches.length){const p=document.createElement('p');p.className='card';p.textContent='没有匹配结果。试试更短的关键词，或清除章节筛选。';sourceResults.append(p);}
 document.getElementById('page-label').textContent=`${sourcePage+1} / ${pages}`;document.getElementById('previous-page').disabled=sourcePage===0;document.getElementById('next-page').disabled=sourcePage===pages-1;syncSourceUrl();
}
let debounce;
sourceQuery.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>{sourcePage=0;renderSource();},180);});
sourceChapter.addEventListener('change',()=>{sourcePage=0;renderSource();});
document.getElementById('source-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(debounce);sourcePage=0;renderSource();});
document.getElementById('source-form').addEventListener('reset',()=>{clearTimeout(debounce);setTimeout(()=>{sourcePage=0;renderSource();},0);});
for(const [id,delta] of [['previous-page',-1],['next-page',1]])document.getElementById(id).addEventListener('click',()=>{sourcePage+=delta;renderSource();sourceResults.scrollIntoView({behavior:'smooth',block:'start'});});
function readSourceUrl(){const p=new URLSearchParams(location.search);sourceQuery.value=p.get('q')||'';sourceChapter.value=p.get('chapter')||'';sourcePage=Math.max(0,(parseInt(p.get('page'),10)||1)-1);renderSource();}
window.addEventListener('popstate',readSourceUrl);readSourceUrl();
async function checkOffline(){const status=document.getElementById('offline-status');try{if(!('serviceWorker'in navigator))throw Error('unsupported');await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;const cached=await caches.open('hpm-garden-v4-full-20261015');const required=['./source.html','./js/source-data.js','./js/source-search.js','./sources/interview-full.md'];const ready=(await Promise.all(required.map(url=>cached.match(url)))).every(Boolean);status.textContent=ready?'完整正文与Markdown已缓存，可离线检索。':'正在缓存完整正文，请联网稍后重新打开本页。';}catch{status.textContent='离线缓存尚未就绪；当前仍可在线检索。';}}
checkOffline();
