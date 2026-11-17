import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { completedRounds, selectedRoundSummary, deriveLeagueStatistics, allScoreRecords } from '../assets/js/app/data-store.js';
import { CONFRONTOS, RESULTADOS } from '../assets/js/legacy-data/pc.js';

const root=path.resolve(import.meta.dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),json=file=>JSON.parse(read(file));
const clubs=json('data/catalog/clubs.json').clubs,history=json('data/historico_rodadas.json'),imports=json('data/historical-imports.json'),state=json('data/state_public.json');
const importedHistory=Object.fromEntries(Object.entries(imports.rounds).map(([round,entry])=>[round,{scores:entry.scores,source:entry.source,source_status:entry.provenance,engine_managed:entry.engine_managed,competitions:[entry.competition_id]}]));
const historyDoc={...history,seasons:{...history.seasons,'2026':{...history.seasons['2026'],cartola_rounds:{...history.seasons['2026'].cartola_rounds,...importedHistory}}}};
const pc2Results={...(state.pc2_resultados||{}),...Object.fromEntries(Object.values(imports.rounds).map(entry=>[entry.competition_round,entry.matches]))};
const store={clubs,stateDoc:state,historyDoc,historicalRounds:historyDoc.seasons['2026'].cartola_rounds,importedRounds:imports.rounds,pc1Fixtures:CONFRONTOS,pc2Fixtures:state.pc2_confrontos||{},pc1Results:{...RESULTADOS,...(state.resultados_pc_extra||{})},pc2Results,currentCartolaRound:24,live:{}};

assert.equal(selectedRoundSummary(store,22).round,22);
assert.equal(selectedRoundSummary(store,22).status,'final');
assert.equal(selectedRoundSummary(store,23).source,'historical_import');
assert.equal(selectedRoundSummary(store,23).fixtures.length,5);
assert.equal(selectedRoundSummary(store,24).status,'partial');
assert.equal(selectedRoundSummary(store,24).fixtures.length,5);
assert.equal(Object.keys(selectedRoundSummary(store,24).scores).length,0);

const rounds=completedRounds(store);assert.equal(rounds.filter(row=>row.id==='2026:23').length,1);
const first=deriveLeagueStatistics(store),second=deriveLeagueStatistics(store);
assert.deepEqual(first,second);assert.deepEqual(first.appliedRoundIds,['2026:23']);assert.equal(first.awardAmbiguities.length,0);
const byId=id=>first.rows.find(row=>row.teamId===id),baseline=name=>state.aproveitamento[name];
assert.equal(first.rows.reduce((sum,row)=>sum+row.played,0)-clubs.reduce((sum,team)=>sum+Number(baseline(team.official_name)?.j||0),0),10);
for(const id of [10000001,10000004,10000010,10000002,10000005]) assert.equal(byId(id).wins,Number(baseline(clubs.find(team=>team.team_id===id).official_name).v)+1);
for(const id of [10000006,10000003,10000008,10000009,10000007]) assert.equal(byId(id).losses,Number(baseline(clubs.find(team=>team.team_id===id).official_name).d)+1);
assert.equal(byId(10000002).mvp,8);assert.equal(byId(10000002).zikado,0);assert.equal(byId(10000008).merda,8);
assert.equal(allScoreRecords(store).length,251);assert.equal(first.records.length,251);assert.equal(first.records.filter(row=>row.season===2026&&row.round===23).length,10);

const future=structuredClone(store),scores=Object.fromEntries(clubs.map((team,index)=>[team.team_id,100-index]));
future.historicalRounds['24']={scores,source:'engine',engine_managed:true};future.historyDoc.seasons['2026'].cartola_rounds['24']=future.historicalRounds['24'];future.pc2Results['6']=[[clubs[0].team_id,100,clubs[1].team_id,99],[clubs[2].team_id,98,clubs[3].team_id,97],[clubs[4].team_id,96,clubs[5].team_id,95],[clubs[6].team_id,94,clubs[7].team_id,93],[clubs[8].team_id,92,clubs[9].team_id,91]];
assert.deepEqual(deriveLeagueStatistics(future).appliedRoundIds,['2026:23','2026:24']);

const lineups=read('assets/js/app/lineups.js'),api=read('api/cartola/lineup.js'),cupCss=read('assets/js/app/site-simplification.css')+read('assets/js/app/theme.css'),roundsJs=read('assets/js/app/rounds.js'),homeJs=read('assets/js/app/home.js');
assert.match(lineups,/\/api\/cartola\/lineup\?id=/);assert.match(lineups,/lineup_inherited/);assert.match(lineups,/luxury_reserve/);assert.doesNotMatch(lineups,/reports\/shadow/);assert.match(api,/adaptCartolaLineup/);assert.doesNotMatch(api,/reports\/shadow/);
assert.match(cupCss,/\.cup-team\.winner/);assert.match(cupCss,/data-color-theme="dark"[^\n]*\.cup-team\.winner/);assert.match(cupCss,/content:"Vencedor"/);
assert.match(roundsJs,/selectedRoundSummary\(store, selected\)/);assert.doesNotMatch(roundsJs,/latestCompletedRound\(store/);assert.match(homeJs,/latestCompletedRound\(store\)/);
console.log('round-statistics-lineups-test: ok');
