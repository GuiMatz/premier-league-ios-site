import {loadStore,crest,deriveLeagueStatistics,clubStatistics,formatPoints} from './data-store.js';
import {readPreferences,mountProfile} from './profile.js';
import {normalizeNavigation} from './navigation.js';
import {clubAssets,OTHER_TEAM_ASSETS,FALLBACK_ASSET} from './asset-map.js';
import {publicCompetitionLabel} from './public-labels.js';

const grid=document.getElementById('clubGrid'),search=document.getElementById('clubSearch');
const SELECTABLE_OTHER_IDS=new Set(['other:jotaventus','other:lurroma']);
const alphabetic=(a,b)=>String(a.official_name||a.name).localeCompare(String(b.official_name||b.name),'pt-BR');
let store,preferences,projection,filter='';

function compactTitle(title){return publicCompetitionLabel(title).replace('Premier League IOS','PL').replace('Copa IOS','Copa').replace('IOS World Cup','IWC').replace('IOS Club World Cup','ICWC');}
function titlesFor(entry){return store.stateDoc.conquistas?.[entry.official_name]||store.stateDoc.conquistas?.[entry.short_name]||[];}
function titleBadges(entry){const titles=titlesFor(entry);return `<div class="title-badges" aria-label="Títulos">${titles.length?titles.map(title=>`<span class="title-badge">${compactTitle(title)}</span>`).join(''):'<span class="title-badge empty">Sem título registrado</span>'}</div>`;}
function currentCard(entry){
  const favorite=Number(entry.team_id)===Number(preferences.favoriteTeamId),assets=clubAssets(entry.team_id),stats=clubStatistics(store,entry.team_id,projection);
  const quick=stats?.pc2Position?`${stats.pc2Position}º no PC/2`:stats?.latestScore?`Última: ${formatPoints(stats.latestScore.points)} pts`:'Temporada sem posição disponível';
  return `<a class="club-card club-card-simple${favorite?' favorite':''}" href="clube.html?id=${entry.team_id}" data-team-name="${entry.official_name}" data-od-id="club-card-${entry.team_id}">${favorite?'<span class="favorite-badge">Seu time</span>':''}<div class="club-identity"><img class="club-logo" src="${crest(entry)}" alt="Logo ${entry.official_name}"><div><h3>${entry.official_name}</h3><span>Presidente · ${entry.responsible||'Indisponível'}</span></div></div><img class="club-mascot-secondary" src="${assets.mascot||FALLBACK_ASSET}" alt="${assets.mascot?`Mascote ${entry.official_name}`:'Mascote indisponível'}" loading="lazy"><p class="season-brief">${quick}</p>${titleBadges(entry)}<span class="club-card-action">Ver time →</span></a>`;
}
function otherCard(team){const descriptions={'other:jotaventus':'Participação histórica · 2024','other:lurroma':'Participação histórica · 2024'};return `<a class="other-team-card ${String(preferences.favoriteTeamId)===team.team_id?'favorite':''}" href="clube.html?id=${encodeURIComponent(team.team_id)}" data-team-name="${team.name}"><div><img src="${team.mascot||FALLBACK_ASSET}" alt="${team.mascot?`Mascote ${team.name}`:'Mascote indisponível'}" loading="lazy"><img src="${team.logo}" alt="Logo ${team.name}"></div><strong>${team.name}</strong><span>${descriptions[team.team_id]}</span></a>`;}
function render(){
  const query=filter.toLocaleLowerCase('pt-BR'),clubs=[...store.clubs].sort(alphabetic).filter(entry=>`${entry.official_name} ${entry.responsible||''}`.toLocaleLowerCase('pt-BR').includes(query));
  grid.classList.remove('data-loading','data-enter');grid.innerHTML=clubs.map(currentCard).join('')||'<div class="empty">Nenhum clube encontrado.</div>';requestAnimationFrame(()=>grid.classList.add('data-enter'));
  const others=document.getElementById('otherTeams'),selectable=OTHER_TEAM_ASSETS.filter(team=>SELECTABLE_OTHER_IDS.has(team.team_id)).sort(alphabetic);
  others.innerHTML=`<div class="section-head"><div><span class="eyebrow">Arquivo de clubes</span><h2>Outros Times</h2><p>Fora das classificações atuais; perfis históricos preservados.</p></div></div><div class="other-grid">${selectable.map(otherCard).join('')}</div>`;
}
normalizeNavigation();
try{store=await loadStore();projection=deriveLeagueStatistics(store);preferences=readPreferences(store.clubs);mountProfile(store.clubs,preferences,next=>{preferences=next;render()});search?.addEventListener('input',event=>{filter=event.target.value;render()});render();}
catch(error){console.error('[PLIOS] Times indisponíveis',error);grid.innerHTML='<div class="empty">Dados temporariamente indisponíveis.</div>';}
