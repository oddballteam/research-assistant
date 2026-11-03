(function(){
'use strict';
/* ---------- helpers ---------- */
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var KEY='va-research-assistant-v1';
var NEED='[NEEDS INPUT]';var RL=null;
var PLATFORM='https://depo-platform-documentation.scrollhelp.site/research-design/research-at-va';
var TEMPLATE_BASE='https://va.ghe.com/software/va.gov-research-repository/blob/master/research-templates/research-plan-template.md';
var uid=function(){return Math.random().toString(36).slice(2,9)};
var toastT;function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200)}
function fmtDate(s){return s?String(s).slice(0,10):'unknown'}
function fmtUTC(s){try{var d=new Date(s);return d.toISOString().slice(0,16).replace('T',' ')+' UTC'}catch(e){return s}}
function copyText(t){return (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('Copied')},function(){toast('Copy is blocked here. Select the text and copy it manually.')})}

/* ---------- state ---------- */
function blank(){return {tab:'scan',terms:'',mode:'all',fProduct:'',fType:'',fYear:'',fArea:'',fGroup:'',fTheme:'',fStage:'',show:6,qcheck:'',
  plan:{rq:[''],roles:{}},guide:{sections:[],tmpl:''},early:{items:[],hyp:{}},report:{recs:[],verdicts:{},next:'',further:'',who:''},pins:[],ack:{},planStep:0,guideStep:0,findStep:0,repStep:0,rec:{},reg:{}}}
var S=blank();
try{var raw=localStorage.getItem(KEY);if(raw){var o=JSON.parse(raw);S=Object.assign(blank(),o);S.plan=Object.assign({rq:[''],roles:{}},o.plan||{});S.guide=Object.assign({sections:[],tmpl:''},o.guide||{});S.early=Object.assign({items:[],hyp:{}},o.early||{});S.report=Object.assign(blank().report,o.report||{});S.rec=o.rec||{};S.reg=o.reg||{}}}catch(e){}
var saveT;function save(){clearTimeout(saveT);saveT=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}},350)}
function getPath(p){return p.split('.').reduce(function(o,k){return o==null?o:o[k]},S)}
function setPath(p,v){var ks=p.split('.'),o=S;for(var i=0;i<ks.length-1;i++){if(o[ks[i]]==null)o[ks[i]]={};o=o[ks[i]]}o[ks[ks.length-1]]=v}

/* ---------- index ---------- */
var IDX=null,EXI=null,ENTS=[],ALLQ=[],QINV=new Map(),EXACT=new Map(),INSIGHTS=[],PINREG={};
var STOP=new Set('a an the and or of to in on for with at by from is are was were be been do does did you your we our i me my it this that these those can could would should will how what when where why which who whom about any if as so than then there here have has had not no yes please tell us also just like get got into out up'.split(' '));
function stem(w){return w.length>4?w.replace(/(ing|ed|es|s)$/,''):w}
function toks(s){var m=String(s).toLowerCase().match(/[a-z0-9]+/g)||[];var out=new Set();m.forEach(function(w){if(w.length>2&&!STOP.has(w))out.add(stem(w))});return out}
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function yearOf(b,name){var d=b&&(b.completedDate||b.startDate||b.titleDate);if(d)return String(d).slice(0,4);var m=String(name).match(/(20\d\d)/);return m?m[1]:''}
var TYPE_ORDER={plan:0,guide:1,screener:2,findings:3,synthesis:4,story:5,other:6,placeholder:7};

function build(){
  var folders=new Map();
  IDX.documents.forEach(function(d){if(!folders.has(d.folder))folders.set(d.folder,[]);folders.get(d.folder).push(d)});
  var byNum=new Map(IDX.board.studies.map(function(s){return [s.number,s]}));
  var linked=new Set();
  var sfByStudy=new Map();
  IDX.structuredFindings.forEach(function(f){var k=norm(f.sourceStudy);if(!sfByStudy.has(k))sfByStudy.set(k,[]);sfByStudy.get(k).push(f)});
  folders.forEach(function(docs,f){
    docs.sort(function(a,b){return (TYPE_ORDER[a.type]-TYPE_ORDER[b.type])||a.path.localeCompare(b.path)});
    var nums=IDX.folderToBoard[f]||[];var bs=nums.map(function(n){return byNum.get(n)}).filter(Boolean);
    bs.forEach(function(b){linked.add(b.number)});
    var last=f.split('/').pop();
    ENTS.push({key:'f:'+f,title:bs[0]?bs[0].title:last,folder:f,docs:docs,boards:bs,year:yearOf(bs[0],last),sfs:sfByStudy.get(norm(last))||(bs[0]&&sfByStudy.get(norm(bs[0].title)))||[]});
  });
  IDX.board.studies.forEach(function(s){if(!linked.has(s.number))ENTS.push({key:'b:'+s.number,title:s.title,folder:null,docs:[],boards:[s],year:yearOf(s,''),sfs:sfByStudy.get(norm(s.title))||[]})});
  // question index
  IDX.documents.forEach(function(d){d.questions.forEach(function(q){var t=toks(q.text);var i=ALLQ.length;var nn=norm(q.text);ALLQ.push({d:d,q:q,t:t,n:nn});if(!EXACT.has(nn))EXACT.set(nn,[]);EXACT.get(nn).push(i);if(t.size>=2)t.forEach(function(w){if(!QINV.has(w))QINV.set(w,[]);QINV.get(w).push(i)})})});
  // insight index (quotes, findings headings, board key findings, board summaries, structured findings)
  var studyOf=function(d){var e=ENTS.find(function(x){return x.folder===d.folder});return e?e.title:d.folder};
  IDX.documents.forEach(function(d){
    d.quotes.forEach(function(q){INSIGHTS.push({kind:'Quote',text:q.text,study:studyOf(d),link:q.link,src:d.file+' · L'+q.line,t:toks(q.text),pin:{kind:'Quote',text:q.text,study:studyOf(d),file:d.file,path:d.path,line:q.line,link:q.link,lastCommit:d.lastCommit,participant:q.participant,role:q.role,attribution:q.attribution,ts:q.sessionTimestamp,section:q.section,docType:d.type}})});
    d.findings.forEach(function(f){INSIGHTS.push({kind:'Finding heading',text:f.text,study:studyOf(d),link:f.link,src:d.file+' · L'+f.line,t:toks(f.text),pin:{kind:'Finding heading',text:f.text,study:studyOf(d),file:d.file,path:d.path,line:f.line,link:f.link,lastCommit:d.lastCommit,docType:d.type}})});
  });
  IDX.board.studies.forEach(function(b){
    var bp=function(kind,text){return {kind:kind,text:text,study:b.title,file:'Board issue #'+b.number,path:null,line:null,link:b.url,lastCommit:null,board:b.number,snapshot:IDX.board.lastRefresh}};
    if(b.summary)INSIGHTS.push({kind:'Board summary',text:b.summary,study:b.title,link:b.url,src:'Board issue #'+b.number,t:toks(b.summary),pin:bp('Board summary',b.summary)});
    (b.keyFindings||[]).forEach(function(k){if(k&&k.length>25)INSIGHTS.push({kind:'Board key finding',text:k,study:b.title,link:b.url,src:'Board issue #'+b.number,t:toks(k),pin:bp('Board key finding',k)})});
  });
  IDX.structuredFindings.forEach(function(f){INSIGHTS.push({kind:'Structured finding',text:f.summary,study:f.sourceStudy,link:f.link,src:f.file+' · L'+(f.line||'?'),t:toks(f.summary||''),pin:{kind:'Structured finding',text:f.summary,study:f.sourceStudy,file:f.file,path:f.file,line:f.line,link:f.link,lastCommit:null}})});
}

/* ---------- Research Explorer layer ----------
   explorer-index.json is built from research-explorer/taxonomy-data.json. Findings keep their original text.
   Labels are automatic (keyword based) and always shown with their confidence. Studies are joined to board
   issues by research-folder path; reports with no board issue become their own entries. */
