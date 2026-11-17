import { APP_CONFIG, TEAMS, TEAM_IDS, CURRENT_RODADA_PC, LAST_CLOSED_PC_ROUND, CLASSICOS, MEMBERS } from './data/league.js';
import { CONFRONTOS, APROVEITAMENTO, PC2_CONFRONTOS, PC2_RESULTADOS } from './data/pc.js';
import { HIST, TOP3, COPA, CURRENT_CAPTAINS, CURRENT_LUXO, PC_ARCHIVE, MUNDIAL_2025 } from './data/history.js';
import { PL_IOS_CHAMPIONS, COPA_IOS_2026, IOS_WORLD_CUP_2026 } from './data/competitions.js';
import { ACTIVE_GENERAL_STATS, HISTORIC_GENERAL_STATS, BEST_SCORES, ALL_TIME_RECORDS, STATS_BASELINE_ROUND } from './data/stats.js';
import { appState, getResultados, isClosedRound, closedRoundsCount, applyPublicState, setSelectedTeam } from './state.js';
import { fetchPublicState } from './services/public-state.js';
import { fetchCartolaSnapshot } from './services/cartola.js';

const $ = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct = (v,j) => j ? ((v/j)*100) : 0;
const logo = id => TEAMS[id]?.logo || APP_CONFIG.leagueLogo;
const name = id => TEAMS[id]?.name || (id===99999999?'Charlton BR':'A definir');
const short = id => TEAMS[id]?.short || name(id);
const normalizeLabel = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function resolveTeamIdByLabel(label){
  const target=normalizeLabel(label);
  if(!target)return null;
  return TEAM_IDS.find(id=>[TEAMS[id]?.name,TEAMS[id]?.short,TEAMS[id]?.owner].some(value=>{const n=normalizeLabel(value);return n===target||n.includes(target)||target.includes(n)}))||null;
}
function objectValueForTeam(obj,id){
  for(const [key,value] of Object.entries(obj||{})) if(resolveTeamIdByLabel(key)===Number(id)) return Number(value)||0;
  return 0;
}

function isCartoleiroAward(t){return /Cartoleiro de Ouro/i.test(String(t||''))}

function teamTitles(id){return (TEAMS[id]?.titles||[]).filter(t=>!isCartoleiroAward(t))}

function teamAwards(id){return (TEAMS[id]?.titles||[]).filter(isCartoleiroAward)}
const escapeHtml = str => String(str ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));

function toast(msg){const box=$('toast');const t=document.createElement('div');t.textContent=msg;box.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),300)},3500)}

function nav(){const tabs=[['home','Início'],['pc','PC'],['classic','PL IOS'],['stats','Estatísticas'],['history','Histórico'],['teams','Times'],['cups','Campeonatos'],['social','Rede Social']];$('nav').innerHTML=tabs.map(([id,label])=>`<button class="tab ${id==='home'?'active':''}" onclick="showTab('${id}',this)">${label}</button>`).join('')}

function showTab(id,btn){document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===id));document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active'); if(id==='pc'){renderPCPage()} if(id==='classic'){renderClassicPage()} if(id==='stats'){renderStats()} if(id==='history'){renderHistory()} if(id==='teams'){renderTeams()} if(id==='cups'){renderChampionships()} if(id==='social'){renderSocial()}}

function classic(a,b){return CLASSICOS[[a,b].sort((x,y)=>x-y).join('-')]||''}

function getResultForRound(round,a,b){return (getResultados()[round]||[]).find(r=>(r[0]===a&&r[2]===b)||(r[0]===b&&r[2]===a))}

function marketStatusId(){return Number(appState.market?.statusId ?? 0)}

function marketRound(){return Number(appState.market?.round || appState.cartolaRound || 0)}

function isMarketOpen(){return Boolean(appState.market?.isOpen)}

function canUseLivePointsForRound(round){return !!appState.market && !isMarketOpen() && !isClosedRound(round) && Number(round)===marketRound()}

function livePointLabel(){return canUseLivePointsForRound(marketRound())?'ao vivo':(isMarketOpen()?'última pontuação':'aguardando rodada')}

function statusSub(d){if(!d)return 'aguardando API do Cartola';return d.escalou?'Escalado para a rodada atual':'Ainda não escalou na rodada atual'}

function pointsFor(round,a,b){const res=getResultForRound(round,a,b); if(res){return res[0]===a?[res[1],res[3],true]:[res[3],res[1],true]} const canUseLive=canUseLivePointsForRound(round); return [canUseLive?(appState.live[a]?.pontos ?? null):null, canUseLive?(appState.live[b]?.pontos ?? null):null, false]}

function computePC(){const stats={};TEAM_IDS.forEach(id=>stats[id]={id,pontos:0,v:0,d:0,e:0,pc:0,forma:[]});Object.keys(getResultados()).map(Number).sort((a,b)=>a-b).forEach(rod=>{getResultados()[rod].forEach(([a,pa,b,pb])=>{if(!stats[a]||!stats[b])return;stats[a].pc+=pa;stats[b].pc+=pb;if(pa>pb){stats[a].pontos+=3;stats[a].v++;stats[b].d++;stats[a].forma.push('W');stats[b].forma.push('L')}else if(pb>pa){stats[b].pontos+=3;stats[b].v++;stats[a].d++;stats[b].forma.push('W');stats[a].forma.push('L')}else{stats[a].pontos++;stats[b].pontos++;stats[a].e++;stats[b].e++;stats[a].forma.push('D');stats[b].forma.push('D')}})});return Object.values(stats).sort((x,y)=>y.pontos-x.pontos||y.pc-x.pc||y.v-x.v)}

function computeStandings(results){const stats={};TEAM_IDS.forEach(id=>stats[id]={id,pontos:0,v:0,d:0,e:0,pc:0,forma:[]});Object.keys(results||{}).map(Number).sort((a,b)=>a-b).forEach(rod=>{(results[rod]||[]).forEach(([a,pa,b,pb])=>{if(!stats[a]||!stats[b])return;stats[a].pc+=pa;stats[b].pc+=pb;if(pa>pb){stats[a].pontos+=3;stats[a].v++;stats[b].d++;stats[a].forma.push('W');stats[b].forma.push('L')}else if(pb>pa){stats[b].pontos+=3;stats[b].v++;stats[a].d++;stats[b].forma.push('W');stats[a].forma.push('L')}else{stats[a].pontos++;stats[b].pontos++;stats[a].e++;stats[b].e++;stats[a].forma.push('D');stats[b].forma.push('D')}})});return Object.values(stats).sort((x,y)=>y.pontos-x.pontos||y.pc-x.pc||y.v-x.v)}

function computePC2(){return computeStandings(PC2_RESULTADOS)}
function pc2ClosedRoundsCount(){return Object.keys(PC2_RESULTADOS).length}

