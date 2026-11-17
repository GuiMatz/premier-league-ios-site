import { normalizeCartolaSnapshot } from './input-normalizer.js';
import { normalizeLineup } from '../../lib/league/lineups.js';

export function validateLeagueSnapshot(snapshot, catalog) {
  const expected = new Set((catalog?.clubs || catalog || []).filter(club=>club.active!==false).map(club=>Number(club.team_id)));
  const errors=[],warnings=[],seen=new Set();
  if (!snapshot || snapshot.schema_version !== 1) errors.push({code:'INVALID_SCHEMA_VERSION'});
  if (!snapshot?.fetched_at || Number.isNaN(Date.parse(snapshot.fetched_at))) errors.push({code:'INVALID_FETCHED_AT'});
  if (!Number.isInteger(snapshot?.cartola_round) || snapshot.cartola_round<1 || snapshot.cartola_round>38) errors.push({code:'INVALID_ROUND'});
  for (const club of snapshot?.clubs || []) {
    const id=Number(club.team_id);
    if (!expected.has(id)) errors.push({code:'UNKNOWN_TEAM',team_id:id});
    if (seen.has(id)) errors.push({code:'DUPLICATE_TEAM',team_id:id}); seen.add(id);
    if (club.round_score!==null&&!Number.isFinite(Number(club.round_score))) errors.push({code:'INVALID_SCORE',team_id:id});
  }
  for (const id of expected) if (!seen.has(id)) errors.push({code:'MISSING_TEAM',team_id:id});
  if ((snapshot?.clubs||[]).length!==10) errors.push({code:'INVALID_CLUB_COUNT',count:(snapshot?.clubs||[]).length});
  const nullScores=(snapshot?.clubs||[]).filter(club=>club.round_score===null).map(club=>club.team_id);
  if (nullScores.length) warnings.push({code:'UNKNOWN_SCORES',team_ids:nullScores});
  const partial=errors.length>0||warnings.length>0||snapshot.market_status==='partial'||snapshot.source_errors?.length>0;
  return { valid:errors.length===0, status:errors.length?'invalid':partial?'partial':'complete', finalizable:errors.length===0&&!nullScores.length&&snapshot.market_status==='round_final', errors, warnings };
}

export function adaptCartolaSnapshot(payload, options) {
  const snapshot=normalizeCartolaSnapshot(payload,options);
  const knownIds=new Set((options.catalog?.clubs||options.catalog||[]).map(club=>Number(club.team_id)));
  const lineup_reports=snapshot.clubs.map(club=>{
    if (!club.lineup) return {team_id:club.team_id,status:'unavailable',lineup:null};
    try { return {team_id:club.team_id,status:'available',lineup:normalizeLineup({...club.lineup,team_id:club.team_id,season:club.lineup.season||new Date(snapshot.fetched_at).getUTCFullYear(),cartola_round:club.lineup.cartola_round||snapshot.cartola_round,captain_id:club.lineup.captain_id??club.captain_id,luxury_reserve:club.lineup.luxury_reserve??club.luxury_reserve},knownIds)}; }
    catch(error){return {team_id:club.team_id,status:'invalid',lineup:null,error:{code:error.code||'INVALID_LINEUP'}};}
  });
  return { snapshot, validation:validateLeagueSnapshot(snapshot,options.catalog), lineup_reports };
}

export function snapshotToEngineInput(snapshot, { catalog, fixtures, history, occurred_at, legacyOrder = [] }) {
  const validation=validateLeagueSnapshot(snapshot,catalog);
  if (!validation.finalizable) return { status:'not_finalizable',validation,input:null };
  return { status:'ready',validation,input:{season:Number(new Date(snapshot.fetched_at).getUTCFullYear()),cartola_round:snapshot.cartola_round,clubs:catalog.clubs||catalog,scores:Object.fromEntries(snapshot.clubs.map(club=>[club.team_id,club.round_score])),fixtures,history,occurred_at:occurred_at||snapshot.fetched_at,source:'manual',legacy_order_team_ids:legacyOrder} };
}
