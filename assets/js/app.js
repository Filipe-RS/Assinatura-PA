/* =========================================================================
   Gerador de Assinatura PMMG — lógica da aplicação
   Depende de: assets/js/shields.js (define a constante global SHIELDS)
   ========================================================================= */
const BG = "assets/img/fundo-classico.png";

const state = {
  layout: 'classico',
  shield: '8cia',
  custom: null,
  custombg: null,
  theme: 'escuro',
  colNome: 'dark',
  colEnd: 'dark',
  alignNome: 'padrao',
  alignEnd: 'padrao',
  shscale: 1,
  expscale: 0.5,                 // tamanho do arquivo salvo (1 = original)
  nome: 'NOME COMPLETO, (POSTO/GRADUAÇÃO) PM',
  funcao: 'LOCAL/FUNÇÃO',
  end1: 'ENDEREÇO COMPLETO - RUA/Nº/BAIRRO/CIDADE-MG',
  end2: 'E-mail: DIGITE SEU EMAIL INSTITUCIONAL OU CAIXA VINCULADA',
  end3: 'Telefone: DIGITE SEU TELEFONE.'
};

// ---------- persistência da última edição ----------
const STORE_KEY = 'assinatura_pmmg_v6';   // vira 'assinatura_pmmg_v7'
const SAVE_KEYS = ['layout','shield','theme','colNome','colEnd','alignNome','alignEnd',
                   'shscale','expscale','nome','funcao','end1','end2','end3'];
const DEFAULTS = {}; SAVE_KEYS.forEach(k => DEFAULTS[k] = state[k]);

state.customSrc   = null;                 // dataURL do escudo enviado
state.custombgSrc = null;                 // dataURL do fundo enviado
state.uplname     = 'nenhum arquivo';
state.uplbgname   = 'padrão do layout';

let booted = false, dirty = false, savedAt = null;

function saveMsg(txt, cls){
  const el = document.getElementById('savemsg');
  if(!el) return;
  el.textContent = txt;
  el.className = 'savemsg' + (cls ? ' ' + cls : '');
}
function fmtWhen(ts){
  try{ return new Date(ts).toLocaleString('pt-BR'); }catch(e){ return ''; }
}
function updateSaveMsg(){
  if(dirty) saveMsg('\u25CF Alterações não salvas \u2014 clique em Salvar alterações (ou Ctrl+S).','warn');
  else if(savedAt) saveMsg('\u2713 Edição salva em ' + fmtWhen(savedAt) + ' \u2014 será carregada quando o arquivo for aberto de novo.','ok');
  else saveMsg('Nenhuma edição salva ainda.','');
}
function markDirty(){
  if(!booted) return;
  dirty = true;
  updateSaveMsg();
}
function collectSave(withImages){
  const o = {};
  SAVE_KEYS.forEach(k => o[k] = state[k]);
  o.savedAt = Date.now();
  if(withImages){
    o.customSrc   = state.customSrc;
    o.custombgSrc = state.custombgSrc;
    o.uplname     = state.uplname;
    o.uplbgname   = state.uplbgname;
  }
  return o;
}
function saveState(){
  let dados = collectSave(true), parcial = false;
  try{
    try{
      localStorage.setItem(STORE_KEY, JSON.stringify(dados));
    }catch(e){                        // estourou a cota: salva sem as imagens enviadas
      dados = collectSave(false); parcial = true;
      localStorage.setItem(STORE_KEY, JSON.stringify(dados));
    }
  }catch(e){
    saveMsg('\u2715 Não foi possível salvar: o navegador bloqueou o armazenamento local deste arquivo.','err');
    return false;
  }
  savedAt = dados.savedAt; dirty = false;
  if(parcial) saveMsg('\u2713 Textos e ajustes salvos em ' + fmtWhen(savedAt) + '. As imagens enviadas eram grandes demais e não foram guardadas.','warn');
  else updateSaveMsg();
  return true;
}
async function restoreState(){
  let raw = null;
  try{ raw = localStorage.getItem(STORE_KEY); }catch(e){ return null; }
  if(!raw) return null;
  let d;
  try{ d = JSON.parse(raw); }catch(e){ return null; }
  SAVE_KEYS.forEach(k => { if(d[k] !== undefined && d[k] !== null) state[k] = d[k]; });
  if(d.customSrc){
    state.customSrc = d.customSrc;
    state.uplname   = d.uplname || 'escudo salvo';
    state.custom    = await loadImg(d.customSrc);
  }
  if(d.custombgSrc){
    state.custombgSrc = d.custombgSrc;
    state.uplbgname   = d.uplbgname || 'fundo salvo';
    state.custombg    = await loadImg(d.custombgSrc);
  }
  savedAt = d.savedAt || null;
  return d;
}
function resetState(){
  if(!confirm('Restaurar os valores padrão e apagar a edição salva?')) return;
  SAVE_KEYS.forEach(k => state[k] = DEFAULTS[k]);
  state.custom = state.customSrc = state.custombg = state.custombgSrc = null;
  state.uplname = 'nenhum arquivo'; state.uplbgname = 'padrão do layout';
  try{ localStorage.removeItem(STORE_KEY); }catch(e){}
  savedAt = null;
  syncUI(); applyTheme(); draw();
  dirty = false; updateSaveMsg();
}
// reflete o estado atual nos controles da tela
function syncUI(){
  [['theme','theme'],['colNome','colNome'],['colEnd','colEnd'],
   ['alignNome','alignNome'],['alignEnd','alignEnd']].forEach(function(par){
    const w = document.getElementById(par[0]); if(!w) return;
    [...w.children].forEach(b => b.classList.toggle('on', b.dataset.v === state[par[1]]));
  });
  const lc = document.getElementById('layouts');
  if(lc) [...lc.children].forEach(b => b.classList.toggle('on', b.dataset.k === state.layout));
  const sel = document.getElementById('shield'); if(sel) sel.value = state.shield;
  ['nome','funcao','end1','end2','end3'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = state[id];
  });
  const ss = document.getElementById('shscale');
  if(ss){
    ss.value = Math.round(state.shscale * 100);
    document.getElementById('shscalev').textContent = ss.value + '%';
  }
  const ex = document.getElementById('expscale');
  if(ex) [...ex.children].forEach(b =>
    b.classList.toggle('on', (+b.dataset.v)/100 === (state.expscale || 1)));
  document.getElementById('uplname').textContent   = state.uplname;
  document.getElementById('uplbgname').textContent = state.uplbgname;
}

