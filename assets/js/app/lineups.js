import { loadStore, formatPoints, club, crest } from './data-store.js';
import { readPreferences, mountProfile } from './profile.js';
import { normalizeNavigation } from './navigation.js';
import { projectEffectiveLineup } from './lineup-projection.js';
import { selectCurrentTeamScore } from './current-team-score.js';
import {setRegionLoading,finishRegionLoading,setButtonLoading,bindRelativeTime} from './public-shell.js';

const $=id=>document.getElementById(id),fallbackCrest='assets/images/league-logo.png';
let store,preferences,selectedTeamId,requestSerial=0,scoresPromise=null,lastLineupAt=null,stopRelativeClock=()=>{};

const athleteName=athlete=>athlete?.nickname||athlete?.name||'Atleta';
const scoreText=value=>value==null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const athleteCrest=(athlete,scores)=>scores?.clubs?.[athlete?.real_club_id]?.crest||fallbackCrest;
const stateText=athlete=>athlete.status==='not_played'?'Não jogou':athlete.status==='pending'?'Ainda não pontuou':athlete.enteredFromBench?'Entrou do banco':athlete.rawScore===0?'Jogou · 0,00':`${scoreText(athlete.rawScore)} pts`;

async function fetchJson(url){const response=await fetch(url,{cache:'no-store'}),payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`${response.status}`);return payload;}
async function publicLineup(teamId){const payload=await fetchJson(`/api/cartola/lineup?id=${encodeURIComponent(teamId)}`);if(payload.status!=='valid'||!payload.lineup)throw new Error(payload?.validation?.code||'LINEUP_UNAVAILABLE');return payload;}
const publicScores=()=>scoresPromise||(scoresPromise=fetchJson('/api/cartola/athlete-scores'));

function playerMarkup(athlete,scores,projection){
  const captain=Number(athlete.athlete_id)===Number(projection.captain.effectiveAthleteId),effective=athlete.effectiveScore??athlete.rawScore,status=stateText(athlete);
  return `<div class="player ${athlete.enteredFromBench?'substitute':''} ${athlete.status==='not_played'?'did-not-play':''}" aria-label="${athleteName(athlete)} · ${status}">${captain?'<span class="captain-mark">CAP</span>':''}<span class="player-portrait"><img src="${athleteCrest(athlete,scores)}" alt="" width="58" height="58"></span><span class="player-name">${athleteName(athlete)}</span><span class="player-score">${scoreText(effective)}</span><span class="player-state">${athlete.enteredFromBench?'Entrou do banco':athlete.status==='not_played'?'Não jogou':athlete.status==='pending'?'Pendente':captain?`CAP: ${scoreText(effective)}`:athlete.rawScore===0?'Jogou · zero':'Pontuação atual'}</span></div>`;
}

function paintField(lineup,projection,scores){
  const groups={ATA:[],MEI:[],DEF:[],GOL:[]};
  projection.effective.forEach(athlete=>groups[athlete.position_group||(athlete.position==='GOL'?'GOL':athlete.position)]?.push(athlete));
  $('attackRow').innerHTML=groups.ATA.map(player=>playerMarkup(player,scores,projection)).join('');$('midfieldRow').innerHTML=groups.MEI.map(player=>playerMarkup(player,scores,projection)).join('');$('defenseRow').innerHTML=groups.DEF.map(player=>playerMarkup(player,scores,projection)).join('');$('goalkeeperRow').innerHTML=groups.GOL.map(player=>playerMarkup(player,scores,projection)).join('');
  $('coachInitials').innerHTML=`<img src="${athleteCrest(projection.coach,scores)}" alt="" width="48" height="48">`;$('coachName').textContent=athleteName(projection.coach);$('coachScore').textContent=scoreText(projection.coach.effectiveScore);
}

