(function () {
  let preference = null;
  try { preference = JSON.parse(localStorage.getItem('plios.preferences.v1') || 'null'); } catch {}
  const validIds = new Set(['10000001','10000010','10000009','10000005','10000004','10000002','10000003','10000007','10000008','10000006','other:jotaventus','other:lurroma']);
  if (!String(preference?.name||'').trim() || !validIds.has(String(preference?.favoriteTeamId))) {
    document.documentElement.dataset.onboardingPending='true';
    return;
  }
  const id = String(preference.favoriteTeamId);
  const active = new Set(['10000001','10000010','10000009','10000005','10000004','10000002','10000003','10000007','10000008','10000006']);
  const others = {
    'other:jotaventus':['Jotaventus','jotaventus-logo.png'],
    'other:lurroma':['Lurroma','lurroma-logo-normalized.png']
  };
  const known = active.has(id) ? [preference.name || 'Seu time', `${id}-logo.png`] : others[id];
  if (!known) return;
  function paint() {
    const button = document.getElementById('profileButton') || document.querySelector('.profile-button');
    if (!button) return false;
    const image = button.querySelector('img');
    const name = document.getElementById('profileName') || button.querySelector('span');
    if (image) { image.src=`assets/media/clubs/${known[1]}`;image.alt=`Escudo ${known[0]}`;image.width=35;image.height=35; }
    if (name) name.textContent=String(preference.name || known[0]);
    button.classList.remove('preference-empty');
    document.documentElement.dataset.favoriteReady='true';
    return true;
  }
  if (paint()) return;
  const observer = new MutationObserver(() => { if (paint()) observer.disconnect(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
