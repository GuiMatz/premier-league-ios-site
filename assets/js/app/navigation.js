export const NAV = Object.freeze({
  'Início':'home-page.html', 'Ligas':'temporada-2026.html', 'Parciais':'rodadas.html',
  'Escalações':'escalacoes.html', 'Palpites':'palpites.html',
  'Estatísticas':'estatisticas.html', 'Times':'times.html'
});

export function competitionClassificationUrl(competition, season) {
  const params = new URLSearchParams({competition, season:String(season), view:'classification'});
  return `competicao.html?${params.toString()}`;
}
export const pc2ClassificationUrl = (season=2026) => competitionClassificationUrl('pc2', season);

const prefetched = new Set();
function prefetch(link) {
  if (!link || link.origin !== location.origin || !link.pathname.endsWith('.html')) return;
  const href = link.href.split('#')[0];
  if (href === location.href.split('#')[0] || prefetched.has(href)) return;
  prefetched.add(href);
  const hint = document.createElement('link'); hint.rel = 'prefetch'; hint.as = 'document'; hint.href = href;
  document.head.append(hint);
}
function installRoutePrefetch() {
  if (document.documentElement.dataset.prefetchReady) return;
  document.documentElement.dataset.prefetchReady = 'true';
  const route = event => {
    const anchor = event.target.closest?.('.desktop-nav a,.mobile-nav a,.mobile-more-menu a,.brand');
    if (anchor) prefetch(new URL(anchor.href, location.href));
  };
  document.addEventListener('pointerover', route, {passive:true});
  document.addEventListener('touchstart', route, {passive:true});
}
export function normalizeNavigation() {
  try {
    if (sessionStorage.getItem('plios.predict.market') === 'open') {
      document.querySelectorAll('[data-predict-nav]').forEach(link => link.classList.add('predict-open'));
    }
  } catch {}
  installRoutePrefetch();
}
export function paintPredictNavigation(market) {
  const open = market?.isOpen === true;
  try { sessionStorage.setItem('plios.predict.market',open?'open':market?.isOpen===false?'closed':'unavailable'); } catch {}
  document.querySelectorAll('[data-predict-nav]').forEach(link => {
    link.classList.toggle('predict-open', open);
    link.setAttribute('aria-label', open ? 'Palpites abertos' : 'Palpites');
  });
}
