/* =========================================================================
   Gerador de Assinatura PMMG — lógica da aplicação
   Depende de: assets/js/shields.js (define a constante global SHIELDS)
   ========================================================================= */
const BG = "assets/img/fundo-classico.png";

const state = {
  layout: 'classico',
  shield: '8cia',
  custom: null,
  theme: 'escuro',
  shscale: 1,
  expmode: 'padrao',             // tamanho do arquivo exportado (fixo, ver EXPORT_MODES)
  nome: 'NOME COMPLETO, (POSTO/GRADUAÇÃO) PM',
  funcao: 'LOCAL/FUNÇÃO',
  end1: 'RUA/Nº/BAIRRO/CIDADE-MG',
  end2: 'E-mail: DIGITE SEU EMAIL INSTITUCIONAL OU CAIXA VINCULADA',
  end3: 'Telefone: DIGITE SEU TELEFONE.'
};

// ---------- persistência da última edição ----------
const STORE_KEY = 'assinatura_pmmg_v7';
// Cor e alinhamento nao sao mais escolhidos pelo usuario (padronizacao da
// assinatura): ficam fixos nos valores definidos em 'state' e por isso saem
// da lista do que e salvo no navegador.
const SAVE_KEYS = ['layout','shield','theme',
                   'shscale','nome','funcao','end1','end2','end3'];
const DEFAULTS = {}; SAVE_KEYS.forEach(k => DEFAULTS[k] = state[k]);

