import { mapCartolaRound } from './rounds.js';
import { validateRoundInput, LeagueValidationError } from './validation.js';
import { finalizeMatches } from './matches.js';
import { calculateHeadToHeadStandings, calculatePremierLeagueStandings, calculateWinRate } from './standings.js';
import { calculateMvp, calculateMerda, updateZikado } from './awards.js';
import { calculateSeasonHighScore } from './records.js';
import { detectLeagueChampion, registerTitle } from './titles.js';
import { createEvent, reconcileEvent } from './events.js';

const clone = value => JSON.parse(JSON.stringify(value));
const emptyState = () => ({ schema_version: 1, round_scores: {}, matches: { pc1: [], pc2: [] }, standings: { 'pl-ios': [], pc1: [], pc2: [] }, awards: { mvp: {}, merda: {}, zikado: {} }, records: {}, titles: [], events: [], finalized_rounds: [] });

export function finalizeRound(input, currentState = {}) {
  const warnings = [], conflicts = [];
  let validated;
  try { validated = validateRoundInput(input); }
  catch (error) {
    const code = error instanceof LeagueValidationError ? error.code : 'VALIDATION_ERROR';
    return { status: ['MISSING_SCORE','INVALID_CLUB_COUNT','INCOMPLETE_FIXTURES'].includes(code) ? 'recovery_required' : 'invalid', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: [{ code, message: error.message, details: error.details }] };
  }
  const mapping = mapCartolaRound(validated.round, Number(input.season));
  if (!mapping) return { status: 'invalid', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: [{ code: 'INVALID_ROUND' }] };
  const state = { ...emptyState(), ...clone(currentState), matches: { ...emptyState().matches, ...(clone(currentState).matches || {}) }, standings: { ...emptyState().standings, ...(clone(currentState).standings || {}) }, awards: { ...emptyState().awards, ...(clone(currentState).awards || {}) } };
  const teamIds = validated.active.map(club => Number(club.team_id));
  let matches = [];
  if (mapping.competition_id) {
    try { matches = finalizeMatches({ fixtures: input.fixtures, scores: validated.scores, competition_id: mapping.competition_id, competition_round: mapping.competition_round, cartola_round: validated.round, season: Number(input.season), knownIds: validated.ids }); }
    catch (error) { return { status: 'recovery_required', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: [{ code: error.code || 'INCOMPLETE_FIXTURES', message: error.message }] }; }
  }
  const mvp = calculateMvp(validated.scores, validated.round, input.legacy_order_team_ids || []);
  const merda = calculateMerda(validated.scores, validated.round, input.legacy_order_team_ids || []);
  if (mvp.status === 'ambiguous' || merda.status === 'ambiguous') return { status: 'ambiguous', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: [{ code: 'UNDEFINED_AWARD_TIE_BREAK', mvp, merda }] };

  const proposedRoundScores = { ...state.round_scores, [validated.round]: validated.scores };
  const proposedMatches = mapping.competition_id ? [...(state.matches[mapping.competition_id] || []).filter(value => value.cartola_round !== validated.round), ...matches] : [];
  const h2h = mapping.competition_id ? calculateHeadToHeadStandings(teamIds, proposedMatches, input.official_standings_order || []) : null;
  const pl = calculatePremierLeagueStandings(teamIds, proposedRoundScores, input.official_standings_order || []);
  const specs = [
    ['round.finalize', 'league', { scores: validated.scores, mapping }],
    ['award.mvp', 'league', mvp.award], ['award.merda', 'league', merda.award],
    ['standings.pl-ios', 'league', { rows: pl.rows }]
  ];
  if (mapping.competition_id) specs.push([`standings.${mapping.competition_id}`, 'league', { rows: h2h.rows }]);
  const occurred_at = input.occurred_at;
  if (!occurred_at || Number.isNaN(Date.parse(occurred_at))) return { status: 'invalid', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: [{ code: 'INVALID_OCCURRED_AT' }] };
  const generated = specs.map(([event_type, scope_id, payload]) => createEvent({ season: Number(input.season), cartola_round: validated.round, event_type, scope_id, occurred_at, source: input.source || 'manual', payload }));
  const decisions = generated.map(event => reconcileEvent(state.events, event));
  const eventConflicts = decisions.filter(value => value.status === 'conflict');
  if (eventConflicts.length) return { status: 'conflict', events: [], nextState: clone(currentState), changes: [], warnings, conflicts: eventConflicts };
  if (decisions.every(value => value.status === 'noop')) return { status: 'noop', events: [], nextState: clone(currentState), changes: [], warnings, conflicts };

  state.round_scores = proposedRoundScores;
  if (mapping.competition_id) { state.matches[mapping.competition_id] = proposedMatches; state.standings[mapping.competition_id] = h2h.rows; }
  state.standings['pl-ios'] = pl.rows;
  state.awards.mvp[mvp.award.team_id] = Number(state.awards.mvp[mvp.award.team_id] || 0) + 1;
  state.awards.merda[merda.award.team_id] = Number(state.awards.merda[merda.award.team_id] || 0) + 1;
  state.awards.zikado = updateZikado(state.awards.zikado, teamIds, mvp.award.team_id);
  state.aproveitamento = Object.fromEntries(teamIds.map(id => { const combined = [...state.matches.pc1, ...state.matches.pc2]; const row = calculateHeadToHeadStandings(teamIds, combined).rows.find(value => value.team_id === id); return [id, { wins: row.wins, losses: row.losses, draws: row.draws, played: row.played, percentage: calculateWinRate(row) }]; }));
  const history = clone(input.history || { seasons: { [input.season]: { cartola_rounds: {} } } });
  history.seasons ??= {}; history.seasons[String(input.season)] ??= { cartola_rounds: {}, special_scores: [] };
  history.seasons[String(input.season)].cartola_rounds[String(validated.round)] = { scores: Object.fromEntries(Object.entries(validated.scores).map(([id, points]) => [id, { points }])) };
  state.records.season_high_score = calculateSeasonHighScore(history, input.season);
  if (validated.round === 36) {
    for (const candidate of [detectLeagueChampion({ competition_id: 'pc2', season: input.season, competition_round: mapping.competition_round, final_round: 18, standings: h2h }), detectLeagueChampion({ competition_id: 'pl-ios', season: input.season, competition_round: validated.round, final_round: 36, standings: pl })]) {
      if (candidate.status === 'resolved') state.titles = registerTitle(state.titles, { title_type: candidate.champion.competition_id, season: Number(input.season), team_id: candidate.champion.team_id, status: 'finished' }).titles;
      else if (candidate.status === 'ambiguous') warnings.push(candidate.reason);
    }
  }
  const applied = decisions.filter(value => value.status === 'apply').map(value => value.event);
  state.events = [...state.events, ...applied]; state.finalized_rounds = [...new Set([...state.finalized_rounds, validated.round])].sort((a,b)=>a-b);
  return { status: warnings.length ? 'applied_with_warnings' : 'applied', events: applied, nextState: state, changes: ['round_scores','matches','standings','awards','aproveitamento','records','events'], warnings, conflicts };
}

export * from './competitions.js'; export * from './rounds.js'; export * from './matches.js'; export * from './standings.js'; export * from './awards.js'; export * from './records.js'; export * from './titles.js'; export * from './lineups.js'; export * from './history.js'; export * from './events.js'; export * from './validation.js';
export * from './live-scoring.js';
