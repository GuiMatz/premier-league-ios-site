import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {deriveLeagueStatistics,clubStatistics} from '../assets/js/app/data-store.js';
import {CONFRONTOS,RESULTADOS} from '../assets/js/legacy-data/pc.js';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const state=json('data/state_public.json'),history=json('data/historico_rodadas.json'),imports=json('data/historical-imports.json'),clubs=json('data/catalog/clubs.json').clubs;
const imported=Object.fromEntries(Object.entries(imports.rounds).map(([round,entry])=>[round,{scores:entry.scores,source:entry.source,source_status:entry.provenance,engine_managed:entry.engine_managed,competitions:[entry.competition_id]}]));
const historyDoc={...history,seasons:{...history.seasons,'2026':{...history.seasons['2026'],cartola_rounds:{...history.seasons['2026'].cartola_rounds,...imported}}}};
const store={clubs,stateDoc:state,historyDoc,historicalRounds:historyDoc.seasons['2026'].cartola_rounds,importedRounds:imports.rounds,pc1Fixtures:CONFRONTOS,pc2Fixtures:state.pc2_confrontos||{},pc1Results:{...RESULTADOS,...(state.resultados_pc_extra||{})},pc2Results:{...(state.pc2_resultados||{}),...Object.fromEntries(Object.values(imports.rounds).map(entry=>[entry.competition_round,entry.matches]))},currentCartolaRound:24,live:{}};

const projection=deriveLeagueStatistics(store),sample=projection.rows[0],profile=clubStatistics(store,sample.teamId,projection);
assert.equal(profile.played,sample.played);assert.equal(profile.wins,sample.wins);assert.equal(profile.losses,sample.losses);assert.equal(profile.mvp,sample.mvp);assert.equal(profile.merda,sample.merda);assert.equal(profile.zikado,sample.zikado);
assert.ok(profile.records.some(row=>row.season===2026&&row.round===23),'R23 precisa entrar automaticamente no perfil');
const future=structuredClone(store),scores=Object.fromEntries(clubs.map((team,index)=>[team.team_id,100-index]));future.historicalRounds['24']={scores,source:'engine',engine_managed:true};future.historyDoc.seasons['2026'].cartola_rounds['24']=future.historicalRounds['24'];future.pc2Results['6']=[[clubs[0].team_id,100,clubs[1].team_id,99],[clubs[2].team_id,98,clubs[3].team_id,97],[clubs[4].team_id,96,clubs[5].team_id,95],[clubs[6].team_id,94,clubs[7].team_id,93],[clubs[8].team_id,92,clubs[9].team_id,91]];assert.ok(clubStatistics(future,clubs[0].team_id).records.some(row=>row.round===24));

const teams=read('assets/js/app/teams.js'),clubPage=read('clube.html'),clubJs=read('assets/js/app/club-refresh.js'),profileJs=read('assets/js/app/profile.js'),boot=read('assets/js/app/profile-boot.js');
assert.match(teams,/localeCompare/);assert.match(teams,/pt-BR/);assert.match(teams,/clubStatistics\(/);assert.match(teams,/deriveLeagueStatistics\(/);assert.match(teams,/SELECTABLE_OTHER_IDS/);assert.doesNotMatch(teams,/Chucanacional|Shese United/i);
assert.match(clubJs,/clubStatistics\(store/);assert.match(clubJs,/deriveLeagueStatistics\(store\)/);assert.doesNotMatch(clubPage,/data-stat-(?:games|wins|losses)="\d+"/);assert.match(clubPage,/Últimas rodadas/i);assert.match(clubPage,/História/i);
assert.match(profileJs,/plios\.preferences\.v1/);assert.match(profileJs,/queueMicrotask\(open\)/);assert.match(profileJs,/Essas prefer/);assert.doesNotMatch(profileJs,/registrad[oa].*servidor|conta criada/i);assert.match(boot,/onboardingPending/);

const season=read('assets/js/app/season.js'),rounds=read('assets/js/app/rounds.js'),partialApi=read('api/cartola/athlete-scores.js'),shared=read('assets/js/app/shared.css'),leagues=read('temporada-2026.html');
assert.match(season,/Vencedor:/);assert.match(season,/Campeão:/);assert.match(season,/isFinal\?'Campeão':'Vencedor'/);assert.match(rounds,/athlete-scores\?projections=1/);assert.match(rounds,/60000/);assert.match(rounds,/Atualizado/);assert.match(rounds,/Parcial temporariamente indisponível/);assert.match(partialApi,/team_projections/);
assert.match(leagues,/leagues-first-frame/);assert.ok(leagues.indexOf('leagues-first-frame')<leagues.indexOf('assets/js/app/season.js'));
assert.match(shared,/data-loading/);assert.match(shared,/data-enter/);assert.match(shared,/prefers-reduced-motion:reduce/);

for(const page of ['home-page.html','temporada-2026.html','rodadas.html','escalacoes.html','palpites.html','estatisticas.html','times.html','clube.html']){const html=read(page);assert.match(html,/public-footer/);assert.doesNotMatch(html,/>Dados atuais, histórico oficial, catálogo|>Estrutura preparada para consumir/);}
console.log('public-ux-club-profiles-test: ok');
