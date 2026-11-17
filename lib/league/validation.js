export class LeagueValidationError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'LeagueValidationError'; this.code = code; this.details = details; }
}

export function assertTeamId(value, knownIds) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new LeagueValidationError('INVALID_TEAM_ID', 'team_id deve ser um inteiro positivo', { value });
  if (knownIds && !knownIds.has(id)) throw new LeagueValidationError('UNKNOWN_TEAM', 'team_id não pertence ao catálogo', { team_id: id });
  return id;
}

export function assertFinalScore(value, field = 'score') {
  if (value === null || value === undefined || value === '') throw new LeagueValidationError('MISSING_SCORE', `${field} ausente`);
  const score = Number(value);
  if (!Number.isFinite(score)) throw new LeagueValidationError('INVALID_SCORE', `${field} inválido`, { value });
  return Math.round(score * 100) / 100;
}

export function validateRoundInput({ season, cartola_round, clubs, scores }) {
  if (!Number.isInteger(Number(season)) || Number(season) < 2023) throw new LeagueValidationError('INVALID_SEASON', 'Temporada inválida');
  const round = Number(cartola_round);
  if (!Number.isInteger(round) || round < 1 || round > 38) throw new LeagueValidationError('INVALID_ROUND', 'Rodada Cartola inexistente', { cartola_round });
  const active = (clubs || []).filter(club => club.active !== false);
  if (active.length !== 10) throw new LeagueValidationError('INVALID_CLUB_COUNT', 'A rodada exige exatamente 10 clubes ativos', { count: active.length });
  const ids = new Set(active.map(club => assertTeamId(club.team_id)));
  if (ids.size !== 10) throw new LeagueValidationError('DUPLICATE_TEAM', 'O catálogo possui team_id duplicado');
  const normalized = {};
  for (const id of ids) normalized[id] = assertFinalScore(scores?.[id] ?? scores?.[String(id)], `score:${id}`);
  const unknown = Object.keys(scores || {}).map(Number).filter(id => !ids.has(id));
  if (unknown.length) throw new LeagueValidationError('UNKNOWN_TEAM', 'Há pontuação de clube desconhecido', { team_ids: unknown });
  return { round, active, ids, scores: normalized };
}