function formDots(f,id=null){const last=f.slice(-5);const dots=`<div class="form">${last.map(x=>`<span class="ball ${x==='W'?'win':x==='L'?'loss':'draw'}"></span>`).join('')}${Array.from({length:Math.max(0,5-last.length)}).map(()=>`<span class="ball" style="background:rgba(255,255,255,.15)"></span>`).join('')}</div>`;return id?`<button class="form-btn" title="Ver últimos 5 confrontos" onclick="showFormDetail(${id});event.stopPropagation()">${dots}</button>`:dots}

function getTeamGames(id){const games=[];Object.keys(getResultados()).map(Number).sort((a,b)=>a-b).forEach(rod=>getResultados()[rod].forEach(([a,pa,b,pb])=>{if(a===id||b===id){const favor=a===id?pa:pb;const contra=a===id?pb:pa;const opp=a===id?b:a;const result=favor>contra?'W':favor<contra?'L':'D';games.push({rod,opp,for:favor,against:contra,result})}}));return games}

function getAproveitamentoById(id){const candidates=[TEAMS[id]?.name,name(id),TEAMS[id]?.short,'Titiham','Titiham Headspurs'];for(const key of candidates){if(key && APROVEITAMENTO[key]) return APROVEITAMENTO[key]}return {v:0,j:0}}

function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0}

function getTeamInsights(id){const games=getTeamGames(id);const best=games.slice().sort((a,b)=>b.for-a.for)[0]||null;const worst=games.slice().sort((a,b)=>a.for-b.for)[0]||null;return {games,best,worst,avgPts:avg(games.map(g=>g.for)),last5:games.slice(-5),wins:games.filter(g=>g.result==='W').length}}

function getRoundSummary(rod){const jogos=(getResultados()[Number(rod)]||[]).map(j=>({a:j[0],pa:j[1],b:j[2],pb:j[3]}));const teams=[];jogos.forEach(j=>{teams.push({id:j.a,pts:j.pa});teams.push({id:j.b,pts:j.pb})});teams.sort((x,y)=>y.pts-x.pts);return {jogos,mvp:teams[0]||null,merda:teams[teams.length-1]||null}}

function renderHistoryRound(){const select=$('historyRoundSelect'); if(!select) return; const rod=Number(select.value||Math.max(...Object.keys(getResultados()).map(Number))); const data=getRoundSummary(rod); const mvp=data.mvp, merda=data.merda; $('historyRoundBox').innerHTML=`<div class="history-round-grid"><div class="round-result-list">${data.jogos.map(j=>{const aWin=j.pa>j.pb,bWin=j.pb>j.pa;return `<div class="round-result-item"><div class="scoreline"><span class="side-result ${aWin?'win':bWin?'loss':''}"><img src="${logo(j.a)}">${short(j.a)} ${fmt(j.pa)}</span><span class="pill gold">x</span><span class="side-result ${bWin?'win':aWin?'loss':''}"><img src="${logo(j.b)}">${fmt(j.pb)} ${short(j.b)}</span></div><small class="winner-tag">${aWin?short(j.a)+' venceu':bWin?short(j.b)+' venceu':'Empate'}</small></div>`}).join('')}</div><div class="history-summary"><div class="summary-card gold"><h4>MVP da rodada ${rod}</h4>${mvp?`<div class="hero-line"><img src="${logo(mvp.id)}"><div><div class="big">${short(mvp.id)}</div><small>${fmt(mvp.pts)} pontos</small></div></div>`:'<p>Sem dados.</p>'}</div><div class="summary-card red"><h4>Merda da rodada ${rod}</h4>${merda?`<div class="hero-line"><img src="${logo(merda.id)}"><div><div class="big">${short(merda.id)}</div><small>${fmt(merda.pts)} pontos</small></div></div>`:'<p>Sem dados.</p>'}</div><div class="summary-card"><h4>Status</h4><div class="big">${data.jogos.length} jogos</div><small>Rodada fechada e salva no site</small></div><div class="summary-card"><h4>Destaque</h4><div class="big">${mvp&&merda?fmt(mvp.pts-merda.pts):'—'}</div><small>diferença entre MVP e pior da rodada</small></div></div></div>`}


function showFormDetail(id){const games=getTeamGames(id).slice(-5).reverse();$('formDetail').innerHTML=`<div class="form-dialog"><div class="form-dialog-head"><div><div class="eyebrow">Forma recente</div><h2>${short(id)}</h2></div><button class="btn secondary small" onclick="closeFormDetail()">Fechar</button></div><div class="detail-hero" style="margin-top:10px"><img src="${logo(id)}" alt="${name(id)}"><div><p>Últimos 5 confrontos do PC/1 com resultado, placar e rodada.</p>${formDots(games.map(g=>g.result))}</div></div><div class="widget-list" style="margin-top:14px">${games.map(g=>`<div class="mini-row form-game"><div class="left"><img src="${logo(id)}"><strong>${short(id)}</strong></div><div><b>Rodada ${g.rod}</b><br><span class="form-result ${g.result==='W'?'win':g.result==='L'?'loss':'draw'}">${g.result==='W'?'Vitória':g.result==='L'?'Derrota':'Empate'} • ${fmt(g.for)} x ${fmt(g.against)}</span></div><div class="left"><strong>${short(g.opp)}</strong><img src="${logo(g.opp)}"></div></div>`).join('')||'<p>Sem jogos fechados ainda.</p>'}</div></div>`;$('formDetail').classList.add('open')}

function closeFormDetail(){$('formDetail').classList.remove('open')}

function renderMatches(){const round=appState.round;const fixtures=PC2_CONFRONTOS[round]||[];$('roundPill').textContent=`PC/2 • Rodada ${round}`;$('roundSub').textContent=fixtures.length?'Confrontos do Pontos Corridos/2':'Aguardando cadastro dos confrontos do PC/2.';$('liveBadge').classList.add('hidden');if(!fixtures.length){$('matchCards').innerHTML='<div class="panel" style="grid-column:1/-1;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px"><strong>Confrontos do PC/2 ainda não cadastrados.</strong><p style="margin-bottom:0;color:var(--muted)">Assim que os jogos forem importados, esta área passa a mostrar os placares automaticamente.</p></div>';return}const results=PC2_RESULTADOS[round]||[];$('matchCards').innerHTML=fixtures.map(([a,b])=>{const res=results.find(r=>(r[0]===a&&r[2]===b)||(r[0]===b&&r[2]===a));let pa=null,pb=null,closed=false;if(res){closed=true;if(res[0]===a){pa=res[1];pb=res[3]}else{pa=res[3];pb=res[1]}}const scoreA=pa==null?'--':fmt(pa),scoreB=pb==null?'--':fmt(pb);const ca=closed&&pa>pb?'winner':closed&&pb>pa?'loser':'';const cb=closed&&pb>pa?'winner':closed&&pa>pb?'loser':'';return `<article class="match-card"><div class="match-topline"><span></span><span class="match-status ${closed?'final':'wait'}">${closed?'FINALIZADO':'AGUARDANDO'}</span></div><div class="match-board"><button class="match-team" onclick="openTeam(${a})" aria-label="Abrir ${name(a)}"><img src="${logo(a)}" alt="${name(a)}"></button><div class="match-center"><div class="scoreline-main"><span class="score-num ${ca}">${scoreA}</span><span class="versus">x</span><span class="score-num ${cb}">${scoreB}</span></div></div><button class="match-team" onclick="openTeam(${b})" aria-label="Abrir ${name(b)}"><img src="${logo(b)}" alt="${name(b)}"></button></div><div class="match-meta"><span>${classic(a,b)?`<b class="classic">${classic(a,b)}</b>`:'Pontos Corridos/2'}</span><span class="pill">${closed?'resultado oficial':'aguardando'}</span></div></article>`}).join('')}

