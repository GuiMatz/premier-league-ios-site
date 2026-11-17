import { assertFinalScore, assertTeamId, LeagueValidationError } from './validation.js';

export function normalizeMatch(input, knownIds) {
  const home = assertTeamId(input.home_team_id, knownIds), away = assertTeamId(input.away_team_id, knownIds);
  if (home === away) throw new LeagueValidationError('SELF_MATCH', 'Um clube não pode enfrentar a si mesmo');
  const homeMissing = input.home_score == null, awayMissing = input.away_score == null;
  if (homeMissing !== awayMissing) return { ...input, home_team_id: home, away_team_id: away, home_score: homeMissing ? null : assertFinalScore(input.home_score), away_score: awayMissing ? null : assertFinalScore(input.away_score), status: 'partial' };
  const status = homeMissing ? 'scheduled' : 'final';
  return { match_id: input.match_id, competition_id: input.competition_id, season: Number(input.season), competition_round: Number(input.competition_round), cartola_round: Number(input.cartola_round), home_team_id: home, away_team_id: away, home_score: homeMissing ? null : assertFinalScore(input.home_score), away_score: awayMissing ? null : assertFinalScore(input.away_score), status };
}

export function finalizeMatches({ fixtures, scores, competition_id, competition_round, cartola_round, season, knownIds }) {
  if (!Array.isArray(fixtures) || fixtures.length !== 5) throw new LeagueValidationError('INCOMPLETE_FIXTURES', 'A rodada exige cinco confrontos');
  const seen = new Set();
  const matches = fixtures.map((fixture, index) => {
    const home = Number(fixture.home_team_id ?? fixture[0]), away = Number(fixture.away_team_id ?? fixture[1]);
    if (seen.has(home) || seen.has(away)) throw new LeagueValidationError('DUPLICATE_FIXTURE_TEAM', 'Clube aparece mais de uma vez na rodada');
    seen.add(home); seen.add(away);
    return normalizeMatch({ match_id: `${season}:${competition_id}:${competition_round}:${index + 1}`, competition_id, season, competition_round, cartola_round, home_team_id: home, away_team_id: away, home_score: scores[home], away_score: scores[away] }, knownIds);
  });
  if (seen.size !== 10 || matches.some(match => match.status !== 'final')) throw new LeagueValidationError('INCOMPLETE_FIXTURES', 'Confrontos não cobrem os 10 clubes com placares finais');
  return matches;
}