function paintBench(projection,scores){
  $('benchCard').hidden=projection.reserves.length===0;$('benchCount').textContent=`${projection.reserves.length} reserva${projection.reserves.length===1?'':'s'}`;
  $('benchList').innerHTML=projection.reserves.map(reserve=>{const replaced=projection.original.find(item=>Number(item.athlete_id)===Number(reserve.replacedAthleteId)),luxuryMark=reserve.isLuxuryReserve?`<span class="luxury-reserve-mark ${projection.luxuryReserve.triggered?'triggered':''}" role="img" tabindex="0" aria-label="Reserva de Luxo" title="Reserva de Luxo"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 15V4m0 0L3 7m3-3 3 3M14 5v11m0 0 3-3m-3 3-3-3"/></svg></span>`:'';return `<article class="bench-player ${reserve.enteredFromBench?'entered':''} ${reserve.isLuxuryReserve?'is-luxury-reserve':''}">${luxuryMark}<img src="${athleteCrest(reserve,scores)}" alt="" width="38" height="38"><div><strong>${athleteName(reserve)}</strong><small>${reserve.position} · ${scoreText(reserve.rawScore)}</small></div><span class="bench-status">${reserve.enteredFromBench?`Entrou no lugar de ${athleteName(replaced)}`:stateText(reserve)}</span></article>`;}).join('');
  $('substitutionSummary').innerHTML=projection.normalSubstitutions.length?`<p class="score-diagnostic">${projection.normalSubstitutions.length} substituição automática confirmada${projection.normalSubstitutions.length===1?'':'s'} pelo banco normal.</p>`:'<p class="score-diagnostic">Nenhuma substituição normal confirmada até agora.</p>';
}

function paintLuxury(lineup,projection,scores){
  // `lineup.luxury_reserve` continua sendo o marcador contratual; aqui apenas refletimos sua projeção no banco.
  const reserve=projection.reserves.find(player=>player.isLuxuryReserve)||null;
  $('reserveMetric').textContent=reserve?athleteName(reserve):'—';$('reserveStateText').textContent=reserve?projection.luxuryReserve.status.replaceAll('_',' '):lineup.lineup_inherited?'Ausência preservada na escalação herdada':'Inexistente';
}

function reset(team,isFavorite,live){
  $('selectedCrest').src=crest(team);$('selectedCrest').alt=`Escudo ${team.official_name}`;$('selectedName').innerHTML=`${team.official_name}${isFavorite?' <span class="favorite-star" aria-label="Seu time favorito">★</span>':''}`;$('viewingLabel').textContent=isFavorite?'Visualizando seu time':'Visualizando outro clube';$('backFavorite').hidden=isFavorite||!Number(preferences.favoriteTeamId);$('panelFormation').textContent='Formação —';$('totalScore').textContent=formatPoints(live?.roundPoints);$('scoreState').textContent='Carregando escalação';$('captainName').textContent='—';$('reserveMetric').textContent='—';$('reserveStateText').textContent='Indisponível';$('budget').textContent=live?.wealth==null?'—':`C$ ${formatPoints(live.wealth)}`;$('teamHighlight').textContent='—';$('highlightScore').textContent='Calculando pontuação efetiva';$('dataCount').textContent='Carregando';$('dataHealth').textContent='Consultando somente contratos públicos do Cartola.';$('roundStatus').className='state-chip partial';$('roundStatus').textContent='Carregando';$('panelStatus').textContent='Escalação atual';$('pitchShell').hidden=true;$('unavailableState').hidden=false;$('benchCard').hidden=true;
}

