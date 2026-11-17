import {loadStore,allScoreRecords,club,crest} from './data-store.js';

const $=id=>document.getElementById(id);
const format=value=>Number(value).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2});

try{
  const store=await loadStore();
  const records=allScoreRecords(store).map(record=>({...record,year:Number(record.season),points:Number(record.points)}));
  const clubs=new Map(store.clubs.map(team=>[Number(team.team_id),team]));
  const favorite=(()=>{try{return Number(JSON.parse(localStorage.getItem('plios.preferences.v1')||'{}').favoriteTeamId)||null}catch{return null}})();
  const team=id=>club(store,id)||{official_name:'Clube histórico',short_name:'Clube histórico'};
  const logo=id=>crest(team(id));
  const topCard=(record,index)=>{const item=team(record.teamId);return `<article class="record-card"><span class="place">#${index+1}</span><div class="record-points">${format(record.points)}</div><div class="record-team"><img src="${logo(record.teamId)}" alt=""><strong>${item.official_name}</strong></div><div class="record-meta">${record.competition} · R${record.round} · ${record.year}</div></article>`;};
  $('recordTop').innerHTML=records.slice(0,3).map(topCard).join('');
  const count=document.createElement('p');count.id='recordsCount';count.className='records-count';count.textContent=`${records.length} pontuações individuais registradas — da maior à pior.`;document.querySelector('#panel-recordes .panel-head')?.append(count);
  const yearFilter=$('yearFilter'),clubFilter=$('clubFilter'),competitionFilter=$('competitionFilter');
  yearFilter.innerHTML='<option value="">Todos os anos</option>'+[...new Set(records.map(item=>item.year))].sort((a,b)=>a-b).map(value=>`<option>${value}</option>`).join('');
  clubFilter.innerHTML='<option value="">Todos os clubes</option>'+[...clubs.values()].sort((a,b)=>a.official_name.localeCompare(b.official_name,'pt-BR')).map(item=>`<option value="${item.team_id}">${item.short_name}</option>`).join('');
  competitionFilter.innerHTML='<option value="">Todas as competições</option>'+[...new Set(records.map(item=>item.competition))].sort().map(value=>`<option>${value}</option>`).join('');
  let visible=25;
  function filtered(){return records.filter(item=>(!yearFilter.value||String(item.year)===yearFilter.value)&&(!clubFilter.value||item.teamId===Number(clubFilter.value))&&(!competitionFilter.value||item.competition===competitionFilter.value));}
  function paint(){const list=filtered();$('recordsList').innerHTML=list.slice(0,visible).map((record,index)=>{const item=team(record.teamId);return `<article class="record-row ${record.teamId===favorite?'favorite':''}"><span class="rank">#${index+1}</span><span class="points">${format(record.points)}</span><div class="table-club"><img src="${logo(record.teamId)}" alt=""><strong>${item.official_name}</strong></div><span class="competition">${record.competition} · R${record.round} · ${record.year}</span></article>`;}).join('')||'<div class="record-row">Nenhum registro para este filtro.</div>';$('loadMore').hidden=visible>=list.length;$('loadMore').textContent=`Carregar mais (${Math.min(visible,list.length)} de ${list.length})`;}
  $('loadMore').onclick=()=>{visible+=25;paint();};[yearFilter,clubFilter,competitionFilter].forEach(control=>control.onchange=()=>{visible=25;paint();});paint();
  document.documentElement.dataset.recordsProjection='ready';
}catch(error){console.error('[PLIOS] Histórico completo de pontuações indisponível',error);}
