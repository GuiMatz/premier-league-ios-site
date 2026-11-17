(function(){
  'use strict';
  var KEY='plios.theme.v1';
  var root=document.documentElement;
  function savedTheme(){
    try{var saved=localStorage.getItem(KEY);return saved==='light'?'light':'dark';}catch(_){return 'dark';}
  }
  function paint(theme,persist){
    theme=theme==='dark'?'dark':'light';
    root.dataset.colorTheme=theme;
    root.style.colorScheme=theme;
    if(persist){try{localStorage.setItem(KEY,theme);}catch(_){}}
    var button=document.getElementById('themeToggle');
    if(button){
      button.textContent=theme==='dark'?'☀️':'🌙';
      button.setAttribute('aria-label',theme==='dark'?'Ativar modo claro':'Ativar modo escuro');
      button.setAttribute('title',theme==='dark'?'Ativar modo claro':'Ativar modo escuro');
      button.setAttribute('aria-pressed',String(theme==='dark'));
    }
  }
  function mount(){
    if(document.getElementById('themeToggle'))return;
    var button=document.createElement('button');
    button.id='themeToggle';
    button.className='theme-toggle';
    button.type='button';
    button.setAttribute('data-od-id','theme-toggle');
    button.addEventListener('click',function(){paint(root.dataset.colorTheme==='dark'?'light':'dark',true);});
    document.body.appendChild(button);
    paint(root.dataset.colorTheme||'dark',false);
  }
  paint(savedTheme(),false);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.addEventListener('storage',function(event){if(event.key===KEY)paint(event.newValue==='light'?'light':'dark',false);});
})();
