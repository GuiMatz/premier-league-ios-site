import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {
  mapCartolaRound, normalizeMatch, calculateHeadToHeadStandings, calculatePremierLeagueStandings,
  calculateMvp, calculateMerda, updateZikado, calculateWinRate, calculateSeasonHighScore,
  normalizeLineup, VALID_FORMATIONS, createEvent, reconcileEvent, sha256, finalizeRound,
  registerTitle, LeagueValidationError
} from '../lib/league/index.js';
import { RESULTADOS as LEGACY_PC1_RESULTS } from '../assets/js/legacy-data/pc.js';
import { PC_ARCHIVE } from '../assets/js/legacy-data/history.js';

const root = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const clubs = (await json('data/catalog/clubs.json')).clubs;
const state = await json('data/state_public.json');
const history = await json('data/historico_rodadas.json');
const golden18 = await json('test/fixtures/league/round-18-2026.json');
const golden22 = await json('test/fixtures/league/round-22-2026.json');
const ids = clubs.map(club => club.team_id), idSet = new Set(ids);
const legacyOrder = [10000009,10000007,10000002,10000004,10000003,10000001,10000005,10000006,10000008,10000010];

for (const [cartola, competition, internal] of [[1,'pc1',1],[18,'pc1',18],[19,'pc2',1],[22,'pc2',4],[23,'pc2',5],[36,'pc2',18]]) {
  const mapped = mapCartolaRound(cartola, 2026); assert.equal(mapped.competition_id, competition); assert.equal(mapped.competition_round, internal);
}

const round22 = history.seasons['2026'].cartola_rounds['22'];
const scores22 = Object.fromEntries(Object.entries(round22.scores).map(([id,value]) => [id, value.points]));
assert.deepEqual(calculateMvp(scores22, 22, legacyOrder).award, { team_id: round22.mvp_team_id, score: round22.mvp_points, round: 22 });
assert.deepEqual(calculateMerda(scores22, 22, legacyOrder).award, { team_id: round22.merda_team_id, score: round22.merda_points, round: 22 });
for (const fixture of [golden18, golden22]) {
  const mapped = mapCartolaRound(fixture.cartola_round, fixture.season);
  assert.equal(mapped.competition_id, fixture.competition_id); assert.equal(mapped.competition_round, fixture.competition_round);
  assert.equal(calculateMvp(fixture.scores, fixture.cartola_round, legacyOrder).award.team_id, fixture.expected.mvp_team_id);
  assert.equal(calculateMerda(fixture.scores, fixture.cartola_round, legacyOrder).award.team_id, fixture.expected.merda_team_id);
}
assert.equal(calculateMvp({1:10,2:10}, 1).status, 'ambiguous');
assert.deepEqual(updateZikado({1:5,2:7,3:0}, [1,2,3], 2), {1:6,2:0,3:1});

const pc2Matches = Object.entries(state.pc2_resultados).flatMap(([round,matches]) => matches.map((match,index) => normalizeMatch({match_id:`pc2:${round}:${index}`,competition_id:'pc2',season:2026,competition_round:Number(round),cartola_round:Number(round)+18,home_team_id:match[0],home_score:match[1],away_team_id:match[2],away_score:match[3]}, idSet)));
const pc2 = calculateHeadToHeadStandings(ids, pc2Matches);
assert.equal(pc2.rows[0].team_id, 10000001); assert.equal(pc2.rows[0].points, 12);
const pc1Matches = Object.entries(LEGACY_PC1_RESULTS).flatMap(([round,matches]) => matches.map((match,index) => normalizeMatch({match_id:`pc1:${round}:${index}`,competition_id:'pc1',season:2026,competition_round:Number(round),cartola_round:Number(round),home_team_id:match[0],home_score:match[1],away_team_id:match[2],away_score:match[3]}, idSet)));
const pc1 = calculateHeadToHeadStandings(ids, pc1Matches);
assert.equal(pc1.rows[0].team_id, 10000005); assert.equal(pc1.rows.every(value => value.played === 10), true, 'adaptador legacy-data expõe somente 10 rodadas PC/1');
assert.equal(PC_ARCHIVE['PC/1 2026'].rows[0][0], 10000003);
assert.notEqual(pc1.rows[0].team_id, PC_ARCHIVE['PC/1 2026'].rows[0][0], 'divergência conhecida entre resultados brutos e classificação oficial consolidada deve permanecer explícita');
assert.equal(calculateWinRate({wins:3,played:5}), 60);
const pl = calculatePremierLeagueStandings(ids, state.round_scores);
assert.equal(pl.rows[0].team_id, 10000001);

