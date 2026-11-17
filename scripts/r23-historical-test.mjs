import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const json=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const imported=await json('data/historical-imports.json');
const shadow=await json('reports/shadow/2026/R23/final-comparison.json');
const baseline=await json('data/league-next/baselines/pre-engine-2026-r23.json');
const state=await json('data/state_public.json');
const round=imported.rounds['23'];

assert.equal(round.cartola_round,23);
assert.equal(round.competition_id,'pc2');
assert.equal(round.competition_round,5);
assert.equal(round.status,'concluded');
assert.equal(round.provenance,'historical_import_pre_cutover');
assert.equal(round.engine_managed,false);
assert.equal(round.engine_validation,'not_validated');
assert.equal(round.lineups_status,'unavailable');
assert.equal(round.matches.length,5);
assert.equal(Object.keys(round.scores).length,10);
assert.equal(new Set(round.matches.flatMap(row=>[row[0],row[2]])).size,10);
assert.equal(imported.current_cartola_round,24);
assert.equal(baseline.as_of_round,22);
assert.equal(state.pc2_resultados['5'],undefined);

const official=Object.fromEntries(shadow.rows.map(row=>[String(row.team_id),row.official_final_score]));
assert.deepEqual(round.scores,official);
assert.equal(shadow.official_is_authoritative,true);
assert.equal(shadow.rows.every(row=>row.computed_final_score===null),true);
for(const [a,pa,b,pb] of round.matches){assert.equal(pa,official[a]);assert.equal(pb,official[b]);}

const dataStore=await fs.readFile(path.join(root,'assets/js/app/data-store.js'),'utf8');
assert.match(dataStore,/historical-imports\.json/);
assert.match(dataStore,/roundProvenance/);
assert.match(dataStore,/Math\.max\(number\(stateDoc\.rodada\).*current_cartola_round/);
const roundsJs=await fs.readFile(path.join(root,'assets/js/app/rounds.js'),'utf8');
assert.match(roundsJs,/Histórico importado · não processado pelo engine/);
assert.match(roundsJs,/escalações individuais finais não estão disponíveis/);

const assetMap=await fs.readFile(path.join(root,'assets/js/app/asset-map.js'),'utf8');
assert.match(assetMap,/other:lurroma[\s\S]*lurroma-logo-normalized\.png/);
assert.equal((assetMap.match(/lurroma-logo-normalized\.png/g)||[]).length,2);
const png=await fs.readFile(path.join(root,'assets/media/clubs/lurroma-logo-normalized.png'));
assert.equal(png.toString('ascii',1,4),'PNG');
assert.equal(png.readUInt32BE(16),512);
assert.equal(png.readUInt32BE(20),512);

console.log(JSON.stringify({ok:true,status:'R23_HISTORICAL_OK',round:23,pc2_round:5,teams:10,matches:5,current_round:24,engine_managed:false,lurroma:'normalized-512'}));