// ---------- tela inicial: escolha da unidade ----------
const UNIT_KEY = 'assinatura_pmmg_unidade';   // {shield, skip}
let welcomePick = null, welcomeOk = false;

function unitPref(){
  try{ return JSON.parse(localStorage.getItem(UNIT_KEY) || 'null'); }catch(e){ return null; }
}
function rememberUnit(id, skip){
  const atual = unitPref() || {};
  if(skip === undefined) skip = !!atual.skip;
  try{ localStorage.setItem(UNIT_KEY, JSON.stringify({shield:id, skip:!!skip})); }catch(e){}
}
function unitLabel(id){
  const u = SHIELDS.find(x => x.id === id);
  return u ? u.label : '';
}
function buildWelcome(){
  const box = document.getElementById('wgroups');
  const grupos = {};
  SHIELDS.forEach(u => { (grupos[u.group] = grupos[u.group] || []).push(u); });
  Object.keys(grupos).forEach(g => {
    const sec = document.createElement('div'); sec.className = 'wsec';
    const tit = document.createElement('div'); tit.className = 'wsec-t'; tit.textContent = g;
    sec.appendChild(tit);
    const grid = document.createElement('div'); grid.className = 'wgrid';
    grupos[g].forEach(u => {
      const b = document.createElement('button');
      b.className = 'wopt'; b.type = 'button'; b.dataset.id = u.id;
      const im = document.createElement('img'); im.alt = u.label; im.src = u.src;
      const sp = document.createElement('span'); sp.textContent = u.label;
      b.appendChild(im); b.appendChild(sp);
      b.onclick = () => pickUnit(u.id);
      b.ondblclick = () => { pickUnit(u.id); enterApp(); };
      grid.appendChild(b);
    });
    sec.appendChild(grid); box.appendChild(sec);
  });
  document.getElementById('wgo').onclick = enterApp;
  document.addEventListener('keydown', e => {
    const w = document.getElementById('welcome');
    if(!w.hidden && e.key === 'Enter' && welcomeOk){ e.preventDefault(); enterApp(); }
  });
  const pref = unitPref();
  document.getElementById('wremember').checked = !!(pref && pref.skip);
  pickUnit(state.shield);
}
function pickUnit(id){
  welcomePick = id;
  [...document.querySelectorAll('#wgroups .wopt')].forEach(b => b.classList.toggle('on', b.dataset.id === id));
  const go = document.getElementById('wgo');
  if(welcomeOk) go.textContent = 'Continuar com ' + unitLabel(id) + '  \u2192';
}
function welcomeReady(){                 // libera o botão quando tudo terminou de carregar
  welcomeOk = true;
  document.getElementById('wgo').disabled = false;
  pickUnit(welcomePick || state.shield);
}
function showWelcome(){
  const w = document.getElementById('welcome');
  w.hidden = false; document.body.classList.add('welcome-open');
  pickUnit(state.shield);
  w.scrollTop = 0;
}
function hideWelcome(){
  document.getElementById('welcome').hidden = true;
  document.body.classList.remove('welcome-open');
}
function enterApp(){
  const trocou = welcomePick && welcomePick !== state.shield;
  if(welcomePick){
    state.shield = welcomePick;
    if(trocou){                          // unidade nova: descarta escudo enviado manualmente
      state.custom = null; state.customSrc = null; state.uplname = 'nenhum arquivo';
    }
  }
  rememberUnit(state.shield, document.getElementById('wremember').checked);
  hideWelcome();
  syncUI(); draw();
  if(!trocou){ dirty = false; updateSaveMsg(); }
}

