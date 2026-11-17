import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adaptCartolaSnapshot, validateLeagueSnapshot } from '../server/league/cartola-adapter.js';
import { normalizeCartolaSnapshot } from '../server/league/input-normalizer.js';
import { calculateSeasonHighScore, SCORE_PROVENANCE, calculateMvp, calculateMerda, historicalCompetitionContract, resolveHistoricalStandings, calculateHeadToHeadStandings } from '../lib/league/index.js';
import { PC_ARCHIVE } from '../assets/js/legacy-data/history.js';

const root=new URL('../',import.meta.url),json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const catalog=await json('data/catalog/clubs.json'),fixture=await json('test/fixtures/cartola/snapshot-round-22.json'),history=await json('data/historico_rodadas.json');
const ids=catalog.clubs.map(club=>club.team_id),fetchedAt=fixture.fetched_at;

const complete=adaptCartolaSnapshot(fixture,{catalog,fetchedAt});
assert.equal(complete.validation.status,'complete');assert.equal(complete.validation.finalizable,true);assert.equal(complete.snapshot.clubs.length,10);

const missing=normalizeCartolaSnapshot({...fixture,teams:fixture.teams.slice(0,9)},{catalog,fetchedAt});
assert.equal(validateLeagueSnapshot(missing,catalog).valid,false);assert.ok(validateLeagueSnapshot(missing,catalog).errors.some(error=>error.code==='MISSING_TEAM'));
const duplicate=normalizeCartolaSnapshot({...fixture,teams:[...fixture.teams.slice(0,9),fixture.teams[0]]},{catalog,fetchedAt});
assert.ok(validateLeagueSnapshot(duplicate,catalog).errors.some(error=>error.code==='DUPLICATE_TEAM'));
const nullScore=normalizeCartolaSnapshot({...fixture,teams:fixture.teams.map((team,index)=>index?team:{...team,roundPoints:null})},{catalog,fetchedAt});
assert.equal(validateLeagueSnapshot(nullScore,catalog).status,'partial');assert.equal(nullScore.clubs[0].round_score,null);

for(const [payload,status] of [[{market:{round:22,statusId:1,isOpen:true}},'market_open'],[{market:{round:22,statusId:2,isOpen:false}},'market_closed'],[{market:{round:22},roundStatus:'live'},'round_live'],[{market:{round:22},roundStatus:'final'},'round_final']]) assert.equal(normalizeCartolaSnapshot({...payload,teams:fixture.teams},{catalog,fetchedAt}).market_status,status);

const formation='4-4-2';let athlete=1;const lineup={season:2026,cartola_round:22,formation,starters:[{athlete_id:athlete++,position:'GOL'},...Array.from({length:4},(_,i)=>({athlete_id:athlete++,position:i%2?'LAT':'ZAG'})),...Array.from({length:4},()=>({athlete_id:athlete++,position:'MEI'})),...Array.from({length:2},()=>({athlete_id:athlete++,position:'ATA'}))],coach:{athlete_id:99,position:'TEC'},captain_id:2,luxury_reserve:{athlete_id:100,position:'MEI'}};
const withLineup={...fixture,teams:fixture.teams.map((team,index)=>index?team:{...team,lineup,captain_id:2})};
const lineups=adaptCartolaSnapshot(withLineup,{catalog,fetchedAt}).lineup_reports;assert.equal(lineups[0].status,'available');assert.equal(lineups.slice(1).every(value=>value.status==='unavailable'),true);

const record=calculateSeasonHighScore(history,2026);assert.equal(record.status,'co_record');assert.deepEqual(new Set(record.holders.map(value=>value.team_id)),new Set([10000001,10000009]));assert.equal(record.holders.every(value=>value.provenance===SCORE_PROVENANCE.SPECIAL_SCORE),true);
const invalidOnly=calculateSeasonHighScore({seasons:{'2026':{cartola_rounds:{},special_scores:[]}},legacy_records:[{year:2026,team_id:ids[0],points:999}]},2026);assert.equal(invalidOnly.status,'unavailable');

const official=PC_ARCHIVE['PC/1 2026'].rows.map(row=>({team_id:row[0],points:row[1],wins:row[2],draws:row[3],losses:row[4],cartola_points:row[5]}));
const contract=historicalCompetitionContract({competition_id:'pc1',season:2026,standings:official,matches:[],source_status:'consolidated_only',official_order:official.map(row=>row.team_id)});
const resolved=resolveHistoricalStandings(contract,(matches,order)=>calculateHeadToHeadStandings(ids,matches,order));assert.equal(resolved.recalculated,false);assert.equal(resolved.rows[0].team_id,10000003);

const tiedHigh={1:100,2:100,3:80},tiedLow={1:20,2:20,3:80};
assert.equal(calculateMvp(tiedHigh,{round:1}).status,'ambiguous');assert.equal(calculateMvp(tiedHigh,{round:1,legacyOrder:[2,1,3]}).status,'resolved_legacy');assert.equal(calculateMvp(tiedHigh,{round:1,legacyOrder:[2,1,3]}).winner.team_id,2);
assert.equal(calculateMerda(tiedLow,{round:1}).status,'ambiguous');assert.equal(calculateMerda(tiedLow,{round:1,legacyOrder:[2,1,3]}).status,'resolved_legacy');assert.equal(calculateMerda(tiedLow,{round:1,legacyOrder:[2,1,3]}).winner.team_id,2);

console.log('OK: reconciliação histórica, adapter Cartola, snapshots, lineups, co-recorde e empates legados validados.');
