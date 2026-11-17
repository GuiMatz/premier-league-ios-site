const numberOrNull = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const isoOrNull = value => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); };

export function normalizeMarketStatus(payload = {}, errors = []) {
  if (errors.length) return 'partial';
  const explicit = String(payload.roundStatus || payload.round_status || '').toLowerCase();
  if (['final','round_final'].includes(explicit)) return 'round_final';
  if (['live','round_live'].includes(explicit)) return 'round_live';
  const statusId = numberOrNull(payload.statusId ?? payload.status_id ?? payload.status?.id);
  if (statusId === 1 || payload.isOpen === true) return 'market_open';
  if (statusId === 2 || payload.isOpen === false) return 'market_closed';
  return 'unavailable';
}

export function normalizeCartolaTeam(team = {}, catalogClub) {
  const id = numberOrNull(team.id ?? team.team_id ?? team.cartola_team_id);
  const lineup = team.lineup && typeof team.lineup === 'object' ? team.lineup : null;
  return {
    team_id: catalogClub?.team_id ?? id,
    cartola_team_id: id,
    round_score: numberOrNull(team.roundPoints ?? team.round_score ?? team.pontos),
    championship_score: numberOrNull(team.totalPoints ?? team.championship_score ?? team.pontos_campeonato),
    budget: numberOrNull(team.budget ?? team.patrimonio),
    lineup,
    captain_id: numberOrNull(team.captain?.id ?? team.captain_id ?? team.capitao_id),
    luxury_reserve: team.luxuryReserve ?? team.luxury_reserve ?? (numberOrNull(team.reserva_luxo_id) == null ? null : { athlete_id:numberOrNull(team.reserva_luxo_id) }),
    lineup_round_id: numberOrNull(team.lineupRoundId ?? team.rodada_time_id),
    scaled: typeof team.scaled === 'boolean' ? team.scaled : typeof team.escalou === 'boolean' ? team.escalou : null,
    data_status: id == null ? 'unavailable' : 'available'
  };
}

export function normalizeCartolaSnapshot(payload = {}, { catalog, fetchedAt } = {}) {
  const clubsById = new Map((catalog?.clubs || catalog || []).map(club => [Number(club.team_id), club]));
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const market = payload.market || {};
  const clubs = (payload.teams || payload.clubs || []).map(team => normalizeCartolaTeam(team, clubsById.get(Number(team.id ?? team.team_id ?? team.cartola_team_id))));
  return {
    schema_version: 1,
    fetched_at: isoOrNull(fetchedAt ?? payload.fetched_at),
    cartola_round: numberOrNull(market.round ?? payload.cartola_round ?? payload.rodada),
    market_status: normalizeMarketStatus({ ...market, roundStatus: payload.round_status ?? payload.roundStatus }, errors),
    market_signal: payload.round_status || payload.roundStatus ? 'explicit_round_status' : market.statusId != null || market.isOpen != null ? 'cartola_market_status' : 'unavailable',
    clubs,
    source_errors: errors.map(error => ({ team_id:numberOrNull(error.id ?? error.team_id), code:error.code || 'SOURCE_ERROR' }))
  };
}

export function localStateToCartolaPayload(state, catalog, fetchedAt) {
  const round = Number(state.rodada), scores = state.round_scores?.[String(round)] || {};
  return { fetched_at:fetchedAt, cartola_round:round, market:{round,statusId:state.status_anterior==='aberto'?1:state.status_anterior==='fechado'?2:null,isOpen:state.status_anterior==='aberto'?true:state.status_anterior==='fechado'?false:null}, teams:(catalog.clubs||[]).map(club=>({id:club.team_id,roundPoints:scores[String(club.team_id)]??null,totalPoints:null,budget:null,lineup:null,captain_id:state.capitao_por_time?.[club.official_name]??null,reserva_luxo_id:state.reserva_luxo_por_time?.[club.official_name]??null})) };
}