// 100% da exportacao = 70% do tamanho em que a assinatura e desenhada
const EXPORT_BASE = 0.70;

const images = {};       // id -> HTMLImageElement
let bgImg = null;

function loadImg(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src;});}

const cv = document.getElementById('cv');
let ctx = cv.getContext('2d');   // redirecionado durante a exportação

// ---------- layout definitions ----------
const LAYOUTS = {
  classico: { w:2016, h:544, label:'Clássico', render:renderClassico },
  clara:    { w:2016, h:520, label:'Faixa clara', render:renderClara },
  central:  { w:1500, h:820, label:'Centralizado', render:renderCentral }
};

function anchor(al,x0,x1){
  if(al==='center') return [(x0+x1)/2,'center'];
  if(al==='right')  return [x1,'right'];
  return [x0,'left'];
}
// stacked text block; name/função use aN, endereço uses aE
function drawStacked(x0,x1,cy,f,aN,aE){
  ctx.textBaseline='alphabetic';
  const c=inks();
  const total = f.gapNF + f.gapFA + 2*f.lh;   // 1st baseline -> last baseline
  const y0 = Math.round(cy - total/2 + f.n*0.35);
  const [nx,nt]=anchor(aN,x0,x1), [ex,et]=anchor(aE,x0,x1);
  ctx.textAlign=nt;
  ctx.fillStyle=c.name; ctx.font=f.nameFont; ctx.fillText(state.nome, nx, y0);
  ctx.fillStyle=c.sub;  ctx.font=f.funcFont; ctx.fillText(state.funcao, nx, y0+f.gapNF);
  ctx.textAlign=et;
  ctx.fillStyle=c.addr; ctx.font=f.addrFont;
  const ya=y0+f.gapNF+f.gapFA;
  ctx.fillText(state.end1, ex, ya);
  ctx.fillText(state.end2, ex, ya+f.lh);
  ctx.fillText(state.end3, ex, ya+2*f.lh);
}

function curShieldImg(){
  if(state.custom) return state.custom;
  return images[state.shield] || null;
}

function drawCover(img,W,H){
  const s=Math.max(W/img.width,H/img.height);
  const w=img.width*s,h=img.height*s;
  ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);
}
const PALETTE={
  dark: {name:'#141414', sub:'#3a352b',            addr:'#26231d'},
  light:{name:'#ffffff', sub:'rgba(255,255,255,.92)', addr:'#f2f2f2'},
  gold: {name:'#9C824A', sub:'#9C824A',            addr:'#9C824A'}
};
function inks(){
  const a = PALETTE[state.colNome] || PALETTE.dark;
  const b = PALETTE[state.colEnd]  || PALETTE.dark;
  return {name:a.name, sub:a.sub, addr:b.addr};
}
function applyTheme(){
  if(state.theme==='escuro') document.body.removeAttribute('data-theme');
  else document.body.dataset.theme = state.theme;
  markDirty();
}
function drawShieldFit(img, boxX, boxY, boxW, boxH, align){
  if(!img) return {x:boxX,y:boxY,w:0,h:0};
  const s = Math.min(boxW/img.width, boxH/img.height);
  const w = img.width*s, h = img.height*s;
  let x = boxX, y = boxY + (boxH-h)/2;
  if(align==='center') x = boxX + (boxW-w)/2;
  else if(align==='right') x = boxX + (boxW-w);
  ctx.drawImage(img, x, y, w, h);
  return {x,y,w,h};
}

