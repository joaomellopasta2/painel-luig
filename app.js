'use strict';
let DADOS = null;
let filtroObjeto = 'todos', filtroTrib = 'todos', filtroStatus = 'todos';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function fmtData(iso){ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function diasAtras(iso){ if(!iso) return ''; const d=new Date(iso+'T12:00:00'); const dif=Math.floor((Date.now()-d)/864e5);
  if(dif<=0) return 'hoje'; if(dif===1) return 'ontem'; if(dif<30) return `há ${dif} dias`;
  const mm=Math.floor(dif/30.44); return mm<12?`há ${mm} ${mm===1?'mês':'meses'}`:`há ${Math.floor(mm/12)} ano(s)`; }

/* ---- tags de resultado ---- */
function tagResultado(p){
  const r=(p.resultado||'').toLowerCase();
  if(r.startsWith('ganho')) return `<span class="tag t-ok">✔ Ganho${r.includes('confirmar')?' *':''}</span>`;
  if(r==='perda') return `<span class="tag t-bad">✘ Perda</span>`;
  if(r==='acordo') return `<span class="tag t-warn">🤝 Acordo</span>`;
  if(r.startsWith('extinto')) return `<span class="tag t-neutral">Extinto s/ mérito</span>`;
  if(p.transito) return `<span class="tag t-neutral">Trânsito — verificar</span>`;
  return `<span class="tag t-neutral">Em curso</span>`;
}

/* =================== RENDER =================== */
function render(){
  const d=DADOS;
  const prox = (()=>{ const h=new Date().getHours(); return h<12?'12h':'00h'; })();
  $('#barraStatus').innerHTML = `Atualizado em <b>${esc(d.gerado_em_label)}</b> · ${d.total} processos · próxima atualização automática às <b>${prox}</b>`;
  renderNovidades(); renderFiltros(); renderLista(); renderPainel();
  const badge=$('#badgeNav');
  if(d.novidades_qtd>0){ badge.hidden=false; badge.textContent=d.novidades_qtd>99?'99+':d.novidades_qtd; }
  else badge.hidden=true;
}

function cardHTML(p){
  const tags=[
    `<span class="tag t-trib">${esc(p.trib)}</span>`,
    `<span class="tag t-inst">${esc(p.instancia)}</span>`,
    p.fonte&&p.fonte.indexOf('TJBA')===0?`<span class="tag t-warn">via TJBA</span>`:'',
    p.novo?`<span class="tag t-new">● ${p.novos_qtd} novo${p.novos_qtd>1?'s':''}</span>`:'',
    tagResultado(p)
  ].join('');
  const rodape = p.qtd_coms>0
    ? `<span class="mov"><span class="dot"></span> Última mov.: <b>${fmtData(p.ultima_data)}</b> (${diasAtras(p.ultima_data)})</span>
       <span>· ${p.qtd_coms} publicações</span>`
    : `<span class="mov"><span class="dot"></span> Registro via TJBA · sem publicação no DJEN</span>`;
  return `<article class="card" data-num="${esc(p.num)}">
    <div class="linha1">${tags}</div>
    <div class="cliente">${esc(p.cliente)}</div>
    <div class="objeto">${esc(p.objeto)} · nº ${esc(p.num)}</div>
    <div class="rodape">${rodape}</div>
  </article>`;
}

function renderNovidades(){
  const d=DADOS, wrap=$('#novidadesResumo'), lista=$('#listaNovidades');
  if(d.primeira_rodada){
    wrap.innerHTML=`<div class="rn-card"><div class="n">${d.total}</div><div class="l">processos monitorados. A partir da próxima atualização automática, as <b>novidades</b> aparecerão aqui destacadas.</div></div>`;
    lista.innerHTML=''; return;
  }
  if(d.novidades_qtd>0){
    wrap.innerHTML=`<div class="rn-card"><div class="n">${d.novidades_qtd}</div><div class="l">processo(s) com <b>novas movimentações</b> desde a última atualização (${esc(d.gerado_em_label)}).</div></div>`;
    const novos=d.processos.filter(p=>p.novo).sort((a,b)=>(b.ultima_data||'').localeCompare(a.ultima_data||''));
    lista.innerHTML=`<div class="sec-titulo">Movimentados agora</div>`+novos.map(cardHTML).join('');
  }else{
    wrap.innerHTML=`<div class="rn-vazio"><div class="emo">✅</div><p>Nenhuma novidade desde a última atualização.<br><small>${esc(d.gerado_em_label)}</small></p></div>`;
    lista.innerHTML='';
  }
}

function renderFiltros(){
  const objetos=['todos',...Array.from(new Set(DADOS.processos.map(p=>p.objeto)))];
  const tribs=['todos',...Array.from(new Set(DADOS.processos.map(p=>p.trib))).sort()];
  const status=['todos','Novidades','Trânsito julgado','Ganho','Perda','1º grau','2º grau'];
  const mk=(arr,cur,tipo)=>arr.map(v=>`<button class="chip ${v===cur?'ativo':''}" data-tipo="${tipo}" data-v="${esc(v)}">${esc(v==='todos'?(tipo==='trib'?'Todos tribunais':tipo==='obj'?'Todos objetos':'Todos status'):v)}</button>`).join('');
  $('#filtros').innerHTML = mk(status,filtroStatus,'status')+mk(tribs,filtroTrib,'trib')+mk(objetos,filtroObjeto,'obj');
}

function aplicaFiltros(lista){
  const q=($('#busca').value||'').toLowerCase().trim();
  return lista.filter(p=>{
    if(filtroObjeto!=='todos' && p.objeto!==filtroObjeto) return false;
    if(filtroTrib!=='todos' && p.trib!==filtroTrib) return false;
    if(filtroStatus==='Novidades' && !p.novo) return false;
    if(filtroStatus==='Trânsito julgado' && !p.transito) return false;
    if(filtroStatus==='Ganho' && !(p.resultado||'').toLowerCase().startsWith('ganho')) return false;
    if(filtroStatus==='Perda' && p.resultado!=='Perda') return false;
    if(filtroStatus==='1º grau' && p.instancia!=='1º grau') return false;
    if(filtroStatus==='2º grau' && !p.instancia.startsWith('2º')) return false;
    if(q){ const alvo=(p.num+' '+p.cliente+' '+p.objeto+' '+p.classe).toLowerCase(); if(!alvo.includes(q)) return false; }
    return true;
  });
}

function renderLista(){
  const res=aplicaFiltros(DADOS.processos);
  $('#contadorLista').textContent=`${res.length} processo(s)`;
  $('#listaProcessos').innerHTML = res.length?res.map(cardHTML).join(''):`<div class="rn-vazio">Nenhum processo com esses filtros.</div>`;
}

/* =================== PAINEL =================== */
function contar(campo){ const m={}; DADOS.processos.forEach(p=>{const k=p[campo]||'—';m[k]=(m[k]||0)+1;}); return m; }
function grafico(titulo,mapa,ordena=true){
  let ent=Object.entries(mapa); if(ordena) ent.sort((a,b)=>b[1]-a[1]);
  const max=Math.max(...ent.map(e=>e[1]),1);
  const barras=ent.map(([k,v])=>`<div class="barra"><span class="lab" title="${esc(k)}">${esc(k)}</span>
    <span class="track"><span class="fill" style="width:${Math.round(v/max*100)}%"></span></span>
    <span class="val">${v}</span></div>`).join('');
  return `<div class="grafico"><h3>${esc(titulo)}</h3>${barras}</div>`;
}
function renderPainel(){
  const d=DADOS, P=d.processos;
  const is1=p=>p.instancia&&p.instancia.startsWith('1º');
  const is2=p=>p.instancia&&(p.instancia.startsWith('2º')||p.instancia.startsWith('Superior'));
  const ehGanho=p=>(p.resultado||'').toLowerCase().startsWith('ganho');
  const ehPerda=p=>p.resultado==='Perda';
  const trans=P.filter(p=>p.transito).length;
  const ganho1=P.filter(p=>ehGanho(p)&&is1(p)).length;
  const ganho2=P.filter(p=>ehGanho(p)&&is2(p)).length;
  const perda1=P.filter(p=>ehPerda(p)&&is1(p)).length;
  const perda2=P.filter(p=>ehPerda(p)&&is2(p)).length;
  $('#tiles').innerHTML=`
    <div class="tile"><div class="n">${d.total}</div><div class="l">Processos monitorados</div></div>
    <div class="tile acc"><div class="n">${d.novidades_qtd}</div><div class="l">Novidades nesta atualização</div></div>
    <div class="tile"><div class="n">${trans}</div><div class="l">Com trânsito em julgado</div></div>
    <div class="tile"><div class="n">${P.filter(is2).length}</div><div class="l">Em 2º grau / Superior</div></div>
    <div class="tile ok"><div class="n">${ganho1}</div><div class="l">Sinais de ganho · 1º grau</div></div>
    <div class="tile ok"><div class="n">${ganho2}</div><div class="l">Sinais de ganho · 2º grau/Sup.</div></div>
    <div class="tile bad"><div class="n">${perda1}</div><div class="l">Sinais de perda · 1º grau</div></div>
    <div class="tile bad"><div class="n">${perda2}</div><div class="l">Sinais de perda · 2º grau/Sup.</div></div>`;
  const resMap={};
  P.forEach(p=>{ let k='Em curso'; const r=(p.resultado||'').toLowerCase();
    if(r.startsWith('ganho'))k='Ganho'; else if(r==='perda')k='Perda'; else if(r==='acordo')k='Acordo';
    else if(r.startsWith('extinto'))k='Extinto s/ mérito'; else if(p.transito)k='Trânsito — verificar';
    resMap[k]=(resMap[k]||0)+1; });
  $('#graficos').innerHTML = grafico('Por tribunal',contar('trib'))
    + grafico('Por objeto',contar('objeto'))
    + grafico('Por instância',contar('instancia'))
    + grafico('Situação / resultado',resMap);
}

/* =================== MODAL =================== */
function abrirProcesso(num){
  const p=DADOS.processos.find(x=>x.num===num); if(!p) return;
  const coms=[...p.coms].sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const tl=coms.map(c=>`<div class="tl-item ${c.novo?'novo':''}">
      <div class="tl-data">${fmtData(c.data)} ${c.novo?'<span class="tag t-new" style="margin-left:6px">NOVO</span>':''}</div>
      <div class="tl-tipo">${esc(c.tipo||'')}${c.doc?' · '+esc(c.doc):''}</div>
      ${c.link?`<a href="${esc(c.link)}" target="_blank" rel="noopener">abrir documento no tribunal ↗</a>`:''}
    </div>`).join('');
  $('#modalConteudo').innerHTML=`
    <div class="m-num">${esc(p.num)}</div>
    <div class="m-sub">${esc(p.trib)} · ${esc(p.classe)}</div>
    <div class="linha1" style="gap:6px">${tagResultado(p)} <span class="tag t-inst">${esc(p.instancia)}</span> ${p.transito?'<span class="tag t-neutral">trânsito em julgado</span>':''}</div>
    <div class="m-grid">
      <div class="m-item"><div class="k">Cliente (autor)</div><div class="v">${esc(p.cliente)}</div></div>
      <div class="m-item"><div class="k">Objeto</div><div class="v">${esc(p.objeto)}</div></div>
      <div class="m-item"><div class="k">Início (1ª publ.)</div><div class="v">${fmtData(p.data_inicio)}</div></div>
      <div class="m-item"><div class="k">Última mov.</div><div class="v">${fmtData(p.ultima_data)}</div></div>
      <div class="m-item"><div class="k">Duração</div><div class="v">${p.duracao_dias!==''?p.duracao_dias+' dias':'—'}</div></div>
      <div class="m-item"><div class="k">Polo</div><div class="v" style="font-size:12px">${esc(p.polo)}</div></div>
    </div>
    ${p.link?`<a class="m-btn" href="${esc(p.link)}" target="_blank" rel="noopener">Ver última decisão no tribunal ↗</a>`:''}
    <div class="sec-titulo" style="margin-left:0">Histórico de publicações (${coms.length})</div>
    <div class="tl">${tl}</div>`;
  const m=$('#modal'); m.hidden=false; document.body.style.overflow='hidden';
}
function fecharModal(){ $('#modal').hidden=true; document.body.style.overflow=''; }

/* =================== EVENTOS =================== */
function trocarTab(tab){
  $$('.tab').forEach(t=>t.classList.remove('ativa'));
  $('#tab-'+tab).classList.add('ativa');
  $$('.nav-btn').forEach(b=>b.classList.toggle('ativo',b.dataset.tab===tab));
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
  const nav=e.target.closest('.nav-btn'); if(nav){ trocarTab(nav.dataset.tab); return; }
  const card=e.target.closest('.card'); if(card){ abrirProcesso(card.dataset.num); return; }
  const chip=e.target.closest('.chip'); if(chip){
    const {tipo,v}=chip.dataset;
    if(tipo==='obj')filtroObjeto=v; if(tipo==='trib')filtroTrib=v; if(tipo==='status')filtroStatus=v;
    renderFiltros(); renderLista(); return;
  }
  if(e.target.id==='modalFechar'||e.target.classList.contains('modal-bg')) fecharModal();
});
$('#busca').addEventListener('input',renderLista);
$('#btnAtualizar').addEventListener('click',()=>carregar(true));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') fecharModal(); });

/* =================== CARGA =================== */
async function carregar(forcar){
  try{
    $('#barraStatus').textContent='Atualizando…';
    const r=await fetch('dados.json'+(forcar?('?t='+Date.now()):''),{cache:forcar?'reload':'default'});
    DADOS=await r.json(); render();
  }catch(err){
    $('#barraStatus').textContent='Sem conexão — mostrando dados salvos.';
    console.error(err);
  }
}
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
carregar();