const record = calculateSeasonHighScore(history, 2026);
assert.equal(record.status,'co_record'); assert.equal(record.record,null);
assert.deepEqual(new Set(record.holders.map(value=>value.team_id)),new Set([10000001,10000009])); assert.equal(record.holders.every(value=>value.points===145),true);

const athletesFor = formation => {
  const [def,mid,att] = formation.split('-').map(Number); let id=1;
  return [{athlete_id:id++,position:'GOL'},...Array.from({length:def},(_,i)=>({athlete_id:id++,position:i%2?'LAT':'ZAG'})),...Array.from({length:mid},()=>({athlete_id:id++,position:'MEI'})),...Array.from({length:att},()=>({athlete_id:id++,position:'ATA'}))];
};
for (const formation of VALID_FORMATIONS) {
  const starters=athletesFor(formation); const lineup=normalizeLineup({team_id:ids[0],season:2026,cartola_round:23,formation,starters,coach:{athlete_id:99,position:'TEC'},captain_id:starters[1].athlete_id,luxury_reserve:{athlete_id:100,position:'MEI'},budget:120.5,points:null},idSet);
  assert.equal(lineup.starters.length,11); assert.equal(lineup.starters.filter(value=>value.position_group==='GOL').length,1); assert.equal(lineup.coach.position,'TEC'); assert.equal(lineup.luxury_reserve.position,'MEI'); assert.equal(lineup.luxury_reserve.position_group,'MEI'); assert.equal(lineup.luxury_reserve_triggered,null);
}
assert.throws(()=>normalizeLineup({team_id:ids[0],formation:'4-2-4',starters:[],coach:{}},idSet),error=>error instanceof LeagueValidationError&&error.code==='INVALID_FORMATION');

assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
const event=createEvent({season:2026,cartola_round:23,event_type:'round.score',scope_id:String(ids[0]),occurred_at:'2026-08-14T12:00:00.000Z',source:'manual',payload:{points:10}});
assert.equal(reconcileEvent([],event).status,'apply'); assert.equal(reconcileEvent([event],event).status,'noop');
const conflict=createEvent({...event,payload:{points:11}}); assert.equal(reconcileEvent([event],conflict).status,'conflict');

const fixtures22=state.pc2_confrontos['4'];
const scoresFixture=Object.fromEntries(Object.entries(round22.scores).map(([id,value])=>[id,Number(value?.points ?? value)]));
const input={season:2026,cartola_round:22,clubs,scores:scoresFixture,fixtures:fixtures22,occurred_at:'2026-08-14T12:00:00.000Z',source:'manual',legacy_order_team_ids:legacyOrder,history};
const once=finalizeRound(input,{}); assert.equal(once.status,'applied');
const twice=finalizeRound(input,once.nextState); assert.equal(twice.status,'noop'); assert.deepEqual(twice.nextState,once.nextState);
let ten=once; for(let i=1;i<10;i++) ten=finalizeRound(input,ten.nextState); assert.deepEqual(ten.nextState,once.nextState);
assert.equal(once.nextState.awards.mvp[round22.mvp_team_id],1); assert.equal(once.nextState.awards.merda[round22.merda_team_id],1);

for (const bad of [
  {...input,clubs:clubs.slice(0,9)},
  {...input,scores:{...scoresFixture,[ids[0]]:null}},
  {...input,scores:Object.fromEntries(Object.entries(scoresFixture).slice(0,9))},
  {...input,fixtures:fixtures22.slice(0,4)}
]) assert.equal(finalizeRound(bad,{}).status,'recovery_required');
assert.equal(finalizeRound({...input,cartola_round:99},{}).status,'invalid');
assert.equal(finalizeRound({...input,scores:{...scoresFixture,99999999:50}},{}).status,'invalid');
const tied={...scoresFixture,[ids[0]]:100,[ids[1]]:100}; Object.keys(tied).filter(id=>![ids[0],ids[1]].includes(Number(id))).forEach((id,index)=>tied[id]=90-index); assert.equal(finalizeRound({...input,scores:tied,legacy_order_team_ids:[]},{}).status,'ambiguous');
const changed={...input,scores:{...scoresFixture,[ids[0]]:scoresFixture[ids[0]]+1}}; assert.equal(finalizeRound(changed,once.nextState).status,'conflict');

assert.equal(registerTitle([], {title_type:'cartoleiro-de-ouro',season:2026,team_id:ids[0],status:'finished'}).status,'rejected');
assert.equal(registerTitle([], {title_type:'pl-ios',season:2026,team_id:ids[0],status:'active'}).status,'rejected');
const title=registerTitle([], {title_type:'pl-ios',season:2026,team_id:ids[0],status:'finished'}); assert.equal(registerTitle(title.titles,title.titles[0]).status,'noop');

console.log('OK: engine pura, golden fixtures, erros, 7 formações e idempotência 1x/2x/10x validados.');