function renderClassico(W,H){
  // background: custom, or tan + diagonal bars
  if(state.custombg) drawCover(state.custombg,W,H);
  else if(bgImg) ctx.drawImage(bgImg,0,0,W,H);
  else { ctx.fillStyle='#B2A582'; ctx.fillRect(0,0,W,H); }
  const c=inks(), sc = state.shscale;
  // shield lower-left
  drawShieldFit(curShieldImg(), 34, H*0.30, 360*sc, (H*0.66)*sc, 'left');
  if(!(state.alignNome==='padrao' && state.alignEnd==='padrao')){
    const aN=state.alignNome==='padrao'?'left':state.alignNome;
    const aE=state.alignEnd==='padrao'?'left':state.alignEnd;
    drawStacked(430, W-40, H*0.50, {nameFont:'italic 600 60px Rawline, sans-serif',
      funcFont:'italic 500 50px Rawline, sans-serif', addrFont:'italic 400 43px Rawline, sans-serif',
      n:60, gapNF:62, gapFA:88, lh:57}, aN, aE);
    return;
  }
  // name + funcao top-left
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.fillStyle=c.name;
  ctx.font='italic 600 62px Rawline, sans-serif';
  ctx.fillText(state.nome, 60, 92);
  ctx.fillStyle=c.sub;
  ctx.font='italic 500 52px Rawline, sans-serif';
  ctx.fillText(state.funcao, 62, 156);
  // address to the right of shield (kept above the diagonal bars)
  ctx.fillStyle=c.addr;
  ctx.font='italic 400 43px Rawline, sans-serif';
  const ax=430, ay=292, lh=57;
  ctx.fillText(state.end1, ax, ay);
  ctx.fillText(state.end2, ax, ay+lh);
  ctx.fillText(state.end3, ax, ay+lh*2);
}

function renderClara(W,H){
  if(state.custombg) drawCover(state.custombg,W,H);
  else { ctx.fillStyle='#F1EDE3'; ctx.fillRect(0,0,W,H); }
  // gold bottom accent
  ctx.fillStyle='#A8935B'; ctx.fillRect(0,H-14,W,14);
  const c=inks(), sc=state.shscale;
  const sb=drawShieldFit(curShieldImg(), 40, H*0.12, 340*sc, (H*0.74)*sc, 'left');
  // vertical divider
  const dx = Math.max(sb.x+sb.w+40, 420);
  ctx.strokeStyle='#A8935B'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(dx, H*0.20); ctx.lineTo(dx, H*0.80); ctx.stroke();
  const tx = dx+40;
  if(!(state.alignNome==='padrao' && state.alignEnd==='padrao')){
    const aN=state.alignNome==='padrao'?'left':state.alignNome;
    const aE=state.alignEnd==='padrao'?'left':state.alignEnd;
    drawStacked(tx, W-40, H*0.50, {nameFont:'700 58px Rawline, sans-serif',
      funcFont:'italic 500 46px Rawline, sans-serif', addrFont:'400 42px Rawline, sans-serif',
      n:58, gapNF:60, gapFA:90, lh:58}, aN, aE);
    return;
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=c.name;
  ctx.font='700 60px Rawline, sans-serif';
  ctx.fillText(state.nome, tx, 150);
  ctx.fillStyle=c.sub;
  ctx.font='italic 500 48px Rawline, sans-serif';
  ctx.fillText(state.funcao, tx, 214);
  ctx.fillStyle=c.addr;
  ctx.font='400 42px Rawline, sans-serif';
  const ay=308, lh=60;
  ctx.fillText(state.end1, tx, ay);
  ctx.fillText(state.end2, tx, ay+lh);
  ctx.fillText(state.end3, tx, ay+lh*2);
}

function renderCentral(W,H){
  if(state.custombg) drawCover(state.custombg,W,H);
  else { ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H); }
  const c=inks(), sc=state.shscale;
  drawShieldFit(curShieldImg(), W/2-190*sc, 40, 380*sc, 360*sc, 'center');
  if(!(state.alignNome==='padrao' && state.alignEnd==='padrao')){
    const aN=state.alignNome==='padrao'?'center':state.alignNome;
    const aE=state.alignEnd==='padrao'?'center':state.alignEnd;
    drawStacked(90, W-90, (40+360*sc + H)/2, {nameFont:'italic 600 58px Rawline, sans-serif',
      funcFont:'italic 500 46px Rawline, sans-serif', addrFont:'400 40px Rawline, sans-serif',
      n:58, gapNF:62, gapFA:92, lh:56}, aN, aE);
    return;
  }
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=c.name;
  ctx.font='italic 600 60px Rawline, sans-serif';
  ctx.fillText(state.nome, W/2, 470);
  ctx.font='italic 500 48px Rawline, sans-serif';
  ctx.fillStyle=c.sub;
  ctx.fillText(state.funcao, W/2, 534);
  // gold rule
  ctx.strokeStyle='#A8935B'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(W/2-260, 576); ctx.lineTo(W/2+260, 576); ctx.stroke();
  ctx.fillStyle=c.addr;
  ctx.font='400 40px Rawline, sans-serif';
  const ay=648, lh=58;
  ctx.fillText(state.end1, W/2, ay);
  ctx.fillText(state.end2, W/2, ay+lh);
  ctx.fillText(state.end3, W/2, ay+lh*2);
}