function changeRound(delta){appState.userChangedRound=true;appState.round=Math.max(1,Math.min(18,Number(appState.round||CURRENT_RODADA_PC)+delta));renderMatches()}

function renderPCTable(){const rows=computePC2();const hasResults=pc2ClosedRoundsCount()>0;if($('leaderPcBox'))$('leaderPcBox').innerHTML=hasResults?leaderClubHtml(rows[0].id,`${rows[0].pontos} pts • PC ${fmt(rows[0].pc)}`):'<strong>—</strong><small>aguardando resultados do PC/2</small>';$('pcTable').innerHTML=hasResults?pcTableMarkup(rows):'<p style="color:var(--muted);margin:0">Aguardando os resultados das rodadas já disputadas do PC/2.</p>'}

function getCartolaRows(){return TEAM_IDS.map(id=>({id,total:appState.live[id]?.pontos_campeonato??0,rod:appState.live[id]?.pontos??0})).sort((a,b)=>b.total-a.total||b.rod-a.rod)}

function cartolaTableMarkup(rows){const head=canUseLivePointsForRound(marketRound())?'Ao vivo':(isMarketOpen()?'Última pont.':'Rodada');return `<table><thead><tr><th>#</th><th>Time</th><th>${head}</th><th>Total</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${String(r.id)===String(appState.selectedTeam)?'highlight':''}"><td><b>${i+1}º</b></td><td><button class="club-cell" onclick="openTeam(${r.id})" style="background:none;border:0;color:inherit;cursor:pointer"><img src="${logo(r.id)}" alt=""><span>${short(r.id)}</span></button></td><td>${fmt(r.rod)}</td><td><b>${fmt(r.total)}</b></td></tr>`).join('')}</tbody></table>`}

function renderCartolaTable(){const rows=getCartolaRows();const hasLive=rows.some(r=>r.total||r.rod);if($('leaderCartolaBox'))$('leaderCartolaBox').innerHTML=hasLive?leaderClubHtml(rows[0].id,`Total ${fmt(rows[0].total)} • última ${fmt(rows[0].rod)}`):'<strong>—</strong><small>aguardando API do Cartola</small>';$('apiStatus').textContent=hasLive?'API online':'demo/offline';$('apiStatus').className='pill '+(hasLive?'green':'red');$('cartolaTable').innerHTML=cartolaTableMarkup(rows)}

function pcTableMarkup(rows){return `<table><thead><tr><th>#</th><th>Time</th><th>PTS</th><th>V</th><th>D</th><th>PC</th><th>Forma</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${String(r.id)===String(appState.selectedTeam)?'highlight':''}"><td><b>${i+1}º</b></td><td><button class="club-cell" onclick="openTeam(${r.id})" style="background:none;border:0;color:inherit;cursor:pointer"><img src="${logo(r.id)}" alt=""><span>${short(r.id)}</span></button></td><td><b>${r.pontos}</b></td><td>${r.v}</td><td>${r.d}</td><td>${fmt(r.pc)}</td><td>${formDots(r.forma,r.id)}</td></tr>`).join('')}</tbody></table>`}

let activePCCompetition='pc2';

function openPCCompetition(view){
  if(!['pc1','pc2'].includes(view)) return;
  activePCCompetition=view;
  renderPCPage();
}

function fixtureLine(a,pa,b,pb,closed=true){
  const aWin=closed&&pa>pb,bWin=closed&&pb>pa;
  return `<div class="fixture-row"><div class="fixture-team ${aWin?'fixture-win':bWin?'fixture-loss':''}"><img src="${logo(a)}"><strong>${short(a)}</strong></div><span class="pill fixture-score main ${closed?'gold':''}">${closed?fmt(pa):'--'} x ${closed?fmt(pb):'--'}</span><div class="fixture-team right ${bWin?'fixture-win':aWin?'fixture-loss':''}"><strong>${short(b)}</strong><img src="${logo(b)}"></div></div>`;
}

function pc1CalendarMarkup(){
  return `<div class="pc-round-list">${Array.from({length:18},(_,i)=>i+1).map(round=>{
    const fixtures=CONFRONTOS[round]||[];
    const results=getResultados()[round]||[];
    return `<div class="pc-round-card"><div class="pc-round-head"><div><h4>PC/1 • Rodada ${round}</h4><small>Rodada ${round} do Cartola</small></div><span class="pill ${results.length?'green':''}">${results.length?'finalizada':'sem resultado'}</span></div><div class="pc-round-fixtures">${fixtures.map(([a,b])=>{const r=results.find(x=>(x[0]===a&&x[2]===b)||(x[0]===b&&x[2]===a));if(!r)return fixtureLine(a,0,b,0,false);return r[0]===a?fixtureLine(a,r[1],b,r[3],true):fixtureLine(a,r[3],b,r[1],true)}).join('')}</div></div>`;
  }).join('')}</div>`;
}

function pc2CalendarMarkup(){
  const lastClosed=pc2ClosedRoundsCount();
  return `<div class="pc-round-list">${Array.from({length:18},(_,i)=>i+1).map(round=>{
    const cartolaRound=round+18;
    const fixtures=PC2_CONFRONTOS[round]||[];
    const results=PC2_RESULTADOS[round]||[];
    const status=results.length?'finalizada':round===lastClosed+1?'próxima':'futura';
    return `<div class="pc-round-card"><div class="pc-round-head"><div><h4>PC/2 • Rodada ${round}</h4><small>Rodada ${cartolaRound} do Cartola</small></div><span class="pill ${results.length?'green':round===lastClosed+1?'gold':''}">${status}</span></div><div class="pc-round-fixtures">${fixtures.length?fixtures.map(([a,b])=>{const r=results.find(x=>(x[0]===a&&x[2]===b)||(x[0]===b&&x[2]===a));if(!r)return fixtureLine(a,0,b,0,false);return r[0]===a?fixtureLine(a,r[1],b,r[3],true):fixtureLine(a,r[3],b,r[1],true)}).join(''):`<div class="fixture-empty">Confrontos ainda não enviados.</div>`}</div></div>`;
  }).join('')}</div>`;
}

