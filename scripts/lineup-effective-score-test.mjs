import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adaptCartolaLineup } from '../server/league/lineup-adapter.js';
import { projectEffectiveLineup } from '../assets/js/app/lineup-projection.js';

const athlete=(id,position,extra={})=>({athlete_id:id,nickname:`Atleta ${id}`,position,real_club_id:100+id,price:10,...extra});
const starters=[athlete(1,'GOL'),athlete(2,'LAT'),athlete(3,'LAT'),athlete(4,'ZAG'),athlete(5,'ZAG'),athlete(6,'MEI'),athlete(7,'MEI'),athlete(8,'MEI'),athlete(9,'ATA'),athlete(10,'ATA'),athlete(11,'ATA')];
const coach=athlete(90,'TEC');
const baseLineup={team_id:1,cartola_round:24,lineup_source:'current_round',lineup_inherited:false,starters,coach,captain_id:2,reserves:[athlete(20,'LAT'),athlete(21,'ATA')],luxury_reserve:athlete(21,'ATA'),points:null};
const played=(score)=>({participation:'played',status:'played',raw_score:score});
const absent={participation:'not_played',status:'not_played',raw_score:null};
const scores=(overrides={})=>({athletes:Object.fromEntries([...starters,coach,...baseLineup.reserves].map(item=>[item.athlete_id,played(1)])),club_matches:{},...overrides});
const withAthletes=overrides=>scores({athletes:{...scores().athletes,...overrides}});

// A: absent starter + positive same-position reserve => substitution.
let result=projectEffectiveLineup(baseLineup,withAthletes({2:absent,20:played(10)}),{roundFinal:true});
assert.equal(result.normalSubstitutions.length,1);assert.equal(result.normalSubstitutions[0].reserveAthleteId,20);

// B: a player who entered the field and scored exactly zero remains effective.
result=projectEffectiveLineup(baseLineup,withAthletes({2:played(0),20:played(10)}),{roundFinal:true});
assert.equal(result.normalSubstitutions.length,0);assert.equal(result.original.find(item=>item.athlete_id===2).effective,true);

// C/D: zero or negative reserve is never activated by the regular bank.
for(const reserveScore of [0,-2]){result=projectEffectiveLineup(baseLineup,withAthletes({2:absent,20:played(reserveScore)}),{roundFinal:true});assert.equal(result.normalSubstitutions.length,0);}

// E/G: captain's positive reserve inherits the armband and the effective total uses 1.5x.
result=projectEffectiveLineup(baseLineup,withAthletes({2:absent,20:played(10)}),{roundFinal:true});
assert.equal(result.captain.effectiveAthleteId,20);assert.equal(result.captain.inherited,true);assert.equal(result.effective.find(item=>item.athlete_id===20).effectiveScore,15);assert.equal(result.effectiveScore,26);

// F: luxury reserve stays identifiable and separate from regular bench semantics.
assert.equal(result.reserves.find(item=>item.athlete_id===21).isLuxuryReserve,true);
const luxuryResult=projectEffectiveLineup(baseLineup,withAthletes({9:played(1),10:played(2),11:played(3),21:played(4)}),{roundFinal:true});
assert.equal(luxuryResult.luxuryReserve.triggered,true);assert.equal(luxuryResult.luxuryReserve.replacedAthleteId,9);

// Real Cartola shape: starters/coach in `atletas`, regular bank in `reservas`, RL id points into the bank.
const positionId={GOL:1,LAT:2,ZAG:3,MEI:4,ATA:5,TEC:6};
const cartolaAthlete=item=>({atleta_id:item.athlete_id,apelido:item.nickname,posicao_id:positionId[item.position],clube_id:item.real_club_id,preco_num:item.price});
const adapted=adaptCartolaLineup({atletas:[...starters,coach].map(cartolaAthlete),reservas:baseLineup.reserves.map(cartolaAthlete),capitao_id:2,reserva_luxo_id:21,pontos:26,time:{rodada_time_id:24,patrimonio:100}},{teamId:1,cartolaTeamId:1,season:2026,cartolaRound:24,capturedAt:'2026-08-24T12:00:00Z',knownTeamIds:new Set([1]),locked:true});
assert.equal(adapted.status,'valid');assert.equal(adapted.lineup.starters.length,11);assert.equal(adapted.lineup.reserves.length,2);assert.equal(adapted.lineup.luxury_reserve.athlete_id,21);

// J: inherited lineups preserve their meaning and do not fabricate an unavailable bench/RL.
const inherited=adaptCartolaLineup({atletas:[...starters,coach].map(cartolaAthlete),reservas:baseLineup.reserves.map(cartolaAthlete),capitao_id:2,reserva_luxo_id:21,time:{rodada_time_id:23}},{teamId:1,cartolaTeamId:1,season:2026,cartolaRound:24,capturedAt:'2026-08-24T12:00:00Z',knownTeamIds:new Set([1]),locked:true,confirmedForRound:true});
assert.equal(inherited.status,'valid');assert.equal(inherited.lineup.lineup_inherited,true);assert.deepEqual(inherited.lineup.reserves,[]);assert.equal(inherited.lineup.luxury_reserve,null);

// H/I and future-capture safeguards remain structural regressions.
const [ui,html,observer,schema]=await Promise.all([readFile(new URL('../assets/js/app/lineups.js',import.meta.url),'utf8'),readFile(new URL('../escalacoes.html',import.meta.url),'utf8'),readFile(new URL('../server/league/shadow-observer.js',import.meta.url),'utf8'),readFile(new URL('../data/schemas/lineup-archive.schema.json',import.meta.url),'utf8')]);
assert.match(ui,/player-name/);assert.match(ui,/player-score/);assert.match(ui,/athleteCrest/);assert.match(ui,/Entrou do banco/);assert.match(html,/captain-mark/);assert.match(html,/BANCO DE RESERVAS/i);assert.match(observer,/reserves/);assert.match(schema,/"reserves"/);

console.log('LINEUP_EFFECTIVE_SCORE_TEST=PASS');