function draw(){
  const L = LAYOUTS[state.layout];
  cv.width=L.w; cv.height=L.h;
  ctx.clearRect(0,0,L.w,L.h);
  L.render(L.w,L.h);
  const ex = (state.expscale || 1) * EXPORT_BASE;
  const ew = Math.round(L.w * ex), eh = Math.round(L.h * ex);
  document.getElementById('cap').textContent =
    L.label + ' — arquivo salvo: ' + ew + '×' + eh + ' px (' +
    Math.round((state.expscale || 1) * 100) + '%)';
  markDirty();
}

// ---------- UI ----------
function buildUI(){
  // layouts
  const lc = document.getElementById('layouts');
  Object.keys(LAYOUTS).forEach(k=>{
    const b=document.createElement('button');
    b.textContent=LAYOUTS[k].label; b.dataset.k=k;
    if(k===state.layout) b.classList.add('on');
    b.onclick=()=>{state.layout=k; [...lc.children].forEach(c=>c.classList.toggle('on',c.dataset.k===k)); draw();};
    lc.appendChild(b);
  });
  // shields grouped
  const sel=document.getElementById('shield');
  const groups={};
  SHIELDS.forEach(s=>{(groups[s.group]=groups[s.group]||[]).push(s);});
  Object.keys(groups).forEach(g=>{
    const og=document.createElement('optgroup'); og.label=g;
    groups[g].forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.label;if(s.id===state.shield)o.selected=true;og.appendChild(o);});
    sel.appendChild(og);
  });
  sel.onchange=()=>{state.shield=sel.value; state.custom=null; state.customSrc=null;
    state.uplname='nenhum arquivo'; document.getElementById('uplname').textContent=state.uplname;
    rememberUnit(state.shield); draw();};
  document.getElementById('chgunit').onclick=()=>showWelcome();
  // upload
  document.getElementById('upl').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    state.uplname=f.name;
    document.getElementById('uplname').textContent=f.name;
    const r=new FileReader();
    r.onload=ev=>{ state.customSrc=ev.target.result; loadImg(ev.target.result).then(im=>{state.custom=im; draw();}); };
    r.readAsDataURL(f);
  };
  // custom background upload
  document.getElementById('uplbg').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    state.uplbgname=f.name;
    document.getElementById('uplbgname').textContent=f.name;
    const r=new FileReader();
    r.onload=ev=>{ state.custombgSrc=ev.target.result; loadImg(ev.target.result).then(im=>{state.custombg=im; draw();}); };
    r.readAsDataURL(f);
  };
  document.getElementById('clrbg').onclick=()=>{
    state.custombg=null; state.custombgSrc=null; document.getElementById('uplbg').value='';
    state.uplbgname='padrão do layout';
    document.getElementById('uplbgname').textContent=state.uplbgname; draw();
  };
  // generic button-group toggle
  function toggle(id,key,after){
    const w=document.getElementById(id);
    [...w.children].forEach(b=>{ b.onclick=()=>{
      state[key]=b.dataset.v;
      [...w.children].forEach(x=>x.classList.toggle('on',x===b));
      (after||draw)();
    };});
  }
  toggle('theme','theme',applyTheme);
  toggle('colNome','colNome');
  toggle('colEnd','colEnd');
  toggle('alignNome','alignNome');
  toggle('alignEnd','alignEnd');
  // text fields
  const bind=(id)=>{const el=document.getElementById(id); el.value=state[id]; el.oninput=()=>{state[id]=el.value; draw();};};
  ['nome','funcao','end1','end2','end3'].forEach(bind);
  // shield scale
  const ss=document.getElementById('shscale');
  ss.oninput=()=>{state.shscale=ss.value/100; document.getElementById('shscalev').textContent=ss.value+'%'; draw();};
  // tamanho do arquivo exportado
  const ex=document.getElementById('expscale');
  [...ex.children].forEach(b=>{ b.onclick=()=>{
    state.expscale = (+b.dataset.v)/100;
    [...ex.children].forEach(x=>x.classList.toggle('on', x===b));
    draw();
  };});
  // export
  document.getElementById('savecfg').onclick=()=>saveState();
  document.getElementById('resetcfg').onclick=()=>resetState();
  document.addEventListener('keydown', e=>{
    if((e.ctrlKey||e.metaKey) && (e.key==='s'||e.key==='S')){ e.preventDefault(); saveState(); }
  });
  document.getElementById('dljpg').onclick=()=>download('image/jpeg','jpg',0.98);
  document.getElementById('dlpng').onclick=()=>download('image/png','png');
}