async function render(teamId){
  const team=club(store,teamId);if(!team)return;selectedTeamId=team.team_id;const favoriteId=Number(preferences.favoriteTeamId),live=store.live[selectedTeamId]||null;reset(team,selectedTeamId===favoriteId,live);const serial=++requestSerial;setRegionLoading($('lineupLayout'),'Carregando escalação...');setButtonLoading($('refreshLineup'),true);
  try{
    const [envelope,scores]=await Promise.all([publicLineup(selectedTeamId),publicScores()]);if(serial!==requestSerial)return;const lineup=envelope.lineup,projection=projectEffectiveLineup(lineup,scores,{roundFinal:scores.round_complete===true}),captain=(lineup.starters||[]).find(athlete=>Number(athlete.athlete_id)===Number(lineup.captain_id));
    $('panelFormation').textContent=`Formação ${lineup.formation||'—'}`;$('captainName').textContent=athleteName(captain);$('budget').textContent=lineup.budget==null?'—':`C$ ${formatPoints(lineup.budget)}`;$('dataCount').textContent=`${lineup.starters.length}/11 · ${lineup.reserves.length} reservas`;$('roundStatus').className=`state-chip ${scores.round_complete?'closed':'partial'}`;$('roundStatus').textContent=scores.round_complete?'Rodada encerrada':'Rodada em andamento';$('panelStatus').textContent=lineup.lineup_inherited?'Escalação herdada':'Escalação efetiva';
    const currentScore=selectCurrentTeamScore(projection,{roundFinal:scores.round_complete===true});$('totalScore').textContent=currentScore?scoreText(currentScore.value):'—';$('scoreState').textContent=currentScore?.label||'Parcial temporariamente indisponível';$('teamHighlight').textContent=currentScore?scoreText(currentScore.value):'—';$('highlightScore').textContent=currentScore?.label||'Parcial temporariamente indisponível';
    const diagnostic=projection.difference==null?'Sem comparação final enquanto há partidas pendentes.':projection.difference===0?'Cálculo efetivo confere com o total oficial.':`Diferença para o total oficial: ${scoreText(projection.difference)} pts.`;$('dataHealth').textContent=`${lineup.lineup_inherited?'Escalação herdada confirmada; banco/RL ausentes quando não fornecidos.':'Escalação atual com banco preservado.'} ${diagnostic}`;
    paintField(lineup,projection,scores);paintBench(projection,scores);paintLuxury(lineup,projection,scores);$('pitchShell').hidden=false;$('unavailableState').hidden=true;lastLineupAt=new Date();stopRelativeClock();stopRelativeClock=bindRelativeTime($('lineupUpdated'),()=>lastLineupAt);finishRegionLoading($('lineupLayout'));
  }catch(error){if(serial!==requestSerial)return;$('dataHealth').textContent=live?'Não foi possível atualizar agora. Exibindo a última atualização disponível.':'Nenhuma escalação disponível.';finishRegionLoading($('lineupLayout'));console.error('[PLIOS] Escalação indisponível',error);}finally{if(serial===requestSerial)setButtonLoading($('refreshLineup'),false);}
}

function buildClubGrid(){const favoriteId=Number(preferences.favoriteTeamId);$('clubGrid').innerHTML=store.clubs.map(team=>`<button type="button" class="club-option" data-team-id="${team.team_id}"><img src="${crest(team)}" alt=""><span><strong>${team.official_name}${team.team_id===favoriteId?' <span class="favorite-star">★</span>':''}</strong><small>Ver escalação da rodada</small></span></button>`).join('');document.querySelectorAll('[data-team-id]').forEach(button=>button.addEventListener('click',()=>{$('teamDialog').close();render(Number(button.dataset.teamId));}));}

normalizeNavigation();
try{store=await loadStore();preferences=readPreferences(store.clubs);const contextMeta=document.querySelector('.lineup-context .context-meta');if(contextMeta){const mapping=contextMeta.querySelector('strong'),updated=$('lineupUpdated');if(mapping)mapping.textContent=`Cartola · R${store.currentCartolaRound??'—'} / PC/2 · R${store.currentPc2Round==null?'—':String(store.currentPc2Round).padStart(2,'0')}`;if(updated)updated.textContent=store.updated?`Atualizado em ${store.updated.toLocaleString('pt-BR')}`:'Atualização —';}document.querySelectorAll('.team-metrics .metric').forEach(metric=>{if(metric.querySelector('label')?.textContent.trim()!=='Rodada')return;metric.querySelector('strong').textContent=store.currentCartolaRound==null?'—':`Cartola R${store.currentCartolaRound}`;metric.querySelector('small').textContent=store.currentPc2Round==null?'PC/2 · —':`PC/2 · R${String(store.currentPc2Round).padStart(2,'0')}`;});selectedTeamId=Number(preferences.favoriteTeamId)||null;mountProfile(store.clubs,preferences,next=>{preferences=next;buildClubGrid();render(Number(next.favoriteTeamId));});buildClubGrid();if(selectedTeamId)render(selectedTeamId);else{$('pitchShell').hidden=true;$('unavailableState').hidden=false;$('benchCard').hidden=true;}$('openTeams').addEventListener('click',()=>$('teamDialog').showModal());$('closeTeams').addEventListener('click',()=>$('teamDialog').close());$('backFavorite').addEventListener('click',()=>render(Number(preferences.favoriteTeamId)));const refresh=()=>{scoresPromise=null;render(selectedTeamId)};$('retryLineup').addEventListener('click',refresh);$('refreshLineup').addEventListener('click',refresh);}catch(error){console.error('[PLIOS] Escalações indisponíveis',error);$('pitchShell').hidden=true;$('unavailableState').hidden=false;$('benchCard').hidden=true;}
