import { deriveFormation, normalizeLineup } from '../../lib/league/lineups.js';
const POSITIONS={1:'GOL',2:'LAT',3:'ZAG',4:'MEI',5:'ATA',6:'TEC'};
const athleteId=value=>Number(value?.atleta_id??value?.athlete_id??value?.id);
const adaptAthlete=value=>({athlete_id:athleteId(value),name:value.nome||value.nome_atleta||null,nickname:value.apelido||value.nickname||null,position:POSITIONS[Number(value.posicao_id)]||String(value.position||'').toUpperCase()||null,photo:value.foto||value.photo||null,real_club_id:value.clube_id==null?null:Number(value.clube_id),status_id:value.status_id==null?null:Number(value.status_id),price:value.preco_num==null?null:Number(value.preco_num),is_captain:false});

export function adaptCartolaLineup(payload,{teamId,cartolaTeamId,season,cartolaRound,capturedAt,knownTeamIds,locked=true,confirmedForRound=false}={}){
 const lineupRoundId=Number(payload?.time?.rodada_time_id??payload?.rodada_time_id);
 if(!Number.isInteger(lineupRoundId)||lineupRoundId<=0)return{status:'invalid',lineup:null,validation:{status:'invalid',code:'LINEUP_ROUND_UNAVAILABLE',details:{expected_round:Number(cartolaRound),lineup_round_id:null}}};
 if(lineupRoundId>Number(cartolaRound))return{status:'invalid',lineup:null,validation:{status:'invalid',code:'LINEUP_ROUND_MISMATCH',details:{expected_round:Number(cartolaRound),lineup_round_id:lineupRoundId}}};
 const inherited=lineupRoundId<Number(cartolaRound);
 if(inherited&&!confirmedForRound)return{status:'invalid',lineup:null,validation:{status:'invalid',code:'INHERITED_LINEUP_UNCONFIRMED',details:{expected_round:Number(cartolaRound),cartola_rodada_time_id:lineupRoundId}}};
 const raw=Array.isArray(payload?.atletas)?payload.atletas:Object.values(payload?.atletas||{}),rawReserves=Array.isArray(payload?.reservas)?payload.reservas:Object.values(payload?.reservas||{}),captainId=Number(payload?.capitao_id),reserveId=Number(payload?.reserva_luxo_id);
 const athletes=raw.map(adaptAthlete);
 // Current Cartola payloads keep every bench athlete in `reservas`. Older
 // captured fixtures occasionally kept only the luxury reserve in `atletas`;
 // accept that shape only for a current-round lineup, never for inheritance.
 const legacyLuxuryReserve=!inherited&&rawReserves.length===0?athletes.find(a=>a.athlete_id===reserveId&&a.position!=='TEC')||null:null;
 const regularReserves=inherited?[]:(rawReserves.length?rawReserves.map(adaptAthlete):(legacyLuxuryReserve?[legacyLuxuryReserve]:[]));
 const reserve=inherited?null:regularReserves.find(a=>a.athlete_id===reserveId)||null,coach=athletes.find(a=>a.position==='TEC')||null;
 const starters=athletes.filter(a=>a.position!=='TEC'&&a.athlete_id!==legacyLuxuryReserve?.athlete_id).map(a=>({...a,is_captain:a.athlete_id===captainId}));
 const formation=deriveFormation(starters),contract={schema_version:2,season:Number(season),cartola_round:Number(cartolaRound),lineup_round_id:Number(cartolaRound),cartola_rodada_time_id:lineupRoundId,lineup_source:inherited?'inherited':'current_round',lineup_inherited:inherited,team_id:Number(teamId),cartola_team_id:Number(cartolaTeamId??teamId),captured_at:capturedAt,formation,starters,reserves:regularReserves,coach,captain_id:captainId,luxury_reserve:reserve,budget:payload?.time?.patrimonio??payload?.patrimonio??null,points:payload?.pontos??null,source:'cartola:time/id',locked};
 if(!formation)return{status:'invalid',lineup:contract,validation:{status:'invalid',code:'INVALID_FORMATION'}};
 try{return{status:'valid',lineup:normalizeLineup(contract,knownTeamIds),validation:{status:'valid'}};}catch(error){return{status:'invalid',lineup:contract,validation:{status:'invalid',code:error.code||'INVALID_LINEUP',details:error.details||null}};}
}

export const isLineupRoundCompatible=(lineup,targetRound)=>Number(lineup?.cartola_round)===Number(targetRound)&&Number(lineup?.lineup_round_id)===Number(targetRound)&&(!lineup?.lineup_inherited||(Number.isInteger(Number(lineup?.cartola_rodada_time_id))&&Number(lineup.cartola_rodada_time_id)>0&&Number(lineup.cartola_rodada_time_id)<Number(targetRound)&&lineup.lineup_source==='inherited'));

export function compareLockedLineups(existing,incoming){
 if(!existing)return{status:'new',lineup:incoming};
 const canonical=value=>JSON.stringify({team_id:value.team_id,cartola_round:value.cartola_round,starters:value.starters.map(a=>a.athlete_id),reserves:(value.reserves||[]).map(a=>a.athlete_id),coach:value.coach?.athlete_id,captain_id:value.captain_id,luxury_reserve:value.luxury_reserve?.athlete_id??null});
 return canonical(existing)===canonical(incoming)?{status:'noop',lineup:existing}:{status:'conflict',lineup:existing,incoming};
}