function copa2026Bracket(){
  const phases=['Quartas de Final','Semifinal','3º Lugar','Final'];
  const byPhase=Object.fromEntries(COPA_IOS_2026.rounds.map(r=>[r.phase,r]));
  return `<div class="theme-panel theme-cup"><div class="archive-hero"><img src="${logo(COPA_IOS_2026.champion)}"><div><h3>🏆 Copa IOS 2026</h3><p>Campeão: <b>${short(COPA_IOS_2026.champion)}</b> • 3º lugar: <b>${short(COPA_IOS_2026.thirdPlace)}</b></p><span class="pill green">Rodadas 19–21 do Cartola</span></div></div><div class="bracket-pro">${phases.map(phase=>{const round=byPhase[phase];return `<div class="bracket-stage"><h4>${phase}${round?` • R${round.cartolaRound}`:''}</h4>${round?round.matches.map(([a,pa,b,pb])=>{const aw=pa>pb,bw=pb>pa;return `<div class="cup-card"><div class="cup-team ${aw?'win':'lose'}"><div class="left"><img src="${logo(a)}"><b>${short(a)}</b></div><strong>${fmt(pa)}</strong></div><div class="cup-vs">x</div><div class="cup-team ${bw?'win':'lose'}"><div class="left"><img src="${logo(b)}"><b>${short(b)}</b></div><strong>${fmt(pb)}</strong></div></div>`}).join(''):'<div class="cup-card"><span class="pill">Sem jogos</span></div>'}</div>`}).join('')}</div></div>`;
}

