import {loadStore,formatPoints,club,crest,latestCompletedRound,latestCompletedRoundMvp,completedRounds,competitionRoundForCartola,projectLiveHeadToHeadStandings} from './data-store.js';
import {readPreferences,mountProfile} from './profile.js';
import {normalizeNavigation,paintPredictNavigation} from './navigation.js';
import {OTHER_TEAM_ASSETS} from './asset-map.js';
import {finishRegionLoading} from './public-shell.js';
import {selectTeamScores,readCurrentScoreCache,writeCurrentScoreCache} from './current-team-score.js';
import {publicCompetitionLabel} from './public-labels.js';
const $ = id => document.getElementById(id);
const ordinal = index => index < 0 ? '—' : `${index + 1}º`;
let currentScores={};

function teamLine(store,row,value) {
  const team = club(store,row?.teamId);
  return team ? `<div class="club"><img src="${crest(team)}" alt="Escudo ${team.official_name}" width="42" height="42"><div><strong>${team.short_name}</strong><small>${value}</small></div></div>` : '<div class="club"><strong>Indisponível</strong></div>';
}
function marketMarkup(market) {
  if (!market) return '<strong>STATUS INDISPONÍVEL</strong>';
  if (!market.isOpen) return '<strong>MERCADO FECHADO</strong>';
  if (!market.closesAt) return '<strong>MERCADO ABERTO</strong>';
  return '<span>Mercado fecha em</span><strong id="marketCountdown">—</strong>';
}
function startTimer(market) {
  clearInterval(window.__pliosMarketTimer);
  const target=market?.closesAt?Date.parse(market.closesAt):NaN, output=$('marketCountdown');
  if(!output||!Number.isFinite(target)) return;
  const paint=()=>{const ms=Math.max(0,target-Date.now()),s=Math.floor(ms/1000);output.textContent=ms?`${String(Math.floor(s/3600)).padStart(2,'0')}h ${String(Math.floor(s%3600/60)).padStart(2,'0')}m ${String(s%60).padStart(2,'0')}s`:'MERCADO FECHADO';};
  paint(); window.__pliosMarketTimer=setInterval(paint,1000);
}
function renderEvents(store,latestMvp) {
  // Compatibilidade conceitual: a antiga seção "Últimas da liga" agora usa o título público "Agora na liga".
  const news=document.querySelector('.news'); if(!news) return;
  const events=[];
  const completedRound=latestCompletedRound(store);
  if(completedRound){
    const internal=completedRound<=18?completedRound:completedRound-18;
    const competition=completedRound<=18?'PC/1':'PC/2';
    const results=(completedRound<=18?store.pc1Results:store.pc2Results)?.[internal]||[];
    events.push({mark:'✓',title:'ÚLTIMA RODADA CONCLUÍDA',copy:`R${completedRound} · ${competition} · ${results.length} confrontos oficiais`});
  }
  if(latestMvp){const team=club(store,latestMvp.teamId);if(team)events.push({mark:'★',title:'MVP DA ÚLTIMA RODADA',copy:`${team.short_name} — ${formatPoints(latestMvp.points)} pts · R${latestMvp.round}`});}
  const pc2Leader=store.standings?.pc2?.[0];if(pc2Leader){const team=club(store,pc2Leader.teamId);if(team)events.push({mark:'◆',title:'LÍDER DO PC/2',copy:team.short_name});}
  if(store.record){const team=club(store,store.record.teamId);if(team)events.push({mark:'↑',title:'MELHOR PONTUAÇÃO DA TEMPORADA',copy:`${team.short_name} — ${formatPoints(store.record.points)} pts`});}
  const conquests=store.stateDoc.conquistas||{};
  Object.entries(conquests).forEach(([name,titles])=>{
    (titles||[]).filter(title=>/2026(?:\/1|\/2)?$/.test(title)).forEach(title=>events.push({mark:'◆',title:'CAMPEÃO DEFINIDO',copy:`${name} — ${publicCompetitionLabel(title)}`}));
  });
  news.innerHTML=`<span class="eyebrow">Fatos registrados</span><h2>Agora na liga</h2>${events.length?events.slice(0,3).map(event=>`<article class="story ui-enter ui-rise"><div class="story-date" aria-hidden="true">${event.mark}</div><div><h3>${event.title}</h3><p>${event.copy}</p></div></article>`).join(''):'<p class="empty-state">Ainda não há fatos disponíveis.</p>'}`;
}
function lineupLabel(entry){if(entry?.scaled===true)return 'Escalação disponível';if(entry)return 'Escalação herdada ou não confirmada';return 'Informação indisponível';}

