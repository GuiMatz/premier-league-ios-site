function optionsFrom(roundOrOptions, legacyOrderTeamIds) {
  return typeof roundOrOptions === 'object' ? { round: Number(roundOrOptions.round), legacyOrder: roundOrOptions.legacyOrder || [] } : { round: Number(roundOrOptions), legacyOrder: legacyOrderTeamIds || [] };
}

function resolveExtreme(scores, roundOrOptions, mode, legacyOrderTeamIds = []) {
  const options = optionsFrom(roundOrOptions, legacyOrderTeamIds), round = options.round;
  const entries = Object.entries(scores).map(([team_id, score]) => ({ team_id: Number(team_id), score: Number(score), round: Number(round) }));
  const extreme = mode === 'max' ? Math.max(...entries.map(value => value.score)) : Math.min(...entries.map(value => value.score));
  const tied = entries.filter(value => value.score === extreme);
  if (tied.length === 1) return { status: 'resolved', winner: tied[0], award: tied[0], candidates: tied };
  const order = new Map(options.legacyOrder.map((id, index) => [Number(id), index]));
  if (tied.every(value => order.has(value.team_id))) {
    tied.sort((a, b) => order.get(a.team_id) - order.get(b.team_id));
    return { status: 'resolved_legacy', winner: tied[0], award: tied[0], candidates: tied, tie_break: 'LEGACY_COMPATIBILITY_ORDER' };
  }
  return { status: 'ambiguous', award: null, candidates: tied, reason: 'UNDEFINED_AWARD_TIE_BREAK' };
}

export const calculateMvp = (scores, roundOrOptions, legacyOrderTeamIds = []) => resolveExtreme(scores, roundOrOptions, 'max', legacyOrderTeamIds);
export const calculateMerda = (scores, roundOrOptions, legacyOrderTeamIds = []) => resolveExtreme(scores, roundOrOptions, 'min', legacyOrderTeamIds);

export function updateZikado(current, teamIds, mvpTeamId) {
  return Object.fromEntries(teamIds.map(id => [Number(id), Number(id) === Number(mvpTeamId) ? 0 : Number(current?.[id] ?? 0) + 1]));
}
