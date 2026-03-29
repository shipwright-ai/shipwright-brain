/**
 * Shipwright Brain — API + Simple UI
 *
 * JSON API at /api/* — clean endpoints for brain-ui (SvelteKit) to consume.
 * Simple HTML UI at / — placeholder until brain-ui is built.
 * File serving at /file — serves attachments.
 *
 * node src/http.js [docs-dir] [port]
 */

import http from "http";
import fs from "fs";
import path from "path";
import * as brain from "./core.js";

const dir = process.env.BRAIN_DOCS_DIR || process.argv[2] || "./docs";
const PORT = process.env.BRAIN_PORT || process.argv[3] || 3111;
brain.init(dir);

function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseQuery(url) {
  const u = new URL(url, "http://localhost");
  return { pathname: u.pathname, params: u.searchParams };
}

// --- Simple placeholder UI ---
const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shipwright Brain</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=DM+Sans:wght@0,400;0,500;0,700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#09090b;--s1:#111113;--s2:#18181b;--b1:#27272a;--t1:#fafafa;--t2:#a1a1aa;--t3:#71717a;--accent:#3b82f6;--r:8px}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1)}
.shell{max-width:900px;margin:0 auto;padding:2rem 1.5rem}
header{display:flex;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--b1);margin-bottom:1.25rem}
.logo{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:600;cursor:pointer}
.stats{font-size:.8rem;color:var(--t3);margin-left:auto;font-family:'JetBrains Mono',monospace}
.search{width:100%;padding:.5rem .85rem;background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);color:var(--t1);font-size:.9rem;outline:none;margin-bottom:1.25rem;font-family:inherit}
.search:focus{border-color:var(--accent)}
.crumbs{font-size:.8rem;color:var(--t3);margin-bottom:1rem}
.crumbs span{cursor:pointer;color:var(--t2)}.crumbs span:hover{color:var(--accent)}
.crumbs .sep{color:#3f3f46;cursor:default}.crumbs .cur{color:var(--t1);cursor:default}
.kinds{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.6rem;margin-bottom:1.5rem}
.kcard{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:.85rem 1rem;cursor:pointer;transition:all .12s}
.kcard:hover{background:var(--s2)}
.kname{font-weight:600;text-transform:capitalize}.kn{font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--t3)}
.list{display:grid;gap:1px;background:var(--b1);border-radius:var(--r);overflow:hidden}
.row{background:var(--s1);padding:.85rem 1rem;cursor:pointer;transition:background .1s}
.row:hover{background:var(--s2)}
.rtitle{font-weight:600;font-size:.95rem}.rsum{font-size:.8rem;color:var(--t2);margin-top:.15rem}
.rmeta{display:flex;gap:.4rem;margin-top:.35rem;flex-wrap:wrap}
.tag{font-family:'JetBrains Mono',monospace;font-size:.65rem;padding:.1rem .4rem;background:var(--s2);color:var(--t2);border-radius:3px}
.detail{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:1.5rem}
.dtitle{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
.dsum{font-size:.95rem;color:var(--t2);font-style:italic;padding:.6rem 1rem;background:var(--s2);border-left:3px solid var(--accent);border-radius:0 4px 4px 0;margin-bottom:1.25rem}
.dmeta{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem}
.dby{font-size:.8rem;color:var(--t3);margin-bottom:1rem}
.dcontent{font-size:.92rem;line-height:1.8;white-space:pre-wrap;overflow-wrap:break-word}
.dcontent img{max-width:100%;border-radius:var(--r);border:1px solid var(--b1);margin:.5em 0}
.refs{border-top:1px solid var(--b1);padding-top:1rem;margin-top:1.25rem}
.refs-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:.4rem;font-weight:600}
.rchip{display:inline-block;padding:.2rem .55rem;background:var(--s2);border:1px solid var(--b1);border-radius:4px;font-size:.8rem;color:var(--t2);cursor:pointer;margin:.15rem}
.rchip:hover{border-color:var(--accent);color:var(--accent)}
.children-section{border-top:1px solid var(--b1);padding-top:1rem;margin-top:1.25rem}
.children-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:.5rem;font-weight:600}
.empty{text-align:center;padding:3rem;color:var(--t3)}
</style></head>
<body><div class="shell">
<header><div class="logo" onclick="go()">shipwright brain</div><div class="stats" id="stats"></div></header>
<input class="search" id="search" placeholder="Search memories..." oninput="onSearch()">
<div id="crumbs" class="crumbs"></div>
<div id="content"></div>
</div>
<script>
let data=null,searchData=null;
const $=id=>document.getElementById(id);

