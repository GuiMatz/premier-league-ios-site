import { assertFinalScore, assertTeamId, LeagueValidationError } from './validation.js';

export const VALID_FORMATIONS=Object.freeze(['3-4-3','3-5-2','4-3-3','4-4-2','4-5-1','5-3-2','5-4-1']);
export const VALID_CARTOLA_POSITIONS=Object.freeze(['GOL','LAT','ZAG','MEI','ATA','TEC']);
export const formationPositionGroup=position=>['LAT','ZAG','DEF'].includes(String(position).toUpperCase())?'DEF':String(position).toUpperCase();
export const luxuryReservePosition=position=>{const exact=String(position||'').toUpperCase();return ['GOL','LAT','ZAG','MEI','ATA'].includes(exact)?exact:null;};

export function deriveFormation(starters=[]){
  const counts=starters.reduce((acc,athlete)=>{const key=formationPositionGroup(athlete.position);acc[key]=(acc[key]||0)+1;return acc;},{});
  if(counts.GOL!==1||(counts.DEF||0)+(counts.MEI||0)+(counts.ATA||0)!==10)return null;
  const formation=`${counts.DEF||0}-${counts.MEI||0}-${counts.ATA||0}`;
  return VALID_FORMATIONS.includes(formation)?formation:null;
}

export function normalizeLineup(payload,knownIds){
  const starters=(payload.starters||[]).map(athlete=>({...athlete,athlete_id:Number(athlete.athlete_id??athlete.id),position:String(athlete.position).toUpperCase(),position_group:formationPositionGroup(athlete.position)}));
  const formation=String(payload.formation||deriveFormation(starters)||'');
  if(!VALID_FORMATIONS.includes(formation))throw new LeagueValidationError('INVALID_FORMATION','Formação inválida',{formation});
  if(starters.length!==11)throw new LeagueValidationError('INVALID_STARTER_COUNT','Escalação exige 11 titulares',{count:starters.length});
  if(starters.some(value=>!Number.isInteger(value.athlete_id)))throw new LeagueValidationError('INVALID_ATHLETE','Titular sem athlete_id válido');
  if(new Set(starters.map(value=>value.athlete_id)).size!==11)throw new LeagueValidationError('DUPLICATE_ATHLETE','Titulares duplicados');
  const counts=starters.reduce((acc,value)=>(acc[value.position_group]=(acc[value.position_group]||0)+1,acc),{}),[defenders,midfielders,forwards]=formation.split('-').map(Number);
  if(counts.GOL!==1||counts.DEF!==defenders||counts.MEI!==midfielders||counts.ATA!==forwards)throw new LeagueValidationError('FORMATION_MISMATCH','Posições não correspondem à formação',{counts,formation});
  const coach=payload.coach;
  if(!coach||formationPositionGroup(coach.position||'TEC')!=='TEC'||!Number.isInteger(Number(coach.athlete_id??coach.id)))throw new LeagueValidationError('INVALID_COACH','É obrigatório um técnico separado');
  const captainId=Number(payload.captain_id);
  if(!starters.some(value=>value.athlete_id===captainId))throw new LeagueValidationError('INVALID_CAPTAIN','Capitão deve estar entre os titulares');
  const reserve=payload.luxury_reserve==null?null:{...payload.luxury_reserve,athlete_id:Number(payload.luxury_reserve.athlete_id??payload.luxury_reserve.id),position:String(payload.luxury_reserve.position||'').toUpperCase(),position_group:formationPositionGroup(payload.luxury_reserve.position),luxury_reserve_position:luxuryReservePosition(payload.luxury_reserve.position)};
  if(reserve&&(!Number.isInteger(reserve.athlete_id)||reserve.luxury_reserve_position===null))throw new LeagueValidationError('INVALID_LUXURY_RESERVE','Reserva de Luxo precisa de ID e posição exata válidos');
  const reserves=(payload.reserves||[]).map(athlete=>({...athlete,athlete_id:Number(athlete.athlete_id??athlete.id),position:String(athlete.position||'').toUpperCase(),position_group:formationPositionGroup(athlete.position)}));
  if(reserves.some(value=>!Number.isInteger(value.athlete_id)||luxuryReservePosition(value.position)===null))throw new LeagueValidationError('INVALID_REGULAR_RESERVE','Reserva normal precisa de ID e posição exata');
  if(new Set(reserves.map(value=>value.athlete_id)).size!==reserves.length)throw new LeagueValidationError('DUPLICATE_RESERVE','Reservas duplicados');
  return{schema_version:Number(payload.schema_version||1),team_id:assertTeamId(payload.team_id,knownIds),cartola_team_id:Number(payload.cartola_team_id??payload.team_id),season:Number(payload.season),cartola_round:Number(payload.cartola_round),lineup_round_id:payload.lineup_round_id==null?null:Number(payload.lineup_round_id),cartola_rodada_time_id:payload.cartola_rodada_time_id==null?null:Number(payload.cartola_rodada_time_id),lineup_source:payload.lineup_source||'unknown',lineup_inherited:payload.lineup_inherited===true,captured_at:payload.captured_at||null,formation,starters,reserves,coach:{...coach,athlete_id:Number(coach.athlete_id??coach.id),position:'TEC'},captain_id:captainId,luxury_reserve:reserve,luxury_reserve_triggered:typeof payload.luxury_reserve_triggered==='boolean'?payload.luxury_reserve_triggered:null,budget:payload.budget==null?null:assertFinalScore(payload.budget,'budget'),points:payload.points==null?null:assertFinalScore(payload.points,'points'),source:payload.source||'unknown',locked:payload.locked===true};
}
