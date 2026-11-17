export const SCORE_PROVENANCE = Object.freeze({ OFFICIAL_ROUND_SCORE:'OFFICIAL_ROUND_SCORE', SPECIAL_SCORE:'SPECIAL_SCORE', LEGACY_SCORE:'LEGACY_SCORE', UNKNOWN:'UNKNOWN' });

export function calculateSeasonHighScore(history, season, policy = {}) {
  const validProvenance = new Set(policy.validProvenance || [SCORE_PROVENANCE.OFFICIAL_ROUND_SCORE, SCORE_PROVENANCE.SPECIAL_SCORE]);
  const candidates = [];
  const seasonData = history?.seasons?.[String(season)] || history?.[String(season)] || null;
  for (const [round, payload] of Object.entries(seasonData?.cartola_rounds || {})) {
    for (const [teamId, value] of Object.entries(payload?.scores || {})) {
      const points = Number(value?.points ?? value);
      if (Number.isFinite(points)) candidates.push({ team_id: Number(teamId), points, round: Number(round), cartola_round: Number(round), competition: 'Cartola', provenance: SCORE_PROVENANCE.OFFICIAL_ROUND_SCORE, source: payload?.source || null, timestamp: payload?.processed_at || null, eligible: validProvenance.has(SCORE_PROVENANCE.OFFICIAL_ROUND_SCORE) });
    }
  }
  for (const value of seasonData?.special_scores || []) {
    const points = Number(value?.points), team_id = Number(value?.team_id);
    if (Number.isFinite(points) && Number.isInteger(team_id)) candidates.push({ team_id, points, round: value.round, cartola_round: null, competition: value.competition || 'Especial', provenance: SCORE_PROVENANCE.SPECIAL_SCORE, source: value.source || null, timestamp: value.processed_at || null, eligible: validProvenance.has(SCORE_PROVENANCE.SPECIAL_SCORE) });
  }
  for (const value of history?.legacy_records || []) {
    if (Number(value.year) !== Number(season)) continue;
    const points = Number(value.points), team_id = Number(value.team_id);
    if (Number.isFinite(points) && Number.isInteger(team_id)) candidates.push({ team_id, points, round:value.round, cartola_round:null, competition:value.competition||'Legacy', provenance:SCORE_PROVENANCE.LEGACY_SCORE, source:value.source||null, timestamp:value.processed_at||null, eligible:validProvenance.has(SCORE_PROVENANCE.LEGACY_SCORE) });
  }
  const eligible = candidates.filter(value => value.eligible);
  if (!eligible.length) return { status: 'unavailable', record: null, holders: [], candidates };
  const max = Math.max(...eligible.map(value => value.points));
  const holders = eligible.filter(value => value.points === max);
  return { status: holders.length === 1 ? 'resolved' : 'co_record', record: holders.length === 1 ? holders[0] : null, holders, candidates };
}