async function load(){const r=await fetch('/api/browse');data=await r.json();
$('stats').textContent=(data.kinds||[]).reduce((s,k)=>s+(k.count||0),0)+' memories';render()}

function go(p){searchData=null;$('search').value='';
const u=p?'/?p='+encodeURIComponent(p):'/';history.pushState({p},'',u);render()}

function cur(){return new URLSearchParams(location.search).get('p')||null}
window.onpopstate=()=>render();

async function render(){
if(searchData){renderSearch();return}
const p=cur();
if(!p){renderHome();return}
if(!p.endsWith('memory.md')){await renderKind(p);return}
await renderDetail(p)}

function renderHome(){
$('crumbs').innerHTML='<span class="cur">Brain</span>';
if(!data||!data.kinds||!data.kinds.length){$('content').innerHTML='<div class="empty">Brain is empty.</div>';return}
$('content').innerHTML='<div class="kinds">'+data.kinds.map(k=>
'<div class="kcard" onclick="go(\\''+esc(k.kind)+'\\')"><div class="kname">'+esc(k.kind)+(k.progress?'  '+progressBadge(k.progress):'')+'</div><div class="kn">'+(k.count||'?')+' memories</div></div>'
).join('')+'</div>'}

async function renderKind(kind){
$('crumbs').innerHTML='<span onclick="go()">Brain</span><span class="sep"> / </span><span class="cur">'+esc(kind)+'</span>';
const r=await fetch('/api/browse?path='+encodeURIComponent(kind));const d=await r.json();
const items=d.memories||[];
if(!items.length){$('content').innerHTML='<div class="empty">Empty.</div>';return}
$('content').innerHTML=renderList(items)}

