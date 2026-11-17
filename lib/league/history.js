export function roundScoresFromHistory(history, season) {
  const rounds = history?.seasons?.[String(season)]?.cartola_rounds || {};
  return Object.fromEntries(Object.entries(rounds).map(([round, payload]) => [round, Object.fromEntries(Object.entries(payload?.scores || {}).map(([id, value]) => [Number(id), Number(value?.points ?? value)]))]));
}

export function historicalAward(history, season, round, type) {
  const payload = history?.seasons?.[String(season)]?.cartola_rounds?.[String(round)];
  if (!payload) return null;
  return type === 'mvp' ? { team_id: Number(payload.mvp_team_id), score: Number(payload.mvp_points), round: Number(round) } : { team_id: Number(payload.merda_team_id), score: Number(payload.merda_points), round: Number(round) };
}

export function historicalCompetitionContract({ competition_id, season, standings, matches = [], source_status, official_order = [] }) {
  if (!['complete','partial','consolidated_only'].includes(source_status)) throw new Error('source_status inválido');
  return { competition_id, season:Number(season), source_status, standings:standings || [], matches, official_order:official_order.map(Number), can_recalculate_standings:source_status==='complete', standings_source:source_status==='complete'?'calculated_matches':'official_consolidated' };
}

export function resolveHistoricalStandings(contract, calculate) {
  if (contract.source_status !== 'complete') return { rows:contract.standings, source:'official_consolidated', source_status:contract.source_status, recalculated:false, official_order:contract.official_order };
  return { ...calculate(contract.matches, contract.official_order), source:'complete_matches', source_status:'complete', recalculated:true };
}