function renderPCPage(){
  if(!$('pcCompetitionView')) return;
  document.querySelectorAll('[data-pc-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.pcView===activePCCompetition));
  if(activePCCompetition==='pc1'){
    const d=PC_ARCHIVE['PC/1 2026'];
    $('pcCompetitionView').innerHTML=`<div class="competition-summary"><span class="pill gold">18 rodadas</span><span class="pill green">encerrado</span><span class="pill">Cartola 1–18</span></div>${pcArchiveTable('PC/1 2026')}<div class="panel glass" style="margin-top:14px"><div class="panel-title"><h3>🗓️ Rodadas do PC/1</h3></div>${pc1CalendarMarkup()}</div>`;
    return;
  }
  const rows=computePC2();
  $('pcCompetitionView').innerHTML=`<div class="competition-summary"><span class="pill orange">em andamento</span><span class="pill">${pc2ClosedRoundsCount()}/18 rodadas concluídas</span><span class="pill">Cartola 19–36</span></div><div class="theme-panel theme-pc2"><div class="competition-title"><h3>📊 PC/2 2026</h3><span class="pill orange">rodada ${pc2ClosedRoundsCount()}</span></div>${pcTableMarkup(rows)}</div><div class="panel glass" style="margin-top:14px"><div class="panel-title"><h3>🗓️ Rodadas do PC/2</h3><span class="pill gold">18 rodadas</span></div>${pc2CalendarMarkup()}</div>`;
}

function renderClassicPage(){if(!$('classicCartolaTable'))return;$('classicCartolaTable').innerHTML=$('cartolaTable')?.innerHTML||'';$('classicApiStatus').textContent=$('apiStatus')?.textContent||'offline/demo';$('classicApiStatus').className=$('apiStatus')?.className||'pill';$('classicStatusList').innerHTML=$('statusList')?.innerHTML||'';$('classicCaptainList').innerHTML=$('captainList')?.innerHTML||'';$('classicLuxoList').innerHTML=$('luxoList')?.innerHTML||'';$('classicCartoletaList').innerHTML=$('cartoletaList')?.innerHTML||''}

function miniTeamRow(id,right,sub='',pillClass=''){return `<div class="mini-row"><div class="left"><img src="${logo(id)}"><div><strong>${short(id)}</strong><br><small>${sub}</small></div></div><span class="pill ${pillClass}">${right}</span></div>`}

function leaderClubHtml(id,line=''){return `<img src="${logo(id)}" alt="${short(id)}"><div><strong>${short(id)}</strong><small>${line}</small></div>`}

function renderWidgets(){const live=appState.live;const pointLabel=livePointLabel();$('statusList').innerHTML=TEAM_IDS.map(id=>{const d=live[id];const ok=d?.escalou;return miniTeamRow(id,d?(ok?'✅':'❌'):'—',statusSub(d),d?(ok?'green':'red'):'')}).join('');const cartoletaRows=[...TEAM_IDS].sort((a,b)=>(live[b]?.patrimonio||0)-(live[a]?.patrimonio||0));$('cartoletaList').innerHTML=cartoletaRows.map(id=>miniTeamRow(id,live[id]?.patrimonio?`C$ ${fmt(live[id].patrimonio)}`:'—',`${pointLabel}: ${fmt(live[id]?.pontos||0)} pts`,'gold')).join('');$('captainList').innerHTML=TEAM_IDS.map(id=>{const jogador=live[id]?.capitao_nome||CURRENT_CAPTAINS[id]||'Não carregado';return miniTeamRow(id,jogador,jogador==='Não carregado'?'aguardando escalação':'Capitão')}).join('');$('luxoList').innerHTML=TEAM_IDS.map(id=>{const jogador=live[id]?.reserva_luxo_nome||CURRENT_LUXO[id]||'Não carregado';return miniTeamRow(id,jogador,jogador==='Não carregado'?'aguardando escalação':'Reserva de luxo')}).join('')}

function getMarketCloseDate(){const value=appState.market?.closesAt;if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:date}

function formatCountdown(ms){
  if(ms<=0)return 'fechando agora';
  const total=Math.floor(ms/1000),d=Math.floor(total/86400),h=Math.floor((total%86400)/3600),m=Math.floor((total%3600)/60),s=total%60;
  if(d>0)return `${d}d ${h}h ${m}min`;
  if(h>0)return `${h}h ${m}min`;
  return `${m}min ${s}s`;
}

function updateMarketDisplay(){if(!$('marketStat')||!appState.market)return;const aberto=isMarketOpen();const fechamento=getMarketCloseDate();$('marketStat').textContent=aberto?'Aberto':'Fechado';$('marketStat').style.color=aberto?'var(--green)':'var(--red)';const rodada=marketRound()||'—';if(aberto&&fechamento){$('marketSub').textContent=`Rodada ${rodada} • fecha em ${formatCountdown(fechamento-new Date())}`}else if(fechamento){$('marketSub').textContent=`Rodada ${rodada} • fechado desde ${fechamento.toLocaleString('pt-BR')}`}else{$('marketSub').textContent=`Rodada ${rodada} • horário de fechamento indisponível`}}

async function refreshAll(manual=false){
  if(manual) toast('Atualizando dados...');
  appState.fetching=true;
  const [publicResult,cartolaResult]=await Promise.allSettled([fetchPublicState(),fetchCartolaSnapshot(TEAM_IDS)]);

  if(publicResult.status==='fulfilled') applyPublicState(publicResult.value);
  else if(manual) toast('O histórico público não respondeu. Mantendo os dados carregados.');

  if(cartolaResult.status==='fulfilled'){
    const snapshot=cartolaResult.value;
    appState.market=snapshot.market;
    appState.cartolaRound=Number(snapshot.market?.round||0)||null;
    let loaded=0;
    snapshot.teams.forEach(data=>{
      const prev=appState.live[data.id];
      if(prev&&prev.pontos!==data.pontos&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
        new Notification('Premier League IOS',{body:`${short(data.id)} mudou para ${fmt(data.pontos)} pts`,icon:logo(data.id)});
      }
      appState.live[data.id]=data;
      loaded++;
    });
    appState.apiOk=loaded>0;
    appState.apiMsg=snapshot.errors.length?`${snapshot.errors.length} time(s) indisponível(is)`:'Cartola online';
    updateMarketDisplay();
    if(manual) toast(`Cartola atualizado: ${loaded}/${TEAM_IDS.length} times`);
  }else{
    appState.apiOk=false;
    appState.apiMsg=cartolaResult.reason?.message||'Cartola indisponível';
    if($('marketStat')){$('marketStat').textContent='Offline';$('marketStat').style.color='var(--red)'}
    if($('marketSub'))$('marketSub').textContent='Não foi possível consultar o Cartola agora';
    if(manual)toast('Cartola indisponível. Mantendo os últimos dados carregados.');
  }
  appState.fetching=false;
  renderAll();
  if(document.getElementById('history')?.classList.contains('active'))renderHistory();
  if(document.getElementById('teams')?.classList.contains('active'))renderTeams();
}

function renderAll(){renderMatches();renderPCTable();renderCartolaTable();renderWidgets();renderSelects();renderPCPage();renderClassicPage();renderStats();renderChampionships();renderHeaderUser();if(document.getElementById('history')?.classList.contains('active'))renderHistory();if(document.getElementById('teams')?.classList.contains('active'))renderTeams()}
function renderSelects(){const opts=`<option value="">⭐ Escolher meu time</option>`+TEAM_IDS.map(id=>`<option value="${id}" ${String(appState.selectedTeam)===String(id)?'selected':''}>${name(id)}</option>`).join('');$('myTeamSelect').innerHTML=opts}
function setMyTeam(id){setSelectedTeam(id);renderAll();toast(id?`Time destacado: ${short(Number(id))}`:'Modo público')}
function renderHeaderUser(){$('userBox').innerHTML='<span>Modo público</span>';$('loginBtn').textContent='Entrar com Cartola';$('loginBtn').onclick=loginCartola}
function loginCartola(){toast('Login com Cartola ficará disponível quando houver uma integração autenticada estável.')}
function requestNotify(){if(!('Notification' in window)){toast('Este navegador não suporta notificações.');return}Notification.requestPermission().then(p=>toast(p==='granted'?'Notificações ativadas.':'Notificações não ativadas.'))}
async function init(){nav();renderSelects();renderAll();await refreshAll(false);setInterval(()=>refreshAll(false),60000);setInterval(updateMarketDisplay,1000)}

function liveRoundLeaders(){
  const round=marketRound();
  if(!canUseLivePointsForRound(round))return null;
  const rows=TEAM_IDS.map(id=>({id,points:Number(appState.live[id]?.pontos)})).filter(x=>Number.isFinite(x.points));
  if(rows.length<TEAM_IDS.length||!rows.some(x=>Math.abs(x.points)>.001))return null;
  rows.sort((a,b)=>b.points-a.points);
  return {round,mvp:rows[0],merda:rows[rows.length-1],provisional:true};
}

function officialRoundLeaders(){
  const last=appState.statsLastRound||{};
  if(!last.round||!last.mvpTeamId||!last.merdaTeamId)return null;
  return {round:last.round,mvp:{id:last.mvpTeamId,points:last.mvpPoints},merda:{id:last.merdaTeamId,points:last.merdaPoints},provisional:false};
}

function statRankRows(kind,live=null){
  return TEAM_IDS.map(id=>{
    let value=objectValueForTeam(HIST[kind],id);
    if(live){
      if(kind==='mvp'&&id===live.mvp.id)value+=1;
      if(kind==='merda'&&id===live.merda.id)value+=1;
      if(kind==='zikado')value=id===live.mvp.id?0:value+1;
    }
    return {id,value};
  }).sort((a,b)=>b.value-a.value||short(a.id).localeCompare(short(b.id),'pt-BR'));
}

function statRankingMarkup(kind,emoji,label,live=null){
  const rows=statRankRows(kind,live);
  return `<div class="widget-list">${rows.map((r,i)=>`<div class="mini-row ${i===0?'top-rank':''}"><div class="left"><img src="${logo(r.id)}"><div><strong>${short(r.id)}</strong><br><small>${i+1}º em ${label.toLowerCase()}${live?' • provisório':''}</small></div></div><span class="pill ${i===0?'gold':''}">${emoji} ${r.value}</span></div>`).join('')}</div>`;
}

function activeGeneralStats(){
  return ACTIVE_GENERAL_STATS.map(base=>{const apr=getAproveitamentoById(base.id);return {id:base.id,wins:Number(apr.v||0),games:Number(apr.j||0),losses:Math.max(0,Number(apr.j||0)-Number(apr.v||0)),mvp:objectValueForTeam(HIST.mvp,base.id),zikado:objectValueForTeam(HIST.zikado,base.id),merda:objectValueForTeam(HIST.merda,base.id)}});
}

function statsTableMarkup(){
  const rows=activeGeneralStats();
  return `<div class="championship-table-wrap"><table><thead><tr><th>Time</th><th>V</th><th>D</th><th>J</th><th>Aprov.</th><th>MVP</th><th>Zikado</th><th>Merda</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="club-cell" onclick="openTeam(${r.id})" style="background:none;border:0;color:inherit;cursor:pointer"><img src="${logo(r.id)}"><span>${short(r.id)}</span></button></td><td><b>${r.wins}</b></td><td>${r.losses}</td><td>${r.games}</td><td>${pct(r.wins,r.games).toFixed(1)}%</td><td>${r.mvp}</td><td>${r.zikado}</td><td>${r.merda}</td></tr>`).join('')}</tbody></table></div>`;
}

function historicStatsMarkup(){
  return `<div class="championship-table-wrap"><table><thead><tr><th>Time histórico</th><th>V</th><th>D</th><th>J</th><th>Aprov.</th></tr></thead><tbody>${HISTORIC_GENERAL_STATS.map(r=>`<tr><td><b>${r.name}</b></td><td>${r.wins}</td><td>${r.losses}</td><td>${r.games}</td><td>${pct(r.wins,r.games).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
}

function scoreRecordsMarkup(){
  return `<div class="stats-record-columns"><div><h4>🏅 Recorde All Time</h4><div class="widget-list">${ALL_TIME_RECORDS.map((r,i)=>{const id=resolveTeamIdByLabel(r.name);return `<div class="mini-row ${i===0?'top-rank':''}"><div class="left"><img src="${logo(id||TEAM_IDS[0])}"><div><strong>${r.name}</strong><br><small>${r.competition} • ${r.round}</small></div></div><span class="pill gold">${fmt(r.points)} pts</span></div>`}).join('')}</div></div><div><h4>🔥 Maiores pontuações registradas</h4><div class="widget-list stats-score-list">${BEST_SCORES.slice(0,10).map((r,i)=>{const id=resolveTeamIdByLabel(r.name);return `<div class="mini-row"><div class="left"><img src="${logo(id||TEAM_IDS[0])}"><div><strong>${r.name}</strong><br><small>${r.competition} • ${r.round}</small></div></div><span class="pill ${i<3?'gold':''}">${fmt(r.points)}</span></div>`}).join('')}</div></div></div>`;
}

function renderStats(){
  if(!$('statsView'))return;
  const live=liveRoundLeaders();
  const leaders=live||officialRoundLeaders();
  const status=live?`Rodada ${leaders.round} • ao vivo`:`Dados oficiais até a rodada ${appState.statsRound||STATS_BASELINE_ROUND}`;
  if($('statsStatusPill')){$('statsStatusPill').textContent=status;$('statsStatusPill').className=`pill ${live?'green':'gold'}`;}
  const mvpCount=leaders?.mvp?.id?objectValueForTeam(HIST.mvp,leaders.mvp.id):0;
  const merdaCount=leaders?.merda?.id?objectValueForTeam(HIST.merda,leaders.merda.id):0;
  const projectedMvpCount=live?mvpCount+1:mvpCount;
  const projectedMerdaCount=live?merdaCount+1:merdaCount;
  const liveNote=live?'Provisório: muda junto com a pontuação do Cartola. A contagem oficial entra após o fechamento da rodada.':'Última rodada processada nas estatísticas.';
  $('statsView').innerHTML=`<div class="stats-live-grid"><div class="summary-card gold"><h4>👑 MVP ${live?'da rodada — ao vivo':'da última rodada'}</h4>${leaders?.mvp?`<div class="hero-line"><img src="${logo(leaders.mvp.id)}"><div><div class="big">${short(leaders.mvp.id)}</div><small>${fmt(leaders.mvp.points)} pts • ${live?`seria o ${projectedMvpCount}º MVP`:`${mvpCount} MVPs no total`}</small></div></div>`:'<p>Sem dados da rodada.</p>'}</div><div class="summary-card red"><h4>💩 Merda ${live?'da rodada — ao vivo':'da última rodada'}</h4>${leaders?.merda?`<div class="hero-line"><img src="${logo(leaders.merda.id)}"><div><div class="big">${short(leaders.merda.id)}</div><small>${fmt(leaders.merda.points)} pts • ${live?`seria a ${projectedMerdaCount}ª vez`:`${merdaCount} vezes no total`}</small></div></div>`:'<p>Sem dados da rodada.</p>'}</div></div><p class="stats-live-note">${liveNote}</p><div class="grid three stats-rank-grid"><div class="panel glass"><div class="panel-title"><h3>👑 Ranking MVP</h3></div>${statRankingMarkup('mvp','⭐','MVP',live)}</div><div class="panel glass"><div class="panel-title"><h3>😔 Zikado</h3></div>${statRankingMarkup('zikado','😔','Zikado',live)}</div><div class="panel glass"><div class="panel-title"><h3>💩 Merda da Rodada</h3></div>${statRankingMarkup('merda','💩','Merda',live)}</div></div><div class="panel glass stats-total-panel"><div class="panel-title"><div><h3>📊 Total geral da liga</h3><p>Base da planilha; os dados publicados pelo bot substituem esta base quando uma nova rodada é processada.</p></div></div>${statsTableMarkup()}</div><div class="panel glass stats-total-panel"><div class="panel-title"><h3>🏛️ Times históricos</h3></div>${historicStatsMarkup()}</div><div class="panel glass stats-total-panel">${scoreRecordsMarkup()}</div>`;
}



function renderTeams(){const sorted=[...TEAM_IDS].sort((a,b)=>name(a).localeCompare(name(b),'pt-BR'));$('teamsGrid').innerHTML=sorted.map(id=>{const apr=getAproveitamentoById(id);const titles=teamTitles(id);const awards=teamAwards(id);return `<article class="team-card glass" onclick="openTeam(${id})"><img src="${logo(id)}" alt="${name(id)}"><h4>${name(id)}</h4><p>${TEAMS[id].bio}</p><div class="filters"><span class="pill gold">${apr.v} vitórias</span><span class="pill ${titles.length?'orange':''}">${titles.length} ${titles.length===1?'título':'títulos'}</span>${awards.length?`<span class="pill">${awards.length} ${awards.length===1?'prêmio':'prêmios'}</span>`:''}</div></article>`}).join(''); if(!$('teamDetail').innerHTML) openTeam(sorted[0],false)}

function openTeam(id,scroll=true){const pc=computePC().find(x=>x.id===id);const pc2=computePC2().find(x=>x.id===id);const apr=getAproveitamentoById(id);const next=[];Object.keys(PC2_CONFRONTOS).map(Number).sort((a,b)=>a-b).forEach(rod=>{if(!PC2_RESULTADOS[rod]){PC2_CONFRONTOS[rod].forEach(([a,b])=>{if(a===id||b===id)next.push({rod,cartolaRound:rod+18,opp:a===id?b:a})})}});const insight=getTeamInsights(id);const games=insight.games;const titles=teamTitles(id);const awards=teamAwards(id);const titleRows=titles.length?titles:['Sem títulos de campeonato cadastrados'];const awardRows=awards.length?awards:['Sem prêmios individuais cadastrados'];const mvpTotal=HIST.mvp[name(id)]||HIST.mvp[TEAMS[id].name]||HIST.mvp[TEAMS[id].short]||0;const merdaTotal=HIST.merda[name(id)]||HIST.merda[TEAMS[id].name]||HIST.merda[TEAMS[id].short]||0;const zikadoAtual=HIST.zikado[name(id)]||HIST.zikado[TEAMS[id].name]||HIST.zikado[TEAMS[id].short]||0;$('teamDetail').innerHTML=`<div class="panel glass"><div class="detail-hero"><img src="${logo(id)}" alt="${name(id)}"><div><div class="eyebrow">Página do time</div><h2>${name(id)}</h2><p>${TEAMS[id].bio}</p><div class="filters"><span class="pill orange">${pc2?.pontos||0} pts PC/2</span><span class="pill green">${pc2?.v||0} vitórias no PC/2</span><span class="pill">${pct(apr.v,apr.j).toFixed(1)}% aproveitamento geral</span></div></div></div><div class="detail-stats"><div class="detail-stat"><small>Títulos</small><strong>${titles.length}</strong></div><div class="detail-stat"><small>Prêmios</small><strong>${awards.length}</strong></div><div class="detail-stat"><small>MVPs</small><strong>${mvpTotal}</strong></div><div class="detail-stat"><small>Zikado atual</small><strong>${zikadoAtual}</strong></div></div></div><div class="insight-grid" style="margin-top:16px"><div class="panel glass"><h3>🏆 Títulos de campeonato</h3><div class="widget-list">${titleRows.map(t=>`<div class="mini-row"><strong>${t}</strong><span class="pill gold">🏆</span></div>`).join('')}</div><h3 style="margin-top:18px">⭐ Prêmios individuais</h3><div class="widget-list">${awardRows.map(t=>`<div class="mini-row"><strong>${t}</strong><span class="pill">⭐</span></div>`).join('')}</div></div><div class="panel glass"><h3>📈 Últimos 5 jogos</h3>${formDots(pc?.forma||[],id)}<p>PC acumulado em 2026: <b>${fmt(pc?.pc||0)}</b></p><div class="bar"><span style="width:${Math.min(100,pct(apr.v,apr.j))}%"></span></div></div><div class="panel glass"><h3>🎯 Marcas do time</h3><div class="widget-list"><div class="mini-row"><div><strong>Melhor rodada</strong><br><small>${insight.best?`Rodada ${insight.best.rod}`:'—'}</small></div><span class="pill gold">${insight.best?fmt(insight.best.for):'—'} pts</span></div><div class="mini-row"><div><strong>Pior rodada</strong><br><small>${insight.worst?`Rodada ${insight.worst.rod}`:'—'}</small></div><span class="pill">${insight.worst?fmt(insight.worst.for):'—'} pts</span></div><div class="mini-row"><div><strong>Merdas da rodada</strong><br><small>histórico</small></div><span class="pill danger">${merdaTotal}</span></div></div></div></div><div class="grid two" style="margin-top:16px"><div class="panel glass"><h3>🔜 Próximos confrontos</h3><div class="widget-list">${next.slice(0,5).map(n=>miniTeamRow(n.opp,`PC/2 R${n.rod} • Cartola ${n.cartolaRound}`,'adversário')).join('')||'<p>Sem confrontos restantes.</p>'}</div></div><div class="panel glass"><h3>📜 Histórico recente no PC/1</h3><div class="timeline">${games.slice(-8).reverse().map(g=>`<div class="timeline-item result-line"><b>Rodada ${g.rod}</b><div class="scoreline"><span class="side-result ${g.result==='W'?'win':g.result==='L'?'loss':''}"><img src="${logo(id)}">${short(id)} ${fmt(g.for)}</span><span class="pill">x</span><span class="side-result ${g.result==='L'?'win':g.result==='W'?'loss':''}"><img src="${logo(g.opp)}">${fmt(g.against)} ${short(g.opp)}</span></div><small class="winner-tag">${g.result==='W'?'Vitória':g.result==='L'?'Derrota':'Empate'}</small></div>`).join('')}</div></div></div>`;document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id==='teams'));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.textContent==='Times'));if(scroll)$('teamDetail').scrollIntoView({behavior:'smooth',block:'start'})}

function competitionTheme(key){if(key.includes('PC/2')) return 'theme-pc2'; if(key.includes('PC')) return 'theme-pc1'; if(key.includes('Copa')) return 'theme-cup'; return 'theme-world'}

function competitionPill(key){if(key.includes('PC/2')) return 'orange'; if(key.includes('PC')) return 'gold'; if(key.includes('Copa')) return 'green'; return 'orange'}

function pcArchiveTable(key){const d=PC_ARCHIVE[key];const theme=competitionTheme(key);const pill=competitionPill(key);const champ=d.rows[0]?.[0];return `<div class="theme-panel ${theme}"><div class="archive-hero"><img src="${logo(champ)}"><div><h3>${d.title}</h3><p>Campeão: <b>${short(champ)}</b> • ${d.note}</p><span class="pill ${pill}">Tabela final</span></div></div><div class="championship-table-wrap"><table><thead><tr><th>#</th><th>Time</th><th>PTS</th><th>V</th><th>E</th><th>D</th><th>PC</th></tr></thead><tbody>${d.rows.map((r,i)=>`<tr class="${i===0?'highlight':''}"><td><b>${i+1}º</b></td><td class="club-cell"><img src="${logo(r[0])}">${short(r[0])}</td><td><b>${r[1]}</b></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${fmt(r[5])}</td></tr>`).join('')}</tbody></table></div></div>`}

function cupBracket(edicao){if(edicao==='Copa IOS 2026')return copa2026Bracket();const fases=['Quartas de Final','Semifinal','3º Lugar','Final'];const grouped={};COPA.filter(x=>x[0]===edicao && x[3]!==null).forEach(([ed,fase,w,l])=>{grouped[fase]??=[];grouped[fase].push({w,l})});const champion=(grouped['Final']||[])[0]?.w||0;return `<div class="theme-panel theme-cup"><div class="archive-hero"><img src="${logo(champion)}"><div><h3>🏆 ${edicao}</h3><p>Campeão: <b>${short(champion)}</b></p><span class="pill green">Mata-mata</span></div></div><div class="bracket-pro">${fases.map(fase=>`<div class="bracket-stage"><h4>${fase}</h4>${(grouped[fase]||[]).map(j=>`<div class="cup-card"><div class="cup-team win"><div class="left"><img src="${logo(j.w)}"><b>${short(j.w)}</b></div><span>✅</span></div><div class="cup-vs">x</div><div class="cup-team lose"><div class="left"><img src="${logo(j.l)}"><b>${j.l?short(j.l):'BYE'}</b></div><span>❌</span></div></div>`).join('')||'<div class="cup-card"><span class="pill">Sem jogos</span></div>'}</div>`).join('')}</div></div>`}

function premierLeagueContent(item){
  if(item.year===2026){
    const rows=getCartolaRows();
    return `<div class="theme-panel theme-pc1"><div class="archive-hero"><img src="${APP_CONFIG.leagueLogo}"><div><h3>🏆 PL IOS 2026</h3><p>Liga Clássica em andamento • classificação atual pela pontuação geral do Cartola.</p><span class="pill orange">em andamento</span></div></div><div class="championship-table-wrap">${cartolaTableMarkup(rows)}</div></div>`;
  }
  const record=PL_IOS_CHAMPIONS.find(x=>x.year===item.year);
  return `<div class="theme-panel theme-pc1"><div class="archive-hero"><img src="${logo(record.champion)}"><div><h3>🏆 PL IOS ${item.year}</h3><p>Campeão: <b>${short(record.champion)}</b></p><span class="pill gold">campeão da temporada</span></div></div><div class="premier-champion-list"><div class="premier-champion-row"><div class="left"><img src="${logo(record.champion)}"><div><strong>${name(record.champion)}</strong><br><small>Campeão da Premier League IOS ${item.year}</small></div></div><span class="pill gold">🏆 ${item.year}</span></div></div></div>`;
}

function worldCup2026Table(){const champ=IOS_WORLD_CUP_2026[0][0];return `<div class="theme-panel theme-world"><div class="archive-hero"><img src="${logo(champ)}"><div><h3>🌍 IOS World Cup 2026</h3><p>Campeão: <b>${short(champ)}</b> • Copa do Mundo de Seleções</p><span class="pill orange">encerrado</span></div></div><div class="championship-table-wrap"><table><thead><tr><th>#</th><th>Time</th><th>Pontos</th></tr></thead><tbody>${IOS_WORLD_CUP_2026.map((r,i)=>`<tr class="${i===0?'highlight':''}"><td><b>${i+1}º</b></td><td class="club-cell"><img src="${logo(r[0])}">${short(r[0])}</td><td class="world-score">${Number(r[1]).toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody></table></div></div>`}

function mundial2025Table(){const champ=MUNDIAL_2025[0]?.[0];return `<div class="theme-panel theme-world"><div class="archive-hero"><img src="${logo(champ)}"><div><h3>🌍 IOS Club World Cup 2025</h3><p>Campeão mundial: <b>${short(champ)}</b></p><span class="pill orange">Mundial de Clubes</span></div></div><div class="championship-table-wrap"><table><thead><tr><th>#</th><th>Time</th><th>PTS</th><th>V</th><th>D</th><th>PC</th></tr></thead><tbody>${MUNDIAL_2025.map((r,i)=>`<tr class="${i===0?'highlight':''}"><td>${i+1}º</td><td class="club-cell"><img src="${logo(r[0])}">${short(r[0])}</td><td><b>${r[1]}</b></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div></div>`}

const CHAMPIONSHIP_MENU = [
  {id:'pl-2026',group:'PL IOS',label:'PL IOS 2026',status:'Em andamento',kind:'premier',year:2026},
  {id:'pl-2025',group:'PL IOS',label:'PL IOS 2025',status:'ValeGuiDoce',kind:'premier',year:2025},
  {id:'pl-2024',group:'PL IOS',label:'PL IOS 2024',status:'Meminetsk',kind:'premier',year:2024},
  {id:'pl-2023',group:'PL IOS',label:'PL IOS 2023',status:'Easy Money',kind:'premier',year:2023},
  {id:'pc2-2026',group:'Pontos Corridos',label:'PC/2 2026',status:'Em andamento',kind:'pc-current'},
  {id:'pc1-2026',group:'Pontos Corridos',label:'PC/1 2026',status:'ValeGuiDoce',kind:'pc',key:'PC/1 2026'},
  {id:'pc2-2025',group:'Pontos Corridos',label:'PC/2 2025',status:'ValeGuiDoce',kind:'pc',key:'PC/2 2025'},
  {id:'pc1-2025',group:'Pontos Corridos',label:'PC/1 2025',status:'Inter de Bigão',kind:'pc',key:'PC/1 2025'},
  {id:'pc-2024',group:'Pontos Corridos',label:'PC 2024',status:'Meminetsk',kind:'pc',key:'PC 2024'},
  {id:'copa-2026',group:'Copa IOS',label:'Copa IOS 2026',status:'Manteto',kind:'copa',key:'Copa IOS 2026'},
  {id:'copa-2025',group:'Copa IOS',label:'Copa IOS 2025',status:'Inter de Bigão',kind:'copa',key:'Copa IOS 2025'},
  {id:'copa-2024',group:'Copa IOS',label:'Copa IOS 2024',status:'Manteto',kind:'copa',key:'Copa IOS 2024'},
  {id:'world-2026',group:'Mundial',label:'IOS World Cup 2026',status:'Meminetsk',kind:'world-2026'},
  {id:'mundial-2025',group:'Mundial',label:'Club World Cup 2025',status:'ValeGuiDoce',kind:'world-2025'}
];

let activeChampionship='pl-2026';

function championshipContent(item){
  if(item.kind==='premier')return premierLeagueContent(item);
  if(item.kind==='pc')return pcArchiveTable(item.key);
  if(item.kind==='pc-current')return `<div class="theme-panel theme-pc2"><div class="archive-hero"><img src="${logo(computePC2()[0].id)}"><div><h3>📊 PC/2 2026</h3><p>${pc2ClosedRoundsCount()} de 18 rodadas concluídas • Cartola 19–36</p><span class="pill orange">em andamento</span></div></div>${pcTableMarkup(computePC2())}</div>`;
  if(item.kind==='copa')return cupBracket(item.key);
  if(item.kind==='world-2026')return worldCup2026Table();
  return mundial2025Table();
}

function championshipMenu(){const groups=[...new Set(CHAMPIONSHIP_MENU.map(x=>x.group))];return `<div class="championship-browser">${groups.map(group=>`<div class="championship-menu-group"><span>${group}</span><div class="championship-menu-items">${CHAMPIONSHIP_MENU.filter(x=>x.group===group).map(item=>`<button class="championship-choice ${item.id===activeChampionship?'active':''}" onclick="openChampionship('${item.id}')"><b>${item.label}</b><small>${item.status}</small></button>`).join('')}</div></div>`).join('')}</div>`}

function openChampionship(id){if(!CHAMPIONSHIP_MENU.some(x=>x.id===id))return;activeChampionship=id;renderChampionships()}

function renderChampionships(){if(!$('championshipsView'))return;const item=CHAMPIONSHIP_MENU.find(x=>x.id===activeChampionship)||CHAMPIONSHIP_MENU[0];$('championshipsView').innerHTML=`${championshipMenu()}<div class="championship-current">${championshipContent(item)}</div>`}

function renderSocial(){}

Object.assign(window, {showTab,changeRound,refreshAll,setMyTeam,renderHistoryRound,openTeam,showFormDetail,closeFormDetail,openPCCompetition,openChampionship,loginCartola,requestNotify});

init();
