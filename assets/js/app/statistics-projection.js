import { loadStore, deriveLeagueStatistics, club, crest } from './data-store.js';
import { finishRegionLoading } from './public-shell.js';

const $ = id => document.getElementById(id);
const format = value => Number(value).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2});

function tableRows(store, rows, favoriteId, mode) {
  return rows.map((row,index) => {
    const team=club(store,row.teamId),rate=row.played?row.wins/row.played*100:0;
    return `<tr class="${row.teamId===favoriteId?'favorite':''}"><td class="rank">${index+1}º</td><td><div class="table-club"><img src="${crest(team)}" alt=""><strong>${team?.official_name||'Clube indisponível'}${row.teamId===favoriteId?' <span class="favorite-star" aria-label="Seu time favorito">★</span>':''}</strong></div></td>${mode==='rate'?`<td>${row.wins}</td><td>${row.played}</td><td class="rate-cell"><span class="rate-value">${format(rate)}%</span><div class="rate-track" aria-hidden="true"><div class="rate-fill" style="width:${rate}%"></div></div></td>`:`<td>${row.played}</td><td class="main-number">${row[mode]}</td>`}</tr>`;
  }).join('');
}

function rankingBlock(store, rows, favoriteId, field) {
  const sorted=[...rows].sort((a,b)=>b[field]-a[field]||a.teamId-b.teamId);
  return `<div class="podium">${sorted.slice(0,3).map((row,index)=>{const team=club(store,row.teamId);return `<article class="podium-card ${index===0?'first':''}"><span class="podium-position">${index+1}º</span><img src="${crest(team)}" alt=""><strong>${team?.short_name||'—'}${row.teamId===favoriteId?' <span class="favorite-star">★</span>':''}</strong><b>${row[field]}</b></article>`;}).join('')}</div><div class="ranking-card"><table class="ranking-table"><thead><tr><th>Pos.</th><th>Clube</th><th>Jogos</th><th>${field==='mvp'?'MVPs':field==='merda'?'Ocorrências':'Zikado'}</th></tr></thead><tbody>${tableRows(store,sorted,favoriteId,field)}</tbody></table></div>`;
}

try {
  const store=await loadStore(),projection=deriveLeagueStatistics(store);
  const favoriteId=(()=>{try{return Number(JSON.parse(localStorage.getItem('plios.preferences.v1')||'{}').favoriteTeamId)||null}catch{return null}})();
  const leader=field=>[...projection.rows].sort((a,b)=>b[field]-a[field]||a.teamId-b.teamId)[0];
  const featureRows=[[leader('wins'),'Mais vitórias','wins'],[leader('mvp'),'Mais MVPs','mvp'],[leader('merda'),'Mais MERDA','merda'],[leader('zikado'),'Mais ZIKADO','zikado']];
  $('generalFeatures').innerHTML=featureRows.filter(([row])=>row).map(([row,label,field],index)=>{const team=club(store,row.teamId);return `<article class="feature ${index===0?'primary':''}"><span class="feature-label">${label}</span><div class="feature-club"><img src="${crest(team)}" alt=""><strong>${team?.short_name||'Clube indisponível'}${row.teamId===favoriteId?' <span class="favorite-star" aria-label="Seu time favorito">★</span>':''}</strong></div><div><div class="feature-value">${row[field]}</div><small>Histórico oficial projetado</small></div></article>`;}).join('');
  const favorite=projection.rows.find(row=>row.teamId===favoriteId),favoriteTeam=favorite?club(store,favorite.teamId):null;
  $('favoriteSummary').innerHTML=favorite?`<img src="${crest(favoriteTeam)}" alt="Escudo ${favoriteTeam?.official_name||''}"><div><span class="global-label">★ Seu time</span><h3>${favoriteTeam?.official_name||'Clube favorito'}</h3></div><div class="fav-metric"><span>Jogos</span><strong>${favorite.played}</strong></div><div class="fav-metric"><span>Vitórias</span><strong>${favorite.wins}</strong></div><div class="fav-metric"><span>MVP</span><strong>${favorite.mvp}</strong></div><div class="fav-metric"><span>Aproveitamento</span><strong>${favorite.played?format(favorite.wins/favorite.played*100):'—'}${favorite.played?'%':''}</strong></div>`:'<p>Escolha seu time para acompanhar o resumo pessoal.</p>';
  finishRegionLoading($('generalFeatures'));finishRegionLoading($('favoriteSummary'));
  $('winsTable').innerHTML=tableRows(store,[...projection.rows].sort((a,b)=>b.wins-a.wins),favoriteId,'wins');
  $('rateTable').innerHTML=tableRows(store,[...projection.rows].sort((a,b)=>(b.played?b.wins/b.played:0)-(a.played?a.wins/a.played:0)),favoriteId,'rate');
  $('mvpRanking').innerHTML=rankingBlock(store,projection.rows,favoriteId,'mvp');
  $('merdaRanking').innerHTML=rankingBlock(store,projection.rows,favoriteId,'merda');
  $('zikadoRanking').innerHTML=rankingBlock(store,projection.rows,favoriteId,'zikado');
  $('mvpTotal').textContent=`${projection.rows.reduce((sum,row)=>sum+row.mvp,0)} MVPs no histórico oficial projetado até as rodadas finalizadas.`;
  document.querySelectorAll('[role="tabpanel"]').forEach(panel=>panel.classList.add('data-enter'));
  document.documentElement.dataset.statisticsProjection='ready';
} catch(error) {
  console.error('[PLIOS] Projeção automática de estatísticas indisponível',error);
}
