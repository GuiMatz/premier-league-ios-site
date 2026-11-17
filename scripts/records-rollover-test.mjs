import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allScoreRecords,clubStatistics,completedRounds,deriveLeagueStatistics} from '../assets/js/app/data-store.js';

const json=file=>JSON.parse(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'));
const clubs=json('data/catalog/clubs.json').clubs,state=json('data/state_public.json'),history=json('data/historico_rodadas.json'),imports=json('data/historical-imports.json');
const ids=clubs.map(team=>Number(team.team_id));
const importedHistory=Object.fromEntries(Object.entries(imports.rounds||{}).map(([round,entry])=>[round,{...entry,scores:entry.scores,competitions:[entry.competition_id]}]));
const historyDoc={...history,seasons:{...(history.seasons||{}),'2026':{...(history.seasons?.['2026']||{}),cartola_rounds:{...(history.seasons?.['2026']?.cartola_rounds||{}),...importedHistory}}}};
const baseStore={clubs,stateDoc:state,historyDoc,historicalRounds:historyDoc.seasons['2026'].cartola_rounds,importedRounds:imports.rounds||{},pc1Results:state.resultados_pc_extra||{},pc2Results:{...(state.pc2_resultados||{})},standings:{pc2:[]}};
const before=allScoreRecords(baseStore).length;
const makeRound=round=>({scores:Object.fromEntries(ids.map((id,index)=>[id,60+round+index/10])),source:'cartola_team_official'});
const store={...baseStore,historicalRounds:{...baseStore.historicalRounds,'24':makeRound(24)}};
const fixtureResults=(round,scores)=>(state.pc2_confrontos[String(round-18)]||[]).map(([a,b])=>[a,scores[a],b,scores[b]]);
store.pc2Results={...store.pc2Results,6:fixtureResults(24,store.historicalRounds['24'].scores)};
assert.equal(completedRounds(store).filter(item=>item.round===24).length,1);
const r24=allScoreRecords(store).filter(item=>item.season===2026&&item.round===24);
assert.equal(r24.length,10);
assert.equal(allScoreRecords(store).length,before+10);
assert.equal(new Set(allScoreRecords(store).map(item=>item.id)).size,allScoreRecords(store).length);

for(const round of [25,26]){store.historicalRounds[String(round)]=makeRound(round);store.pc2Results[round-18]=fixtureResults(round,store.historicalRounds[String(round)].scores);}
const future=allScoreRecords(store);
assert.deepEqual([24,25,26].map(round=>future.filter(item=>item.season===2026&&item.round===round).length),[10,10,10]);
assert.deepEqual(future,allScoreRecords(store));
assert.equal(future.every((item,index,list)=>index===0||Number(list[index-1].points)>=Number(item.points)),true);

const projection=deriveLeagueStatistics(store);
for(const id of ids){const profile=clubStatistics(store,id,projection),global=future.filter(item=>item.teamId===id);assert.equal(profile.best.points,Math.max(...global.map(item=>item.points)));assert.equal(profile.worst.points,Math.min(...global.map(item=>item.points)));assert.equal(profile.average,global.reduce((sum,item)=>sum+item.points,0)/global.length);}
const ui=fs.readFileSync(new URL('../assets/js/app/statistics-records.js',import.meta.url),'utf8');
assert.match(ui,/loadStore,allScoreRecords/);assert.doesNotMatch(ui,/historical-imports\.json|historico_rodadas\.json/);
console.log(`R24_RECORDS_COUNT=${r24.length}`);console.log('records-rollover-test: OK');