function exName(s){return String(s).replace(/_/g,' ')}
function qtxt(s){return String(s).replace(/^[“"‘'\s]+|[”"’'\s]+$/g,'')}
function exPin(kind,r,text,line,extra){return Object.assign({kind:kind,text:text,study:r.t,file:r.p.split('/').pop(),path:r.p,line:line||null,link:line?r.u+'#L'+line:r.u,lastCommit:null,ex:true,snap:EXI.source.generatedAt,at:r.at},extra||{})}
function attachExplorer(){
  var byBoard=new Map();
  ENTS.forEach(function(e){e.ex=[];e.boards.forEach(function(b){byBoard.set(b.number,e)})});
  EXI.reports.forEach(function(r){
    var targets=new Set();(r.bn||[]).forEach(function(n){var e=byBoard.get(n);if(e)targets.add(e)});
    if(targets.size){targets.forEach(function(e){e.ex.push(r)})}
    else{ENTS.push({key:'x:'+r.p,title:r.t,folder:null,docs:[],boards:[],year:String(r.d||'').slice(0,4),sfs:[],ex:[r],exOnly:true})}
  });
  EXI.reports.forEach(function(r){
    r.f.forEach(function(f){var p=exPin('Explorer finding',r,f.x,null);INSIGHTS.push({kind:'Explorer finding',text:f.x,study:r.t,link:r.u,src:p.file,t:toks(f.x),pin:p})});
    r.q.forEach(function(q){var t=qtxt(q.x);var p=exPin('Quote',r,t,q.l,{participant:q.p||null});INSIGHTS.push({kind:'Quote',text:t,study:r.t,link:p.link,src:p.file+' · L'+q.l,t:toks(t),pin:p})});
  });
}
function exSel(){return {pa:S.fArea,ug:S.fGroup,th:S.fTheme,js:S.fStage}}
function exActive(){var s=exSel();return !!(s.pa||s.ug||s.th||s.js)}
function exFindingOk(f){var s=exSel();for(var k in s){if(s[k]&&!(f.l[k]&&f.l[k][0]===s[k]))return false}return true}
function exLabs(f){return ['ty','pa','ug','th','js','sv'].filter(function(k){return f.l[k]}).map(function(k){var v=f.l[k];return '<span class="chip mono'+(v[1]<0.3?' warn':'')+'" title="Automatic label ('+k+'), confidence '+Math.round(v[1]*100)+'%">'+esc(exName(v[0]))+' '+Math.round(v[1]*100)+'%</span>'}).join('')}

/* overlap / similarity */
function overlap(text){
  var qt=toks(text),n=norm(text),res=[],seen=new Set();
  (EXACT.get(n)||[]).forEach(function(i){var a=ALLQ[i];var k=a.d.path+'|'+a.q.line;if(seen.has(k))return;seen.add(k);res.push({a:a,j:1,same:true})});
  if(qt.size<2&&!res.length)return {short:true,hits:[]};
  if(qt.size>=2){
    var cand=new Map();
    qt.forEach(function(w){(QINV.get(w)||[]).forEach(function(i){cand.set(i,(cand.get(i)||0)+1)})});
    var thr=qt.size<=3?0.6:0.4;
    cand.forEach(function(c,i){if(c<2)return;var a=ALLQ[i];if(a.n===n)return;var inter=0;qt.forEach(function(w){if(a.t.has(w))inter++});var j=inter/(qt.size+a.t.size-inter);if(j>=thr)res.push({a:a,j:j,same:false})});
  }
  res.sort(function(x,y){return y.j-x.j});
  return {short:false,hits:res.slice(0,4)};
}
function relatedInsights(text,n){
  var qt=toks(text);if(qt.size<2)return [];var out=[];
  INSIGHTS.forEach(function(it){var sh=0;qt.forEach(function(w){if(it.t.has(w))sh++});if(sh>=2){var cov=sh/qt.size;if(cov>=0.4)out.push({it:it,cov:cov,sh:sh})}});
  out.sort(function(a,b){return b.cov-a.cov||b.sh-a.sh});return out.slice(0,n||5);
}

/* ---------- pins & citations ---------- */
function reg(p,salt){var id=p.kind+'|'+(p.path||p.link)+'|'+(p.line||'')+'|'+String(p.text).slice(0,40)+(salt||'');p.id=id;PINREG[id]=p;return id}
function cite(p){
  var who='';
  if(p.kind==='Quote'){who=' ('+(p.participant||p.role||'no participant ID in source')+'; session timestamp: '+(p.ts||'not recorded in source')+')'}
  var src=p.path?(p.path+(p.line?' L'+p.line:'')+' <'+p.link+'>'+(p.lastCommit?'; file last committed '+fmtDate(p.lastCommit):'')):('Board issue '+p.file.replace('Board issue ','')+' <'+p.link+'>; board snapshot refreshed '+fmtDate(p.snapshot||IDX.board.lastRefresh));
  if(p.ex)return '“'+p.text+'”'+who+' — '+p.study+'. Source: '+src+'. Research Explorer snapshot generated '+fmtDate(p.snap)+' from va.gov-team; report last updated '+fmtDate(p.at)+'.'+(p.kind==='Explorer finding'?' Finding text is copied from the report; no line number is recorded and its labels are automatic.':(p.line?' Line number refers to the report text in that snapshot.':''));
  return '“'+p.text+'”'+who+' — '+p.study+'. Source: '+src+'. Index built '+fmtDate(IDX.repo.builtAt)+' from commit '+IDX.repo.commit.slice(0,7)+'.';
}
function pinned(id){return S.pins.some(function(p){return p.id===id})}

/* ---------- search ---------- */
function normQ(s){return String(s||'').toLowerCase().replace(/\s+/g,' ').trim()}
/* Unquoted text is one phrase, matched as written. Each "quoted" segment is a separate keyword. */
function parseTerms(s){var out=[];var rest=String(s||'').replace(/["\u201C\u201D]([^"\u201C\u201D]*)["\u201C\u201D]/g,function(m,a){var t=normQ(a);if(t.length>1)out.push(t);return ' '});rest=normQ(rest.replace(/["\u201C\u201D]/g,' ').replace(/[,;]+/g,' '));if(rest.length>1)out.push(rest);return Array.from(new Set(out))}
/* Reviewed synonyms. Keys are singular keywords. Each match is shown on the search page, so a result can be traced to the word that matched. */
var SYN={'vso':['veteran service organization','service officer'],'assistive':['assistive technology','screen reader','screen magnifier','jaws','nvda','voiceover'],'screen reader':['assistive technology','jaws','nvda','voiceover'],'sign in':['log in','login','sign-in'],'caregiver':['family caregiver','caretaker']};
function baseW(x){return x.length>3&&/s$/.test(x)&&!/ss$/.test(x)?x.slice(0,-1):x}
function variantsOf(x){return [x].concat(SYN[baseW(x)]||[])}
function hitW(t,x){return t.indexOf(x)>-1||(x.length>3&&/s$/.test(x)&&!/ss$/.test(x)&&t.indexOf(x.slice(0,-1))>-1)}
function mt(text,terms){var t=normQ(text);return terms.filter(function(x){return variantsOf(x).some(function(v){return hitW(t,v)})})}
function hl(text,terms){text=String(text);if(!terms||!terms.length)return esc(text);var ex=[];terms.forEach(function(x){variantsOf(x).forEach(function(v){if(ex.indexOf(v)<0)ex.push(v)})});ex.sort(function(a,b){return b.length-a.length});var re=new RegExp('('+ex.map(function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('|')+')','gi');return text.split(re).map(function(p,i){return i%2?'<mark>'+esc(p)+'</mark>':esc(p)}).join('')}
function passFilters(e){
  var b=e.boards[0];
  if(S.fProduct&&!(b&&b.product===S.fProduct))return false;
  if(S.fType&&!(b&&b.researchType===S.fType))return false;
  if(S.fYear&&e.year!==S.fYear)return false;
  if(exActive()&&!(e.ex||[]).some(function(r){return r.f.some(exFindingOk)}))return false;
  return true;
}
/* Every passage a study offers as one unit: a paragraph of a document, a board field, a tagged finding, an Explorer finding or quote. */
function passageUnits(e){
  var U=[];
  e.docs.forEach(function(d){var para=[];(d.lines||[]).forEach(function(l){if(!String(l).trim()){if(para.length)U.push(para.join(' '));para=[]}else para.push(l)});if(para.length)U.push(para.join(' '))});
  e.boards.forEach(function(b){if(b.title)U.push(b.title);if(b.summary)U.push(b.summary);(b.keyFindings||[]).forEach(function(k){U.push(k)})});
  e.sfs.forEach(function(f){if(f.summary)U.push(f.summary)});
  (e.ex||[]).forEach(function(r){r.f.forEach(function(f){if(exFindingOk(f))U.push(f.x)});r.q.forEach(function(q){U.push(q.x)})});
  return U;
}
/* The largest set of keywords that appear together in one passage. */
function togetherSet(e,terms){
  var best=new Set();
  passageUnits(e).forEach(function(u){var m=mt(u,terms);if(m.length>best.size)best=new Set(m)});
  return best;
}
function searchEnt(e,terms){
  var H={q:[],quote:[],find:[],ctx:[],board:[],sf:[],ex:[],exq:[]},got=new Set();
  var add=function(arr,it,m){arr.push(it);m.forEach(function(x){got.add(x)})};
  e.docs.forEach(function(d){
    var used=new Set();
    d.questions.forEach(function(q){var m=mt(q.text,terms);if(m.length){add(H.q,{d:d,q:q,m:m},m);used.add(q.line)}});
    d.quotes.forEach(function(q){var m=mt(q.text,terms);if(m.length){add(H.quote,{d:d,q:q,m:m},m);used.add(q.line)}});
    d.findings.forEach(function(f){var m=mt(f.text,terms);if(m.length){add(H.find,{d:d,f:f,m:m},m);used.add(f.line)}});
    if(d.type!=='guide'&&d.type!=='screener'&&d.type!=='placeholder'){var n=0;for(var i=0;i<d.lines.length&&n<5;i++){if(used.has(i+1))continue;var ln=d.lines[i];if(ln.length<25)continue;var m=mt(ln,terms);if(m.length){add(H.ctx,{d:d,line:i+1,text:ln.trim().slice(0,420),m:m},m);n++}}}
  });
  e.boards.forEach(function(b){
    var m=mt(b.title,terms);if(m.length)add(H.board,{b:b,field:'Title',text:b.title,m:m},m);
    if(b.summary){m=mt(b.summary,terms);if(m.length)add(H.board,{b:b,field:'Summary',text:b.summary,m:m},m)}
    (b.keyFindings||[]).forEach(function(k){var m2=mt(k,terms);if(m2.length)add(H.board,{b:b,field:'Key finding',text:k,m:m2},m2)});
  });
  e.sfs.forEach(function(f){var m=mt(f.summary,terms);if(m.length)add(H.sf,{f:f,m:m},m)});
  (e.ex||[]).forEach(function(r){
    r.f.forEach(function(f){if(!exFindingOk(f))return;var m=mt(f.x,terms);if(m.length)add(H.ex,{r:r,f:f,m:m},m)});
    r.q.forEach(function(q){var m=mt(q.x,terms);if(m.length)add(H.exq,{r:r,q:q,m:m},m)});
  });
  if(e.exOnly){mt(e.title,terms).forEach(function(x){got.add(x)})}
  if(terms.length>1&&S.mode==='all')got=togetherSet(e,terms);
  var total=H.q.length+H.quote.length+H.find.length+H.ctx.length+H.board.length+H.sf.length+H.ex.length+H.exq.length;
  return {H:H,got:got,total:total};
}
function runSearch(){
  var terms=parseTerms(S.terms);
  var pool=ENTS.filter(passFilters);
  if(!terms.length){
    if(!exActive())return {terms:terms,pool:pool,results:[]};
    var br=[];
    pool.forEach(function(e){var H={q:[],quote:[],find:[],ctx:[],board:[],sf:[],ex:[],exq:[]};(e.ex||[]).forEach(function(r){r.f.forEach(function(f){if(exFindingOk(f))H.ex.push({r:r,f:f,m:[]})})});if(H.ex.length)br.push({e:e,r:{H:H,got:new Set(),total:H.ex.length},score:H.ex.length})});
    br.sort(function(a,b){return b.score-a.score||String(b.e.year).localeCompare(String(a.e.year))});
    return {terms:terms,pool:pool,results:br,browse:true};
  }
  var res=[];
  pool.forEach(function(e){var r=searchEnt(e,terms);var ok=S.mode==='all'?r.got.size===terms.length:r.got.size>0;if(ok)res.push({e:e,r:r,score:r.got.size*1000+Math.min(r.total,500)})});
  res.sort(function(a,b){return b.score-a.score||String(b.e.year).localeCompare(String(a.e.year))});
  return {terms:terms,pool:pool,results:res};
}

/* ---------- rendering: shared ---------- */
function srcLink(d,line){return '<a class="src" href="'+esc(d.link.split('#')[0]+(line?'#L'+line:''))+'" target="_blank" rel="noopener" title="'+esc(d.path)+'">'+esc(d.file)+(line?' · L'+line:'')+'</a>'}
function typeChip(t){return '<span class="chip mono">'+esc(t)+'</span>'}
function actions(id){return '<button class="btn sm ghost pinbtn'+(pinned(id)?' on':'')+'" data-act="pin" data-id="'+esc(id)+'" aria-pressed="'+pinned(id)+'">'+(pinned(id)?'Pinned ✓':'Pin')+'</button> <button class="btn sm quiet" data-act="cite" data-id="'+esc(id)+'">Copy citation</button>'}
function limited(items,render,n){n=n||8;if(items.length<=n)return '<ul class="hits">'+items.map(render).join('')+'</ul>';return '<ul class="hits">'+items.slice(0,n).map(render).join('')+'</ul><details class="more"><summary>Show '+(items.length-n)+' more</summary><ul class="hits">'+items.slice(n).map(render).join('')+'</ul></details>'}
function sec(title,count,body,open){return '<details class="sec"'+(open?' open':'')+'><summary>'+esc(title)+' <span class="n">'+count+'</span></summary><div class="secbody">'+body+'</div></details>'}

var ABBR=/(?:\b(?:e\.g|i\.e|vs|etc|approx|Dr|Mr|Ms|St|No|U\.S|a\.m|p\.m)\.)$/i;
function splitSentences(t){
  var out=[];
  String(t).replace(/([.!?]["”’)\]]*)\s+(?=[A-Z“"‘'(\[0-9])/g,'$1\u0001').split('\u0001').forEach(function(p){
    if(out.length&&ABBR.test(out[out.length-1]))out[out.length-1]+=' '+p;else out.push(p)});
  return out;
}
function chunkSummary(text){
  var chunks=[];
  String(text).split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).forEach(function(p){
    if(p.length<=360){chunks.push(p);return}
    var cur='';
    splitSentences(p).forEach(function(s){if(cur&&(cur+' '+s).length>320){chunks.push(cur);cur=s}else cur=cur?cur+' '+s:s});
    if(cur)chunks.push(cur);
  });
  return chunks;
}
/* Many board summaries are Markdown with the line breaks stripped ("Key Findings ==== - a - b", "1. a 2. b").
   Only unambiguous markers are used to recover structure; everything else stays prose. */
var SETEXT=/\s((?:[A-Z][\w'’&\/-]*\s+){0,4}[A-Z][\w'’&\/-]*)\s+(?:={3,}|-{3,})\s+/g;
var NUMB=/(?:^|\s)(\d{1,2})[.)]\s+(?=[A-Z"“(])/g;
var BUL=/(?:^|\s)(?:•\s*|-\s+(?=[A-Z0-9"“(‘']))/g;
function bulletIdx(x){
  var idx=[],m;BUL.lastIndex=0;
  while((m=BUL.exec(x))){var prev=m.index>0?x.charAt(m.index-1):'',nxt=x.charAt(BUL.lastIndex);if(/\d/.test(prev)&&/\d/.test(nxt))continue;idx.push({s:m.index,e:BUL.lastIndex})}
  return idx;
}
function listBuild(x,idx,kind){
  var out=[],intro=x.slice(0,idx[0].s).trim();
  if(intro){
    var lead=intro,label='';
    if(!/[.!?:\u201d")\]]\s*$/.test(intro)){
      var ss=splitSentences(intro),lastS=ss[ss.length-1];
      if(lastS.length<=70&&!/\b(to|of|the|a|an|and|or|for|with|that|which|we|is|are|will|in|on|by)$/i.test(lastS)){label=lastS;lead=ss.slice(0,-1).join(' ')}
    }
    if(lead)(kind==='ol'?listify(lead):[{t:'text',x:lead}]).forEach(function(b){out.push(b)});
    if(label)out.push({t:'h',x:label});
  }
  var items=idx.map(function(i,k){return x.slice(i.e,k+1<idx.length?idx[k+1].s:x.length).trim()}).filter(Boolean);
  out.push({t:kind,items:items});
  return out;
}
function listify(x){
  var idx=[],m;
  NUMB.lastIndex=0;
  while((m=NUMB.exec(x)))idx.push({s:m.index,e:NUMB.lastIndex,n:+m[1]});
  if(idx.length>=2&&idx[0].n===1&&(idx[1].n===2||idx.every(function(i){return i.n===1})))return listBuild(x,idx,'ol');
  idx=bulletIdx(x);
  if(idx.length>=2)return listBuild(x,idx,'ul');
  return [{t:'text',x:x}];
}
function parseSummary(text){
  var src=' '+String(text).replace(/\s+/g,' ').trim()+' ',segs=[],last=0,m;
  SETEXT.lastIndex=0;
  while((m=SETEXT.exec(src))){
    var pre=src.slice(last,m.index).trim();
    if(pre)segs.push({t:'text',x:pre});
    segs.push({t:'h',x:m[1].trim()});
    last=SETEXT.lastIndex-1;
  }
  var tail=src.slice(last).trim();if(tail)segs.push({t:'text',x:tail});
  var out=[];
  segs.forEach(function(s){if(s.t==='h')out.push(s);else listify(s.x).forEach(function(b){out.push(b)})});
  return out;
}
function itemHtml(i,terms,nest){
  if(nest){
    var bi=bulletIdx(i);
    if(bi.length>=2){
      var parts=listBuild(i,bi,'ul'),ul=parts.filter(function(x){return x.t==='ul'})[0],intro=parts.filter(function(x){return x.t!=='ul'}).map(function(x){return x.x}).join(' ');
      return (intro?hl(intro,terms)+' ':'')+'<ul class="sumlist sub">'+ul.items.map(function(z){return '<li>'+hl(z,terms)+'</li>'}).join('')+'</ul>';
    }
  }
  return hl(i,terms);
}
function summaryUnits(blocks,terms){
  var u=[];
  blocks.forEach(function(b){
    if(b.t==='h')u.push({k:'h',txt:b.x,html:'<h5 class="sumh">'+hl(b.x,terms)+'</h5>'});
    else if(b.t==='ul'||b.t==='ol')u.push({k:'l',txt:b.items.join(' '),html:'<'+b.t+' class="sumlist">'+b.items.map(function(i){return '<li>'+itemHtml(i,terms,b.t==='ol')+'</li>'}).join('')+'</'+b.t+'>'});
    else chunkSummary(b.x).forEach(function(p){u.push({k:'p',txt:p,html:'<p>'+hl(p,terms)+'</p>'})});
  });
  return u;
}
function boardSummaryHtml(text,terms){
  var blocks=parseSummary(text);if(!blocks.length)return '';
  var lede='';
  if(blocks[0].t==='text'){
    var ch=chunkSummary(blocks[0].x),ss=splitSentences(ch[0]),first=ss.slice(1).join(' '),rest=(first?[first]:[]).concat(ch.slice(1));
    lede='<p class="lede'+(ss[0].length>260?' long':'')+'">'+hl(ss[0],terms)+'</p>';
    blocks=(rest.length?[{t:'text',x:rest.join(' ')}]:[]).concat(blocks.slice(1));
  }
  var units=summaryUnits(blocks,terms),h='<div class="sumtext">'+lede;
  if(String(text).length<=520||units.length<=1){h+=units.map(function(x){return x.html}).join('')}
  else{
    var vis=units[0].k==='p'?1:0,hid=units.slice(vis),op=terms.length&&hid.some(function(x){return mt(x.txt,terms).length});
    h+=units.slice(0,vis).map(function(x){return x.html}).join('')+'<details class="rest"'+(op?' open':'')+'><summary>Read the full summary</summary>'+hid.map(function(x){return x.html}).join('')+'</details>';
  }
  return h+'</div>';
}
var KF_BUL=/^\s*(?:[-*•]|\d+[.)])\s+/;
function kfParse(raw){
  var t=String(raw).replace(KF_BUL,'').trim();
  if(/:\s*$/.test(t))return {h:true,t:t.replace(/:\s*$/,'')};
  var m=t.match(/^([A-Z][^:.!?]{2,48}):\s+([\s\S]+)$/);
  return m?{label:m[1],rest:m[2],t:t}:{t:t};
}
function kfHtml(b,terms){
  var items=(b.keyFindings||[]).map(function(k,i){return {raw:k,i:i,p:kfParse(k)}}).filter(function(x){return x.p.t});
  if(!items.length)return {html:'',n:0,m:0};
  items.forEach(function(x){x.m=!x.p.h&&mt(x.raw,terms).length>0});
  var n=items.filter(function(x){return !x.p.h}).length,m=items.filter(function(x){return x.m}).length;
  var coll=items.length>6,show=new Set();
  if(coll){
    if(m){items.forEach(function(x,j){if(x.m){show.add(j);for(var k=j-1;k>=0&&k>=j-6;k--){if(items[k].p.h){show.add(k);break}}}})}
    else items.slice(0,5).forEach(function(x,j){show.add(j)});
  }
  var firstShown=coll?Math.min.apply(null,Array.from(show)):0;
  var li=items.map(function(x,j){
    var cls='kf-i'+(x.p.h?' kf-h':'')+(x.m?' kf-m':'')+(coll&&show.has(j)?' show':'')+(coll&&j===firstShown?' first':'');
    var body;
    if(x.p.h)body='<span class="kf-t">'+hl(x.p.t,terms)+'</span>';
    else{
      var txt=x.p.label?(/^(finding|key finding)\s*#?\d+$/i.test(x.p.label)?esc(x.p.label)+': '+hl(x.p.rest,terms):'<b>'+hl(x.p.label,terms)+':</b> '+hl(x.p.rest,terms)):hl(x.p.t,terms);
      var long=x.p.t.length>360&&!x.m;
      var pid=reg({kind:'Board key finding',text:x.raw,study:b.title,file:'Board issue #'+b.number,path:null,line:null,link:b.url,board:b.number,snapshot:IDX.board.lastRefresh},'#'+x.i);
      body='<div class="kf-b"><span class="kf-t'+(long?' clamp':'')+'">'+txt+'</span>'+(long?'<button type="button" class="linkbtn" data-act="clamp">More</button>':'')+'</div><button type="button" class="btn sm ghost kf-pin" data-act="pin" data-id="'+esc(pid)+'" aria-label="Pin this key finding">'+(pinned(pid)?'Pinned ✓':'Pin')+'</button>';
    }
    return '<li class="'+cls+'">'+body+'</li>';
  }).join('');
  var tog=coll?'<button type="button" class="linkbtn kf-toggle" data-act="kf-toggle" data-n="'+n+'" aria-expanded="false">Show all '+n+' key findings</button>':'';
  return {html:'<div class="kfwrap'+(coll?' kf-collapsed':'')+'"><ul class="kf">'+li+'</ul>'+tog+'</div>',n:n,m:m};
}
function boardBlock(b,terms){
  var sm=b.summary&&mt(b.summary,terms).length>0,kf=kfHtml(b,terms);
  var h='<div class="bblock"><div class="meta"><a class="src" href="'+esc(b.url)+'" target="_blank" rel="noopener">Board issue #'+b.number+'</a><span>board snapshot '+fmtDate(IDX.board.lastRefresh)+'</span></div>';
  if(b.summary){
    var sid=reg({kind:'Board summary',text:b.summary,study:b.title,file:'Board issue #'+b.number,path:null,line:null,link:b.url,board:b.number,snapshot:IDX.board.lastRefresh});
    h+='<div class="bsub"><span>Summary</span><span class="bact">'+actions(sid)+'</span></div>'+boardSummaryHtml(b.summary,terms);
  }
  if(kf.n)h+='<div class="bsub"><span>Key findings <span class="n">'+kf.n+(terms.length&&kf.m?' · '+kf.m+' matching':'')+'</span></span></div>'+kf.html;
  if(!b.summary&&!kf.n)h+='<div class="empty">This board entry has no summary or key findings.</div>';
  return {html:h+'</div>',m:(sm?1:0)+kf.m};
}
function pinOf(kind,d,o){return {kind:kind,text:o.text,study:o.study,file:d.file,path:d.path,line:o.line,link:o.link,lastCommit:d.lastCommit,participant:o.participant,role:o.role,attribution:o.attribution,ts:o.ts,section:o.section,docType:d.type}}

function coverChip(x,terms){
  if(!terms||terms.length<2)return '';
  var miss=terms.filter(function(t){return !x.r.got.has(t)});
  if(!miss.length)return '<span class="chip good">Has all '+terms.length+' keywords</span>';
  return '<span class="chip warn">Has '+(terms.length-miss.length)+' of '+terms.length+' · missing: '+esc(miss.join(', '))+'</span>';
}
function studyCard(x,terms){
  var e=x.e,H=x.r.H,b=e.boards[0];
  var chips=[],sub=[];
  var cov=coverChip(x,terms);if(cov)chips.push(cov);
  var nex=(e.ex||[]).reduce(function(a,r){return a+r.f.length},0);
  if(e.docs.length){chips.push('<span class="chip good">Full text indexed · '+e.docs.length+' file'+(e.docs.length>1?'s':'')+'</span>');if(nex)chips.push('<span class="chip">+ '+nex+' Explorer findings</span>')}
  else if(e.exOnly)chips.push('<span class="chip warn">Research Explorer only · '+nex+' auto-labelled findings · not on the project board · questions asked are not in this index</span>');
  else if(nex)chips.push('<span class="chip warn">Board entry + '+nex+' Explorer findings · questions asked are not in this index</span>');
  else chips.push('<span class="chip warn">Board entry only · questions asked are not in this index</span>');
  if(b){var subp=[b.status,b.team,b.product?(b.product+(b.subProduct?' / '+b.subProduct:'')):'',b.researchType].filter(Boolean);if(subp.length)sub.push(subp.join(' · '));
    var dts=[b.startDate&&('started '+b.startDate),b.completedDate&&('completed '+b.completedDate)].filter(Boolean).join(' · ');if(dts)sub.push(dts)}
  else if(e.exOnly&&e.ex&&e.ex[0]){var r0=e.ex[0];sub.push([r0.team,r0.prod,'report date '+r0.d,r0.n?r0.n+' participants':'',(r0.m||[]).slice(0,2).join(', ')].filter(Boolean).join(' · '))}
  else if(e.year)sub.push('year in folder name: '+e.year);
  var types={};e.docs.forEach(function(d){types[d.type]=(types[d.type]||0)+1});
  var typeChips=Object.keys(types).map(function(t){return typeChip(t+(types[t]>1?' ×'+types[t]:''))}).join(' ');
  var missing=[];if(e.docs.length){['plan','guide','findings'].forEach(function(t){if(!types[t])missing.push(t)})}
  var links=[];
  e.boards.forEach(function(bb){links.push('<a href="'+esc(bb.url)+'" target="_blank" rel="noopener">Board issue #'+bb.number+' ↗</a>');if(bb.researchFolderUrl)links.push('<a href="'+esc(bb.researchFolderUrl)+'" target="_blank" rel="noopener">Research folder in va.gov-team ↗</a>')});
  (e.ex||[]).slice(0,3).forEach(function(r){links.push('<a href="'+esc(r.u)+'" target="_blank" rel="noopener" title="'+esc(r.p)+'">Report: '+esc(r.p.split('/').pop())+' ↗</a>')});
  if((e.ex||[]).length>3)links.push('<span>+ '+(e.ex.length-3)+' more reports</span>');
  var h='<article class="study"><header><h3>'+hl(e.title,terms)+'</h3>'+(sub.length?'<div class="subline">'+esc(sub.join(' · '))+'</div>':'')+'<div class="chips">'+chips.join('')+'</div>'+(typeChips?'<div class="chips">'+typeChips+(missing.length?' <span class="chip warn">no '+missing.join(' / no ')+' indexed</span>':'')+'</div>':'')+(links.length?'<div class="links">'+links.join('')+'</div>':'')+'</header>';
  var qRender=function(i){var p=pinOf('Question',i.d,{text:i.q.text,study:e.title,line:i.q.line,link:i.q.link,section:i.q.section});var id=reg(p);return '<li class="hit"><div class="txt">'+hl(i.q.text,terms)+'</div><div class="meta">'+typeChip(i.d.type)+srcLink(i.d,i.q.line)+(i.q.section?'<span>in “'+esc(i.q.section)+'”</span>':'')+'<span>file last committed '+fmtDate(i.d.lastCommit)+'</span>'+actions(id)+'</div></li>'};
  h+=sec('Questions asked before',H.q.length+' matching',H.q.length?limited(H.q,qRender):'<div class="empty">'+(e.docs.length?'No indexed question matches these terms.':'Not available: this study has no files in the local repo. Open its research folder in va.gov-team.')+'</div>',H.q.length>0);
  var quRender=function(i){var q=i.q;var p=pinOf('Quote',i.d,{text:q.text,study:e.title,line:q.line,link:q.link,participant:q.participant,role:q.role,attribution:q.attribution,ts:q.sessionTimestamp,section:q.section});var id=reg(p);
    return '<li class="hit"><blockquote>'+hl(q.text,terms)+'</blockquote><div class="meta"><span class="chip '+(q.participant||q.role?'':'warn')+'">'+(q.participant?'Participant '+esc(q.participant):q.role?'Role: '+esc(q.role):'No participant ID in source')+'</span><span class="chip '+(q.sessionTimestamp?'good':'')+'">'+(q.sessionTimestamp?'Session timestamp '+esc(q.sessionTimestamp):'Session timestamp not recorded in source')+'</span>'+typeChip(i.d.type)+srcLink(i.d,q.line)+'<span>file last committed '+fmtDate(i.d.lastCommit)+'</span>'+actions(id)+'</div></li>'};
  h+=sec('Participant quotes',H.quote.length+' matching',H.quote.length?limited(H.quote,quRender):'<div class="empty">No indexed quote matches these terms.</div>',H.quote.length>0);
  var fRender=function(i){var p=pinOf('Finding heading',i.d,{text:i.f.text,study:e.title,line:i.f.line,link:i.f.link});var id=reg(p);return '<li class="hit"><div class="txt">'+hl(i.f.text,terms)+'</div><div class="meta">'+typeChip(i.d.type)+srcLink(i.d,i.f.line)+'<span>file last committed '+fmtDate(i.d.lastCommit)+'</span>'+actions(id)+'</div></li>'};
  if(H.find.length)h+=sec('Findings and recommendations (headings)',H.find.length+' matching',limited(H.find,fRender),true);
  var cRender=function(i){var p=pinOf('Context line',i.d,{text:i.text,study:e.title,line:i.line,link:i.d.link.split('#')[0]+'#L'+i.line});var id=reg(p);return '<li class="hit"><div class="txt">'+hl(i.text,terms)+'</div><div class="meta">'+typeChip(i.d.type)+srcLink(i.d,i.line)+'<span>file last committed '+fmtDate(i.d.lastCommit)+'</span>'+actions(id)+'</div></li>'};
  if(H.ctx.length)h+=sec('Other matching lines in plans and reports',H.ctx.length+' shown',limited(H.ctx,cRender),false);
  var bRender=function(i){var bb=i.b;var p={kind:'Board '+i.field.toLowerCase(),text:i.text,study:bb.title,file:'Board issue #'+bb.number,path:null,line:null,link:bb.url,board:bb.number,snapshot:IDX.board.lastRefresh};var id=reg(p);return '<li class="hit"><div class="txt">'+hl(i.text,terms)+'</div><div class="meta"><span class="chip">'+esc(i.field)+'</span><a class="src" href="'+esc(bb.url)+'" target="_blank" rel="noopener">Board issue #'+bb.number+'</a><span>board snapshot '+fmtDate(IDX.board.lastRefresh)+'</span>'+actions(id)+'</div></li>'};
  if(H.board.length){
    var bbl=e.boards.map(function(bb){return boardBlock(bb,terms)});
    var bm=bbl.reduce(function(a,x){return a+x.m},0);
    h+=sec('Board summary and key findings',bm?bm+' matching':'title match only',bbl.map(function(x,i){return (e.boards.length>1?'<h4 class="btitle">'+hl(e.boards[i].title,terms)+'</h4>':'')+x.html}).join(''),!e.docs.length||(bm>0&&!H.q.length&&!H.quote.length));
  }
  var sRender=function(i){var f=i.f;var p={kind:'Structured finding',text:f.summary,study:f.sourceStudy,file:f.file,path:f.file,line:f.line,link:f.link};var id=reg(p);var labs=Object.keys(f.labels||{}).slice(0,3).map(function(k){return (f.labels[k]||[]).slice(0,3).join(', ')}).filter(Boolean).join(' · ');return '<li class="hit"><div class="txt">'+hl(f.summary,terms)+'</div><div class="meta"><span class="chip mono">'+esc(f.id)+'</span>'+(f.participants?'<span>'+esc(f.participants)+' participants</span>':'')+(labs?'<span>'+esc(labs)+'</span>':'')+'<a class="src" href="'+esc(f.link)+'" target="_blank" rel="noopener">'+esc(f.file)+' · L'+(f.line||'?')+'</a>'+actions(id)+'</div></li>'};
  if(H.sf.length)h+=sec('Tagged findings (findings.yml)',H.sf.length+' matching',limited(H.sf,sRender),true);
  var multi=(e.ex||[]).length>1;
  var exRender=function(i){var r=i.r,f=i.f;var p=exPin('Explorer finding',r,f.x,null);var id=reg(p);return '<li class="hit"><div class="txt">'+hl(f.x,terms)+'</div><div class="meta">'+exLabs(f)+'<a class="src" href="'+esc(r.u)+'" target="_blank" rel="noopener" title="'+esc(r.p)+'">'+esc(p.file)+'</a>'+(multi?'<span>'+esc(r.t)+'</span>':'')+'<span>report date '+esc(r.d)+'</span>'+actions(id)+'</div></li>'};
  if(H.ex.length)h+=sec('Findings from Research Explorer (auto-labelled)',H.ex.length+(x.browse?' with the selected labels':' matching'),limited(H.ex,exRender),true);
  var exqRender=function(i){var r=i.r,q=i.q;var t=qtxt(q.x);var p=exPin('Quote',r,t,q.l,{participant:q.p||null});var id=reg(p);return '<li class="hit"><blockquote>'+hl(t,terms)+'</blockquote><div class="meta"><span class="chip '+(q.p?'':'warn')+'">'+(q.p?'Participant '+esc(q.p)+' (from the “P#” tag on this line)':'No participant ID on this line')+'</span><span class="chip">Session timestamp not captured by this index</span><a class="src" href="'+esc(p.link)+'" target="_blank" rel="noopener" title="'+esc(r.p)+'">'+esc(p.file)+' · L'+q.l+'</a>'+(multi?'<span>'+esc(r.t)+'</span>':'')+'<span>report date '+esc(r.d)+'</span>'+actions(id)+'</div></li>'};
  if(H.exq.length)h+=sec('Participant quotes from Research Explorer reports',H.exq.length+' matching',limited(H.exq,exqRender),true);
  var oc=0;
  return (h+'</article>').replace(/<details class="sec" open>/g,function(m){return oc++?'<details class="sec">':m});
}

function ovHtml(o){
  if(!o)return '';
  if(o.short)return '<div class="ov"><span class="chip">Too short to compare</span></div>';
  if(!o.hits.length)return '<div class="ov"><span class="chip good">No similar prior question found by wording</span> <span class="hint">Wording overlap only. A differently worded question may still cover the same ground.</span></div>';
  return '<div class="ov"><span class="chip warn">'+o.hits.length+' similar prior question'+(o.hits.length>1?'s':'')+' by wording</span>'+o.hits.map(function(h){var a=h.a;return '<div class="m"><div>“'+esc(a.q.text)+'”</div><div class="meta">'+(h.same?'<span class="chip crit">Same wording</span>':'<span class="chip warn">Wording overlap '+Math.round(h.j*100)+'%</span>')+typeChip(a.d.type)+srcLink(a.d,a.q.line)+'<span>'+esc(folderTitle(a.d.folder))+'</span><span>file last committed '+fmtDate(a.d.lastCommit)+'</span></div></div>'}).join('')+'</div>';
}
function folderTitle(f){var e=ENTS.find(function(x){return x.folder===f});return e?e.title:f}

/* ---------- tab: scan (Know) ---------- */
function activeFilters(){return ['fProduct','fType','fYear','fArea','fGroup','fTheme','fStage'].filter(function(k){return S[k]}).length+(S.mode==='all'?1:0)}
function updRefine(){var sm=$('details.refine>summary');if(sm){var n=activeFilters();sm.innerHTML='Refine'+(n?' <span class="n">'+n+' on</span>':'')}}
function renderScan(){
  var prods=Array.from(new Set(IDX.board.studies.map(function(s){return s.product}).filter(Boolean))).sort();
  var types=Array.from(new Set(IDX.board.studies.map(function(s){return s.researchType}).filter(Boolean))).sort();
  var years=Array.from(new Set(ENTS.map(function(e){return String(e.year||'')}).filter(function(y){return /^(19|20)\d\d$/.test(y)}))).sort().reverse();
  var opt=function(list,cur,all){return '<option value="">'+all+'</option>'+list.map(function(v){return '<option'+(v===cur?' selected':'')+'>'+esc(v)+'</option>'}).join('')};
  var local=ENTS.filter(function(e){return e.docs.length}).length;
  var boardOnly=ENTS.filter(function(e){return !e.docs.length&&!e.exOnly}).length;
  var boardWithEx=ENTS.filter(function(e){return !e.docs.length&&!e.exOnly&&(e.ex||[]).length}).length;
  var exOnlyN=ENTS.filter(function(e){return e.exOnly}).length;
  var exNotice='',exRow='';
  if(EXI){
    var nf=EXI.source.findings,withStage=0;EXI.reports.forEach(function(r){r.f.forEach(function(f){if(f.l.js)withStage++})});
    var L=EXI.labels,eopt=function(list,cur,all){return '<option value="">'+all+'</option>'+list.map(function(v){return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(exName(v))+'</option>'}).join('')};
    exNotice='<div class="notice"><b>Research Explorer layer.</b> '+EXI.source.reports+' reports and '+nf.toLocaleString()+' findings (snapshot '+esc(fmtDate(EXI.source.generatedAt))+') are joined to studies by research folder. <b>'+boardWithEx+'</b> of the board-only studies now show findings, and <b>'+exOnlyN+'</b> reports have no board issue and appear as their own entries. Labels are assigned automatically from keywords, each with a confidence score. Use them to find evidence, not as conclusions. Journey stage is present on only '+Math.round(withStage/nf*100)+'% of findings.</div>';
    exRow='<div class="row"><div class="field"><label for="fArea">Product area</label><select id="fArea">'+eopt(L.pa,S.fArea,'Any area')+'</select></div><div class="field"><label for="fGroup">User group</label><select id="fGroup">'+eopt(L.ug,S.fGroup,'Any group')+'</select></div><div class="field"><label for="fTheme">Theme</label><select id="fTheme">'+eopt(L.th,S.fTheme,'Any theme')+'</select></div><div class="field"><label for="fStage">Journey stage</label><select id="fStage">'+eopt(L.js,S.fStage,'Any stage')+'</select></div></div><div class="hint">These four use the Research Explorer’s automatic labels. Pick one with the search box empty to browse every finding that carries it.</div>';
  }
  var n=activeFilters();
  var tries=['caregiver','sign in','wayfinding'].map(function(t){return '<button class="chip" data-act="try" data-t="'+esc(t)+'">'+esc(t)+'</button>'}).join('');
  return '<section class="know"><h1>What are you researching?</h1><p class="lede">Search past VA research before you plan. You will see what is already known, what was asked, and where the gaps are.</p>'+
  '<div class="searchbox"><label class="sr" for="terms">Topic terms</label><input type="search" id="terms" value="'+esc(S.terms)+'" placeholder="A product, a group of Veterans, or a task" autocomplete="off"></div><div class="hint" style="margin-top:8px">Phrases match as written: <b>sign in</b> finds “sign in”. Put words in quotes to search them one at a time: <b>"sign" "in"</b>.</div>'+
  '<div class="tryrow"><span>Try</span>'+tries+'</div>'+
  '<details class="refine"'+(n?' open':'')+'><summary>Refine'+(n?' <span class="n">'+n+' on</span>':'')+'</summary><div class="refbody">'+
  '<div class="row"><div class="field"><label for="mode">Match</label><select id="mode"><option value="any"'+(S.mode==='any'?' selected':'')+'>Any keyword</option><option value="all"'+(S.mode==='all'?' selected':'')+'>All keywords</option></select></div>'+
  '<div class="field"><label for="fProduct">Product</label><select id="fProduct">'+opt(prods,S.fProduct,'All products')+'</select></div>'+
  '<div class="field"><label for="fType">Research type</label><select id="fType">'+opt(types,S.fType,'All types')+'</select></div>'+
  '<div class="field"><label for="fYear">Year</label><select id="fYear">'+opt(years,S.fYear,'All years')+'</select></div></div>'+exRow+
  '<div><button class="btn sm quiet" data-act="clearf">Clear filters</button></div></div></details>'+
  '<details class="about"><summary>How this search works</summary><div class="notice">Unquoted text is searched as one phrase, matched exactly as written (case and extra spaces ignored). Words in quotes are searched separately; “Any keyword” means at least one of them matches, and “All keywords” means all must. Search matches wording, not meaning, so try several phrasings. <b>'+local+'</b> studies have full text in the local repo (plans, guides, findings). <b>'+boardOnly+'</b> more appear only as project board entries with a summary and a link to their folder in va.gov-team; their questions are not in this index.</div>'+exNotice+'</details></section>'+
  '<div id="scanOut"></div>'+bp('scan')+
  '<details class="qchk"><summary>Check questions you have already drafted</summary><p class="lead">Paste draft questions, one per line. Each is compared with every indexed question from guides, plans, screeners and reports.</p><div class="field"><label for="qcheck">Draft questions</label><textarea id="qcheck" placeholder="One question per line">'+esc(S.qcheck)+'</textarea></div><button class="btn" data-act="qcheck">Check wording overlap</button><div id="qOut" style="margin-top:12px"></div></details>';
}
function topLabels(map,n){return Object.keys(map).sort(function(a,b){return map[b]-map[a]||a.localeCompare(b)}).slice(0,n)}
function summaryHtml(sr){
  var R=sr.results,nFull=R.filter(function(x){return x.e.docs.length}).length;
  var nq=0,nquote=0,nfind=0,pa={},ug={},yrs=[],exF=0;
  R.forEach(function(x){var H=x.r.H;nq+=H.q.length;nquote+=H.quote.length+H.exq.length;nfind+=H.find.length+H.ex.length+H.sf.length;
    H.ex.forEach(function(i){exF++;var l=i.f.l;if(l.pa)pa[l.pa[0]]=(pa[l.pa[0]]||0)+1;if(l.ug)ug[l.ug[0]]=(ug[l.ug[0]]||0)+1});
    if(/^(19|20)\d\d$/.test(String(x.e.year)))yrs.push(String(x.e.year))});
  yrs.sort();
  var synUsed=sr.browse?[]:sr.terms.filter(function(x){return SYN[baseW(x)]}).map(function(x){return '“'+esc(x)+'” → '+SYN[baseW(x)].map(function(v){return esc(v)}).join(', ')});
  var synLine=synUsed.length?'<p class="for" style="margin-top:-12px">Also matching: '+synUsed.join(' · ')+'</p>':'';
  var what=sr.browse?'Findings with the selected labels':'Results for '+sr.terms.map(function(t){return '“'+esc(t)+'”'}).join(sr.terms.length>1?(S.mode==='all'?' and ':' or '):'');
  var span=yrs.length?(yrs[0]===yrs[yrs.length-1]?yrs[0]:yrs[0]+' to '+yrs[yrs.length-1]):'';
  var h='<section class="sum" aria-labelledby="sumh"><h2 id="sumh">What we already know</h2><p class="for">'+what+(span?' · studies from '+span:'')+' · searched '+sr.pool.length+' studies</p>'+synLine+
   '<div class="tiles"><div class="tile"><b>'+R.length+'</b><span>studies'+(nFull?' · '+nFull+' with full text':'')+'</span></div><div class="tile"><b>'+nq+'</b><span>questions asked before</span></div><div class="tile"><b>'+nquote+'</b><span>participant quotes</span></div><div class="tile"><b>'+nfind+'</b><span>findings</span></div></div>';
  if(exF){
    var tp=topLabels(pa,4),tg=topLabels(ug,4);
    h+='<div class="sumrow"><h3>Most common labels on matching Explorer findings</h3><div class="chips">'+tp.map(function(k){return '<span class="chip">'+esc(exName(k))+' · '+pa[k]+'</span>'}).join('')+tg.map(function(k){return '<span class="chip">'+esc(exName(k))+' · '+ug[k]+'</span>'}).join('')+'</div></div>';
    if(EXI&&exF>=15){var miss=EXI.labels.ug.filter(function(k){return !ug[k]});
      if(miss.length)h+='<div class="sumrow"><h3>No matching finding carries these user-group labels</h3><div class="chips">'+miss.slice(0,8).map(function(k){return '<span class="chip">'+esc(exName(k))+'</span>'}).join('')+'</div><div class="hint">This reflects automatic labels on the findings that matched your words. It is a lead to check, not proof that nobody was studied.</div></div>'}
  }
  return h+'<div class="sumrow"><div class="hint">Pin anything useful. Pinned items carry into your plan, guide and report with their source.</div></div></section>';
}
/* When an unquoted phrase finds nothing, offer the same words as quoted keywords. */
var WEAK=new Set(['use','uses','used','using','make','makes','get','gets','need','needs','want','wants','find','know','how','what','who','where','when','which','there','their','they','them','have','has','had','some','more','just']);
function kwFallback(terms){
  if(terms.length!==1||terms[0].indexOf(' ')<0)return '';
  var ws=terms[0].split(' ').map(function(w){return w.replace(/[^a-z0-9]/g,'')}).filter(function(w){return w.length>1&&!STOP.has(w)&&!WEAK.has(w)}).map(function(w){return w.length>3&&/s$/.test(w)&&!/ss$/.test(w)?w.slice(0,-1):w});
  ws=Array.from(new Set(ws)).slice(0,6);
  if(ws.length<2)return '';
  return ws.map(function(w){return '"'+w+'"'}).join(' ');
}
function drawScan(){
  var out=$('#scanOut');if(!out)return;
  var sr=runSearch();PINREG={};
  if(!sr.terms.length&&!sr.browse){out.innerHTML='<p class="hushed">Results appear here. Nothing is suggested until you search.</p>';return}
  var h=summaryHtml(sr);
  if(!sr.results.length){var kwq=kwFallback(sr.terms);
    if(kwq)h+='<div class="notice warn"><b>No study has this exact phrase.</b> Studies often use different wording or word forms. Search the key words separately:<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" data-act="kw" data-m="all" data-kw="'+esc(kwq)+'">Search these words, all must match</button><button class="btn sm ghost" data-act="kw" data-m="any" data-kw="'+esc(kwq)+'">Any of these words</button></div><div class="hint" style="margin-top:8px">Will search: '+esc(kwq)+'</div></div>';
  }
  if(!sr.results.length)h+='<div class="notice warn">No study matches. Try another wording, switch to “Any keyword” under Refine, or clear a filter. Absence here does not prove nothing was studied: studies outside this index are not searched.</div>';
  h+=sr.results.slice(0,S.show).map(function(x){return studyCard(x,sr.terms)}).join('');
  if(sr.results.length>S.show)h+='<button class="btn ghost" data-act="more">Show 10 more studies ('+(sr.results.length-S.show)+' remaining)</button>';
  out.innerHTML=h;
}

/* ---------- tab: plan ---------- */
var PLAN=[
 {sec:'Details',items:[
  {id:'title',label:'Plan title',hint:'Template: "Research Plan for [Team, Product, Date]".',req:1},
  {id:'author',label:'Author',hint:'Template field: your name or GitHub handle.'},
  {id:'product',label:'Product name',req:1},
  {id:'journey',label:'Veteran journey stage',hint:'Template options start "Joining | Serving | …". See the Veteran Journey section of the template for the full list.'},
  {id:'octo',label:'OCTO-DE priority this research supports',hint:'Template: work with your VA lead and product manager.'}]},
 {sec:'Background',items:[
  {id:'bg_problem',label:'What problem is your product trying to solve?',area:1,req:1},
  {id:'bg_where',label:'Where is your product situated on VA.gov? (ex: auth vs. unauth)',req:1},
  {id:'bg_fam',label:'What is Veterans’ familiarity with this tool? Is this a new product or an iteration on an existing one?',area:1,req:1},
  {id:'bg_brief',label:'Product brief (link)'}]},
 {sec:'Research goals',items:[
  {id:'goal1',label:'Goal 1',hint:'What are you trying to learn from this research? Template limit: 3 goals per study. If you have more, consider breaking the research into iterative studies.',req:1,area:1},
  {id:'goal2',label:'Goal 2',area:1},{id:'goal3',label:'Goal 3',area:1},
  {id:'outcome',label:'Outcome',hint:'How will this research advance your product to the next phase in the design process? What will you do with your learnings?',area:1,req:1}]},
 {sec:'Hypotheses',items:[
  {id:'hyp',label:'Hypotheses (one per line)',hint:'Template prompts: What do you intend to learn and measure? What do you already know about this problem space? What do you think users will do or think? Write a generalized statement that combines what you know and what you think will happen. Keep hypotheses within the goals of your study.',area:1,req:1,tall:1}]},
 {sec:'Methodology',items:[
  {id:'method',label:'Method',hint:'Describe the method you are planning. Explain why it is appropriate for the goals of the research and the maturity of the design.',area:1,req:1},
  {id:'location',label:'Location',hint:'See the Location section of the template.',req:1}]},
 {sec:'Research materials',items:[
  {id:'materials',label:'Links to materials',hint:'Conversation guide, prototype (moderated usability), emails or sessions (unmoderated), recruitment flyer if recruiting outside Perigean. Template: your OCTO/VA lead must review and approve all materials, including this plan, before you submit a recruitment request.',area:1}]},
 {sec:'Recruitment',items:[
  {id:'recruit',label:'Recruitment approach',hint:'Who is your intended audience (Veterans, caregivers, VSOs, SMEs) and how will you recruit them? Template: Perigean cannot recruit VA employees or VSOs. Which inclusive research strategies are you using? OCTO recommends lean maximum variation for most studies.',area:1,req:1},
  {id:'n_ideal',label:'Ideal completed sessions',num:1,req:1},{id:'n_vets',label:'Veterans',num:1},{id:'n_cg',label:'Caregivers',num:1},{id:'n_dep',label:'Dependents',num:1},{id:'n_total',label:'Total participants to request',num:1,ratio:1},
  {id:'crit_p',label:'Primary criteria (must-haves)',hint:'Write criteria for experience or scenarios as screener questions with qualifying responses. Perigean uses these verbatim. More criteria make it less likely a small sample meets all of them.',area:1,req:1},
  {id:'crit_s',label:'Secondary criteria (nice-to-haves)',hint:'What criteria would strengthen your results?',area:1}]},
 {sec:'Timeline',items:[
  {id:'kickoff',label:'Optional kick-off call with Perigean: suggested dates and times'},
  {id:'pilot_name',label:'Pilot participant name',hint:'Template: a pilot session is required. Send the pilot participant email in the study Slack channel.',req:1},
  {id:'pilot_date',label:'Date and time of pilot session',req:1},
  {id:'dates',label:'Planned dates of research (MM/DD-MM/DD)',req:1},
  {id:'len',label:'Session length',hint:'e.g. 30 minutes, under 1 hour, up to 2 hours.',req:1},
  {id:'buffer',label:'Buffer time between sessions',hint:'Template recommends 30 minutes.'},
  {id:'maxday',label:'Maximum sessions per day'},
  {id:'avail',label:'Availability (exact dates and times, Eastern)',hint:'Template: provide at least double the number of time slots as participants requested, and consider hours outside the workday.',area:1}]},
 {sec:'Team roles',roles:1,items:[]},
 {sec:'Approvals',items:[{id:'approvals',label:'Approvals',hint:'Template: reviewed by OCTO Product Owner or Team Lead (date), and by OCTO Research-Ops Lead (date).',area:1}]}
];
var ROLES=[['moderator','Moderator'],['guidewriter','Research guide writing and task development'],['recruiter','Participant recruiting and screening'],['poc','Project point of contact'],['a11y','Accessibility specialist (for sessions that may need assistive technology support)'],['notetakers','Note-takers, or “Perigean”'],['observers','Observers']];
var JOURNEYS=['Joining','Serving','Getting Out','Starting Up','Taking Care of Myself','Reinventing Myself','Putting Down Roots','Retiring','Aging','Dying'];
function whyHint(t){return t?'<details class="why"><summary>Why this?</summary><div class="hint">'+esc(t)+' <span class="chip mono">repo plan template</span></div></details>':''}
function planField(f){
  var id='pl_'+f.id,v=S.plan[f.id]||'';
  var extra='';
  if(f.id==='journey'){
    var cur=v.split(',').map(function(x){return x.trim()}).filter(Boolean);
    return '<fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;padding:0;margin-bottom:6px">Veteran journey stage<span class="req" style="margin-left:8px">pick all</span></legend>'+whyHint('Where does your product fit into the Veteran journey? Are there moments that matter? The template says to delete journeys not supported by this research. The Veteran Journey Map PDF is linked from the template.')+'<div class="jgrid">'+JOURNEYS.map(function(j){return '<label class="chk"><input type="checkbox" data-jr="'+esc(j)+'"'+(cur.indexOf(j)>-1?' checked':'')+'> '+esc(j)+'</label>'}).join('')+'</div></fieldset>';
  }
  if(f.ratio){var n=parseFloat(S.plan.n_ideal);extra='<div class="hint">Template rule: request 1.5× your ideal completed sessions'+(isFinite(n)&&n>0?' (for '+n+' ideal sessions, that is '+(Math.ceil(n*1.5*10)/10)+').':'.')+' Your entry is not changed.</div>'}
  return '<div class="field"><label for="'+id+'">'+esc(f.label)+(f.req?'<span class="req">required</span>':'')+'</label>'+whyHint(f.hint)+
    (f.area?'<textarea id="'+id+'" data-path="plan.'+f.id+'" style="'+(f.tall?'min-height:140px':'')+'">'+esc(v)+'</textarea>':'<input type="text" id="'+id+'" data-path="plan.'+f.id+'" value="'+esc(v)+'"'+(f.num?' inputmode="numeric"':'')+'>')+extra+'</div>';
}
function planSecDone(si){
  var s=PLAN[si],req=s.items.filter(function(f){return f.req});
  var ok=req.every(function(f){return (S.plan[f.id]||'').trim()});
  if(s.sec==='Research goals')ok=ok&&S.plan.rq.some(function(x){return x.trim()});
  if(!req.length&&s.sec!=='Research goals')return s.roles?Object.keys(S.plan.roles||{}).some(function(k){return (S.plan.roles[k]||'').trim()}):(s.items.some(function(f){return (S.plan[f.id]||'').trim()}));
  return ok;
}
function planMissing(){
  var m=[];
  PLAN.forEach(function(s,si){s.items.forEach(function(f){if(f.req&&!(S.plan[f.id]||'').trim())m.push({si:si,label:f.label,sec:s.sec})});
    if(s.sec==='Research goals'&&!S.plan.rq.some(function(x){return x.trim()}))m.push({si:si,label:'Research questions',sec:s.sec})});
  return m;
}
function dotsHtml(n,cur,doneFn,act,names){var o='<div class="dots" role="group" aria-label="Sections">';for(var i=0;i<n;i++){var d=doneFn(i);o+='<button data-act="'+act+'" data-i="'+i+'" class="'+(d?'done':'')+'"'+(i===cur?' aria-current="step"':'')+' aria-label="'+esc(names[i])+(d?' (done)':'')+'">'+(d&&i!==cur?'✓':(i+1))+'</button>'}return o+'</div>'}
function renderPlan(){
  var N=PLAN.length,st=Math.min(Math.max(+S.planStep||0,0),N);S.planStep=st;
  var names=PLAN.map(function(x){return x.sec}).concat(['Review and send']);
  var h='<section class="panel step"><div class="stephead"><p class="eyebrow">Research plan · step '+(st+1)+' of '+(N+1)+'</p>'+dotsHtml(N+1,st,function(i){return i<N?planSecDone(i):planMissing().length===0},'p-go',names)+'</div>';
  if(st<N){
    var s0=PLAN[st];
    h+='<h2 id="stepTitle" tabindex="-1">'+esc(s0.sec)+'</h2><p class="lead">'+(st===0?'Prompts follow the repo’s research-plan template. Anything you leave blank stays blank and is listed before you send. Nothing is filled in for you.':'&nbsp;')+'</p><div class="stepbody">';
    s0.items.forEach(function(f){h+=planField(f)});
    if(s0.sec==='Research goals'){
      h+='<div class="field"><label>Research questions<span class="req">required</span></label>'+whyHint('Do not write out every question you will ask participants. Those belong in the conversation guide. Ask of each: what will I do with what I learn, and does it serve the study goals?');
      S.plan.rq.forEach(function(q,i){h+='<div class="listrow"><div><input type="text" id="rq_'+i+'" data-path="plan.rq.'+i+'" data-ov="rqov_'+i+'" value="'+esc(q)+'" aria-label="Research question '+(i+1)+'"><div id="rqov_'+i+'"></div></div><button class="btn sm quiet" data-act="rq-del" data-i="'+i+'" aria-label="Remove question '+(i+1)+'">Remove</button></div>'});
      h+='<div><button class="btn sm ghost" data-act="rq-add">Add research question</button></div></div>';
    }
    if(s0.roles){
      h+='<div class="hint">Template: list names only, no email addresses. Keep total observers and attendees to no more than 5 or 6.</div><div class="cols">'+ROLES.map(function(r){return '<div class="field"><label for="role_'+r[0]+'">'+esc(r[1])+'</label><input type="text" id="role_'+r[0]+'" data-path="plan.roles.'+r[0]+'" value="'+esc((S.plan.roles||{})[r[0]]||'')+'"></div>'}).join('')+'</div>';
    }
    h+='</div><div class="stepnav">'+(st>0?'<button class="btn quiet" data-act="p-go" data-i="'+(st-1)+'">Back</button>':'<span></span>')+'<button class="btn" data-act="p-go" data-i="'+(st+1)+'">'+(st===N-1?'Review your plan':'Next: '+esc(names[st+1]))+'</button></div></section>'+bp('plan');
    return h;
  }
  var miss=planMissing();
  h+='<h2 id="stepTitle" tabindex="-1">Review and send</h2><p class="lead">Check what is missing, then copy or download the plan. Your OCTO/VA lead must review and approve all materials, including this plan, before you submit a recruitment request.</p><div class="stepbody">';
  if(miss.length)h+='<div class="notice warn"><b>'+miss.length+' required item'+(miss.length>1?'s are':' is')+' still blank.</b> They will appear as '+NEED+' in the export.<ul style="margin:8px 0 0;padding-left:20px">'+miss.map(function(x){return '<li><button class="btn sm quiet" data-act="p-go" data-i="'+x.si+'" style="min-height:32px">'+esc(x.sec)+': '+esc(x.label)+'</button></li>'}).join('')+'</ul></div>';
  else h+='<div class="notice">Every required field has an entry. Read it through before you send it.</div>';
  h+='<div><h3 style="margin:0 0 6px">Plan as Markdown</h3><p class="lead" style="margin:0 0 12px">Blank fields appear as '+NEED+'. Pinned prior research is appended with full citations.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-act="dl" data-what="plan">Download .md</button><button class="btn ghost" data-act="cp" data-what="plan">Copy</button></div><pre class="md" id="planMd"></pre></div>';
  h+=recHtml();
  h+='</div><div class="stepnav"><button class="btn quiet" data-act="p-go" data-i="'+(N-1)+'">Back</button><span></span></div></section>'+bp('plan');
  return h;
}
var REC_TYPES=['Various (a mix of all below)','Veterans','Veteran’s family member (such as a spouse or dependent)','Veteran’s caregiver','Service member'];
var REC_CATS=['Dates of Service','Branch of Service','Service Overseas','Service in Combat Zone','Sex','Age','Race','Residence','Education','LGBTQ+','Benefits','Benefits Received','Benefits Application Method','Access Benefits Online','Language','Device for Session','Assistive Technology'];
function recHtml(){
  return '<div><h3 style="margin:0 0 6px">Recruitment request for Perigean</h3><p class="lead" style="margin:0 0 12px">Prepares the text for the repo’s “Easy Recruitment Request” issue form. You paste it into the form yourself, because the repo needs VA sign-in. The form uses primary criteria only.</p>'+
   '<div class="notice" style="margin-bottom:12px">Enter the numbers and criteria on the earlier plan steps (Recruitment) and they flow in here. The form also asks you to pick values for: '+REC_CATS.map(esc).join(', ')+'. Choose those in the form. Nothing here selects them for you.</div>'+
   '<div class="field"><label for="rec_type">Participant types for the form</label><div class="jgrid">'+REC_TYPES.map(function(t){var on=(S.rec.types||[]).indexOf(t)>-1;return '<label class="chk"><input type="checkbox" data-rt="'+esc(t)+'"'+(on?' checked':'')+'> '+esc(t)+'</label>'}).join('')+'</div></div>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn" data-act="dl" data-what="rec">Download .md</button><button class="btn ghost" data-act="cp" data-what="rec">Copy</button></div><pre class="md" id="recMd"></pre></div>';
}
function recMd(){
  var p=S.plan,ym=(p.dates||'').trim();
  var types=S.rec.types||[];
  var parts=[];if((p.n_vets||'').trim())parts.push('Veterans: '+p.n_vets.trim());if((p.n_cg||'').trim())parts.push('Veteran’s caregiver: '+p.n_cg.trim());if((p.n_dep||'').trim())parts.push('Veteran’s family member: '+p.n_dep.trim());
  var o='# Recruitment request (Easy Recruitment Request form)\n\n**Issue title:** [Recruitment Request]: YYYY-MM '+((p.title||'').trim()||p.product&&p.product.trim()||NEED)+'\n\n';
  o+='**How many participants do you want in your study?** '+V(p.n_total)+'\n_Form note: total should be 1.5 times your ideal completed sessions._\n\n';
  o+='**How many completed sessions do you need to consider your study complete?** '+V(p.n_ideal)+'\n\n';
  o+='**What type of participants do you want to have?** '+(types.length?types.join(', '):NEED+' (choose in the section above)')+'\n\n';
  o+='**Exact participant breakdown (optional):** '+(parts.length?parts.join(', '):'(none)')+'\n\n';
  o+='**Primary criteria from your plan (must-haves). Map each to the form’s criteria categories, or add as screener questions:**\n'+V(p.crit_p)+'\n\n';
  o+='**Secondary criteria from your plan (nice-to-haves). The form takes primary criteria only, so decide which to drop or move to screener questions:**\n'+((p.crit_s||'').trim()||'(none)')+'\n\n';
  o+='**Planned dates of research:** '+V(p.dates)+'\n**Session length:** '+V(p.len)+'\n\n';
  o+='**After you submit (from the form):**\n- [ ] Copy the new card’s URL into the criteria link section of your study’s issue card on the board.\n- [ ] Move the recruitment card from Proposed to Recruitment.\n';
  return o;
}
function V(x){x=(x||'').trim();return x?x:NEED}
function priorSection(){
  if(!S.pins.length)return '';
  return '\n## Prior research referenced\n\n'+S.pins.map(function(p,i){return (i+1)+'. ['+p.kind+'] '+cite(p)}).join('\n')+'\n';
}
function planMd(){
  var p=S.plan,r=p.roles||{};
  var fm='---\ntitle: "'+V(p.title).replace(/"/g,'\\"')+'"\nauthor: "'+V(p.author)+'"\nproduct: "'+V(p.product)+'"\nveteran_journey_stage: "'+V(p.journey)+'"\nocto_priority: "'+V(p.octo)+'"\n---\n\n';
  var rq=p.rq.filter(function(x){return x.trim()}).map(function(x,i){return (i+1)+'. '+x.trim()}).join('\n')||NEED;
  return fm+'# '+V(p.title)+'\n\n## Background\n\n**What problem is your product trying to solve?**\n'+V(p.bg_problem)+'\n\n**Where is your product situated on VA.gov?**\n'+V(p.bg_where)+'\n\n**Familiarity / new product or iteration**\n'+V(p.bg_fam)+'\n\n**Product brief:** '+V(p.bg_brief)+'\n\n## Research Goals\n\n### Goals\n1. '+V(p.goal1)+'\n2. '+((p.goal2||'').trim()||'(none)')+'\n3. '+((p.goal3||'').trim()||'(none)')+'\n\n### Outcome\n'+V(p.outcome)+'\n\n### Research questions\n'+rq+'\n\n### Hypotheses\n'+V(p.hyp)+'\n\n## Methodology\n'+V(p.method)+'\n\n### Location\n'+V(p.location)+'\n\n## Research materials\n'+V(p.materials)+'\n\n## Recruitment\n\n### Recruitment approach\n'+V(p.recruit)+'\n\n- Veterans: '+V(p.n_vets)+'\n- Caregivers: '+V(p.n_cg)+'\n- Dependents: '+V(p.n_dep)+'\n- Total: '+V(p.n_total)+'\n- Ideal completed sessions: '+V(p.n_ideal)+'\n\n### Primary criteria (must-haves)\n'+V(p.crit_p)+'\n\n### Secondary criteria (nice-to-haves)\n'+((p.crit_s||'').trim()||'(none)')+'\n\n## Timeline\n\n- Optional kick-off call with Perigean: '+((p.kickoff||'').trim()||'(none)')+'\n- Pilot participant: '+V(p.pilot_name)+'\n- Pilot date and time: '+V(p.pilot_date)+'\n- Planned dates of research: '+V(p.dates)+'\n- Session length: '+V(p.len)+'\n- Buffer time: '+V(p.buffer)+'\n- Maximum sessions per day: '+V(p.maxday)+'\n\n### Availability (Eastern)\n'+V(p.avail)+'\n\n## Team Roles\n\n'+ROLES.map(function(x){return '- '+x[1]+': '+V(r[x[0]])}).join('\n')+'\n\n## Approvals\n'+V(p.approvals)+'\n'+priorSection();
}

/* ---------- tab: guide ---------- */
function guideHeadings(){
  var cnt=new Map();
  IDX.documents.filter(function(d){return d.type==='guide'}).forEach(function(d){var seen=new Set();d.headings.forEach(function(h){if(h.level<2||h.level>3)return;var k=h.text.replace(/[^\w\s&/-]/g,'').replace(/^\d+[.)]?\s*/,'').trim().toLowerCase();if(k.length<3||seen.has(k))return;seen.add(k);var c=cnt.get(k)||{n:0,label:h.text.replace(/^\d+[.)]?\s*/,'').trim()};c.n++;cnt.set(k,c)})});
  return Array.from(cnt.values()).sort(function(a,b){return b.n-a.n}).slice(0,14);
}
function renderGuide(){
  var gc=IDX.documents.filter(function(d){return d.type==='guide'}).length;
  var hs=guideHeadings(),secs=S.guide.sections,n=secs.length;
  var gs=Math.min(Math.max(+S.guideStep||0,0),Math.max(n-1,0));S.guideStep=gs;
  var h='<section class="panel step"><div class="stephead"><p class="eyebrow">Conversation guide</p></div><h2 id="stepTitle" tabindex="-1">'+(n?esc(secs[gs].title):'Start your guide')+'</h2><p class="lead">Build the guide one section at a time. Each question is compared with every indexed question from earlier studies, so you can reuse, reword or keep it knowingly.</p>';
  if(n)h+='<div class="pills" role="group" aria-label="Guide sections" style="margin-bottom:28px">'+secs.map(function(x,i){return '<button class="pl" data-act="g-go" data-i="'+i+'"'+(i===gs?' aria-current="true"':'')+'>'+esc(x.title)+'</button>'}).join('')+'</div>';
  h+='<details class="refine" style="margin:0 0 28px"'+(n?'':' open')+'><summary>'+(n?'Add or change sections':'Choose your sections')+'</summary><div class="refbody">'+
   '<div class="notice">The official conversation-guide template lives in va.gov-team (linked from the plan template) and is not in this repo, so no structure is assumed. Paste its headings below, or start from headings that recur in the '+gc+' indexed guides.</div>'+
   '<div class="field"><label for="gtmpl">Official template headings (optional)</label><textarea id="gtmpl" data-path="guide.tmpl" placeholder="Paste the headings, one per line">'+esc(S.guide.tmpl||'')+'</textarea><div><button class="btn sm ghost" data-act="g-tmpl">Create sections from these lines</button></div></div>'+
   '<div class="field"><label>Headings seen in indexed guides</label><div class="hint">Count is the number of indexed guides containing the heading.</div><div class="chips">'+hs.map(function(x){return '<button class="chip" data-act="g-addsec" data-t="'+esc(x.label)+'">+ '+esc(x.label)+' · '+x.n+'</button>'}).join('')+'</div></div>'+
   '<div class="row"><div class="field grow"><label for="newsec">New section</label><input type="text" id="newsec" placeholder="Section title"></div><button class="btn" data-act="g-newsec">Add section</button></div></div></details>';
  if(n){
    var s=secs[gs],si=gs;
    h+='<div class="stepbody">';
    if(!s.qs.length)h+='<div class="empty">No questions in this section yet.</div>';
    s.qs.forEach(function(q,qi){
      var base='guide.sections.'+si+'.qs.'+qi;var key=s.id+'|'+q.id;
      h+='<div class="field"><div class="listrow"><div><textarea id="gq_'+q.id+'" data-path="'+base+'.text" data-ov="gov_'+q.id+'" data-gq="'+esc(key)+'" style="min-height:64px" aria-label="Question '+(qi+1)+' in '+esc(s.title)+'">'+esc(q.text)+'</textarea>'+(q.from?'<div class="hint">Reused from a prior study. Source: <a href="'+esc(q.from.link)+'" target="_blank" rel="noopener">'+esc(q.from.file)+' · L'+esc(q.from.line)+'</a>, '+esc(q.from.study)+'</div>':'')+'<div id="gov_'+q.id+'"></div></div><button class="btn sm quiet" data-act="g-delq" data-si="'+si+'" data-qi="'+qi+'">Remove</button></div></div>';
    });
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="g-addq" data-si="'+si+'">Add question</button><button class="btn quiet" data-act="g-delsec" data-si="'+si+'">Remove this section</button></div></div>';
    h+='<div class="stepnav">'+(gs>0?'<button class="btn quiet" data-act="g-go" data-i="'+(gs-1)+'">Back: '+esc(secs[gs-1].title)+'</button>':'<span></span>')+(gs<n-1?'<button class="btn" data-act="g-go" data-i="'+(gs+1)+'">Next: '+esc(secs[gs+1].title)+'</button>':'<button class="btn" data-act="g-check">Check all questions</button>')+'</div>';
  }
  h+='</section>'+bp('guide')+
  '<section class="panel"><h2>Guide as Markdown</h2><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-act="dl" data-what="guide">Download .md</button><button class="btn ghost" data-act="cp" data-what="guide">Copy</button><button class="btn quiet" data-act="g-check">Check all questions</button></div><pre class="md" id="guideMd"></pre></section>';
  return h;
}
function guideMd(){
  var t=(S.plan.title||'').trim();
  var o='# Conversation Guide'+(t?' — '+t:'')+'\n\n';
  if(!S.guide.sections.length)o+=NEED+' (no sections added)\n';
  S.guide.sections.forEach(function(s){o+='## '+s.title+'\n\n';var n=0;s.qs.forEach(function(q){if(!q.text.trim())return;n++;o+=n+'. '+q.text.trim()+(q.from?'  \n   _Reused from '+q.from.study+', '+q.from.file+' L'+q.from.line+' <'+q.from.link+'>_':'')+'\n'});o+='\n'});
  return o+priorSection();
}

/* ---------- tab: early findings ---------- */
var KINDS=['Observation','Pattern across participants','Hypothesis check','Unexpected'];
var STRENGTH=['Single observation','Seen in a few sessions','Seen in most sessions','Not yet clear'];
function piiWarn(s){return /[\w.+-]+@[\w-]+\.[\w.]+/.test(s)||/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(s)||/\b\d{3}-\d{2}-\d{4}\b/.test(s)}
function renderEarly(){
  var items=S.early.items,n=items.length;var fs=Math.min(Math.max(+S.findStep||0,0),Math.max(n-1,0));S.findStep=fs;
  var h='<section class="panel step"><div class="stephead"><p class="eyebrow">Early findings</p></div><h2 id="stepTitle" tabindex="-1">'+(n?'Finding '+(fs+1)+' of '+n:'Log your first finding')+'</h2><p class="lead">Log findings as sessions finish. Each one carries the participant IDs, the session timestamp you enter, a verbatim quote and a pointer to your notes. Prior insights that share wording are offered for comparison and are never merged in for you.</p>';
  if(n)h+='<div class="pills" role="group" aria-label="Findings" style="margin-bottom:28px">'+items.map(function(x,i){return '<button class="pl" data-act="f-go" data-i="'+i+'"'+(i===fs?' aria-current="true"':'')+'>'+(i+1)+(x.include?' ✓':'')+'</button>'}).join('')+'<button class="pl add" data-act="e-add">+ Add finding</button></div>';
  if(!n){h+='<div style="margin-top:8px"><button class="btn" data-act="e-add">Add finding</button></div></section>'+bp('early');return h}
  var it=items[fs],i=fs;
  var b='early.items.'+i;var ids=Array.from(new Set((it.parts||'').match(/\bP\d{1,3}\b/gi)||[])).map(function(x){return x.toUpperCase()});
  var pii=piiWarn((it.statement||'')+' '+(it.quote||'')+' '+(it.notes||''));
  var tsBad=it.ts&&!/^\d{1,2}:\d{2}(:\d{2})?$/.test(it.ts.trim());
  h+=(pii?'<div class="notice crit" style="margin-bottom:20px">This finding may contain an email address, phone number or ID number. Use participant IDs (P1, P2) only and remove personal details.</div>':'')+'<div class="stepbody">'+
  '<div class="field"><label for="es_'+it.id+'">What did you find?</label><textarea id="es_'+it.id+'" data-path="'+b+'.statement">'+esc(it.statement||'')+'</textarea></div>'+
  '<div class="field"><label for="eq_'+it.id+'">Participant quote (verbatim)</label><textarea id="eq_'+it.id+'" data-path="'+b+'.quote" style="min-height:72px">'+esc(it.quote||'')+'</textarea></div>'+
  '<div class="cols"><div class="field"><label for="ep_'+it.id+'">Participant IDs</label><input type="text" id="ep_'+it.id+'" data-path="'+b+'.parts" value="'+esc(it.parts||'')+'" placeholder="P3, P7"><div class="hint">'+ids.length+' ID'+(ids.length===1?'':'s')+' listed</div></div>'+
  '<div class="field"><label for="et_'+it.id+'">Session timestamp</label><input type="text" id="et_'+it.id+'" data-path="'+b+'.ts" value="'+esc(it.ts||'')+'" placeholder="mm:ss or h:mm:ss">'+(tsBad?'<div class="hint" style="color:var(--red)">Use mm:ss or h:mm:ss.</div>':'')+'</div></div>'+
  '<details class="refine" style="margin:0"><summary>More details</summary><div class="refbody">'+
  '<div class="cols"><div class="field"><label for="ek_'+it.id+'">Type</label><select id="ek_'+it.id+'" data-path="'+b+'.kind">'+KINDS.map(function(k){return '<option'+(it.kind===k?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select></div>'+
  '<div class="field"><label for="est_'+it.id+'">How widely seen</label><select id="est_'+it.id+'" data-path="'+b+'.strength"><option value="">Choose</option>'+STRENGTH.map(function(k){return '<option'+(it.strength===k?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select></div>'+
  '<div class="field"><label for="ed_'+it.id+'">Session date</label><input type="text" id="ed_'+it.id+'" data-path="'+b+'.date" value="'+esc(it.date||'')+'" placeholder="MM/DD/YYYY"></div></div>'+
  '<div class="field"><label for="en_'+it.id+'">Where the evidence lives</label><input type="text" id="en_'+it.id+'" data-path="'+b+'.notes" value="'+esc(it.notes||'')+'" placeholder="Link to notes or transcript in the study folder"><div class="hint">Do not link to or upload original recordings in GitHub, Slack or other shared storage.</div></div>'+
  '<div class="field"><label for="eh_'+it.id+'">Hypothesis this relates to</label><input type="text" id="eh_'+it.id+'" data-path="'+b+'.hyp" value="'+esc(it.hyp||'')+'" placeholder="Paste or type the hypothesis"></div></div></details>'+
  '<label class="chk"><input type="checkbox" data-path="'+b+'.include" '+(it.include?'checked':'')+' id="ei_'+it.id+'"> Include in the final report</label>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="e-rel" data-i="'+i+'">Find related prior insights</button><button class="btn quiet" data-act="e-del" data-i="'+i+'">Remove this finding</button></div><div id="rel_'+it.id+'"></div></div>'+
  '<div class="stepnav">'+(fs>0?'<button class="btn quiet" data-act="f-go" data-i="'+(fs-1)+'">Back</button>':'<span></span>')+(fs<n-1?'<button class="btn" data-act="f-go" data-i="'+(fs+1)+'">Next finding</button>':'<button class="btn ghost" data-act="e-add">Add another finding</button>')+'</div></section>'+bp('early');
  return h;
}
function relHtml(text){
  var r=relatedInsights(text,6);
  if(!r.length)return '<div class="ov"><span class="chip">No indexed insight shares enough wording</span></div>';
  return '<div class="ov"><span class="chip warn">'+r.length+' prior insight'+(r.length>1?'s':'')+' share wording with this finding</span>'+r.map(function(x){var p=x.it.pin;var id=reg(Object.assign({},p));return '<div class="m"><div>'+(x.it.kind==='Quote'?'“'+esc(x.it.text)+'”':esc(x.it.text.length>420?x.it.text.slice(0,420)+'…':x.it.text))+'</div><div class="meta"><span class="chip">'+esc(x.it.kind)+'</span><span class="chip mono">shares '+x.sh+' of your key words</span><span>'+esc(x.it.study)+'</span><a class="src" href="'+esc(x.it.link)+'" target="_blank" rel="noopener">'+esc(x.it.src)+'</a>'+actions(id)+'</div></div>'}).join('')+'</div>';
}

/* ---------- tab: report ---------- */
function hypList(){return (S.plan.hyp||'').split('\n').map(function(x){return x.trim()}).filter(Boolean)}
var VERDICTS=['Supported','Partly supported','Not supported','Not tested','Inconclusive'];
var REPSTEPS=['Hypotheses and conclusions','Recommendations','Next steps','Who we talked to','Review and export'];
function repDone(i){
  if(i===0){var hs=hypList();return hs.length>0&&hs.every(function(x){return (S.report.verdicts[x]||{}).v})}
  if(i===1)return S.report.recs.some(function(r){return (r.text||'').trim()});
  if(i===2)return !!((S.report.next||'').trim()||(S.report.further||'').trim());
  if(i===3)return !!(S.report.who||'').trim();
  return false;
}
function renderReport(){
  var inc=S.early.items.filter(function(i){return i.include}),hs=hypList();
  var N=REPSTEPS.length,st=Math.min(Math.max(+S.repStep||0,0),N-1);S.repStep=st;
  var h='<section class="panel step"><div class="stephead"><p class="eyebrow">Final report · step '+(st+1)+' of '+N+'</p>'+dotsHtml(N,st,repDone,'r-go',REPSTEPS)+'</div><h2 id="stepTitle" tabindex="-1">'+esc(REPSTEPS[st])+'</h2>';
  var cnt='<div class="notice" style="margin-bottom:24px">'+inc.length+' finding'+(inc.length===1?'':'s')+' included from Findings. '+(inc.length&&(inc.length<5||inc.length>10)?'The Platform guidance aims for 5 to 10 top findings or themes. Confirm this count is intended.':'')+'</div>';
  h+='<p class="lead">'+(st===0?'Built from your plan and the findings you marked for the report. Headings follow the structure used by the findings reports in this repo. Nothing is written for you: gaps are listed as open questions.':'&nbsp;')+'</p>';
  h+=(st===0?cnt:'')+'<div class="stepbody">';
  if(st===0){
    h+=hs.length?hs.map(function(x,i){var v=S.report.verdicts[x]||{};return '<div class="field"><label>'+esc(x)+'</label><div class="row"><select id="hv_'+i+'" data-hv="'+esc(x)+'" aria-label="Verdict for hypothesis '+(i+1)+'"><option value="">Choose a verdict</option>'+VERDICTS.map(function(k){return '<option'+(v.v===k?' selected':'')+'>'+esc(k)+'</option>'}).join('')+'</select><div class="grow"><input type="text" id="hn_'+i+'" data-hn="'+esc(x)+'" value="'+esc(v.note||'')+'" placeholder="Evidence for this verdict" aria-label="Evidence note for hypothesis '+(i+1)+'"></div></div></div>'}).join(''):'<div class="empty">No hypotheses in the plan yet. Add them on the Plan step called Hypotheses.</div>';
  }
  if(st===1){
    h+='<div class="hint">Each recommendation should rest on at least one included finding.</div>';
    S.report.recs.forEach(function(r,i){h+='<div class="field"><div class="listrow"><div><textarea id="rc_'+r.id+'" data-path="report.recs.'+i+'.text" style="min-height:64px" aria-label="Recommendation '+(i+1)+'">'+esc(r.text||'')+'</textarea><div class="chips" style="margin-top:8px">'+(inc.length?inc.map(function(f){var fi=S.early.items.indexOf(f);return '<label class="chk" style="font-size:.9rem"><input type="checkbox" data-rl="'+i+'" data-f="'+f.id+'" '+((r.links||[]).indexOf(f.id)>-1?'checked':'')+'> Finding '+(fi+1)+'</label>'}).join(' '):'<span class="hint">No included findings to link.</span>')+'</div></div><button class="btn sm quiet" data-act="r-del" data-i="'+i+'">Remove</button></div></div>'});
    h+='<div><button class="btn ghost" data-act="r-add">Add recommendation</button></div>';
  }
  if(st===2)h+='<div class="field"><label for="rnext">Next steps</label><textarea id="rnext" data-path="report.next">'+esc(S.report.next||'')+'</textarea></div><div class="field"><label for="rfurther">Further research needed</label><textarea id="rfurther" data-path="report.further">'+esc(S.report.further||'')+'</textarea></div>';
  if(st===3)h+='<div class="field"><label for="rwho">Participants, recruitment criteria and demographics</label><div class="hint">Report counts and participant IDs only. No names or contact details.</div><textarea id="rwho" data-path="report.who">'+esc(S.report.who||'')+'</textarea></div>';
  if(st===4)h+='<div><p class="lead" style="margin:0 0 12px">Blanks appear as '+NEED+'. Pinned prior research is appended with full citations.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-act="dl" data-what="report">Download .md</button><button class="btn ghost" data-act="cp" data-what="report">Copy</button></div><pre class="md" id="reportMd"></pre></div>';
  h+='</div><div class="stepnav">'+(st>0?'<button class="btn quiet" data-act="r-go" data-i="'+(st-1)+'">Back</button>':'<span></span>')+(st<N-1?'<button class="btn" data-act="r-go" data-i="'+(st+1)+'">Next: '+esc(REPSTEPS[st+1])+'</button>':'<span></span>')+'</div></section>'+bp('report');
  return h;
}
function reportMd(){
  var p=S.plan,inc=S.early.items.filter(function(i){return i.include});
  var goals=[p.goal1,p.goal2,p.goal3].filter(function(x){return (x||'').trim()}).map(function(x,i){return (i+1)+'. '+x.trim()}).join('\n')||NEED;
  var rq=p.rq.filter(function(x){return x.trim()}).map(function(x,i){return (i+1)+'. '+x.trim()}).join('\n')||NEED;
  var o='# '+((p.title||'').trim()||NEED)+' — Research Findings\n\n## Research Goals\n'+goals+'\n\n## Research Questions\n'+rq+'\n\n## Methodology\n'+V(p.method)+'\n\n## Hypotheses and Conclusions\n';
  var hs=hypList();o+=hs.length?hs.map(function(x){var v=S.report.verdicts[x]||{};return '- '+x+'\n  - Verdict: '+(v.v||NEED)+'\n  - Evidence: '+((v.note||'').trim()||NEED)}).join('\n'):NEED;
  o+='\n\n## Key Findings\n'+(inc.length?inc.map(function(f,i){return (i+1)+'. '+V(f.statement)}).join('\n'):NEED)+'\n\n## Details of Findings\n';
  o+=inc.length?inc.map(function(f,i){var ids=(f.parts||'').trim();return '\n### Finding '+(i+1)+': '+V(f.statement)+'\n\n- Type: '+(f.kind||NEED)+'\n- How widely seen: '+(f.strength||NEED)+'\n- Participants: '+(ids||NEED)+'\n- Session date: '+((f.date||'').trim()||NEED)+'\n- Session timestamp: '+((f.ts||'').trim()||NEED)+'\n- Evidence location: '+((f.notes||'').trim()||NEED)+'\n\n> "'+((f.quote||'').trim()||NEED)+'"'+(ids?' — '+ids:'')+((f.ts||'').trim()?' ['+f.ts.trim()+']':'')}).join('\n'):NEED;
  o+='\n\n## Recommendations\n';
  o+=S.report.recs.length?S.report.recs.map(function(r,i){var ln=(r.links||[]).map(function(id){var k=S.early.items.findIndex(function(f){return f.id===id});return k>-1?'Finding '+(k+1):null}).filter(Boolean);return (i+1)+'. '+V(r.text)+'\n   - Evidence: '+(ln.length?ln.join(', '):NEED)}).join('\n'):NEED;
  o+='\n\n## Next Steps\n'+V(S.report.next)+'\n\n## Further research needed\n'+V(S.report.further)+'\n\n## Appendix\n\n### Who we talked to\n'+V(S.report.who)+'\n'+priorSection();
  return o;
}

/* ---------- tab: register (step 6) ---------- */
var RJ=['Joining Military','Serving in Military','Getting Out Military','Starting Up Civilian Life','Taking Care of Themselves','Reinventing Themselves','Putting Down Roots','Retiring','Aging','Dying'];
var RB=['Disability','Education','Employment','Finances','Healthcare','Housing','Life Insurance','Memorialization','Pension'];
var REGSTEPS=['Study folder','Intake card','Labels','Close out'];
var OUTCOME=['key-findings-added','no-recommendations-exploratory','no-recommendations-validated','no-recommendations-uat','further-research-needed','recommendations-tracked-externally'];
function regInit(){
  var r=S.reg;
  if(!r.jInit){r.jInit=1;var cur=(S.plan.journey||'').split(',').map(function(x){return x.trim()}).filter(Boolean);r.journeys=r.journeys||[];cur.forEach(function(j){var k=JOURNEYS.indexOf(j);if(k>-1&&r.journeys.indexOf(RJ[k])<0)r.journeys.push(RJ[k])})}
  r.journeys=r.journeys||[];r.bnfts=r.bnfts||[];r.labels=r.labels||[];r.checks=r.checks||{};r.outcome=r.outcome||[];
}
function regTitle(){var r=S.reg;return (r.ym||'').trim()?(r.ym.trim()+' '+((S.plan.product||'').trim()||NEED)+' '+((r.project||'').trim()||NEED)+' ['+((r.rtype||'').trim()||NEED)+']'):'YYYY-MM '+((S.plan.product||'').trim()||NEED)+' '+((r.project||'').trim()||NEED)+' ['+((r.rtype||'').trim()||NEED)+']'}
function regBody(){
  var r=S.reg;
  var chk=function(all,sel){return all.map(function(x){return '- ['+(sel.indexOf(x)>-1?'x':' ')+'] '+x}).join('\n')};
  return '### VFS team name\n\n'+(r.team||'')+'\n\n### Collaboration Cycle Ticket\n\n'+(r.cc||'')+'\n\n### Research Folder\n\n'+(r.folder||'')+'\n\n### Recruitment Criteria\n\n'+(r.crit||'')+'\n\n### Summary\n\n'+(r.summary||'')+'\n\n### Veteran Journeys\n\n'+chk(RJ,r.journeys)+'\n\n### Benefits\n\n'+chk(RB,r.bnfts)+'\n';
}
function rxFor(l){if(!l.p.length)return null;return new RegExp(l.p.map(function(m){return '\\b'+m.replace(/[.*+?^${}()|[\]\\:]/g,'\\$&')+'\\b'}).join('|'),'i')}
/* Mirrors .github/scripts/issue-labeler.js as read from the local clone: PRDT from title only; RESRCH from title or body; BNFT and all other labels only from checked checkboxes; at most 10. */
function autoLabels(){
  if(!RL)return null;
  var title=regTitle(),body=regBody();
  var all=RL.labels.map(function(l){return [l.n,rxFor(l)]}).filter(function(x){return x[1]});
  var checked=[];var re=/^[-*]\s*\[[xX]\]\s*(.+)$/gim,m;while((m=re.exec(body))!==null)checked.push(m[1].trim());
  var prd=all.filter(function(x){return x[0].indexOf('PRDT:')===0}),bn=all.filter(function(x){return x[0].indexOf('BNFT:')===0}),rs=all.filter(function(x){return x[0].indexOf('RESRCH:')===0});
  var ot=all.filter(function(x){return x[0].indexOf('PRDT:')!==0&&x[0].indexOf('BNFT:')!==0&&x[0].indexOf('RESRCH:')!==0});
  var set=new Set();
  for(var i=0;i<prd.length;i++){if(prd[i][1].test(title)){set.add(prd[i][0]);if(set.size>=10)break}}
  for(i=0;i<rs.length;i++){if(rs[i][1].test(title)||rs[i][1].test(body)){set.add(rs[i][0]);if(set.size>=10)break}}
  outer:for(var c=0;c<checked.length;c++){for(i=0;i<bn.length;i++){if(bn[i][1].test(checked[c])){set.add(bn[i][0]);if(set.size>=10)break}}if(set.size>=10)break}
  for(c=0;c<checked.length;c++){for(i=0;i<ot.length;i++){if(ot[i][1].test(checked[c])){set.add(ot[i][0]);if(set.size>=10)break}}if(set.size>=10)break}
  return Array.from(set);
}
function regLabelsAll(){var a=autoLabels()||[];var man=S.reg.labels||[];var u=a.slice();man.forEach(function(x){if(u.indexOf(x)<0)u.push(x)});return {auto:a,all:u}}
function intakeMd(){
  var r=S.reg,L=regLabelsAll();
  return '# Research intake card (copy each value into the Research Intake Form)\n\n**Issue title:** '+regTitle()+'\n\n**VFS team name:** '+(r.team||NEED)+'\n\n**Collaboration Cycle Ticket:** '+((r.cc||'').trim()||NEED)+'\n\n**Research Folder:** '+((r.folder||'').trim()||NEED)+'\n\n**Recruitment Criteria (optional):** '+((r.crit||'').trim()||'(none)')+'\n\n**Summary:**\n'+((r.summary||'').trim()||NEED)+'\n\n**Veteran Journeys:** '+(r.journeys.length?r.journeys.join(', '):NEED)+'\n\n**Benefits:** '+(r.bnfts.length?r.bnfts.join(', '):NEED)+'\n\n**Labels (5 to 15 on the card):** '+(L.all.length?L.all.join('; '):'(none yet)')+'\n\n_Form instructions: assign yourself and any other researcher. Product, research method, Veteran journey and benefit labels are applied automatically after you create the card. Add the others, and remove any applied by mistake._\n';
}
function closeMd(){
  var r=S.reg;
  return '# Close out\n\n## Key Findings (paste into the card’s Key Findings field)\n\n'+((r.key||'').trim()||NEED)+'\n\n## Labels to add\n\n'+((r.outcome||[]).length?r.outcome.map(function(x){return '- '+x}).join('\n'):'(none chosen)')+'\n\n## Checklist\n\n- [ ] Key findings added to the card\n- [ ] Card moved to the Completed column\n';
}
function lblListHtml(){
  if(!RL)return '';
  var q=(($('#lblq')||{}).value||S.reg.lq||'').trim().toLowerCase(),g=($('#lblg')||{}).value||S.reg.lg||'';
  var man=S.reg.labels||[],auto=autoLabels()||[];
  var list=RL.labels.filter(function(l){return (!g||l.g===g)&&(!q||l.n.toLowerCase().indexOf(q)>-1||l.d.toLowerCase().indexOf(q)>-1)});
  if(!q&&!g)return '<div class="hint">Search, or pick a group, to see labels.</div>';
  var shown=list.slice(0,40);
  return shown.map(function(l){var on=man.indexOf(l.n)>-1||auto.indexOf(l.n)>-1;return '<div class="hit" style="padding:8px 0"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><div><b>'+esc(l.n)+'</b><div class="hint">'+esc(l.d.replace(/^match:\s*/,''))+'</div></div><button class="btn sm ghost pinbtn'+(on?' on':'')+'" data-act="lbl-tg" data-n="'+esc(l.n)+'"'+(auto.indexOf(l.n)>-1?' disabled':'')+'>'+(auto.indexOf(l.n)>-1?'Auto':on?'Added ✓':'Add')+'</button></div></div>'}).join('')+(list.length>40?'<div class="hint">'+(list.length-40)+' more. Narrow the search.</div>':'')+(list.length?'':'<div class="hint">No label matches.</div>');
}
function prdtHint(){
  var w=((S.plan.product||'')+' '+(S.reg.project||'')).toLowerCase().split(/[^a-z0-9]+/).filter(function(x){return x.length>3});
  if(!w.length||!RL)return '';
  var c=RL.labels.filter(function(l){return l.n.indexOf('PRDT:')===0&&w.some(function(x){return l.n.toLowerCase().indexOf(x)>-1})}).slice(0,6);
  return c.length?' Similar product labels: '+c.map(function(l){return esc(l.n.replace('PRDT: ',''))}).join('; ')+'.':'';
}
function lblSummaryHtml(){
  var L=regLabelsAll(),n=L.all.length,man=S.reg.labels||[];
  var warn=n<5?'<div class="notice warn">The form asks for 5 to 15 labels. This list has '+n+'.</div>':n>15?'<div class="notice warn">The form asks for 5 to 15 labels. This list has '+n+'.</div>':'<div class="notice">'+n+' labels. The form asks for 5 to 15.</div>';
  var hasP=L.auto.some(function(x){return x.indexOf('PRDT:')===0});
  return warn+'<div class="sumrow"><h3>Applied automatically when you create the card ('+L.auto.length+')</h3><div class="chips">'+(L.auto.length?L.auto.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join(''):'<span class="hint">None yet. Fill in the intake step first.</span>')+'</div>'+(hasP?'':'<div class="hint">No product label would match this title. Product labels are matched on the issue title only, so the product name must match a label’s wording exactly.'+prdtHint()+'</div>')+(L.auto.some(function(x){return x.indexOf('RESRCH:')===0})?'':'<div class="hint">No research-method label would match. The type of research in the title or card must use a label’s exact wording. Options: '+RL.labels.filter(function(l){return l.n.indexOf('RESRCH:')===0}).map(function(l){return esc(l.n.replace('RESRCH: ',''))}).join(', ')+'.</div>')+'</div>'+
   '<div class="sumrow"><h3>Added by you ('+man.length+')</h3><div class="chips">'+(man.length?man.map(function(x){return '<button class="chip" data-act="lbl-tg" data-n="'+esc(x)+'" aria-label="Remove '+esc(x)+'">'+esc(x)+' ✕</button>'}).join(''):'<span class="hint">None yet.</span>')+'</div></div>';
}
function drawRegOut(){
  var a=$('#intakeMd');if(a)a.textContent=intakeMd();a=$('#closeMd');if(a)a.textContent=closeMd();
  a=$('#lblSum');if(a)a.innerHTML=lblSummaryHtml();a=$('#lblList');if(a)a.innerHTML=lblListHtml();
  a=$('#titlePrev');if(a)a.textContent=regTitle();
}
function renderRegister(){
  regInit();var r=S.reg,N=REGSTEPS.length,st=Math.min(Math.max(+r.step||0,0),N-1);r.step=st;
  var h='<section class="panel step"><div class="stephead"><p class="eyebrow">Add to the research repo · step '+(st+1)+' of '+N+'</p>'+dotsHtml(N,st,function(i){return !!r.checks['s'+i]},'g-reg',REGSTEPS)+'</div><h2 id="stepTitle" tabindex="-1">'+esc(REGSTEPS[st])+'</h2>';
  if(!RL)h+='<div class="notice warn">repo-labels.json did not load, so the label preview is off. The rest still works.</div>';
  h+='<div class="stepbody">';
  if(st===0){
    h+='<p class="lead" style="margin:0">The research repository does not store your study folder. The folder stays in va.gov-team, and the intake card points to it. Tick each item as you finish it.</p>';
    [['f1','The study folder exists in va.gov-team under your product’s research folder, and you have its URL.'],['f2','The research plan from step 2 is saved in the folder.'],['f3','The conversation guide from step 3 is saved in the folder.'],['f4','The findings report from step 5 is saved in the folder.'],['f5','No original recordings, names, emails or phone numbers are in the folder.'],['f6','You have the Collaboration Cycle ticket URL for this work.']].forEach(function(c){h+='<label class="chk"><input type="checkbox" data-rgc="'+c[0]+'"'+(r.checks[c[0]]?' checked':'')+'> '+esc(c[1])+'</label>'});
    h+='<div class="hint">Sources: the repository README (product research folders remain in va.gov-team) and the Research Intake Form, which requires the folder URL and the Collaboration Cycle ticket. Folder contents above are a checklist for this tool, not a rule from the repo.</div>';
  }
  if(st===1){
    h+='<p class="lead" style="margin:0">These fields match the repo’s Research Intake Form. Paste the result into a new issue from that form on the repo, because it needs VA sign-in.</p>';
    h+='<div class="cols"><div class="field"><label for="rg_ym">Year and month<span class="req">required</span></label><input type="text" id="rg_ym" data-path="reg.ym" value="'+esc(r.ym||'')+'" placeholder="YYYY-MM"></div><div class="field"><label for="rg_prod">Product name</label><input type="text" id="rg_prod" data-path="plan.product" value="'+esc(S.plan.product||'')+'"><div class="hint">Shared with your plan.</div></div><div class="field"><label for="rg_proj">Project name<span class="req">required</span></label><input type="text" id="rg_proj" data-path="reg.project" value="'+esc(r.project||'')+'"></div><div class="field"><label for="rg_type">Type of research<span class="req">required</span></label><input type="text" id="rg_type" list="rtypes" data-path="reg.rtype" value="'+esc(r.rtype||'')+'" placeholder="e.g. Usability Test">'+(RL?'<datalist id="rtypes">'+RL.labels.filter(function(l){return l.n.indexOf('RESRCH:')===0}).map(function(l){return '<option value="'+esc(l.n.replace('RESRCH: ',''))+'">'}).join('')+'</datalist>':'')+'</div></div>';
    h+='<div class="hint">Issue title: <b id="titlePrev">'+esc(regTitle())+'</b></div>';
    h+='<div class="field"><label for="rg_team">VFS team name<span class="req">required</span></label><select id="rg_team" data-path="reg.team"><option value="">Select team</option>'+((RL&&RL.teams)||[]).map(function(t){return '<option'+(r.team===t?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select></div>';
    h+='<div class="field"><label for="rg_cc">Collaboration Cycle ticket<span class="req">required</span></label><input type="text" id="rg_cc" data-path="reg.cc" value="'+esc(r.cc||'')+'" placeholder="https://va.ghe.com/software/va.gov-team/issues/..."></div>';
    h+='<div class="field"><label for="rg_folder">Research folder<span class="req">required</span></label><input type="text" id="rg_folder" data-path="reg.folder" value="'+esc(r.folder||'')+'" placeholder="https://va.ghe.com/software/va.gov-team/..."></div>';
    h+='<div class="field"><label for="rg_crit">Recruitment criteria (optional)</label><div class="hint">The URL of the criteria card you made for this study.</div><input type="text" id="rg_crit" data-path="reg.crit" value="'+esc(r.crit||'')+'"></div>';
    h+='<div class="field"><label for="rg_sum">Summary<span class="req">required</span></label><div class="hint">Briefly summarize the high-level questions your research was trying to answer.</div><textarea id="rg_sum" data-path="reg.summary" style="min-height:110px">'+esc(r.summary||'')+'</textarea><div><button class="btn sm ghost" data-act="reg-sum">Start from my goals and research questions</button></div></div>';
    h+='<fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;padding:0;margin-bottom:6px">Veteran journeys<span class="req" style="margin-left:8px">required</span></legend><div class="hint">Started from your plan. Change as needed.</div><div class="jgrid">'+RJ.map(function(j){return '<label class="chk"><input type="checkbox" data-rgj="'+esc(j)+'"'+(r.journeys.indexOf(j)>-1?' checked':'')+'> '+esc(j)+'</label>'}).join('')+'</div></fieldset>';
    h+='<fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;padding:0;margin-bottom:6px">Benefits<span class="req" style="margin-left:8px">required</span></legend><div class="jgrid">'+RB.map(function(j){return '<label class="chk"><input type="checkbox" data-rgb="'+esc(j)+'"'+(r.bnfts.indexOf(j)>-1?' checked':'')+'> '+esc(j)+'</label>'}).join('')+'</div></fieldset>';
    h+='<div><h3 style="margin:0 0 10px">Intake card text</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-act="dl" data-what="intake">Download .md</button><button class="btn ghost" data-act="cp" data-what="intake">Copy</button></div><pre class="md" id="intakeMd"></pre></div>';
  }
  if(st===2){
    var gs=RL?Array.from(new Set(RL.labels.map(function(l){return l.g}))):[];
    h+='<p class="lead" style="margin:0">The form asks for 5 to 15 labels. Some are applied automatically after you create the card. This preview follows the repo’s labeler script as it is in the local copy. Add the rest here.</p><div id="lblSum"></div>';
    if(RL){h+='<div class="row"><div class="field grow"><label for="lblq">Search labels</label><input type="search" id="lblq" value="'+esc(r.lq||'')+'" placeholder="A product, audience, component or topic"></div><div class="field"><label for="lblg">Group</label><select id="lblg"><option value="">All groups</option>'+gs.map(function(g){return '<option'+(r.lg===g?' selected':'')+'>'+esc(g)+'</option>'}).join('')+'</select></div></div><div id="lblList"></div>'}
    h+='<div class="hint">Preview limits: it mirrors the labeler as of the local clone and assumes the issue body looks like the form’s output. The real result may differ if the script or the form changed. Check the card after you create it, and remove any label applied by mistake.</div>';
  }
  if(st===3){
    h+='<p class="lead" style="margin:0">After the study is finished, summarize the key findings on the card and move it to the Completed column.</p>';
    h+='<div class="field"><label for="rg_key">Key findings<span class="req">for the card</span></label><div class="hint">Markdown is fine. The card’s field says: summarize after the study is finished and move the issue card to the complete column.</div><textarea id="rg_key" data-path="reg.key" style="min-height:160px">'+esc(r.key||'')+'</textarea><div><button class="btn sm ghost" data-act="reg-key">Start from my included findings</button></div></div>';
    h+='<fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;padding:0;margin-bottom:6px">Closing labels</legend><div class="hint">These labels exist in the repo. Descriptions are the repo’s own text.</div>'+OUTCOME.map(function(n){var l=RL&&RL.labels.filter(function(x){return x.n===n})[0];return '<label class="chk" style="align-items:flex-start"><input type="checkbox" data-rgo="'+esc(n)+'"'+(r.outcome.indexOf(n)>-1?' checked':'')+' style="margin-top:4px"><span><b>'+esc(n)+'</b>'+(l?'<span class="hint" style="display:block">'+esc(l.d.replace(/^match:\s*/,''))+'</span>':'')+'</span></label>'}).join('')+'</fieldset>';
    h+='<div><h3 style="margin:0 0 10px">Close-out text</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" data-act="dl" data-what="close">Download .md</button><button class="btn ghost" data-act="cp" data-what="close">Copy</button></div><pre class="md" id="closeMd"></pre></div>';
  }
  h+='</div><div class="stepnav">'+(st>0?'<button class="btn quiet" data-act="g-reg" data-i="'+(st-1)+'">Back</button>':'<span></span>')+(st<N-1?'<button class="btn" data-act="g-reg" data-i="'+(st+1)+'">Next: '+esc(REGSTEPS[st+1])+'</button>':'<span></span>')+'</div></section>'+bp('register');
  setTimeout(drawRegOut,0);
  return h;
}

/* ---------- best-practice panels ---------- */
function bpItem(t,src,url){return '<li>'+esc(t)+' <span class="chip mono">'+esc(src)+'</span>'+(url?' <a href="'+esc(url)+'" target="_blank" rel="noopener">source ↗</a>':'')+'</li>'}
function bp(tab){
  var P=function(t){return bpItem(t,'Research at VA · Platform docs',PLATFORM)};
  var T=function(t,l){return bpItem(t,'repo plan template L'+l,TEMPLATE_BASE+'#L'+l)};
  var L={
   scan:[P('Check the research repo, the OCTO Research Insights newsletter and analytics dashboards before starting new research.'),P('Quotes appear with participant IDs only. No names or contact details.')],
   plan:[T('Limit 3 goals per study.',123),T('Research questions go in the plan. The questions you ask participants go in the conversation guide.',146),T('Request 1.5× the ideal completed sessions as total participants.',281),T('Submit materials for Research Review 8 to 9 days before the first remote research day. In-person studies need 2 or more weeks.',308),T('A pilot session is required.',316),T('Request at least double the number of time slots as participants.',336),T('Team roles: names only, no email addresses; no more than 5 to 6 total attendees.',354),T('Your OCTO/VA lead must review and approve all materials before you submit a recruitment request.',232)],
   guide:[P('Run a pilot session first and update the guide before real sessions.'),P('Keep the guide out of the participant’s view. Press record only after permission is granted. Transcription supplements verbatim notes and never replaces them.'),P('If the topic could be hard to discuss, see whether the sensitive content can be reworked. Otherwise plan extra support, use trauma-informed practices and know the emergency exit strategies.')],
   register:[bpItem('Add 5 to 15 labels. Product, research method, Veteran journey and benefit labels are applied automatically after the card is created. Add others and remove any applied by mistake.','repo intake form',''),bpItem('Assign yourself and any other researcher to the card.','repo intake form',''),bpItem('Summarize key findings on the card when the study is finished and move it to the Completed column.','repo intake form',''),bpItem('After submitting a recruitment request, copy its card URL into the criteria link of your study card, then move the recruitment card from Proposed to Recruitment.','repo recruitment form','')],
   early:[P('Synthesize soon after sessions while memory is fresh.'),P('Use participant IDs (P1, P2) in notes and findings.'),P('Never upload original recordings to GitHub, Slack, cloud storage or any server. Clips for sharing must be scrubbed of PII and PHI by the lead researcher.')],
   report:[P('Aim for 5 to 10 top findings or themes with supporting quotes, a verdict on each hypothesis, and recommendations with evidence.'),P('Keep the focus on the digital experience. Non-digital insights go to the product owner first.'),P('Store the write-up in the study folder named YYYY-MM-Research-Name, and check for design system implications.')]
  }[tab]||[];
  return '<details class="bp"><summary>VA research best practices for this step</summary><ul>'+L.join('')+'<li class="hint">Platform guidance changes. Confirm against the live Research at VA pages (VA network).</li></ul></details>';
}

/* ---------- aside ---------- */
function openQuestions(){
  var q=[];
  var add=function(tab,field,text){q.push({tab:tab,field:field,text:text})};
  if(!parseTerms(S.terms).length)add('scan','terms','Which topic terms should I search the repo for?');
  PLAN.forEach(function(s){s.items.forEach(function(f){if(f.req&&!(S.plan[f.id]||'').trim())add('plan','pl_'+f.id,'Plan · '+f.label+(f.hint?'':''))})});
  if(!S.plan.rq.some(function(x){return x.trim()}))add('plan','rq_0','Plan · What are your research questions?');
  if(!(S.plan.roles||{}).moderator)add('plan','role_moderator','Plan · Who is the moderator?');
  S.guide.sections.forEach(function(s){s.qs.forEach(function(qq){if(qq.text.trim()&&qq.flag&&!S.ack[qq.id])add('guide','gq_'+qq.id,'Guide · “'+qq.text.trim().slice(0,70)+'” resembles a prior question. Keep, reword or reuse?')})});
  S.early.items.forEach(function(it,i){var n='Finding '+(i+1);
    if(!(it.statement||'').trim())add('early','es_'+it.id,n+' · What is the finding?');
    if(!/\bP\d{1,3}\b/i.test(it.parts||''))add('early','ep_'+it.id,n+' · Which participant IDs support it?');
    if(!(it.ts||'').trim())add('early','et_'+it.id,n+' · What is the session timestamp?');
    if(!(it.quote||'').trim())add('early','eq_'+it.id,n+' · What is the verbatim quote?');
    if(!(it.notes||'').trim())add('early','en_'+it.id,n+' · Where do the notes or transcript live?')});
  hypList().forEach(function(x,i){if(!(S.report.verdicts[x]||{}).v)add('report','hv_'+i,'Report · Verdict for “'+x.slice(0,60)+'”?')});
  S.report.recs.forEach(function(r,i){if(!(r.links||[]).length)add('report','rc_'+r.id,'Report · Which finding supports recommendation '+(i+1)+'?')});
  if(!S.early.items.some(function(i){return i.include}))add('report','','Report · Which early findings belong in the report?');
  return q;
}
function renderAside(){
  var oq=openQuestions(),shown=oq.slice(0,12);
  var h='<div class="sheethead"><h2>Your notes</h2><button class="btn sm quiet" data-act="sheet-close">Close</button></div><div class="group"><p class="ghead">Questions for you <span class="chip warn">'+oq.length+'</span></p><div class="inset">'+
    (oq.length?'<ul class="cells">'+shown.map(function(x){return '<li class="q-item"><span>'+esc(x.text)+'</span><button data-act="goto" data-tab="'+x.tab+'" data-field="'+esc(x.field)+'">Go to field</button></li>'}).join('')+(oq.length>shown.length?'<li class="hint">+ '+(oq.length-shown.length)+' more</li>':'')+'</ul>':'<div class="cell empty">Nothing outstanding.</div>')+
    '</div><p class="gfoot">Gaps I will not fill in myself. Answer them in the fields.</p></div>';
  h+='<div class="group"><p class="ghead">Evidence tray <span class="chip">'+S.pins.length+'</span></p><div class="inset">';
  if(S.pins.length){h+='<ul class="cells">'+S.pins.map(function(p,i){return '<li class="pin-item"><div class="k">'+esc(p.kind)+' · '+esc(p.study)+'</div><div>'+esc(p.text.length>170?p.text.slice(0,170)+'…':p.text)+'</div><div class="meta"><a class="src" href="'+esc(p.link)+'" target="_blank" rel="noopener">'+esc(p.file)+(p.line?' · L'+p.line:'')+'</a>'+(p.kind==='Question'?'<button class="btn sm ghost" data-act="pin-guide" data-i="'+i+'">Add to guide</button>':'')+'<button class="btn sm quiet" data-act="unpin" data-i="'+i+'">Remove</button></div></li>'}).join('')+'</ul><div class="cell"><button class="btn sm ghost" data-act="cite-all">Copy all citations</button></div>'}
  else h+='<div class="cell empty">Nothing pinned yet.</div>';
  h+='</div><p class="gfoot">Pinned items are cited in your exports with source link, line and commit date.</p></div>';
  h+='<div class="group"><p class="gfoot">Source links point to va.ghe.com and need VA network or SSO access. Your draft is saved in this browser only, so export to keep it.</p><div style="padding:0 16px"><button class="btn sm quiet" data-act="reset">Clear my draft</button></div></div>';
  $('#aside').innerHTML=h;
  var dk=[];var ev=$('#evbtn');if(ev){ev.classList.toggle('has',S.pins.length>0);$('#evn').textContent=S.pins.length}if(S.tab!=='scan')dk.push('<button class="pill" data-act="sheet">Questions<b>'+oq.length+'</b></button>');
  $('#dock').innerHTML=dk.join('');
  renderTabs();
}

/* ---------- main render ---------- */
var TABS=[['scan','Know','Step 1: what we already know'],['plan','Plan','Step 2: research plan'],['guide','Guide','Step 3: conversation guide'],['early','Findings','Step 4: early findings'],['report','Report','Step 5: final report'],['register','Register','Step 6: add to the research repo']];
function stepDone(t){
  if(t==='scan')return S.pins.length>0;
  if(t==='plan'){var req=[];PLAN.forEach(function(sc){sc.items.forEach(function(f){if(f.req)req.push(f.id)})});var ok=req.filter(function(id){return (S.plan[id]||'').trim()}).length+(S.plan.rq.some(function(x){return x.trim()})?1:0);return ok===req.length+1}
  if(t==='guide')return S.guide.sections.some(function(sc){return sc.qs.some(function(q){return q.text.trim()})});
  if(t==='early')return S.early.items.some(function(i){return i.include});
  if(t==='register'){var r=S.reg||{};return !!((r.team||'')&&(r.cc||'').trim()&&(r.folder||'').trim()&&(r.summary||'').trim()&&(r.journeys||[]).length&&(r.bnfts||[]).length)}
  return false;
}
function renderTabs(){$('#tabs').innerHTML=TABS.map(function(t,i){var d=stepDone(t[0]);return '<button role="tab" class="'+(d?'done':'')+'" aria-selected="'+(S.tab===t[0])+'" aria-label="'+t[2]+(d?' (done)':'')+'" data-act="tab" data-tab="'+t[0]+'" id="tab-'+t[0]+'"><span class="num" aria-hidden="true">'+(d?'✓':(i+1))+'</span><span class="lbl">'+t[1]+'</span></button>'}).join('')}
var SHEET=false;
function setSheet(v){SHEET=v;var a=$('#aside'),sc=$('#scrim');if(a)a.classList.toggle('open',v);if(sc)sc.hidden=!v;if(v){var c=$('#aside [data-act="sheet-close"]');c&&c.focus()}}
function renderIdx(){
  var r=IDX.repo,nq=IDX.documents.reduce(function(a,d){return a+d.questions.length},0),nqu=IDX.documents.reduce(function(a,d){return a+d.quotes.length},0);
  var skipped=Object.keys(IDX.notIndexed).map(function(k){return IDX.notIndexed[k]+' .'+k}).join(', ');
  $('#idxbar').innerHTML='<span class="chip warn">Sample data: fictional studies, not real research</span><span>Index built <b>'+esc(fmtUTC(r.builtAt))+'</b></span><span>from <b>'+esc(r.branch)+' @ '+esc(r.commit.slice(0,7))+'</b> (committed '+esc(fmtDate(r.commitDate))+')</span><span><b>'+IDX.documents.length+'</b> files · <b>'+nq.toLocaleString()+'</b> questions · <b>'+nqu+'</b> quotes · <b>'+IDX.board.studies.length+'</b> board studies (snapshot '+esc(fmtDate(IDX.board.lastRefresh))+')</span>'+(EXI?'<span>Research Explorer snapshot <b>'+esc(fmtDate(EXI.source.generatedAt))+'</b> · <b>'+EXI.source.reports+'</b> reports · <b>'+EXI.source.findings.toLocaleString()+'</b> findings</span>':'<span>Research Explorer layer not loaded</span>')+'<button data-act="limits">What this index cannot tell you</button>';
  var sr=$('#src');if(sr)sr.innerHTML='<i aria-hidden="true" style="background:var(--orange)"></i><span>Sample data · Index '+esc(fmtDate(r.builtAt))+' · '+esc(r.commit.slice(0,7))+'</span>';
  $('#idxbar').dataset.limits=IDX.limits.join('\n')+'\nNot indexed (not text): '+skipped+'.'+(EXI?'\nResearch Explorer layer: findings are copied from research-explorer/taxonomy-data.json (generated '+fmtDate(EXI.source.generatedAt)+'). Labels (finding type, product area, user group, theme, journey stage, severity) are assigned automatically from keywords with the confidence shown. They can be wrong, and journey stage is missing on most findings. Findings carry no line numbers or timestamps. Quote line numbers refer to the report text in that snapshot and may have moved if the file changed since. A participant ID is read only from a “P#” tag on the quote line, and session timestamps are not captured. Explorer reports are joined to board issues by research folder path; where none matches, the report appears as its own entry.':'')+'\nThis build shows fictional sample data only. To change it, edit scripts/make-sample-data.mjs and run npm run sample.';
}
function render(){
  renderTabs();PINREG={};
  var m=$('#main');
  var order=TABS.map(function(t){return t[0]}),oi=order.indexOf(S.tab);
  var nb='<div class="nextbar">'+(oi>0?'<button class="btn quiet" data-act="tab" data-tab="'+order[oi-1]+'">Back</button>':'<span></span>')+(oi<order.length-1?'<button class="btn" data-act="tab" data-tab="'+order[oi+1]+'">Continue to '+TABS[oi+1][1]+'</button>':'<span></span>')+'</div>';
  if(S.tab==='plan'&&S.planStep<PLAN.length)nb='';
  if(S.tab==='report'&&S.repStep<REPSTEPS.length-1)nb='';
  if(S.tab==='register'&&(+S.reg.step||0)<3)nb='';
  m.innerHTML=({scan:renderScan,plan:renderPlan,guide:renderGuide,early:renderEarly,report:renderReport,register:renderRegister}[S.tab])()+nb;
  if(S.tab==='scan')drawScan();
  refreshPreviews();renderAside();
  if(S.tab==='plan')S.plan.rq.forEach(function(q,i){if(q.trim()){var bx=$('#rqov_'+i);if(bx)bx.innerHTML=ovHtml(overlap(q))}});
  if(S.tab==='guide')S.guide.sections.forEach(function(s){s.qs.forEach(function(q){if(q.text.trim()&&q.chk){var gx=$('#gov_'+q.id);if(gx)gx.innerHTML=ovHtml(overlap(q.text))}})});
}
function stepTop(){window.scrollTo(0,0);var t=$('#stepTitle');if(t)t.focus({preventScroll:true})}
function refreshPreviews(){var a=$('#planMd');if(a)a.textContent=planMd();a=$('#guideMd');if(a)a.textContent=guideMd();a=$('#recMd');if(a)a.textContent=recMd();drawRegOut();a=$('#reportMd');if(a)a.textContent=reportMd()}

/* ---------- events ---------- */
var dT;function deb(f,ms){clearTimeout(dT);dT=setTimeout(f,ms)}
document.addEventListener('input',function(ev){
  var el=ev.target;
  if(el.id==='terms'){S.terms=el.value;S.show=6;save();deb(function(){drawScan();renderAside()},280);return}
  if(el.id==='lblq'){S.reg.lq=el.value;save();deb(drawRegOut,200);return}
  if(el.id==='qcheck'){S.qcheck=el.value;save();return}
  if(el.dataset&&el.dataset.hv!==undefined){var v=S.report.verdicts[el.dataset.hv]||(S.report.verdicts[el.dataset.hv]={});v.v=el.value;save();renderAside();refreshPreviews();return}
  if(el.dataset&&el.dataset.hn!==undefined){var w=S.report.verdicts[el.dataset.hn]||(S.report.verdicts[el.dataset.hn]={});w.note=el.value;save();refreshPreviews();return}
  if(el.dataset&&el.dataset.rl!==undefined){return}
  var p=el.dataset&&el.dataset.path;
  if(p){setPath(p,el.type==='checkbox'?el.checked:el.value);save();refreshPreviews();deb(renderAside,400)}
});
document.addEventListener('change',function(ev){
  var el=ev.target;
  if(el.dataset&&(el.dataset.rgj!==undefined||el.dataset.rgb!==undefined||el.dataset.rgo!==undefined||el.dataset.rgc!==undefined)){var q=el.dataset.rgj!==undefined?['journeys','rgj']:el.dataset.rgb!==undefined?['bnfts','rgb']:el.dataset.rgo!==undefined?['outcome','rgo']:null;if(q){S.reg[q[0]]=Array.from(document.querySelectorAll('input[data-'+q[1]+']')).filter(function(x){return x.checked}).map(function(x){return x.dataset[q[1]]})}else{S.reg.checks[el.dataset.rgc]=el.checked}save();drawRegOut();renderTabs();return}
  if(el.id==='lblg'){S.reg.lg=el.value;save();drawRegOut();return}
  if(el.dataset&&el.dataset.jr!==undefined){S.plan.journey=Array.from(document.querySelectorAll('input[data-jr]')).filter(function(x){return x.checked}).map(function(x){return x.dataset.jr}).join(', ');save();refreshPreviews();renderAside();return}
  if(el.dataset&&el.dataset.rt!==undefined){S.rec.types=Array.from(document.querySelectorAll('input[data-rt]')).filter(function(x){return x.checked}).map(function(x){return x.dataset.rt});save();refreshPreviews();return}
  if(el.id==='mode'||el.id==='fProduct'||el.id==='fType'||el.id==='fYear'||el.id==='fArea'||el.id==='fGroup'||el.id==='fTheme'||el.id==='fStage'){S[el.id==='mode'?'mode':el.id]=el.value;S.show=6;save();drawScan();updRefine();return}
  if(el.dataset&&el.dataset.rl!==undefined){var r=S.report.recs[+el.dataset.rl];r.links=r.links||[];var i=r.links.indexOf(el.dataset.f);if(el.checked&&i<0)r.links.push(el.dataset.f);if(!el.checked&&i>-1)r.links.splice(i,1);save();renderAside();refreshPreviews();return}
  if(el.dataset&&el.dataset.path&&(el.type==='checkbox'||el.tagName==='SELECT')){setPath(el.dataset.path,el.type==='checkbox'?el.checked:el.value);save();render()}
});
document.addEventListener('focusout',function(ev){
  var el=ev.target;
  if(el.dataset&&el.dataset.ov&&el.value.trim()){
    var o=overlap(el.value);var box=document.getElementById(el.dataset.ov);if(box)box.innerHTML=ovHtml(o);
    if(el.dataset.gq){S.guide.sections.forEach(function(s){s.qs.forEach(function(q){if(s.id+'|'+q.id===el.dataset.gq){q.chk=true;q.flag=!o.short&&o.hits.length>0}})});save();renderAside()}
  }
});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&SHEET){setSheet(false);var dk=$('#dock .pill');dk&&dk.focus()}});
document.addEventListener('click',function(ev){if(ev.target&&ev.target.id==='scrim')setSheet(false)});
function gq(si,qi){return S.guide.sections[si].qs[qi]}
document.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;
  if(a==='tab'){setSheet(false);S.tab=b.dataset.tab;save();try{history.replaceState(null,'','#'+S.tab)}catch(e){}render();window.scrollTo(0,0);return}
  if(a==='more'){S.show+=10;drawScan();return}
  if(a==='kf-toggle'){var w=b.closest('.kfwrap'),c=w.classList.toggle('kf-collapsed');b.textContent=c?'Show all '+b.dataset.n+' key findings':'Show fewer';b.setAttribute('aria-expanded',c?'false':'true');return}
  if(a==='clamp'){var tx=b.previousElementSibling,cl=tx.classList.toggle('clamp');b.textContent=cl?'More':'Less';return}
  if(a==='sheet'){setSheet(!SHEET);return}
  if(a==='sheet-close'){setSheet(false);var dk=$('#dock .pill');dk&&dk.focus();return}
  if(a==='kw'){S.terms=b.dataset.kw;S.mode=b.dataset.m;S.show=6;save();render();return}
  if(a==='try'){S.terms=b.dataset.t;S.show=6;save();render();var ti=$('#terms');ti&&ti.focus();return}
  if(a==='clearf'){S.mode='any';S.fProduct=S.fType=S.fYear=S.fArea=S.fGroup=S.fTheme=S.fStage='';S.show=6;save();render();return}
  if(a==='limits'){var t=$('#idxbar').dataset.limits;var n=$('#limitbox');if(n){n.remove();return}var d=document.createElement('div');d.id='limitbox';d.className='notice';d.style.cssText='white-space:pre-line';d.textContent=t;$('#idxbar').appendChild(d);return}
  if(a==='pin'){var p=PINREG[b.dataset.id];if(!p)return;
    if(pinned(p.id)){S.pins=S.pins.filter(function(x){return x.id!==p.id});save();b.textContent='Pin';b.classList.remove('on');b.setAttribute('aria-pressed','false');renderAside();toast('Removed from Evidence ('+S.pins.length+')');return}
    S.pins.push(Object.assign({},p));save();b.textContent='Pinned ✓';b.classList.add('on');b.setAttribute('aria-pressed','true');renderAside();
    toast('Pinned. Saved to Evidence ('+S.pins.length+'), top right. It will be cited in your plan, guide and report.');
    var ev=$('#evbtn');if(ev){ev.classList.remove('pulse');void ev.offsetWidth;ev.classList.add('pulse')}return}
  if(a==='cite'){var q=PINREG[b.dataset.id];if(q)copyText(cite(q));return}
  if(a==='unpin'){S.pins.splice(+b.dataset.i,1);save();renderAside();if(S.tab==='scan')drawScan();refreshPreviews();return}
  if(a==='cite-all'){copyText(S.pins.map(function(p,i){return (i+1)+'. ['+p.kind+'] '+cite(p)}).join('\n'));return}
  if(a==='pin-guide'){var pn=S.pins[+b.dataset.i];if(!S.guide.sections.length)S.guide.sections.push({id:uid(),title:'Added from prior research',qs:[]});var sc=S.guide.sections[S.guide.sections.length-1];sc.qs.push({id:uid(),text:pn.text,from:{study:pn.study,file:pn.file,line:pn.line,link:pn.link}});save();toast('Added to “'+sc.title+'” with its source.');if(S.tab==='guide')render();else renderAside();return}
  if(a==='qcheck'){var lines=($('#qcheck').value||'').split('\n').map(function(x){return x.trim()}).filter(Boolean);$('#qOut').innerHTML=lines.length?lines.map(function(l){return '<div class="field"><b>'+esc(l)+'</b>'+ovHtml(overlap(l))+'</div>'}).join(''):'<div class="empty">Paste at least one question.</div>';return}
  if(a==='reset'){if(b.dataset.sure){S=blank();try{localStorage.removeItem(KEY)}catch(e){}render();toast('Draft cleared')}else{b.dataset.sure='1';b.textContent='Click again to clear everything';setTimeout(function(){b.dataset.sure='';b.textContent='Clear my draft'},4000)}return}
  if(a==='goto'){setSheet(false);S.tab=b.dataset.tab;save();render();var f=b.dataset.field&&document.getElementById(b.dataset.field);if(f){f.scrollIntoView({block:'center'});f.focus()}else window.scrollTo(0,0);return}
  if(a==='g-reg'){S.reg.checks['s'+(S.reg.step||0)]=true;S.reg.step=+b.dataset.i;save();render();stepTop();return}
  if(a==='lbl-tg'){var nm2=b.dataset.n,ls=S.reg.labels||(S.reg.labels=[]),ix=ls.indexOf(nm2);if(ix>-1)ls.splice(ix,1);else ls.push(nm2);save();drawRegOut();return}
  if(a==='reg-sum'){var pg=S.plan,gl=[pg.goal1,pg.goal2,pg.goal3].filter(function(x){return (x||'').trim()}).map(function(x,i){return (i+1)+'. '+x.trim()}).join('\n'),rq=pg.rq.filter(function(x){return x.trim()}).map(function(x,i){return (i+1)+'. '+x.trim()}).join('\n');if(!gl&&!rq){toast('Your plan has no goals or research questions yet.');return}S.reg.summary=(S.reg.summary?S.reg.summary+'\n\n':'')+(gl?'Goals:\n'+gl:'')+(gl&&rq?'\n\n':'')+(rq?'Research questions:\n'+rq:'');save();render();return}
  if(a==='reg-key'){var inc=S.early.items.filter(function(i){return i.include&&(i.statement||'').trim()});if(!inc.length){toast('No findings are marked for the report yet.');return}S.reg.key=(S.reg.key?S.reg.key+'\n\n':'')+inc.map(function(f,i){return (i+1)+'. '+f.statement.trim()}).join('\n');save();render();return}
  if(a==='r-go'){S.repStep=+b.dataset.i;save();render();stepTop();return}
  if(a==='p-go'){S.planStep=+b.dataset.i;save();render();stepTop();return}
  if(a==='g-go'){S.guideStep=+b.dataset.i;save();render();stepTop();return}
  if(a==='rq-add'){S.plan.rq.push('');save();render();var l=$('#rq_'+(S.plan.rq.length-1));l&&l.focus();return}
  if(a==='rq-del'){S.plan.rq.splice(+b.dataset.i,1);if(!S.plan.rq.length)S.plan.rq=[''];save();render();return}
  if(a==='g-newsec'){var v=$('#newsec').value.trim();if(v){S.guide.sections.push({id:uid(),title:v,qs:[]});S.guideStep=S.guide.sections.length-1;save();render()}return}
  if(a==='g-addsec'){S.guide.sections.push({id:uid(),title:b.dataset.t,qs:[]});S.guideStep=S.guide.sections.length-1;save();render();return}
  if(a==='g-tmpl'){($('#gtmpl').value||'').split('\n').map(function(x){return x.replace(/^#+\s*/,'').trim()}).filter(Boolean).forEach(function(t){S.guide.sections.push({id:uid(),title:t,qs:[]})});save();render();return}
  if(a==='g-delsec'){S.guide.sections.splice(+b.dataset.si,1);S.guideStep=Math.max(0,Math.min(S.guideStep,S.guide.sections.length-1));save();render();return}
  if(a==='g-addq'){S.guide.sections[+b.dataset.si].qs.push({id:uid(),text:''});save();render();var qs=S.guide.sections[+b.dataset.si].qs;var e=$('#gq_'+qs[qs.length-1].id);e&&e.focus();return}
  if(a==='g-delq'){S.guide.sections[+b.dataset.si].qs.splice(+b.dataset.qi,1);save();render();return}
  if(a==='g-check'){S.guide.sections.forEach(function(s){s.qs.forEach(function(q){if(q.text.trim()){var o=overlap(q.text);q.chk=true;q.flag=!o.short&&o.hits.length>0}})});save();render();return}
  if(a==='e-add'){S.early.items.push({id:uid(),kind:KINDS[0]});S.findStep=S.early.items.length-1;save();render();stepTop();return}
  if(a==='f-go'){S.findStep=+b.dataset.i;save();render();stepTop();return}
  if(a==='e-del'){S.early.items.splice(+b.dataset.i,1);S.findStep=Math.max(0,Math.min(S.findStep,S.early.items.length-1));save();render();return}
  if(a==='e-rel'){var it=S.early.items[+b.dataset.i];PINREG={};var box=$('#rel_'+it.id);box.innerHTML=(it.statement||'').trim()?relHtml(it.statement):'<div class="notice warn">Write the finding first. Related insights are matched on its wording.</div>';return}
  if(a==='r-add'){S.report.recs.push({id:uid(),text:'',links:[]});save();render();return}
  if(a==='r-del'){S.report.recs.splice(+b.dataset.i,1);save();render();return}
  if(a==='cp'){var w=b.dataset.what;copyText(w==='plan'?planMd():w==='guide'?guideMd():w==='rec'?recMd():w==='intake'?intakeMd():w==='close'?closeMd():reportMd());return}
  if(a==='dl'){var wh=b.dataset.what;var txt=wh==='plan'?planMd():wh==='guide'?guideMd():wh==='rec'?recMd():wh==='intake'?intakeMd():wh==='close'?closeMd():reportMd();var nm=({plan:'research-plan',guide:'conversation-guide',report:'research-findings',rec:'recruitment-request',intake:'research-intake-card',close:'research-close-out'})[wh]+'.md';
    (async function(){try{var dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(!dl)throw {code:'unavailable'};await dl.save({filename:nm,data:txt})}catch(e){if(e&&e.code==='declined')return;toast('Saving is not available in this view. Use Copy instead.')}})();return}
});

/* ---------- boot ---------- */
(function(){var h=(location.hash||'').replace('#','');if(['scan','plan','guide','early','report','register'].indexOf(h)>-1)S.tab=h})();
var DATA_BASE='data/sample/';
function getJson(name){return fetch(DATA_BASE+name).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
getJson('research-index.json').then(function(j){IDX=j;build();return getJson('explorer-index.json').then(function(x){try{EXI=x;attachExplorer()}catch(err){EXI=null;ENTS=ENTS.filter(function(e){return !e.exOnly});ENTS.forEach(function(e){e.ex=[]})}},function(){EXI=null})}).then(function(){return getJson('repo-labels.json').then(function(x){RL=x},function(){RL=null})}).then(function(){renderIdx();render()}).catch(function(e){$('#main').innerHTML='<div class="panel"><h2>The sample data did not load</h2><p class="lead">The page needs the files in public/data/sample/. Run npm run sample to re-create them. Error: '+esc(e.message||e)+'</p></div>';$('#idxbar').textContent='No index loaded';var sr2=$('#src');if(sr2)sr2.textContent='No index'});
})();
