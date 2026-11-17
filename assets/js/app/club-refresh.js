import {loadStore,deriveLeagueStatistics,clubStatistics,formatPoints,crest} from './data-store.js';
import {clubAssets,OTHER_TEAM_ASSETS,FALLBACK_ASSET} from './asset-map.js';
import {readPreferences,mountProfile,savePreferences} from './profile.js';
import {normalizeNavigation} from './navigation.js';
import {CLUB_EDITORIAL,OTHER_TEAM_HISTORY} from './club-historical.js';
import {publicCompetitionLabel} from './public-labels.js';

const $=id=>document.getElementById(id),rawId=new URLSearchParams(location.search).get('id'),numericId=Number(rawId),fmt=value=>value==null?'—':formatPoints(value),count=value=>value==null?'—':String(value);
const statRow=(label,value,meta='')=>`<div class="record-row-compact"><span>${label}${meta?`<small>${meta}</small>`:''}</span><strong>${value}</strong></div>`;
const metric=(label,value)=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
const titleFor=(store,entry)=>store.stateDoc.conquistas?.[entry.official_name]||store.stateDoc.conquistas?.[entry.short_name]||[];

function paintFavorite(preferences,id){const favorite=String(preferences.favoriteTeamId)===String(id);$('favoritePill').hidden=!favorite;$('setFavorite').hidden=favorite;}
function renderHistorical(asset,preferences){
  const info=OTHER_TEAM_HISTORY[asset.team_id];document.title=`${asset.name} — Premier League IOS`;$('clubKind').textContent=info.kind;$('clubName').textContent=asset.name;$('owner').textContent='Indisponível';$('heroCrest').src=asset.logo;$('heroCrest').alt=`Logo ${asset.name}`;
  if(asset.mascot){$('heroMascot').src=asset.mascot;$('heroMascot').alt=`Mascote ${asset.name}`;$('heroMascot').hidden=false;}
  $('currentSeason').innerHTML='<div class="limited-note">Este clube não participa das classificações atuais. Dados históricos limitados.</div>';$('automaticStats').innerHTML='<div class="limited-note">Estatísticas detalhadas indisponíveis.</div>';$('recentRounds').innerHTML='<div class="limited-note">Nenhuma rodada oficial atual aplicável.</div>';$('titleList').innerHTML='<div class="limited-note">Nenhum título oficial registrado.</div>';$('clubRecords').innerHTML='<div class="limited-note">Recordes detalhados indisponíveis.</div>';$('historyCopy').textContent=info.history;$('lineupLink').hidden=true;
  $('setFavorite').onclick=()=>{preferences=savePreferences({...preferences,favoriteTeamId:asset.team_id});paintFavorite(preferences,asset.team_id);};paintFavorite(preferences,asset.team_id);$('clubHero').classList.remove('data-loading');$('clubHero').classList.add('data-enter');
}
function renderActive(store,entry,projection,preferences){
  const stats=clubStatistics(store,entry.team_id,projection),assets=clubAssets(entry.team_id),titles=titleFor(store,entry);
  document.title=`${entry.official_name} — Premier League IOS`;$('clubKind').textContent='Clube atual · Premier League IOS';$('clubName').textContent=entry.official_name;$('owner').textContent=entry.responsible||'Indisponível';$('heroCrest').src=crest(entry);$('heroCrest').alt=`Logo ${entry.official_name}`;
  if(assets.mascot){$('heroMascot').src=assets.mascot;$('heroMascot').alt=`Mascote ${entry.official_name}`;$('heroMascot').hidden=false;}
  $('metricGrid').innerHTML=[metric('Posição PC/2',stats?.pc2Position?`${stats.pc2Position}º`:'—'),metric('Jogos',count(stats?.played)),metric('Vitórias',count(stats?.wins)),metric('Derrotas',count(stats?.losses)),metric('Empates',count(stats?.draws)),metric('Última pontuação',fmt(stats?.latestScore?.points))].join('');
  $('automaticStats').innerHTML=[statRow('Aproveitamento',stats?.rate==null?'—':`${stats.rate.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`),statRow('MVP',count(stats?.mvp)),statRow('MERDA',count(stats?.merda)),statRow('ZIKADO',count(stats?.zikado)),statRow('Média',fmt(stats?.average))].join('');
  $('recentRounds').innerHTML=stats?.recentRounds.length?stats.recentRounds.map(row=>`<div class="recent-row"><span>R${row.round} · ${row.season}</span><strong>${fmt(row.points)}</strong><i class="result-token">${row.result||'—'}</i></div>`).join(''):'<div class="limited-note">Rodadas recentes indisponíveis.</div>';
  $('titleList').innerHTML=titles.length?titles.map(title=>`<div class="title-row"><i class="title-mark">◆</i><strong>${publicCompetitionLabel(title)}</strong></div>`).join(''):'<div class="limited-note">Nenhum título oficial registrado.</div>';
  const recordMeta=row=>row?`R${row.round??'—'} · ${row.season??'ano indisponível'}`:'';
  $('clubRecords').innerHTML=[statRow('Melhor pontuação',fmt(stats?.best?.points),recordMeta(stats?.best)),statRow('Pior pontuação',fmt(stats?.worst?.points),recordMeta(stats?.worst)),statRow('Média histórica',fmt(stats?.average)),statRow('MVPs',count(stats?.mvp))].join('');
  $('historyCopy').textContent=CLUB_EDITORIAL[entry.team_id]||'Conteúdo histórico detalhado indisponível.';
  $('setFavorite').onclick=()=>{preferences=savePreferences({...preferences,favoriteTeamId:entry.team_id});paintFavorite(preferences,entry.team_id);};paintFavorite(preferences,entry.team_id);$('clubHero').classList.remove('data-loading');$('clubHero').classList.add('data-enter');
}

normalizeNavigation();
try{
  const store=await loadStore(),entry=store.clubsById[numericId]||null,other=OTHER_TEAM_ASSETS.find(item=>item.team_id===rawId),projection=deriveLeagueStatistics(store);let preferences=readPreferences(store.clubs);
  mountProfile(store.clubs,preferences,next=>{preferences=next;paintFavorite(preferences,entry?.team_id||other?.team_id);});
  if(entry)renderActive(store,entry,projection,preferences);else if(other&&OTHER_TEAM_HISTORY[other.team_id])renderHistorical(other,preferences);else location.replace('times.html');
}catch(error){console.error('[PLIOS] Perfil do clube indisponível',error);$('clubName').textContent='Perfil temporariamente indisponível';$('heroCrest').src=FALLBACK_ASSET;}
