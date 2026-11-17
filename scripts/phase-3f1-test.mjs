import assert from 'node:assert/strict';
import { mkdir,readFile,rm } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOwnershipIndex,getMostSelected,getMostCaptained,getMostLuxuryReserved,getAthleteImpact,buildMostSelectedTeam } from '../lib/league/ownership.js';
import { addLockedLineup } from '../server/league-next/lineup-archive.js';
import { buildOwnershipProjection,validateOwnershipProjection,writeOwnershipProjection } from '../server/league-next/ownership-projection.js';
import { checkLeagueIntegrity } from '../server/league-next/integrity.js';
import { initialState } from '../server/league-next/projection.js';
import { writeAtomic,hashValue } from '../server/league-next/storage.js';
import { createOwnershipFixture } from '../test/fixtures/league/ownership-10-clubs.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),catalog=JSON.parse(await readFile(join(root,'data','catalog','clubs.json'),'utf8')),clubs=catalog.clubs.filter(c=>c.active),teamIds=clubs.map(c=>c.team_id),lineups=createOwnershipFixture(teamIds),index=buildOwnershipIndex(lineups,clubs);
assert.equal(index.status,'complete');assert.equal(index.expected_teams,10);assert.equal(index.available_teams,10);
assert.equal(index.athletes['100'].starter_count,10);assert.equal(index.athletes['100'].starter_percentage,100);
assert.equal(index.athletes['101'].starter_count,7);assert.equal(index.athletes['101'].starter_percentage,70);
assert.equal(index.athletes['102'].starter_count,10);assert.equal(index.athletes['102'].captain_count,4);assert.equal(index.athletes['102'].captain_percentage,40);
assert.equal(index.athletes['900'].starter_count,0);assert.equal(index.athletes['900'].luxury_reserve_count,3);assert.equal(index.athletes['900'].luxury_reserve_percentage,30);
assert.deepEqual(index.athletes['102'].selected_by.filter(x=>x.captain).map(x=>[x.team_id,x.starter,x.captain]),teamIds.slice(0,4).sort((a,b)=>a-b).map(id=>[id,true,true]));
assert.equal(index.coaches['800'].coach_selection_count,10);assert.equal(index.athletes['101'].position,'LAT');assert.equal(index.athletes['900'].position,'LAT');
assert.equal(getMostSelected(index)[0].count,10);assert.equal(getMostCaptained(index)[0].athlete_id,102);assert.equal(getMostLuxuryReserved(index)[0].athlete_id,900);
const impact=getAthleteImpact(index,102);assert.equal(impact.affected_teams.length,10);assert.equal(impact.affected_teams.filter(x=>x.role==='captain').length,4);assert.equal(impact.affected_teams.find(x=>x.role==='captain').captain_multiplier,1.5);
const rlImpact=getAthleteImpact(index,900);assert.equal(rlImpact.affected_teams.every(x=>x.role==='luxury_reserve'&&x.effective_impact===null),true);

const partial=buildOwnershipIndex(lineups.slice(0,9),clubs);assert.equal(partial.status,'partial');assert.equal(partial.available_teams,9);assert.equal(partial.missing_teams.length,1);assert.equal(partial.athletes['100'].starter_count,9);assert.equal(partial.athletes['100'].starter_percentage,null);
const duplicateTeam=buildOwnershipIndex([...lineups,lineups[0]],clubs);assert.equal(duplicateTeam.validation.errors.some(x=>x.code==='DUPLICATE_TEAM_ID'),true);assert.equal(duplicateTeam.athletes['100'].starter_count,10);
const duplicateAthlete=structuredClone(lineups);duplicateAthlete[0].starters[1]=structuredClone(duplicateAthlete[0].starters[0]);assert.equal(buildOwnershipIndex(duplicateAthlete,clubs).validation.errors.some(x=>x.code==='DUPLICATE_ATHLETE_IN_LINEUP'),true);

const legacy=buildMostSelectedTeam(index,{legacyCaptainOrder:[102]});assert.equal(legacy.status,'resolved_legacy');assert.equal(legacy.formation,'4-3-3');assert.equal(legacy.selected.length,12);assert.equal(legacy.selected.filter(x=>x.position==='TEC').length,1);assert.equal(legacy.captain.athlete_id,102);assert.equal(legacy.legacy_behavior.luxury_reserve_participates_in_selection_pool,true);

let archive={schema_version:1,season:2026,cartola_round:24,locked:{},result:{}};for(const lineup of lineups)archive=addLockedLineup(archive,lineup).archive;
const projectionA=buildOwnershipProjection({archive,activeClubs:clubs,generatedAt:'2026-08-20T23:00:00Z'}),projectionB=buildOwnershipProjection({archive,activeClubs:clubs,generatedAt:'2026-08-21T00:00:00Z'});assert.equal(projectionA.ownership_hash,projectionB.ownership_hash);assert.equal(hashValue(projectionA.ownership),hashValue(projectionB.ownership));assert.equal(validateOwnershipProjection({projection:projectionA,archive,activeClubs:clubs}).status,'OK');
const tampered=structuredClone(projectionA);tampered.ownership.athletes['100'].starter_count=9;assert.equal(validateOwnershipProjection({projection:tampered,archive,activeClubs:clubs}).issues.some(x=>x.code==='OWNERSHIP_CONTENT_MISMATCH'),true);

const temp=join(root,'tmp','league-next',`phase-3f1-${process.pid}`),baseline=JSON.parse(await readFile(join(root,'data','league-next','baselines','pre-engine-2026-r23.json'),'utf8')),history=JSON.parse(await readFile(join(root,'data','league-next','baselines','clubs-history.json'),'utf8'));await mkdir(join(temp,'events'),{recursive:true});await writeAtomic(join(temp,'events','2026.jsonl'),'');await writeAtomic(join(temp,'seasons','2026','state.json'),initialState(baseline,2026));await writeAtomic(join(temp,'seasons','2026','lineups','R24.json'),archive);await writeOwnershipProjection(temp,projectionA);
assert.equal((await checkLeagueIntegrity({root:temp,baseline,catalog,historicalCatalog:history,season:2026})).status,'OK');await writeOwnershipProjection(temp,tampered);const integrity=await checkLeagueIntegrity({root:temp,baseline,catalog,historicalCatalog:history,season:2026});assert.equal(integrity.status,'ERROR');assert.equal(integrity.issues.some(x=>x.code==='OWNERSHIP_CONTENT_MISMATCH'),true);await rm(temp,{recursive:true,force:true});
console.log('OK: Fase 3F.1 — ownership, rankings, papéis, parcialidade, impacto, compatibilidade legada, rebuild e integridade validados.');
