import {animateDataRegion} from './public-shell.js';

const tabs=[...document.querySelectorAll('[role="tab"]')],panels=[...document.querySelectorAll('[role="tabpanel"]')];
const valid=new Set(tabs.map(tab=>tab.dataset.tab));
function activate(id,{historyMode='replace',focus=false}={}){
  if(!valid.has(id))id='geral';
  const selected=tabs.find(tab=>tab.dataset.tab===id);
  tabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab===selected)));
  panels.forEach(panel=>{const active=panel.id===`panel-${id}`;panel.hidden=!active;if(active)animateDataRegion(panel,'ui-fade')});
  if(focus)selected?.focus();
  const url=new URL(location.href);url.searchParams.set('tab',id);history[historyMode==='push'?'pushState':'replaceState']({tab:id},'',url);
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab.dataset.tab,{historyMode:'push'}));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activate(tabs[next].dataset.tab,{historyMode:'push',focus:true})})});
window.addEventListener('popstate',()=>activate(new URLSearchParams(location.search).get('tab')||'geral'));
activate(new URLSearchParams(location.search).get('tab')||'geral');

const definitions={mvp:'Melhor pontuação individual da rodada entre os clubes.',merda:'Menor pontuação individual da rodada, conforme a regra histórica da liga.',zikado:'Registro histórico de Zikado conforme as regras oficiais da liga.'};
for(const [id,text] of Object.entries(definitions)){const heading=document.querySelector(`#panel-${id} h2`);if(!heading)continue;const tip=document.createElement('button');tip.type='button';tip.dataset.tooltip=text;tip.setAttribute('aria-label',`O que significa ${id.toUpperCase()}?`);tip.setAttribute('aria-expanded','false');tip.textContent='?';heading.append(' ',tip)}
