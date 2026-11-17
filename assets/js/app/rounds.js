import { loadStore, formatPoints, club, crest, computeHeadToHead, selectedRoundSummary } from './data-store.js';
import { readPreferences, mountProfile } from './profile.js';
import { normalizeNavigation } from './navigation.js';
import {setRegionLoading,finishRegionLoading,setButtonLoading,bindRelativeTime,flashUpdated} from './public-shell.js';
import {selectTeamScores} from './current-team-score.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let store, preferences, selected = Number(params.get('round')) || null, pollTimer=null, lastLiveAt=null,stopRelativeClock=()=>{};

function resultFor(results, a, b) {
  return (results || []).find(row =>
    (Number(row[0]) === Number(a) && Number(row[2]) === Number(b)) ||
    (Number(row[0]) === Number(b) && Number(row[2]) === Number(a))
  );
}

function summaryCard(label, team, points) {
  return `<div class="summary-item"><div><label>${label}</label><div class="summary-club">${team ? `<img src="${crest(team)}" alt=""><strong>${team.official_name}</strong>` : '<strong>—</strong>'}</div></div><strong class="summary-value">${formatPoints(points)}</strong></div>`;
}

function render(round,{historyMode='replace',direction=''}={}) {
  const previousScores=new Map([...document.querySelectorAll('[data-live-score]')].map(node=>[node.dataset.liveScore,node.textContent]));
  selected = Math.max(1, Math.min(36, Number(round)));
  const isPc1 = selected <= 18;
  const internal = isPc1 ? selected : selected - 18;
  const competition = isPc1 ? 'PC/1' : 'PC/2';
  const fixtureSource = isPc1 ? store.pc1Fixtures : store.pc2Fixtures;
  const resultSource = isPc1 ? store.pc1Results : store.pc2Results;
  const fixtures = fixtureSource[internal] || [];
  const results = resultSource[internal] || [];
  const current = selected === store.roundContext?.liveRound;
  const closed = results.length > 0;
  const provenance = store.roundProvenance?.[String(selected)] || null;

  const url=new URL(location.href);url.searchParams.set('round',String(selected));history[historyMode==='push'?'pushState':'replaceState']({round:selected},'',url);
  $('contextNumbers').innerHTML = `Cartola R${selected} <span aria-hidden="true">/</span> ${competition} R${String(internal).padStart(2, '0')}`;
  $('contextUpdated').textContent = store.updated ? `Fonte atualizada em ${store.updated.toLocaleString('pt-BR')}` : 'Horário indisponível';
  const hasLive = current && Object.keys(store.live || {}).length > 0;
  $('contextStatus').textContent = provenance ? 'HISTÓRICO IMPORTADO' : closed ? 'FINAL' : hasLive ? 'AO VIVO / PARCIAL' : current ? 'PARCIAL INDISPONÍVEL' : 'SEM DADOS';
  $('contextStatus').className = `state-chip ${closed ? 'closed' : current ? 'partial' : 'future'}`;
  $('roundBanner').dataset.round = selected;
  $('roundCompetition').textContent = `${competition} · Rodada ${String(internal).padStart(2, '0')}`;
  $('roundTitle').textContent = `Parciais — R${selected}`;
  $('roundDescription').textContent = provenance
    ? 'Rodada histórica importada pré-cutover. Totais oficiais disponíveis; escalações individuais finais não estão disponíveis.'
    : fixtures.length ? 'Confrontos oficiais cadastrados para esta rodada.' : 'Confrontos ainda não cadastrados; nenhum jogo foi inventado.';
  $('roundFacts').innerHTML = `<div class="round-fact"><strong>${fixtures.length || '—'}</strong><span>Confrontos</span></div><div class="round-fact"><strong>${fixtures.length ? fixtures.length * 2 : '—'}</strong><span>Clubes</span></div><div class="round-fact"><strong>R${selected}</strong><span>Cartola</span></div>`;
  $('dataAvailability').innerHTML = `<i class="update-dot"></i><strong>${provenance ? 'Histórico importado · não processado pelo engine' : fixtures.length ? `${fixtures.length} confrontos oficiais` : 'Dados indisponíveis'}</strong>`;
  $('lastUpdate').textContent = lastLiveAt&&current ? 'Atualizado agora' : store.stale ? 'Exibindo a última atualização disponível' : 'Dados consolidados';
  $('previousRound').textContent = `← R${selected - 1}`;
  $('previousRound').disabled = selected <= 1;
  $('currentRound').innerHTML = `R${selected}<span>${provenance ? 'Importada' : current ? 'Atual' : closed ? 'Final' : 'Sem dados'}</span>`;
  $('nextRound').textContent = `R${selected + 1} →`;
  $('nextRound').disabled = selected >= (store.roundContext?.cartolaRound || selected);

  const favoriteId = Number(preferences.favoriteTeamId);
  $('matchesGrid').innerHTML = fixtures.length ? fixtures.map(([a, b], index) => {
    const teamA = club(store, a), teamB = club(store, b), result = resultFor(results, a, b);
    const pointsA = result ? (Number(result[0]) === Number(a) ? result[1] : result[3]) : current ? store.live?.[a]?.roundPoints??null : null;
    const pointsB = result ? (Number(result[0]) === Number(a) ? result[3] : result[1]) : current ? store.live?.[b]?.roundPoints??null : null;
    const hasPartial=pointsA!=null&&pointsB!=null,status = result ? 'ENCERRADO' : current&&hasPartial ? 'AO VIVO' : 'EM BREVE';
    return `<article class="match-card ${a === favoriteId || b === favoriteId ? 'favorite' : ''}"><div class="match-top"><span>Jogo ${String(index + 1).padStart(2, '0')}</span><span class="match-status ${result ? 'closed' : status === 'AO VIVO' ? 'live' : 'soon'}">${status}</span></div><div class="match-board"><div class="team-side"><img src="${crest(teamA)}" alt=""><strong>${teamA?.short_name || '—'}</strong></div><div class="score"><div class="scoreline">${result||hasPartial ? `<span data-live-score="${selected}:${a}">${formatPoints(pointsA)}</span><i>×</i><span data-live-score="${selected}:${b}">${formatPoints(pointsB)}</span>` : '<span>VS</span>'}</div><small>${result ? 'Placar final' : hasPartial ? 'Pontuação parcial' : 'Aguardando dados'}</small></div><div class="team-side"><img src="${crest(teamB)}" alt=""><strong>${teamB?.short_name || '—'}</strong></div></div></article>`;
  }).join('') : '<div class="empty-round" style="grid-column:1/-1"><h3>Dados indisponíveis</h3><p>Nenhum confronto confiável foi localizado para esta rodada.</p></div>';
  const matchGrid=$('matchesGrid');matchGrid.classList.remove('ui-enter','ui-slide-next','ui-slide-prev');requestAnimationFrame(()=>matchGrid.classList.add('ui-enter',direction==='next'?'ui-slide-next':direction==='prev'?'ui-slide-prev':'ui-fade'));matchGrid.querySelectorAll('[data-live-score]').forEach(node=>{const previous=previousScores.get(node.dataset.liveScore);if(previous!=null&&previous!==node.textContent)flashUpdated(node)});

  const completed = Object.fromEntries(Object.entries(resultSource).filter(([key]) => Number(key) <= internal));
  const standings = computeHeadToHead(store.clubs, completed);
  $('roundDetails').hidden = false;
  $('tableTitle').textContent = `Classificação ${competition}`;
  $('tableStatus').textContent = `${closed ? 'Após' : 'Até'} R${String(internal).padStart(2, '0')}`;
  $('standingsBody').innerHTML = standings.slice(0, 6).map((row, index) => {
    const team = club(store, row.teamId);
    return `<tr class="${row.teamId === favoriteId ? 'favorite-row' : ''}"><td class="position">${index + 1}º</td><td><div class="table-club"><img src="${crest(team)}" alt=""><strong>${team?.short_name || '—'}</strong></div></td><td><strong>${row.points}</strong></td><td>${row.wins}</td><td>${formatPoints(row.cartolaPoints)}</td></tr>`;
  }).join('');

  const summary = selectedRoundSummary(store, selected);
  const scoreRows = Object.entries(summary?.scores || {}).map(([teamId, points]) => ({teamId:Number(teamId),points:Number(points)})).filter(row => Number.isFinite(row.points)).sort((a,b)=>b.points-a.points);
  const summaryCards = [];
  if (summary?.mvpTeamId != null && summary?.mvpPoints != null) summaryCards.push(summaryCard('MVP da rodada', club(store, summary.mvpTeamId), summary.mvpPoints));
  else if (scoreRows.length) summaryCards.push(summaryCard('Maior pontuação', club(store, scoreRows[0].teamId), scoreRows[0].points));
  if (summary?.worstTeamId != null && summary?.worstPoints != null) summaryCards.push(summaryCard('Menor pontuação', club(store, summary.worstTeamId), summary.worstPoints));
  else if (scoreRows.length) summaryCards.push(summaryCard('Menor pontuação', club(store, scoreRows.at(-1).teamId), scoreRows.at(-1).points));
  $('summaryItems').innerHTML = summaryCards.join('');
  const summaryLabel = summary.status === 'final' ? (summary.source === 'historical_import' ? 'Histórico oficial importado' : 'Resultado oficial') : summary.status === 'partial' ? 'Parcial da rodada selecionada' : 'Resumo indisponível';
  $('summaryStatus').textContent = summary.status === 'unavailable' ? summaryLabel : `R${selected} · ${summary.fixtures.length} confrontos · ${summaryLabel}`;
}

