import assert from 'node:assert/strict';
import fs from 'node:fs';
import {competitionRoundForCartola,projectLiveHeadToHeadStandings,deriveLeagueStatistics,allScoreRecords} from '../assets/js/app/data-store.js';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const competitions=JSON.parse(read('data/catalog/competitions.json')).competitions;
const clubs=JSON.parse(read('data/catalog/clubs.json')).clubs;
const ids=clubs.map(club=>club.team_id),official=ids.map((teamId,index)=>({teamId,points:10-index,wins:3,draws:1,losses:1,played:5,cartolaPoints:300-index}));
const fixtures=[[ids[0],ids[1]],[ids[2],ids[3]],[ids[4],ids[5]],[ids[6],ids[7]],[ids[8],ids[9]]];
const scores=Object.fromEntries(ids.map((id,index)=>[id,{value:100-index}]));
const competitionRound=competitionRoundForCartola(competitions,'pc2',2026,25);
assert.equal(competitionRound,7);
const live=projectLiveHeadToHeadStandings({officialRows:official,fixtures,liveScores:scores,season:2026,cartolaRound:25,competitionRound,completed:[]});
assert.equal(live.applied,true);assert.equal(live.reliableMatches,5);assert.equal(live.rows.reduce((sum,row)=>sum+row.played,0),official.reduce((sum,row)=>sum+row.played,0)+10);
const noFalseZero=projectLiveHeadToHeadStandings({officialRows:official,fixtures,liveScores:{[ids[0]]:{value:80}},season:2026,cartolaRound:25,competitionRound,completed:[]});
assert.equal(noFalseZero.applied,false);assert.deepEqual(noFalseZero.rows,official);
const finalized=projectLiveHeadToHeadStandings({officialRows:official,fixtures,liveScores:scores,season:2026,cartolaRound:25,competitionRound,completed:[{id:'2026:25'}]});
assert.equal(finalized.applied,false);assert.deepEqual(finalized.rows,official);

const baseline=Object.fromEntries(clubs.map(club=>[club.official_name,{j:1,v:1,e:0,d:0}]));
const stateDoc={temporada_atual:2026,aproveitamento:baseline,mvp_historico:{},merda_historico:{},zikado:{}};
const finalRound={id:'2026:23',season:2026,round:23,status:'final',official:true,trusted:true,fixtures:fixtures.map(([teamA,teamB],index)=>({teamA,scoreA:100-index,teamB,scoreB:90-index})),scores:Object.fromEntries(ids.map((id,index)=>[id,100-index]))};
const store={clubs,stateDoc,historicalRounds:{'23':{scores:finalRound.scores},'24':{scores:Object.fromEntries(ids.map(id=>[id,999]))}},historyDoc:{seasons:{'2026':{cartola_rounds:{'23':{scores:finalRound.scores},'24':{scores:Object.fromEntries(ids.map(id=>[id,999]))}}}}},pc1Results:{},pc2Results:{5:finalRound.fixtures.map(match=>[match.teamA,match.scoreA,match.teamB,match.scoreB])},importedRounds:{}};
const statistics=deriveLeagueStatistics(store,{baselineAsOfRound:22});
assert.deepEqual(statistics.appliedRoundIds,['2026:23']);assert.equal(statistics.rows.reduce((sum,row)=>sum+row.played,0),20);
assert.equal(allScoreRecords(store).some(record=>record.season===2026&&record.round===24),false);

const home=read('home-page.html'),favorite=home.indexOf('data-od-id="your-team"'),highlights=home.indexOf('data-od-id="home-highlights"'),news=home.indexOf('data-od-id="latest-events"'),table=home.indexOf('id="homeStandings"');
assert.ok(favorite<highlights&&highlights<news&&news<table);
const profile=read('assets/js/app/profile.js'),shared=read('assets/js/app/shared.css');
assert.match(shared,/\.profile-dialog\.profile-editing\{position:fixed!important/);assert.match(shared,/100dvh/);assert.match(profile,/event\.key==='Escape'/);assert.match(profile,/returnFocus\?\.focus/);assert.match(profile,/event\.target===dialog/);assert.match(profile,/plios\.preferences\.v1/);
const classic=read('api/cartola/classic-league.js');assert.match(classic,/\/liga\/\$\{SLUG\}/);assert.match(classic,/\/time\/id\/\$\{club\.team_id\}/);assert.match(classic,/CACHE_TTL=60_000/);assert.match(classic,/totalPoints==null/);assert.doesNotMatch(classic,/token|cookie|authorization/i);
console.log('integrated-live-home-test: ok');
