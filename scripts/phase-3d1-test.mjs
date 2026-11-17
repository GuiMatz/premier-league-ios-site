import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLineup, normalizeAthleteScores, calculateLiveTeamScore, formationPositionGroup, luxuryReservePosition, reconcileComputedAndOfficialScore } from '../lib/league/index.js';
const root=new URL('../',import.meta.url),catalog=JSON.parse(await readFile(new URL('data/catalog/clubs.json',root),'utf8')),teamId=catalog.clubs[0].team_id,known=new Set(catalog.clubs.map(c=>c.team_id));
const starters=[{athlete_id:1,position:'GOL'},{athlete_id:2,position:'LAT'},{athlete_id:3,position:'LAT'},{athlete_id:4,position:'ZAG'},{athlete_id:5,position:'ZAG'},{athlete_id:6,position:'MEI'},{athlete_id:7,position:'MEI'},{athlete_id:8,position:'MEI'},{athlete_id:9,position:'MEI'},{athlete_id:10,position:'ATA'},{athlete_id:11,position:'ATA'}];
const makeLineup=(captainId=2,reserve={athlete_id:99,position:'LAT'})=>normalizeLineup({team_id:teamId,cartola_team_id:teamId,season:2026,cartola_round:23,captured_at:'2026-08-14T12:00:00Z',starters,coach:{athlete_id:90,position:'TEC'},captain_id:captainId,luxury_reserve:reserve,source:'fixture',locked:true},known);
const scoreSnapshot=(changes={})=>normalizeAthleteScores({fetched_at:'2026-08-14T13:00:00Z',cartola_round:23,athletes:Object.fromEntries([...starters,{athlete_id:90},{athlete_id:99}].map(a=>[a.athlete_id,{raw_score:Object.hasOwn(changes,a.athlete_id)?changes[a.athlete_id]:5}]))});

assert.equal(formationPositionGroup('LAT'),'DEF');assert.equal(formationPositionGroup('ZAG'),'DEF');assert.equal(luxuryReservePosition('LAT'),'LAT');assert.equal(luxuryReservePosition('ZAG'),'ZAG');

let result=calculateLiveTeamScore(makeLineup(3,{athlete_id:99,position:'LAT'}),scoreSnapshot({2:6,3:7,4:-20,5:-10,99:8}));
assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.equal(result.players.some(p=>p.athlete_id===4),true);assert.equal(result.players.some(p=>p.athlete_id===5),true);
result=calculateLiveTeamScore(makeLineup(5,{athlete_id:99,position:'ZAG'}),scoreSnapshot({2:-20,3:-10,4:6,5:7,99:8}));
assert.equal(result.luxury_reserve.replaced_athlete_id,4);assert.equal(result.players.some(p=>p.athlete_id===2),true);assert.equal(result.players.some(p=>p.athlete_id===3),true);

result=calculateLiveTeamScore(makeLineup(2),scoreSnapshot({2:2,3:5,99:8}));
assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.equal(result.luxury_reserve.inherits_captain,true);assert.equal(result.captain.athlete_id,99);assert.equal(result.captain.raw_score,8);assert.equal(result.captain.effective_score,12);assert.equal(result.players.some(p=>p.athlete_id===2),false);

result=calculateLiveTeamScore(makeLineup(2),scoreSnapshot({2:2,3:2,99:8}));
assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.deepEqual(result.luxury_reserve.replacement_candidates,[2,3]);assert.equal(result.captain.athlete_id,99);assert.equal(result.captain.effective_score,12);

result=calculateLiveTeamScore(makeLineup(3),scoreSnapshot({2:2,3:6,99:8}));
assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.equal(result.captain.athlete_id,3);assert.equal(result.captain.raw_score,6);assert.equal(result.captain.effective_score,9);

result=calculateLiveTeamScore(makeLineup(3),scoreSnapshot({2:6,3:8,99:7}));
assert.equal(result.luxury_reserve.triggered,true);assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.equal(result.captain.athlete_id,3);assert.equal(result.captain.effective_score,12);

result=calculateLiveTeamScore(makeLineup(2),scoreSnapshot({2:-5,3:-2,99:-1}));
assert.equal(result.luxury_reserve.triggered,true);assert.equal(result.captain.athlete_id,99);assert.equal(result.captain.raw_score,-1);assert.equal(result.captain.effective_score,-1.5);

result=calculateLiveTeamScore(makeLineup(3),scoreSnapshot({2:-5,3:2,99:-3}));
assert.equal(result.luxury_reserve.triggered,true);assert.equal(result.luxury_reserve.replaced_athlete_id,2);assert.equal(result.captain.athlete_id,3);

result=calculateLiveTeamScore(makeLineup(3),scoreSnapshot({2:7,3:8,99:7}));assert.equal(result.luxury_reserve.triggered,false);
const reconciliation=reconcileComputedAndOfficialScore({computed_live_score:result.computed_live_score,official_final_score:result.computed_live_score+0.5});assert.equal(reconciliation.status,'difference');assert.equal(reconciliation.official_is_authoritative,true);
console.log('OK: Fase 3D.1 — posição exata do RL, capitão herdado e ordem correta do live scoring validadas.');