async function renderDetail(mf){
const r=await fetch('/api/memory?f='+encodeURIComponent(mf));
if(!r.ok){go();return}
const m=await r.json();
const bc='<span onclick="go()">Brain</span><span class="sep"> / </span><span onclick="go(\\''+esc(m.kind)+'\\')">'+esc(m.kind)+'</span>'+(m.parent?'<span class="sep"> / </span><span onclick="go(\\''+esc(m.parent)+'\\')">...</span>':'')+
'<span class="sep"> / </span><span class="cur">'+esc(m.title)+'</span>';
$('crumbs').innerHTML=bc;

const tags=(m.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('');
const refs=(m.refs||[]).filter(Boolean).map(r=>'<span class="rchip" onclick="go(\\''+esc(r)+'\\')">'+esc(r.replace(/^docs\\//,'').replace(/\\/memory\\.md$/,''))+'</span>').join('');
const children=(m.children||[]);
const atts=(m.attachments||[]);
const memDir=mf.replace(/\\/memory\\.md$/,'');

let h='<div class="detail"><div class="dtitle">'+esc(m.title)+'</div>';
if(m.summary)h+='<div class="dsum">'+esc(m.summary)+'</div>';
h+='<div class="dmeta"><span class="tag">'+esc(m.kind)+'</span>'+tags+'</div>';
h+='<div class="dby">by '+esc(m.by||'?')+' · created '+(m.at?new Date(m.at).toLocaleDateString():'?')+(m.modified?' · modified '+new Date(m.modified).toLocaleDateString():'')+'</div>';
if(m.content){
let c=esc(m.content);
c=c.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g,(_, alt, src)=>{
const resolved=src.startsWith('http')?src:'/file?p='+encodeURIComponent(memDir+'/'+src);
return '<img alt="'+alt+'" src="'+resolved+'" style="max-width:100%;border-radius:8px;border:1px solid #27272a;margin:.5em 0">';});
h+='<div class="dcontent">'+c+'</div>'}
if(refs)h+='<div class="refs"><div class="refs-label">References</div>'+refs+'</div>';
if(atts.length){h+='<div class="refs"><div class="refs-label">Attachments</div>';
for(const a of atts){const af=typeof a==='string'?a:a.file;const isImg=/\\.(png|jpg|jpeg|gif|svg|webp)$/i.test(af);
if(isImg)h+='<img src="/file?p='+encodeURIComponent(af)+'" style="max-width:200px;border-radius:8px;border:1px solid #27272a;margin:.25rem">';
else h+='<span class="tag">'+esc(af.split('/').pop())+'</span>'}
h+='</div>'}
if(children.length){h+='<div class="children-section"><div class="children-label">Sub-memories</div>'+renderList(children)+'</div>'}
h+='</div>';
$('content').innerHTML=h}

async function onSearch(){const q=$('search').value.trim();
if(!q){searchData=null;render();return}
const r=await fetch('/api/search?q='+encodeURIComponent(q));searchData=await r.json();renderSearch()}

function renderSearch(){
$('crumbs').innerHTML='<span onclick="go()">Brain</span><span class="sep"> / </span><span class="cur">Search</span>';
const items=searchData.memories||searchData||[];
$('content').innerHTML=items.length?renderList(items):'<div class="empty">No results.</div>'}

function progressBadge(p){if(!p)return'';
const pct=Math.round(p.checked/p.total*100);
const col=pct===100?'#22c55e':pct===0?'#71717a':'#f59e0b';
return '<span class="tag" style="border:1px solid '+col+';color:'+col+'">'+p.checked+'/'+p.total+'</span>'}

function renderList(items){return '<div class="list">'+items.map(m=>{
const prog=m.aggregateProgress||m.progress;
return '<div class="row" onclick="go(\\''+esc(m.memory_file)+'\\')"><div class="rtitle">'+esc(m.title)+(prog?'  '+progressBadge(prog):'')+'</div>'+
(m.summary?'<div class="rsum">'+esc(m.summary)+'</div>':'')+
'<div class="rmeta">'+(m.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+
(m.children?'<span class="tag">+'+m.children+' sub</span>':'')+'</div></div>'
}).join('')+'</div>'}

function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML}
load();setInterval(load,5000);
</script></body></html>`;

// --- Server ---
const server = http.createServer(async (req, res) => {
  const { pathname, params } = parseQuery(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // --- API ---
  if (pathname === "/api/browse") {
    const p = params.get("path") || undefined;
    const limit = parseInt(params.get("limit")) || 20;
    const offset = parseInt(params.get("offset")) || 0;
    const tags = params.get("tags") ? params.get("tags").split(",") : undefined;
    const status = params.get("status") || undefined;
    const r = brain.browse(p, { limit, offset, tags, status });
    if (!r) return json(res, { error: "Not found" }, 404);
    return json(res, r);
  }

  if (pathname === "/api/search") {
    const q = params.get("q") || "";
    const queries = q.split(/\s+/).filter(Boolean);
    const tags = params.get("tags") ? params.get("tags").split(",") : undefined;
    const kind = params.get("kind") || undefined;
    const status = params.get("status") || undefined;
    const limit = parseInt(params.get("limit")) || 20;
    const offset = parseInt(params.get("offset")) || 0;
    return json(res, brain.search({ queries, tags, kind, status, limit, offset }));
  }

  if (pathname === "/api/semantic-search") {
    const q = params.get("q") || "";
    const tags = params.get("tags") ? params.get("tags").split(",") : undefined;
    const kind = params.get("kind") || undefined;
    const status = params.get("status") || undefined;
    const limit = parseInt(params.get("limit")) || 20;
    const offset = parseInt(params.get("offset")) || 0;
    return json(res, await brain.semanticSearch({ query: q, tags, kind, status, limit, offset }));
  }

  if (pathname === "/api/memory") {
    const f = params.get("f");
    const entry = brain.getEntry(f);
    if (!entry) return json(res, { error: "Not found" }, 404);
    const content = brain.readContent(f);
    const children = (entry.children || []).map(cf => {
      const c = brain.getEntry(cf);
      return c ? { memory_file: c.memory_file, title: c.title, summary: c.summary, tags: c.tags, progress: c.progress, aggregateProgress: c.aggregateProgress, children: c.children.length, at: c.at, modified: c.modified } : null;
    }).filter(Boolean);
    const refs = (entry.refs || []).map(rf => {
      const r = brain.getEntry(rf);
      return r ? { memory_file: r.memory_file, title: r.title, summary: r.summary, kind: r.kind, tags: r.tags, progress: r.progress, aggregateProgress: r.aggregateProgress } : { memory_file: rf };
    });
    return json(res, { ...entry, content, children, refs });
  }

  if (pathname === "/api/graph") {
    return json(res, brain.getGraph());
  }

  if (pathname === "/api/overview") {
    const s = brain.stats();
    const tags = brain.allTags();
    const kinds = brain.getKinds();
    return json(res, { total: s.total, kinds: s.kinds, tags, kindsList: kinds, ready: brain.isReady() });
  }

  // --- File serving ---
  if (pathname === "/file") {
    const p = params.get("p");
    if (!p) { res.writeHead(400); res.end(); return; }
    const absPath = path.resolve(p);
    if (!absPath.startsWith(path.resolve(brain.getDocsDir()))) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(absPath)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(absPath).toLowerCase();
    const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp", ".pdf": "application/pdf" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(absPath).pipe(res);
    return;
  }

  // --- UI ---
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(`Brain API: http://localhost:${PORT}/api/`);
  console.log(`Brain UI:  http://localhost:${PORT}`);
  console.log(`Docs:      ${brain.getDocsDir()}`);
});
