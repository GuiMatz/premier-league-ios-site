(function () {
  const desktopItems = [
    ['Início', 'home-page.html'], ['Ligas', 'temporada-2026.html'],
    ['Parciais', 'rodadas.html'], ['Escalações', 'escalacoes.html'],
    ['Palpites', 'palpites.html'], ['Estatísticas', 'estatisticas.html'],
    ['Times', 'times.html']
  ];
  const mobileItems = [
    ['Início', 'home-page.html', '⌂'], ['Parciais', 'rodadas.html', '◉'],
    ['Escalações', 'escalacoes.html', 'XI'], ['Palpites', 'palpites.html', '?']
  ];
  const aliases = { 'ligas.html':'temporada-2026.html', 'parciais.html':'rodadas.html' };
  const rawCurrent = (location.pathname.split('/').pop() || 'home-page.html').toLowerCase();
  const current = aliases[rawCurrent] || rawCurrent;
  const isCurrent = href => href.toLowerCase() === current;
  function link(label, href, symbol) {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    if (symbol) a.dataset.symbol = symbol;
    if (label === 'Palpites') { a.dataset.predictNav = 'true'; a.dataset.symbol = '?'; }
    if (isCurrent(href)) a.setAttribute('aria-current', 'page');
    return a;
  }
  function ensureMoreMenu(nav) {
    if (document.querySelector('.mobile-more-menu')) return;
    const menu = document.createElement('div');
    menu.className = 'mobile-more-menu'; menu.id = 'mobileMoreMenu'; menu.hidden = true;
    menu.setAttribute('aria-label', 'Mais destinos');
    [['Ligas','temporada-2026.html'],['Estatísticas','estatisticas.html'],['Times','times.html']]
      .forEach(item => menu.append(link(item[0], item[1])));
    nav.before(menu);
  }
  function paint(root = document) {
    root.querySelectorAll?.('.desktop-nav').forEach(nav => {
      if (nav.dataset.architecture === 'simplified') return;
      nav.replaceChildren(...desktopItems.map(item => link(item[0], item[1])));
      nav.dataset.architecture = 'simplified';
    });
    root.querySelectorAll?.('.mobile-nav').forEach(nav => {
      if (nav.dataset.architecture === 'simplified') return;
      const more = document.createElement('button');
      more.type = 'button'; more.textContent = 'Mais'; more.dataset.symbol = '•••';
      more.setAttribute('aria-controls', 'mobileMoreMenu'); more.setAttribute('aria-expanded', 'false');
      if (['temporada-2026.html','estatisticas.html','times.html'].includes(current)) more.setAttribute('aria-current','page');
      nav.replaceChildren(...mobileItems.map(item => link(item[0], item[1], item[2])), more);
      nav.dataset.architecture = 'simplified'; ensureMoreMenu(nav);
    });
  }
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) paint(node);
  })));
  observer.observe(document.documentElement, { childList:true, subtree:true }); paint();
  document.addEventListener('DOMContentLoaded', () => {
    paint(); observer.disconnect();
    document.addEventListener('click', event => {
      const button = event.target.closest('.mobile-nav button[aria-controls="mobileMoreMenu"]');
      const menu = document.getElementById('mobileMoreMenu');
      if (button && menu) {
        const open = menu.hidden; menu.hidden = !open; button.setAttribute('aria-expanded', String(open));
      } else if (menu && !menu.hidden && !event.target.closest('.mobile-more-menu')) {
        menu.hidden = true; document.querySelector('[aria-controls="mobileMoreMenu"]')?.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const menu = document.getElementById('mobileMoreMenu'); if (menu) menu.hidden = true;
      document.querySelector('[aria-controls="mobileMoreMenu"]')?.setAttribute('aria-expanded','false');
    });
  }, { once:true });
})();