// Canvas final: a assinatura é REDESENHADA na resolução de saída
// (texto rasterizado no tamanho final = letras nítidas, em vez de imagem encolhida).
function exportCanvas(){
  const ex = (state.expscale || 1) * EXPORT_BASE;
  if(ex === 1) return cv;
  const L = LAYOUTS[state.layout];
  const w = Math.max(1, Math.round(L.w * ex));
  const h = Math.max(1, Math.round(L.h * ex));
  const c2 = document.createElement('canvas');
  c2.width = w; c2.height = h;
  const x2 = c2.getContext('2d');
  x2.imageSmoothingEnabled = true;
  x2.imageSmoothingQuality = 'high';
  const real = ctx;
  ctx = x2;                                  // as funções de desenho usam 'ctx'
  try{
    ctx.setTransform(w / L.w, 0, 0, h / L.h, 0, 0);
    ctx.clearRect(0, 0, L.w, L.h);
    L.render(L.w, L.h);
  } finally {
    ctx = real;
  }
  return c2;
}
function download(mime,ext,q){
  // JPEG needs opaque bg (canvas already opaque). Render fresh to be safe.
  draw();
  const out = exportCanvas();
  const url = out.toDataURL(mime, q);
  const a=document.createElement('a');
  a.download = 'assinatura_'+state.layout+'_'+out.width+'x'+out.height+'.'+ext;
  a.href=url; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- boot ----------
async function boot(){
  const brand = (SHIELDS.find(s=>s.id==='inst_color')||{}).src;
  if(brand){
    document.getElementById('brandimg').src = brand;
    document.getElementById('wbrand').src = brand;
  }
  await restoreState();
  const pref = unitPref();
  if(pref && pref.shield && SHIELDS.some(u => u.id === pref.shield)) state.shield = pref.shield;
  applyTheme();
  buildWelcome();
  if(pref && pref.skip) hideWelcome();
  else document.body.classList.add('welcome-open');
  bgImg = await loadImg(BG);
  await Promise.all(SHIELDS.map(async s=>{ images[s.id]=await loadImg(s.src); }));
  try{
    await document.fonts.load('italic 600 62px Rawline');
    await document.fonts.load('italic 500 52px Rawline');
    await document.fonts.load('italic 400 44px Rawline');
    await document.fonts.load('700 60px Rawline');
    await document.fonts.load('400 42px Rawline');
    await document.fonts.ready;
  }catch(e){}
  buildUI();
  syncUI();
  draw();
  booted = true; dirty = false;
  updateSaveMsg();
  welcomeReady();
}
boot();
