const main=document.querySelector('main');
document.querySelectorAll('.page-note').forEach(note=>note.remove());
if(main&&!main.querySelector('.public-footer')){const footer=document.createElement('footer');footer.className='public-footer';footer.textContent='© 2026 Premier League IOS.';main.append(footer);}

export function animateDataRegion(region,kind='ui-rise'){if(!region)return;region.classList.remove('data-loading','ui-enter','ui-fade','ui-rise');requestAnimationFrame(()=>region.classList.add('ui-enter',kind));}
export function setRegionLoading(region,label='Carregando dados...'){if(!region)return;region.classList.remove('ui-enter','ui-fade','ui-rise');region.classList.add('data-loading','ui-loading');region.setAttribute('aria-busy','true');region.dataset.loadingLabel=label;}
export function finishRegionLoading(region){if(!region)return;region.removeAttribute('aria-busy');region.classList.remove('ui-loading');animateDataRegion(region);}
export function setButtonLoading(button,loading,label='Atualizar'){if(!button)return;button.disabled=loading;button.classList.toggle('is-refreshing',loading);button.setAttribute('aria-busy',String(loading));if(!button.dataset.idleLabel)button.dataset.idleLabel=button.textContent.trim();button.textContent=loading?'↻ Atualizando…':button.dataset.idleLabel||label;}
export function relativeUpdateLabel(date){if(!(date instanceof Date)||Number.isNaN(date.valueOf()))return 'Atualização indisponível';const seconds=Math.max(0,Math.floor((Date.now()-date.valueOf())/1000));if(seconds<10)return 'Atualizado agora';if(seconds<60)return `Atualizado há ${seconds}s`;const minutes=Math.floor(seconds/60);return minutes===1?'Atualizado há 1 min':`Atualizado há ${minutes} min`;}
export function bindRelativeTime(element,getDate){if(!element)return()=>{};const paint=()=>{const date=typeof getDate==='function'?getDate():getDate;if(!(date instanceof Date)||Number.isNaN(date.valueOf()))return;element.textContent=relativeUpdateLabel(date)};paint();const timer=setInterval(paint,15000);return()=>clearInterval(timer);}
export function flashUpdated(element){if(!element)return;element.classList.remove('ui-updated');requestAnimationFrame(()=>element.classList.add('ui-updated'));setTimeout(()=>element.classList.remove('ui-updated'),420);}

document.addEventListener('error',event=>{const image=event.target;if(!(image instanceof HTMLImageElement)||image.dataset.fallbackApplied)return;image.dataset.fallbackApplied='true';image.src='assets/images/league-logo.png';image.classList.add('image-fallback');},true);
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-tooltip]');document.querySelectorAll('[data-tooltip].tooltip-open').forEach(item=>{if(item!==trigger)item.classList.remove('tooltip-open')});if(trigger){event.preventDefault();trigger.classList.toggle('tooltip-open');trigger.setAttribute('aria-expanded',String(trigger.classList.contains('tooltip-open')));}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('[data-tooltip].tooltip-open').forEach(item=>{item.classList.remove('tooltip-open');item.setAttribute('aria-expanded','false')});});

const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets=[...document.querySelectorAll('main > section, main > .section')].slice(1);
if(!reduceMotion&&'IntersectionObserver' in window){
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('is-revealed');revealObserver.unobserve(entry.target);}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  revealTargets.forEach(target=>{target.classList.add('reveal-on-scroll');revealObserver.observe(target);});
}else revealTargets.forEach(target=>target.classList.add('is-revealed'));

const paintScrollState=()=>document.documentElement.toggleAttribute('data-scrolled',scrollY>24);
addEventListener('scroll',paintScrollState,{passive:true});paintScrollState();
