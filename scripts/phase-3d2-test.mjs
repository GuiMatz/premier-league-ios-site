import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adaptCartolaLineup,isLineupRoundCompatible } from '../server/league/lineup-adapter.js';
import { calculateLiveTeamScore,normalizeAthleteScores } from '../lib/league/index.js';

const root=new URL('../',import.meta.url),catalog=JSON.parse(await readFile(new URL('data/catalog/clubs.json',root),'utf8')),known=new Set(catalog.clubs.map(club=>club.team_id));
const realInheritedTeamIds=[10000006,10000008],positions=['GOL','LAT','LAT','ZAG','ZAG','MEI','MEI','MEI','ATA','ATA','ATA'],positionId={GOL:1,LAT:2,ZAG:3,MEI:4,ATA:5,TEC:6};
const payloadFor=(teamId,lineupRound,{currentReserve=false}={})=>{const base=teamId*100,starters=positions.map((position,index)=>({atleta_id:base+index+1,apelido:`A${index+1}`,posicao_id:positionId[position],clube_id:1})),coach={atleta_id:base+90,apelido:'TEC',posicao_id:6},reserve={atleta_id:base+99,apelido:'RL atual',posicao_id:2};return{atletas:currentReserve?[...starters,coach,reserve]:[...starters,coach],capitao_id:base+2,reserva_luxo_id:currentReserve?base+99:base+2,time:{patrimonio:100,rodada_time_id:lineupRound}};};
const adapt=(teamId,payload,confirmedForRound=false)=>adaptCartolaLineup(payload,{teamId,season:2026,cartolaRound:23,capturedAt:'2026-08-15T12:00:00Z',knownTeamIds:known,confirmedForRound});

// A) Escalação alterada na própria R23 preserva o RL normalmente.
const current=adapt(realInheritedTeamIds[0],payloadFor(realInheritedTeamIds[0],23,{currentReserve:true}));assert.equal(current.status,'valid');assert.equal(current.lineup.lineup_inherited,false);assert.equal(current.lineup.luxury_reserve.athlete_id,realInheritedTeamIds[0]*100+99);

for(const teamId of realInheritedTeamIds){
  const payload=payloadFor(teamId,19),staleRlId=payload.reserva_luxo_id,captainId=payload.capitao_id,coachId=teamId*100+90;
  assert.equal(adapt(teamId,payload).validation.code,'INHERITED_LINEUP_UNCONFIRMED');
  const inherited=adapt(teamId,payload,true);assert.equal(inherited.status,'valid');assert.equal(inherited.lineup.cartola_round,23);assert.equal(inherited.lineup.lineup_round_id,23);assert.equal(inherited.lineup.cartola_rodada_time_id,19);assert.equal(inherited.lineup.lineup_source,'inherited');assert.equal(inherited.lineup.lineup_inherited,true);assert.equal(inherited.lineup.starters.length,11);assert.equal(inherited.lineup.coach.athlete_id,coachId);assert.equal(inherited.lineup.formation,'4-3-3');assert.equal(inherited.lineup.captain_id,captainId);assert.equal(inherited.lineup.luxury_reserve,null);assert.equal(inherited.lineup.starters.some(player=>player.athlete_id===staleRlId),true);assert.equal(isLineupRoundCompatible(inherited.lineup,23),true);

  // Locked R23 inherited: 11 titulares + técnico, capitão x1.5 e nenhuma substituição por RL.
  const scores=normalizeAthleteScores({fetched_at:'2026-08-15T13:00:00Z',cartola_round:23,athletes:Object.fromEntries([...inherited.lineup.starters,inherited.lineup.coach].map(player=>[player.athlete_id,{raw_score:1}]))});
  const live=calculateLiveTeamScore(inherited.lineup,scores);assert.equal(live.status,'complete');assert.equal(live.complete,true);assert.equal(live.players.length,11);assert.equal(live.coach.raw_score,1);assert.equal(live.captain.athlete_id,captainId);assert.equal(live.captain.captain_multiplier,1.5);assert.equal(live.captain.effective_score,1.5);assert.equal(live.computed_live_score,12.5);assert.deepEqual(live.missing_athletes,[]);assert.equal(live.luxury_reserve.athlete_id,null);assert.equal(live.luxury_reserve.triggered,false);
}

// Rodada futura continua rejeitada.
const future=adapt(realInheritedTeamIds[0],payloadFor(realInheritedTeamIds[0],24));assert.equal(future.status,'invalid');assert.equal(future.validation.code,'LINEUP_ROUND_MISMATCH');
console.log('OK: Fase 3D.2 — dois casos reais 4-3-3 preservam XI/capitão/técnico e descartam apenas o papel do RL antigo.');