function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}
function schedulePolling(roundComplete=false){stopPolling();const summary=selectedRoundSummary(store,selected);if(selected===store.roundContext?.liveRound&&summary.status==='partial'&&!roundComplete)pollTimer=setInterval(()=>refreshLive(false),60000);}
async function refreshLive(manual=false){
  if(selected!==store.roundContext?.liveRound)return;
  const region=$('matchesGrid'),hadTrusted=Object.keys(store.live||{}).length>0;if(!hadTrusted)setRegionLoading(region,'Carregando parcial...');setButtonLoading($('refreshPartial'),true);
  try{const response=await fetch('/api/cartola/athlete-scores?projections=1',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP_${response.status}`);const payload=await response.json(),projections=payload.team_projections||{};if(!Object.keys(projections).length)throw new Error('PARTIAL_UNAVAILABLE');const selectedScores=selectTeamScores(projections,{roundFinal:payload.round_complete===true});store.live=Object.fromEntries(Object.entries(selectedScores).map(([teamId,value])=>[Number(teamId),{teamId:Number(teamId),roundPoints:value.value,effective:value.source==='effective_current'||value.authoritative===true,scoreSource:value.source}]));lastLiveAt=new Date(payload.updated_at||Date.now());render(selected);finishRegionLoading(region);schedulePolling(payload.round_complete===true);}
  catch(error){console.error('[PLIOS] Parcial temporariamente indisponível',error);if(!hadTrusted)region.innerHTML='<div class="empty-round"><h3>Parcial ainda não disponível</h3><p>Não foi possível atualizar agora.</p></div>';$('dataAvailability').innerHTML=`<i class="update-dot"></i><strong>${hadTrusted?'Exibindo a última atualização disponível':'Parcial ainda não disponível'}</strong>`;finishRegionLoading(region);if(!manual)schedulePolling(false);}
  finally{setButtonLoading($('refreshPartial'),false);}
}

normalizeNavigation();
const classificationLink = document.querySelector('.table-footer .text-link');
if (classificationLink) classificationLink.href = 'competicao.html?competition=pc2&view=classification';

try {
  store = await loadStore();
  preferences = readPreferences(store.clubs);
  if (!selected) selected = store.roundContext?.liveRound || store.roundContext?.latestCompletedRound || store.currentCartolaRound || 23;
  mountProfile(store.clubs, preferences, next => { preferences = next; render(selected); });
  render(selected);
  await refreshLive(false);
  stopRelativeClock();stopRelativeClock=bindRelativeTime($('lastUpdate'),()=>lastLiveAt);
  $('previousRound').onclick = () => {render(selected - 1,{historyMode:'push',direction:'prev'});schedulePolling();};
  $('currentRound').onclick = () => {const target=store.roundContext?.liveRound||store.roundContext?.latestCompletedRound||selected;render(target,{historyMode:'push',direction:'next'});refreshLive(false);};
  $('nextRound').onclick = () => {render(selected + 1,{historyMode:'push',direction:'next'});schedulePolling();};
  $('refreshPartial').onclick=()=>refreshLive(true);
  $('allRounds').onclick = () => $('roundDialog').showModal();
  $('roundDialog').querySelector('.round-list').innerHTML = Array.from({length:store.currentCartolaRound || 0}, (_, index) => {
    const cartolaRound = index + 1, isPc1 = cartolaRound <= 18, internalRound = isPc1 ? cartolaRound : cartolaRound - 18;
    return `<button type="button" data-round="${cartolaRound}"><strong>Cartola R${String(cartolaRound).padStart(2, '0')}</strong><small>${isPc1 ? 'PC/1' : 'PC/2'} R${String(internalRound).padStart(2, '0')}</small></button>`;
  }).join('');
  $('roundDialog').onclick = event => { const button = event.target.closest('[data-round]'); if (button) {const target=Number(button.dataset.round),direction=target>selected?'next':'prev';$('roundDialog').close();render(target,{historyMode:'push',direction});if(selected===store.roundContext?.liveRound)refreshLive(false);else schedulePolling(); } };
  $('closeDialog').onclick = () => $('roundDialog').close();
  window.addEventListener('popstate',()=>{const target=Number(new URLSearchParams(location.search).get('round'))||store.roundContext?.liveRound||store.roundContext?.latestCompletedRound||store.currentCartolaRound;if(target!==selected){const direction=target>selected?'next':'prev';render(target,{direction});if(selected===store.roundContext?.liveRound)refreshLive(false);else schedulePolling();}});
} catch (error) {
  console.error('[PLIOS] Rodadas indisponíveis', error);
  $('matchesGrid').innerHTML = '<div class="empty-round"><h3>Dados indisponíveis</h3></div>';
}
