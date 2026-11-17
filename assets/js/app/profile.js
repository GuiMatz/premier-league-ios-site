import {OTHER_TEAM_ASSETS,clubAssets} from './asset-map.js';

const KEY='plios.preferences.v1';
const LEGACY_KEYS=['pliosProfile','pli_visual_profile','plios-profile'];
const OTHER_IDS=new Set(['other:jotaventus','other:lurroma']);
const OTHERS=OTHER_TEAM_ASSETS.filter(team=>OTHER_IDS.has(team.team_id));
const readJson=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const favoriteKey=value=>String(value||'').startsWith('other:')?String(value):(Number(value)||null);
export const LOCAL_PREFERENCE_NOTE='Essas preferências ficam somente neste dispositivo.';

export function readStoredPreferences(){
  const current=readJson(KEY);
  return current&&typeof current==='object'?{name:String(current.name||'').trim(),favoriteTeamId:favoriteKey(current.favoriteTeamId)}:{name:'',favoriteTeamId:null};
}

export function readPreferences(clubs){
  const ids=new Set([...clubs.map(club=>club.team_id),...OTHERS.map(club=>club.team_id)]),current=readJson(KEY),currentFavorite=favoriteKey(current?.favoriteTeamId);
  if(current&&ids.has(currentFavorite))return{name:String(current.name||'').trim(),favoriteTeamId:currentFavorite};
  let name='',favoriteTeamId=Number(localStorage.getItem('pli_selected_team')||localStorage.getItem('memibet_my_team'));
  for(const key of LEGACY_KEYS){const value=readJson(key);if(!name&&value?.name)name=String(value.name);if(!ids.has(favoriteTeamId)&&ids.has(Number(value?.favoriteTeamId)))favoriteTeamId=Number(value.favoriteTeamId);}
  if(!ids.has(favoriteTeamId))favoriteTeamId=null;
  if(name&&favoriteTeamId){const migrated={name:name.trim(),favoriteTeamId};localStorage.setItem(KEY,JSON.stringify(migrated));return migrated;}
  return{name:'',favoriteTeamId:null};
}

export function savePreferences(value){
  const clean={name:String(value.name||'').trim(),favoriteTeamId:favoriteKey(value.favoriteTeamId)};
  localStorage.setItem(KEY,JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent('plios:preferences',{detail:clean}));
  return clean;
}

