import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shared=read('assets/js/app/shared.css'),shell=read('assets/js/app/public-shell.js'),rounds=read('assets/js/app/rounds.js'),season=read('assets/js/app/season.js'),stats=read('assets/js/app/statistics-ui.js'),lineups=read('assets/js/app/lineups.js'),profile=read('assets/js/app/profile.js'),boot=read('assets/js/app/profile-boot.js'),home=read('home-page.html'),index=read('index.html'),leagues=read('temporada-2026.html'),statistics=read('estatisticas.html'),notFound=read('404.html');

assert.match(shared,/\.ui-enter/);assert.match(shared,/\.ui-fade/);assert.match(shared,/\.ui-rise/);assert.match(shared,/\.ui-loading/);assert.match(shared,/\.ui-updated/);assert.match(shared,/\.ui-pressable/);assert.match(shared,/prefers-reduced-motion:reduce/);assert.match(shared,/\.data-loading/);assert.match(shared,/position:sticky/);
assert.match(shell,/setButtonLoading/);assert.match(shell,/relativeUpdateLabel/);assert.match(shell,/flashUpdated/);assert.match(shell,/image-fallback/);assert.match(shell,/Escape/);
assert.match(rounds,/previousScores/);assert.match(rounds,/data-live-score/);assert.match(rounds,/Exibindo a última atualização disponível/);assert.match(rounds,/setInterval\(\(\)=>refreshLive\(false\),60000\)/);assert.match(rounds,/summary\.status==='partial'/);assert.match(rounds,/pushState/);assert.match(rounds,/popstate/);assert.doesNotMatch(rounds,/roundPoints\s*\|\|\s*0/);
assert.match(lineups,/refreshLineup/);assert.match(lineups,/setButtonLoading/);assert.match(lineups,/bindRelativeTime/);assert.match(lineups,/projectEffectiveLineup/);
assert.match(season,/pushState/);assert.match(season,/popstate/);assert.match(season,/competition/);assert.match(stats,/searchParams\.set\('tab'/);assert.match(stats,/popstate/);
assert.match(profile,/profile-save'\)\.disabled/);assert.match(profile,/favoriteTeamId/);assert.match(boot,/onboardingPending/);
assert.equal(home,index,'Home e index precisam permanecer equivalentes');assert.ok(home.indexOf('theme-boot.js')<home.indexOf('</head>'));assert.ok(leagues.indexOf('leagues-first-frame')<leagues.indexOf('season.js'));assert.match(statistics,/legacy-statistics-disabled/);assert.doesNotMatch(statistics,/<script>\s*const A=/);
assert.match(notFound,/Essa página não existe/);assert.match(notFound,/theme-boot\.js/);assert.match(notFound,/Voltar ao Início/);
for(const source of [shared,shell,rounds,season,stats,lineups,profile])assert.doesNotMatch(source,/gsap|framer-motion|animate\.css/i);
for(const page of ['home-page.html','temporada-2026.html','rodadas.html','escalacoes.html','palpites.html','estatisticas.html','times.html','clube.html']){
  const html=read(page);
  assert.match(html,/public-footer/);
  assert.doesNotMatch(html,/<(?:footer|p)[^>]*(?:public-footer|page-note)[^>]*>[^<]*(?:writer|ledger|shadow|contratos internos)/i);
}
console.log('public-polish-ux-test: ok');
