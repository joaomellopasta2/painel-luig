'use strict';
let DADOS = null;
let filtroObjeto = 'todos', filtroTrib = 'todos', filtroStatus = 'todos';
let CONTRATOS = null, provEnfase = 'todas', provPolo = 'todos';

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

function advCurto(nm){ if(!nm) return ''; const p=nm.trim().split(/\s+/); return p.length>2?`${p[0]} ${p[p.length-1]}`:nm; }
function cardHTML(p){
  const tags=[
    p.posse?`<span class="tag t-posse">🏛️ Posse adquirida</span>`:'',
    p.de_terceiros?`<span class="tag t-adv">⚖️ ${esc(advCurto(p.advogado))}</span>`:`<span class="tag t-luig">Luig</span>`,
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
  const status=['todos','Luig','Outros advogados','Posse adquirida','Novidades','Trânsito julgado','Ganho','Perda','1º grau','2º grau'];
  const mk=(arr,cur,tipo)=>arr.map(v=>`<button class="chip ${v===cur?'ativo':''}" data-tipo="${tipo}" data-v="${esc(v)}">${esc(v==='todos'?(tipo==='trib'?'Todos tribunais':tipo==='obj'?'Todos objetos':'Todos status'):v)}</button>`).join('');
  $('#filtros').innerHTML = mk(status,filtroStatus,'status')+mk(tribs,filtroTrib,'trib')+mk(objetos,filtroObjeto,'obj');
}

function aplicaFiltros(lista){
  const q=($('#busca').value||'').toLowerCase().trim();
  return lista.filter(p=>{
    if(filtroObjeto!=='todos' && p.objeto!==filtroObjeto) return false;
    if(filtroTrib!=='todos' && p.trib!==filtroTrib) return false;
    if(filtroStatus==='Luig' && p.de_terceiros) return false;
    if(filtroStatus==='Outros advogados' && !p.de_terceiros) return false;
    if(filtroStatus==='Posse adquirida' && !p.posse) return false;
    if(filtroStatus==='Novidades' && !p.novo) return false;
    if(filtroStatus==='Trânsito julgado' && !p.transito) return false;
    if(filtroStatus==='Ganho' && !(p.resultado||'').toLowerCase().startsWith('ganho')) return false;
    if(filtroStatus==='Perda' && p.resultado!=='Perda') return false;
    if(filtroStatus==='1º grau' && p.instancia!=='1º grau') return false;
    if(filtroStatus==='2º grau' && !p.instancia.startsWith('2º')) return false;
    if(q){ const alvo=(p.num+' '+p.cliente+' '+p.objeto+' '+p.classe+' '+(p.advogado||'')).toLowerCase(); if(!alvo.includes(q)) return false; }
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
  const posseArr=P.filter(p=>p.posse);
  const posseN=posseArr.length;
  const posseDef=posseArr.filter(p=>/definitiv|tr[âa]nsito/i.test(p.posse_tipo||'')).length;
  const posseVig=posseN-posseDef;
  $('#tiles').innerHTML=`
    <div class="tile posse-hero" onclick="(function(){filtroStatus='Posse adquirida';trocarTab('processos');renderFiltros();renderLista();})()">
      <div class="ph-ic">🏛️</div>
      <div class="ph-body"><div class="n">${posseN}</div>
      <div class="l">clientes já <b>na posse da vaga</b> (via liminar/tutela ou definitivo) — toque para ver a lista</div>
      <div class="ph-sub">${posseDef} definitiva(s) · ${posseVig} por liminar/tutela (vigente)</div></div>
    </div>
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

/* =================== PROVAS (terceirização) =================== */
function limpaObjeto(s){ return (s==null?'':String(s)).replace(/^\s*(d[oa]\s+(contrato|objeto|procedimento|edital|servi[çc]o)|objeto)\b[:\-–\s]*/i,'').trim(); }
// usa o objeto do edital só quando começa como um objeto de verdade; senão o objeto curto do feed (mais confiável)
function melhorObjeto(c){
  const full=limpaObjeto(c.objeto_completo||'');
  if(full && /^(presta|servi|contrata|execu|fornec|gest|gerenc|manuten|opera|obra|constru|montagem|realiza|elabora|multiservi|apoio|inspe|sv\.|serv\.)/i.test(full)) return full;
  return c.objeto||full;
}
async function carregarContratos(){
  if(CONTRATOS) { renderProvas(); return; }
  try{
    const r=await fetch('contratos.json?t='+Date.now(),{cache:'default'});
    CONTRATOS=await r.json();
  }catch(err){ CONTRATOS={contratos:[],total:0,enfases:{}}; }
  montaSelectEnfase();
  renderProvas();
}
function montaSelectEnfase(){
  const sel=$('#selEnfase'); if(!sel||sel.dataset.pronto) return;
  const en=CONTRATOS.enfases||{};
  const keys=Object.keys(en).sort((a,b)=>(+a)-(+b));
  sel.innerHTML='<option value="todas">Todas as ênfases</option>'+
    keys.map(k=>`<option value="${k}">${esc('Ênfase '+k+': '+en[k])}</option>`).join('');
  sel.dataset.pronto='1';
}
function contratoCard(c){
  const tipo = c.tipo==='concluido'
    ? `<span class="tag t-ok">✅ Concluída / homologada</span>`
    : `<span class="tag t-open">🟢 Licitação aberta</span>`;
  const polosArr=(c.polos||[]);
  const polos=polosArr.length
    ? polosArr.map(p=>p==='Nacional'
        ? `<span class="tag t-nac">🌐 Nacional</span>`
        : `<span class="tag t-polo">📍 ${esc(p)}</span>`).join('')
    : `<span class="tag t-neutral">📍 polo a identificar</span>`;
  const enf=(c.enfase_nomes||[]).map(n=>`<span class="tag t-enf">${esc(n)}</span>`).join('');
  const prof = c.profissionais
    ? `<span class="tag t-prof">👷 ${c.profissionais} profissional(is)</span>` : '';
  const nomeEmp = c.fornecedor || c.empresa || '';
  const empresa = nomeEmp ? `<span class="tag t-emp">🏢 ${esc(nomeEmp)}</span>` : '';
  const posH = c.pos_homologacao ? `<span class="tag t-pos">⚡ pós-homologação</span>` : '';
  const dataRef = c.data_publicacao||c.data_fim||c.data_inicio;
  const obj = melhorObjeto(c);
  return `<article class="card card-contrato" data-num="${esc(c.num)}">
    <div class="linha1">${tipo}${empresa}${posH}${prof}${polos}</div>
    <div class="objeto-c">${esc(obj)}</div>
    <div class="enf-linha">${enf}</div>
    <div class="rodape">
      <span class="mov"><span class="dot"></span> nº ${esc(c.num)} · ${dataRef?('publ. '+fmtData(dataRef)):'—'}</span>
      ${c.fonte?`<span>· ${esc(c.fonte)}</span>`:''}
    </div>
  </article>`;
}
function filtraContratos(){
  const L=(CONTRATOS&&CONTRATOS.contratos)||[];
  return L.filter(c=>{
    if(provEnfase!=='todas' && !(c.enfases||[]).includes(+provEnfase)) return false;
    // contratos de abrangência Nacional cobrem todos os polos → aparecem em qualquer filtro
    if(provPolo!=='todos' && !(c.polos||[]).includes(provPolo) && !(c.polos||[]).includes('Nacional')) return false;
    return true;
  });
}
function renderProvas(){
  if(!CONTRATOS){ return; }
  const res=filtraContratos();
  const ab=res.filter(c=>c.tipo!=='concluido').length, cc=res.length-ab;
  const wrap=$('#provasResumo');
  if(!CONTRATOS.total){
    wrap.innerHTML=`<div class="rn-vazio"><div class="emo">⏳</div><p>Ainda não há contratos coletados.<br><small>Rode o atualizador no PC para gerar o <b>contratos.json</b>.</small></p></div>`;
    $('#contadorProvas').textContent=''; $('#listaContratos').innerHTML=''; return;
  }
  wrap.innerHTML=`<div class="rn-card"><div class="n">${res.length}</div><div class="l">contrato(s) de serviço da Petrobras nesta seleção — <b>${cc}</b> concluído(s)/homologado(s) · <b>${ab}</b> em licitação aberta. Base desde ${esc(CONTRATOS.desde||'jan/2024')}.</div></div>`;
  $('#contadorProvas').textContent=`${res.length} contrato(s)`;
  $('#listaContratos').innerHTML = res.length
    ? res.map(contratoCard).join('')
    : `<div class="rn-vazio">Nenhum contrato para esta ênfase/polo. Isso também é informação: pode não haver terceirização registrada nesse recorte (ou o objeto não casou). A base cresce a cada atualização.</div>`;
}
function abrirContrato(num){
  const c=(CONTRATOS.contratos||[]).find(x=>x.num===num); if(!c) return;
  const sug=(c.empresas_sugeridas||[]);
  const prof = c.profissionais
    ? `<div class="cartao-info" style="margin-top:10px"><h3 style="text-transform:none">👷 Nº de profissionais no contrato: ${c.profissionais}</h3>${c.profissionais_evid?`<div class="posse-evid">"…${esc(c.profissionais_evid)}…"</div>`:''}<div class="posse-nota">Extraído do edital — confirme na fonte.</div></div>`
    : `<div class="posse-nota" style="margin-top:8px">Nº de profissionais: <b>não informado</b> no edital (contratos por demanda/homem-hora costumam não fixar efetivo).</div>`;
  const polosM=(c.polos||[]).map(p=>p==='Nacional'?`<span class="tag t-nac">🌐 Nacional</span>`:`<span class="tag t-polo">📍 ${esc(p)}</span>`).join('');
  const valorFmt = c.valor ? ('R$ '+Number(c.valor).toLocaleString('pt-BR')) : '';
  const vig = (c.vig_inicio||c.vig_fim) ? `${fmtData(c.vig_inicio)} — ${fmtData(c.vig_fim)}` : '';
  const transp = c.fonte && c.fonte.indexOf('Transpar')>=0;
  const linkLabel = transp ? 'Ver no Portal da Transparência ↗' : 'Ver contrato/edital na fonte (Petronect) ↗';
  $('#modalConteudo').innerHTML=`
    <div class="m-num">Contrato ${esc(c.contrato||c.num)}</div>
    <div class="m-sub">${esc(c.fonte||'Petronect')} · ${esc(c.situacao||(c.tipo==='concluido'?'Concluída / homologada':'Licitação aberta'))}</div>
    <div class="linha1" style="gap:6px">${(c.enfase_nomes||[]).map(n=>`<span class="tag t-enf">${esc(n)}</span>`).join('')} ${polosM} ${c.pos_homologacao?'<span class="tag t-pos">⚡ pós-homologação</span>':''}</div>
    ${c.fornecedor?`<div class="posse-box"><b>🏢 Empresa contratada:</b> ${esc(c.fornecedor)}${c.icj?` · <span style="color:var(--tx2)">ICJ ${esc(c.icj)}</span>`:''}</div>`:''}
    <div class="cartao-info" style="margin-top:10px"><h3 style="text-transform:none">Objeto do contrato</h3><div class="v">${esc(melhorObjeto(c))}</div></div>
    ${prof}
    ${c.pos_homologacao?`<div class="posse-nota" style="margin-top:8px">⚡ Contratação/vigência <b>posterior à homologação</b> do concurso (18/06/2024) — especialmente relevante para a tese.</div>`:''}
    <div class="m-grid">
      <div class="m-item"><div class="k">Situação</div><div class="v">${esc(c.situacao||c.status_desc||'—')}</div></div>
      <div class="m-item"><div class="k">Vigência</div><div class="v">${vig||'—'}</div></div>
      <div class="m-item"><div class="k">Valor</div><div class="v">${valorFmt||'—'}</div></div>
      <div class="m-item"><div class="k">Publicação</div><div class="v">${fmtData(c.data_publicacao)}</div></div>
      <div class="m-item"><div class="k">Região (UF)</div><div class="v">${esc((c.ufs||[]).join(', ')||'—')}</div></div>
      <div class="m-item"><div class="k">Nº processo</div><div class="v">${esc(c.num||'—')}</div></div>
    </div>
    ${sug.length?`<div class="cartao-info" style="margin-top:10px"><h3 style="text-transform:none">Empresas conhecidas nesta área</h3><div class="v" style="font-size:13px">${sug.map(esc).join(' · ')}</div><div class="posse-nota">Lista de referência (não confirma que uma delas venceu este contrato específico).</div></div>`:''}
    ${c.edital_link?`<a class="m-btn" href="${esc(c.edital_link)}" target="_blank" rel="noopener">${linkLabel}</a>`:''}
    <div class="posse-nota" style="margin-top:10px">Classificação automática por leitura do objeto — estimativa, confirme na fonte.</div>`;
  const m=$('#modal'); m.hidden=false; document.body.style.overflow='hidden';
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
    <div class="linha1" style="gap:6px">${p.posse?'<span class="tag t-posse">🏛️ Posse adquirida</span>':''} ${tagResultado(p)} <span class="tag t-inst">${esc(p.instancia)}</span> ${p.transito?'<span class="tag t-neutral">trânsito em julgado</span>':''}</div>
    ${p.posse?`<div class="posse-box"><b>🏛️ Cliente já na posse da vaga</b> — ${esc(p.posse_tipo||'')}. ${p.posse_evid?`<div class="posse-evid">"…${esc(p.posse_evid)}…"</div>`:''}<div class="posse-nota">Estimativa por leitura da decisão — confirme no link abaixo.</div></div>`:''}
    ${p.resultado&&p.resultado_evid?`<div class="cartao-info" style="margin-top:10px"><h3 style="text-transform:none">Resultado (estimativa): ${esc(p.resultado)}</h3><div style="color:var(--tx2);font-size:12px;margin-bottom:6px">Motivo: ${esc(p.sinal||'')}</div><div class="posse-evid">"…${esc(p.resultado_evid)}…"</div><div class="posse-nota">Leitura automática da decisão — confirme no link abaixo.</div></div>`:''}
    <div class="m-grid">
      <div class="m-item"><div class="k">Cliente (autor)</div><div class="v">${esc(p.cliente)}</div></div>
      <div class="m-item"><div class="k">Objeto</div><div class="v">${esc(p.objeto)}</div></div>
      <div class="m-item"><div class="k">Início (1ª publ.)</div><div class="v">${fmtData(p.data_inicio)}</div></div>
      <div class="m-item"><div class="k">Última mov.</div><div class="v">${fmtData(p.ultima_data)}</div></div>
      <div class="m-item"><div class="k">Duração</div><div class="v">${p.duracao_dias!==''?p.duracao_dias+' dias':'—'}</div></div>
      <div class="m-item"><div class="k">Advogado(a)</div><div class="v" style="font-size:12px">${esc(p.advogado||'—')}${p.de_terceiros?'':' (nosso monitorado)'}</div></div>
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
  if(tab==='provas') carregarContratos();
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
  const nav=e.target.closest('.nav-btn'); if(nav){ trocarTab(nav.dataset.tab); return; }
  const cc=e.target.closest('.card-contrato'); if(cc){ abrirContrato(cc.dataset.num); return; }
  const card=e.target.closest('.card'); if(card){ abrirProcesso(card.dataset.num); return; }
  const chip=e.target.closest('.chip'); if(chip){
    const {tipo,v}=chip.dataset;
    if(tipo==='obj')filtroObjeto=v; if(tipo==='trib')filtroTrib=v; if(tipo==='status')filtroStatus=v;
    renderFiltros(); renderLista(); return;
  }
  if(e.target.id==='modalFechar'||e.target.classList.contains('modal-bg')) fecharModal();
});
$('#busca').addEventListener('input',renderLista);
$('#selEnfase').addEventListener('change',e=>{ provEnfase=e.target.value; renderProvas(); });
$('#selPolo').addEventListener('change',e=>{ provPolo=e.target.value; renderProvas(); });
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

/* =================== POPUP DOAÇÃO =================== */
(function(){
  const pop = $('#doacao');
  if(!pop) return;
  const btnPix = $('#btnPix');
  let timers = [];

  function mostrar(){ pop.hidden = false; }
  function fechar(){ pop.hidden = true; }

  // Agenda: entrada (~1,2s), 2min, 5min, 10min — depois não aparece mais.
  // Ao recarregar/reentrar no site, a contagem recomeça (timers são criados a cada load).
  const AGENDA = [1200, 2*60*1000, 5*60*1000, 10*60*1000];
  AGENDA.forEach(ms => timers.push(setTimeout(mostrar, ms)));

  // Fechar
  pop.addEventListener('click', e => {
    if(e.target.id==='doacaoFechar' || e.target.classList.contains('doacao-bg')) fechar();
  });
  document.addEventListener('keydown', e => { if(e.key==='Escape' && !pop.hidden) fechar(); });

  // Copiar chave PIX (fica só no data-attribute, não visível ao usuário)
  btnPix.addEventListener('click', async () => {
    const chave = btnPix.getAttribute('data-pix') || '';
    let ok = false;
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(chave); ok = true;
      } else throw new Error('fallback');
    }catch(_){
      try{
        const ta = document.createElement('textarea');
        ta.value = chave; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        ok = document.execCommand('copy'); document.body.removeChild(ta);
      }catch(__){ ok = false; }
    }
    const orig = btnPix.innerHTML;
    if(ok){
      btnPix.classList.add('copiado');
      btnPix.innerHTML = '<span class="pix-ic">✓</span> Chave PIX copiada!';
    }else{
      btnPix.innerHTML = '<span class="pix-ic">⚠</span> Copie manualmente';
    }
    setTimeout(() => { btnPix.innerHTML = orig; btnPix.classList.remove('copiado'); }, 2200);
  });
})();
