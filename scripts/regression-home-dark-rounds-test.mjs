import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {latestCompletedRound} from '../assets/js/app/data-store.js';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const bytes=file=>fs.readFileSync(path.join(root,file));
const home=read('home-page.html'),index=read('index.html'),vercel=JSON.parse(read('vercel.json'));
const homeJs=read('assets/js/app/home.js'),rounds=read('assets/js/app/rounds.js');
const theme=read('assets/js/app/theme.css'),simplification=read('assets/js/app/site-simplification.css');
const shared=read('assets/js/app/shared.css'),competitionCss=read('assets/js/app/competition-refresh.css');
const assetMap=read('assets/js/app/asset-map.js'),profile=read('assets/js/app/profile.js');
const profileBoot=read('assets/js/app/profile-boot.js'),teams=read('assets/js/app/teams.js'),times=read('times.html');

assert.deepEqual(bytes('index.html'),bytes('home-page.html'),'index.html divergiu da Home nova');
assert.ok(vercel.rewrites.some(rule=>rule.source==='/'&&rule.destination==='/home-page.html'),'rewrite / não aponta para a Home nova');
assert.match(home,/site-simplification\.css/,'Home nova perdeu a simplificação');
assert.match(home,/PC\/2 · 2026/,'Home não identifica o PC/2 2026');
assert.match(home,/Classificação completa do PC\/2 2026/,'caption da tabela não identifica o PC/2');
assert.match(home,/10 clubes/,'Home não garante os dez clubes');
assert.match(homeJs,/standings'\)\.innerHTML=pc\.slice\(0,10\)/,'Home não renderiza dez linhas do PC/2');
assert.doesNotMatch(homeJs,/standings'\)\.innerHTML=pl\.slice/,'Home ainda renderiza PL IOS na tabela principal');
assert.match(read('assets/js/app/season.js'),/pl-ios/,'PL IOS deixou de existir em Ligas');

const clubs=JSON.parse(read('data/catalog/clubs.json')).clubs;
const state=JSON.parse(read('data/state_public.json'));
const imports=JSON.parse(read('data/historical-imports.json'));
const importedPc2=Object.fromEntries(Object.values(imports.rounds||{}).filter(entry=>entry.competition_id==='pc2'&&Array.isArray(entry.matches)).map(entry=>[String(entry.competition_round),entry.matches]));
const historicalRounds=Object.fromEntries(Object.entries(imports.rounds||{}).map(([round,entry])=>[round,{scores:entry.scores}]));
const latest=latestCompletedRound({clubs,historicalRounds,pc1Results:{},pc2Results:{...(state.pc2_resultados||{}),...importedPc2},currentCartolaRound:Math.max(Number(state.rodada)||0,Number(imports.current_cartola_round)||0)});
assert.equal(latest,23,'última rodada concluída deve ser R23 no estado atual');
assert.doesNotMatch(read('assets/js/app/data-store.js'),/round\s*===\s*23/,'latestCompletedRound não pode ter hardcode de R23');
assert.match(rounds,/selectedRoundSummary\(store, selected\)/,'Parciais não usa resumo exclusivo da rodada selecionada');
assert.doesNotMatch(rounds,/latestCompletedRound\(store\)/,'Parciais não pode reutilizar a última rodada concluída da Home');
assert.match(rounds,/summary\.fixtures\.length/,'resumo não informa os confrontos da rodada selecionada');
assert.match(homeJs,/ÚLTIMA RODADA CONCLUÍDA/,'Home não anuncia a última rodada concluída');

assert.match(theme,/season-competition-card\[aria-pressed="true"\]/,'selected de Ligas não foi tratado no dark');
assert.match(theme,/season-competition-card img[\s\S]*object-fit:contain/,'logos de Ligas não preservam contain');
assert.match(theme,/html:not\(\[data-color-theme="dark"\]\) \.predict-status/,'Palpites claro não tem contraste explícito');
assert.match(theme,/tabs-wrap/,'container das tabs de Estatísticas não foi tratado');
assert.match(theme,/ranking-table tr\.favorite/,'favorito de Estatísticas não foi tratado');
assert.match(theme,/club-picker label span/,'seletor de favorito não foi tratado no dark');
assert.match(theme,/club-picker input:checked\+span/,'estado selecionado do favorito não foi tratado');
assert.match(simplification,/competition-trophy\{width:auto!important;height:auto!important/,'troféu na identidade pode distorcer');
assert.match(competitionCss,/img\[alt\^="Troféu"\]\{width:auto;height:58px/,'troféu de competição não preserva proporção');
assert.match(shared,/trophy-image\{width:44px;height:auto/,'troféus de clubes não preservam proporção');

const selectableSources=[assetMap,profile,profileBoot,teams,times].join('\n');
assert.doesNotMatch(selectableSources,/Chucanacional|Shese United/i,'clube removido ainda aparece em superfície selecionável');
for(const name of ['Chereca FC','Jotaventus','Lurroma']) assert.match(assetMap,new RegExp(name),`${name} ausente de Outros Times`);
assert.equal((assetMap.match(/team_id:'other:/g)||[]).length,3,'Outros Times deve conter exatamente três clubes');

console.log(JSON.stringify({ok:true,home_identical:true,latest_completed_round:latest,other_teams:3}));