function render(store,preferences){
  paintPredictNavigation(store.market);
  const favoriteId=Number(preferences.favoriteTeamId), otherFavorite=OTHER_TEAM_ASSETS.find(team=>team.team_id===preferences.favoriteTeamId), favorite=club(store,favoriteId), displayFavorite=favorite||otherFavorite;
  const pl=store.standings['pl-ios']||[],live=favorite?store.live[favoriteId]:null,latestMvp=latestCompletedRoundMvp(store);
  const liveCartolaRound=store.roundContext?.liveRound,season=Number(store.stateDoc?.temporada_atual)||2026;
  const liveCompetitionRound=competitionRoundForCartola(store.competitions,'pc2',season,liveCartolaRound);
  const liveProjection=projectLiveHeadToHeadStandings({officialRows:store.standings.pc2||[],fixtures:store.pc2Fixtures?.[liveCompetitionRound]||[],liveScores:currentScores,season,cartolaRound:liveCartolaRound,competitionRound:liveCompetitionRound,completed:completedRounds(store)});
  const pc=liveProjection.rows;
  document.querySelector('.hero h1').textContent='Premier League IOS';
  document.querySelector('.round').innerHTML=`R${store.currentCartolaRound??'—'} <span>Cartola</span>`;
  document.querySelector('.market').innerHTML=`${marketMarkup(store.market)}<span>${store.currentPc2Round?`PC/2 · rodada interna ${store.currentPc2Round}`:'Competição indisponível'}</span>`;
  startTimer(store.market);

  const cards=document.querySelectorAll('.highlight');
  cards[0].innerHTML=`<span class="label">Líder da PL IOS</span>${teamLine(store,store.premierLeagueLeader,`${formatPoints(store.premierLeagueLeader?.cartolaPoints)} pts`)}`;
  cards[1].innerHTML=`<span class="label">Líder do PC atual</span>${teamLine(store,pc[0],pc[0]?`${pc[0].points??'—'} pts`:'Indisponível')}`;
  cards[2].innerHTML=`<span class="label">Último MVP</span>${latestMvp?teamLine(store,{teamId:latestMvp.teamId},`${formatPoints(latestMvp.points)} pts · R${latestMvp.round}`):'<div class="metric">Indisponível</div>'}`;
  cards[3].innerHTML=`<span class="label">Melhor pontuação</span>${store.record?teamLine(store,{teamId:store.record.teamId},`${formatPoints(store.record.points)} pts`):'<div class="metric">Indisponível</div>'}`;

  $('favoriteCrest').src=displayFavorite?(displayFavorite.crest||displayFavorite.logo):'assets/images/league-logo.png';
  $('favoriteCrest').alt=displayFavorite?`Escudo ${displayFavorite.official_name}`:'Nenhum time favorito selecionado';
  $('favoriteTeamName').textContent=displayFavorite?.official_name||'Escolha seu time';
  const stats=document.querySelectorAll('.fav-stat strong');
  const currentScore=favorite?currentScores[favoriteId]||null:null;
  stats[0].textContent=currentScore?formatPoints(currentScore.value):'—';
  $('favoriteScoreLabel').textContent=currentScore?.label||'Parcial temporariamente indisponível';
  stats[1].textContent=favorite?ordinal(pl.findIndex(row=>row.teamId===favoriteId)):'—';
  stats[2].textContent=favorite?ordinal(pc.findIndex(row=>row.teamId===favoriteId)):'—';
  stats[3].textContent=favorite?lineupLabel(live):'—';
  const note=document.querySelector('.favorite-copy p');
  note.textContent=favorite?'Resumo da rodada e das competições atuais.':displayFavorite?'Clube histórico fora das classificações atuais.':'Defina um favorito para ver seu resumo aqui.';
  const action=document.querySelector('.fav-actions .btn');
  action.textContent=favorite?'Ver escalação':displayFavorite?'Ver perfil':'Escolher time';
  action.onclick=()=>{if(favorite)location.href=`escalacoes.html?team=${favoriteId}`;else if(displayFavorite)location.href=`clube.html?id=${preferences.favoriteTeamId}`;else document.getElementById('profileButton')?.click();};

  const liveBadge=$('pc2LiveBadge');if(liveBadge){liveBadge.hidden=!liveProjection.applied;liveBadge.textContent=liveProjection.applied?`AO VIVO · R${liveCompetitionRound}`:'';}
  $('standings').innerHTML=pc.length?pc.slice(0,10).map((row,i)=>{const team=club(store,row.teamId);return `<tr class="${row.teamId===favoriteId?'favorite-row':''}"><td class="position">${i+1}º</td><td><div class="table-club"><img src="${crest(team)}" alt="" width="34" height="34"><strong>${team?.short_name||'—'}</strong></div></td><td><strong>${row.points??'—'}</strong></td><td>${row.wins??'—'}</td><td>${formatPoints(row.cartolaPoints)}</td></tr>`}).join(''):'<tr class="home-state"><td colspan="5">A classificação do PC/2 ainda não está disponível.</td></tr>';
  renderEvents(store,latestMvp);
  finishRegionLoading($('homeStandings'));finishRegionLoading(document.querySelector('.news'));
}
normalizeNavigation();
try{const store=await loadStore();let preferences=readPreferences(store.clubs);currentScores=readCurrentScoreCache(store.currentCartolaRound);mountProfile(store.clubs,preferences,next=>{preferences=next;render(store,preferences)});render(store,preferences);try{const response=await fetch('/api/cartola/athlete-scores?projections=1',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP_${response.status}`);const payload=await response.json();currentScores=selectTeamScores(payload.team_projections,{roundFinal:payload.round_complete===true,cached:currentScores});writeCurrentScoreCache(store.currentCartolaRound,currentScores);render(store,preferences);}catch(error){console.error('[PLIOS] Pontuação efetiva atual indisponível',error);render(store,preferences);}}catch(error){console.error('[PLIOS] Home indisponível',error);const standings=$('standings'),standingsRegion=$('homeStandings'),news=document.querySelector('.news'),market=document.querySelector('.market');if(market)market.innerHTML='<strong>STATUS INDISPONÍVEL</strong><span>Tente novamente mais tarde</span>';if(standings)standings.innerHTML='<tr class="home-state"><td colspan="5" role="alert">Não foi possível carregar a classificação.</td></tr>';if(news)news.innerHTML='<span class="eyebrow">Fatos registrados</span><h2>Agora na liga</h2><p class="error-state" role="alert">Não foi possível carregar os fatos da liga.</p>';finishRegionLoading(standingsRegion);finishRegionLoading(news);}