state.customSrc = null;                   // dataURL do escudo enviado
state.uplname   = 'nenhum arquivo';

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
    o.customSrc = state.customSrc;
    o.uplname   = state.uplname;
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
  savedAt = d.savedAt || null;
  return d;
}
function resetState(){
  if(!confirm('Restaurar os valores padrão e apagar a edição salva?')) return;
  SAVE_KEYS.forEach(k => state[k] = DEFAULTS[k]);
  state.custom = state.customSrc = null;
  state.uplname = 'nenhum arquivo';
  try{ localStorage.removeItem(STORE_KEY); }catch(e){}
  savedAt = null;
  syncUI(); applyTheme(); draw();
  dirty = false; updateSaveMsg();
}
// reflete o estado atual nos controles da tela
function syncUI(){
  [['theme','theme']].forEach(function(par){
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
  const ex = document.getElementById('expsize');
  if(ex) [...ex.children].forEach(b =>
    b.classList.toggle('on', b.dataset.v === state.expmode));
  const un = document.getElementById('uplname');
  if(un) un.textContent = state.uplname;
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

// ---------- tamanhos de exportacao ----------
// scale   -> fator aplicado sobre o tamanho do layout (junto com EXPORT_BASE)
// squeeze -> fator aplicado SO na largura (1 = mantem a proporcao original)
// No modelo Classico (2016x544) isto resulta em 706x190 e 599x190.
// scale  -> fator aplicado sobre o tamanho do layout (junto com EXPORT_BASE)
// narrow  -> estreita a AREA DE DESENHO antes de exportar. Nao deforma nada:
//            o texto e o escudo mantem o tamanho, sobra menos espaco vazio a direita.
// No modelo Classico (2016x544) isto resulta em 706x190 e 599x190.
// Tamanho unico de exportacao, para padronizar a assinatura. No modelo
// Classico (2016x544) resulta em 706x190 px.
// Para oferecer outro tamanho no futuro, basta acrescentar uma entrada aqui e
// um grupo de botoes com id="expsize" no index.html (um botao por entrada,
// com data-v igual a chave); o resto do codigo ja lida com isso.
const EXPORT_MODES = {
  padrao: { label: 'Padrão', scale: 0.50, narrow: 1 }
};
function expMode(){ return EXPORT_MODES[state.expmode] || EXPORT_MODES.padrao; }
// area de desenho efetiva do layout no modo escolhido
function expFrame(L){
  const m = expMode();
  return { w: Math.max(1, Math.round(L.w * m.narrow)), h: L.h, render: L.render, label: L.label };
}
function expSize(L){
  const F = expFrame(L), k = expMode().scale * EXPORT_BASE;
  return { w: Math.max(1, Math.round(F.w * k)), h: Math.max(1, Math.round(F.h * k)) };
}

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

// ---------- ajuste automatico de texto ----------
// Impede que nome/funcao/endereco sejam cortados quando passam da largura
// disponivel: mede as linhas do bloco e reduz a fonte do bloco inteiro pelo
// mesmo fator, preservando a hierarquia visual entre as linhas.
function fitRatio(lines, maxW){
  let r = 1;
  if(!(maxW > 0)) return r;
  lines.forEach(([t, font]) => {
    if(!t) return;
    ctx.font = font;
    const w = ctx.measureText(t).width;
    if(w > maxW) r = Math.min(r, maxW / w);
  });
  return r;
}
function fitFont(font, r){
  if(r >= 1) return font;
  return font.replace(/(\d+(?:\.\d+)?)px/, (m, px) => Math.max(8, +px * r).toFixed(1) + 'px');
}


function curShieldImg(){
  if(state.custom) return state.custom;
  return images[state.shield] || null;
}

// cores fixas do texto da assinatura
const INK = {name:'#141414', sub:'#3a352b', addr:'#26231d'};
function inks(){ return INK; }
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
  // fundo: imagem padrao do modelo, com reserva em cor solida
  if(bgImg) ctx.drawImage(bgImg,0,0,W,H);
  else { ctx.fillStyle='#B2A582'; ctx.fillRect(0,0,W,H); }
  const c=inks(), sc = state.shscale;
  // shield lower-left
  drawShieldFit(curShieldImg(), 34, H*0.30, 360*sc, (H*0.66)*sc, 'left');
  // name + funcao top-left
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  const fN='italic 600 62px Rawline, sans-serif', fF='italic 500 52px Rawline, sans-serif',
        fA='italic 400 43px Rawline, sans-serif';
  const ax=430, ay=292, lh=57;
  const rN=fitRatio([[state.nome,fN],[state.funcao,fF]], W-62-24);
  const rA=fitRatio([[state.end1,fA],[state.end2,fA],[state.end3,fA]], W-ax-24);
  ctx.fillStyle=c.name;
  ctx.font=fitFont(fN,rN);
  ctx.fillText(state.nome, 60, 92);
  ctx.fillStyle=c.sub;
  ctx.font=fitFont(fF,rN);
  ctx.fillText(state.funcao, 62, 156);
  // address to the right of shield (kept above the diagonal bars)
  ctx.fillStyle=c.addr;
  ctx.font=fitFont(fA,rA);
  ctx.fillText(state.end1, ax, ay);
  ctx.fillText(state.end2, ax, ay+lh);
  ctx.fillText(state.end3, ax, ay+lh*2);
}

function renderClara(W,H){
  ctx.fillStyle='#F1EDE3'; ctx.fillRect(0,0,W,H);
  // gold bottom accent
  ctx.fillStyle='#A8935B'; ctx.fillRect(0,H-14,W,14);
  const c=inks(), sc=state.shscale;
  const sb=drawShieldFit(curShieldImg(), 40, H*0.12, 340*sc, (H*0.74)*sc, 'left');
  // vertical divider
  const dx = Math.max(sb.x+sb.w+40, 420);
  ctx.strokeStyle='#A8935B'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(dx, H*0.20); ctx.lineTo(dx, H*0.80); ctx.stroke();
  const tx = dx+40;
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  const fN='700 60px Rawline, sans-serif', fF='italic 500 48px Rawline, sans-serif',
        fA='400 42px Rawline, sans-serif';
  const rN=fitRatio([[state.nome,fN],[state.funcao,fF]], W-tx-40);
  const rA=fitRatio([[state.end1,fA],[state.end2,fA],[state.end3,fA]], W-tx-40);
  ctx.fillStyle=c.name;
  ctx.font=fitFont(fN,rN);
  ctx.fillText(state.nome, tx, 150);
  ctx.fillStyle=c.sub;
  ctx.font=fitFont(fF,rN);
  ctx.fillText(state.funcao, tx, 214);
  ctx.fillStyle=c.addr;
  ctx.font=fitFont(fA,rA);
  const ay=308, lh=60;
  ctx.fillText(state.end1, tx, ay);
  ctx.fillText(state.end2, tx, ay+lh);
  ctx.fillText(state.end3, tx, ay+lh*2);
}

function renderCentral(W,H){
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
  const c=inks(), sc=state.shscale;
  drawShieldFit(curShieldImg(), W/2-190*sc, 40, 380*sc, 360*sc, 'center');
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  const fN='italic 600 60px Rawline, sans-serif', fF='italic 500 48px Rawline, sans-serif',
        fA='400 40px Rawline, sans-serif';
  const rN=fitRatio([[state.nome,fN],[state.funcao,fF]], W-180);
  const rA=fitRatio([[state.end1,fA],[state.end2,fA],[state.end3,fA]], W-180);
  ctx.fillStyle=c.name;
  ctx.font=fitFont(fN,rN);
  ctx.fillText(state.nome, W/2, 470);
  ctx.font=fitFont(fF,rN);
  ctx.fillStyle=c.sub;
  ctx.fillText(state.funcao, W/2, 534);
  // gold rule
  ctx.strokeStyle='#A8935B'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(W/2-260, 576); ctx.lineTo(W/2+260, 576); ctx.stroke();
  ctx.fillStyle=c.addr;
  ctx.font=fitFont(fA,rA);
  const ay=648, lh=58;
  ctx.fillText(state.end1, W/2, ay);
  ctx.fillText(state.end2, W/2, ay+lh);
  ctx.fillText(state.end3, W/2, ay+lh*2);
}

function draw(){
  const L0 = LAYOUTS[state.layout];
  const L = expFrame(L0);
  cv.width=L.w; cv.height=L.h;
  ctx.clearRect(0,0,L.w,L.h);
  L.render(L.w,L.h);
  const e = expSize(L0);
  document.getElementById('cap').textContent =
    L.label + ' — arquivo salvo: ' + e.w + '×' + e.h + ' px';
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
  // generic button-group toggle
  function toggle(id,key,after){
    const w=document.getElementById(id); if(!w) return;
    [...w.children].forEach(b=>{ b.onclick=()=>{
      state[key]=b.dataset.v;
      [...w.children].forEach(x=>x.classList.toggle('on',x===b));
      (after||draw)();
    };});
  }
  toggle('theme','theme',applyTheme);
  // text fields
  const bind=(id)=>{const el=document.getElementById(id); el.value=state[id]; el.oninput=()=>{state[id]=el.value; draw();};};
  ['nome','funcao','end1','end2','end3'].forEach(bind);
  // shield scale
  const ss=document.getElementById('shscale');
  ss.oninput=()=>{state.shscale=ss.value/100; document.getElementById('shscalev').textContent=ss.value+'%'; draw();};
  // tamanho do arquivo exportado
  const ex=document.getElementById('expsize');
  if(ex) [...ex.children].forEach(b=>{ b.onclick=()=>{
    state.expmode = b.dataset.v;
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
  const L = expFrame(LAYOUTS[state.layout]);
  const { w, h } = expSize(LAYOUTS[state.layout]);
  if(w === L.w && h === L.h) return cv;
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
  try{
    buildUI();
    syncUI();
    draw();
  }catch(e){
    // nunca deixa a tela presa em "Carregando..." por causa de um erro isolado
    console.error('Falha ao montar a interface:', e);
  }
  booted = true; dirty = false;
  updateSaveMsg();
  welcomeReady();
}
boot();