export function mountProfile(activeClubs,initial,onChange=()=>{}){
  const all=[...activeClubs,...OTHERS],button=document.getElementById('profileButton')||document.querySelector('.profile-button');if(!button)return;
  if(document.querySelector('.profile-dialog[data-profile-local]'))return;
  button.id='profileButton';
  let image=button.querySelector('img');if(!image){image=document.createElement('img');button.prepend(image);}
  let name=document.getElementById('profileName')||button.querySelector('span'),preferences=initial,returnFocus=null;
  const dialog=document.createElement('section');
  dialog.className='profile-dialog';dialog.dataset.profileLocal='true';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','profileWelcomeTitle');
dialog.innerHTML=`<form class="profile-form" novalidate><div class="onboarding-visual" data-od-id="login-tiger-panel"><span class="login-atmosphere" aria-hidden="true"></span><img class="onboarding-tiger" src="assets/media/login/tiger-login.png" alt="Tigre adulto em iluminação esportiva azul" width="1536" height="1024"><img class="smoke-front smoke-front-01" src="assets/media/login/smoke-front-01.png" alt="" aria-hidden="true" width="1664" height="936"><div class="tiger-copy"><small>Temporada 2026</small><strong>Premier League IOS</strong><p>Onde cada rodada vira história.</p></div></div><div class="profile-form-content" data-od-id="login-form-panel"><div class="login-brand"><img src="assets/images/league-logo.png" alt="Logo Premier League IOS" width="48" height="48"><div><strong>Premier League IOS</strong><span>Temporada 2026</span></div></div><div class="profile-form-head"><div><span>Primeiro acesso</span><h2 id="profileWelcomeTitle">Bem-vindo à liga.</h2><p>Monte seu perfil para continuar. ${LOCAL_PREFERENCE_NOTE}</p></div><button type="submit" value="cancel" aria-label="Fechar">×</button></div><label for="profileLocalName">Seu nome</label><input id="profileLocalName" name="name" maxlength="32" autocomplete="name" placeholder="Como devemos chamar você" required aria-describedby="profileLocalError"><fieldset><legend>Escolha seu time favorito</legend><div class="club-picker"></div></fieldset><p class="profile-error" id="profileLocalError" role="alert" aria-live="polite" hidden>Informe seu nome e escolha um clube.</p><div class="profile-actions"><button class="profile-save" value="default" data-od-id="login-submit">Entrar na liga</button></div></div></form>`;
  document.body.append(dialog);
  const clubImage=club=>club.crest||club.logo||(!String(club.team_id).startsWith('other:')?clubAssets(club.team_id).logo:'assets/images/league-logo.png');
  const choice=club=>`<label><input type="radio" name="favoriteTeamId" value="${club.team_id}" required aria-describedby="profileLocalError"><span><img src="${clubImage(club)}" alt=""><b>${club.short_name||club.name||club.official_name}</b></span></label>`;
  dialog.querySelector('.club-picker').innerHTML=`<h3>Times atuais</h3>${activeClubs.map(choice).join('')}<h3>Outros Times</h3>${OTHERS.map(choice).join('')}`;
  const updateValidity=()=>{const nameInput=dialog.querySelector('[name="name"]'),validName=nameInput.value.trim().length>0,validTeam=Boolean(dialog.querySelector('[name="favoriteTeamId"]:checked'));dialog.querySelector('.profile-save').disabled=!(validName&&validTeam);nameInput.removeAttribute('aria-invalid');dialog.querySelector('.profile-error').hidden=true;};
  dialog.addEventListener('input',updateValidity);dialog.addEventListener('change',updateValidity);
  dialog.querySelector('[name="name"]').addEventListener('blur',event=>{if(event.target.value.trim())return;event.target.setAttribute('aria-invalid','true');const error=dialog.querySelector('.profile-error');error.textContent='Informe seu nome para continuar.';error.hidden=false;});
  function paint(){const selected=all.find(club=>String(club.team_id)===String(preferences.favoriteTeamId));name.textContent=selected?(preferences.name||selected.short_name||selected.name):'Criar perfil';image.src=selected?clubImage(selected):'assets/images/league-logo.png';image.alt=selected?`Logo ${selected.official_name||selected.name}`:'Nenhum time selecionado';button.classList.toggle('preference-empty',!selected);}
  function closeProfile({restoreFocus=true}={}){dialog.hidden=true;document.documentElement.classList.remove('onboarding-open','profile-editing-open');button.setAttribute('aria-expanded','false');dialog.classList.remove('login-leaving','login-ready');dialog.querySelector('.profile-save').disabled=false;if(restoreFocus)queueMicrotask(()=>returnFocus?.focus());}
  function open(){returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:button;dialog.querySelector('[name="name"]').value=preferences.name||'';const radio=dialog.querySelector(`[value="${preferences.favoriteTeamId}"]`);if(radio)radio.checked=true;dialog.querySelector('.profile-save').textContent=preferences.name?'Salvar alterações':'Entrar na liga';dialog.querySelector('[value="cancel"]').hidden=!preferences.name||!preferences.favoriteTeamId;const editing=Boolean(preferences.name&&preferences.favoriteTeamId);dialog.classList.toggle('profile-editing',editing);updateValidity();dialog.hidden=false;document.documentElement.classList.add('onboarding-open');document.documentElement.classList.toggle('profile-editing-open',editing);button.setAttribute('aria-expanded','true');dialog.classList.add('ui-enter','ui-fade','login-ready');queueMicrotask(()=>dialog.querySelector('[name="name"]')?.focus());}
  button.addEventListener('click',open);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&preferences.name&&preferences.favoriteTeamId){closeProfile();return;}if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button:not([hidden]):not([disabled]),input:not([disabled])')].filter(item=>item.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});dialog.addEventListener('pointerdown',event=>{if(event.target===dialog&&dialog.classList.contains('profile-editing'))closeProfile();});
dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(event.submitter?.value==='cancel'){closeProfile();return;}const data=new FormData(event.currentTarget),next={name:data.get('name'),favoriteTeamId:favoriteKey(data.get('favoriteTeamId'))},nameInput=dialog.querySelector('[name="name"]'),error=dialog.querySelector('.profile-error');if(!String(next.name).trim()||!next.favoriteTeamId){nameInput.setAttribute('aria-invalid',String(!String(next.name).trim()));error.textContent=!String(next.name).trim()?'Informe seu nome para continuar.':'Escolha um time favorito para continuar.';error.hidden=false;if(!String(next.name).trim())nameInput.focus();else dialog.querySelector('[name="favoriteTeamId"]')?.focus();return;}nameInput.removeAttribute('aria-invalid');error.hidden=true;const isFirstEntry=!preferences.name||!preferences.favoriteTeamId;preferences=savePreferences(next);const finish=()=>{delete document.documentElement.dataset.onboardingPending;paint();closeProfile();onChange(preferences);};if(!isFirstEntry){finish();return;}const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;dialog.classList.add('login-leaving');dialog.querySelector('.profile-save').disabled=true;setTimeout(finish,reduced?120:420);});
  const sync=event=>{preferences=event.detail||readPreferences(activeClubs);paint();onChange(preferences);};window.addEventListener('plios:preferences',sync);window.addEventListener('storage',event=>{if(event.key===KEY)sync({detail:readPreferences(activeClubs)});});paint();if(!preferences.name||!preferences.favoriteTeamId)queueMicrotask(open);
}
