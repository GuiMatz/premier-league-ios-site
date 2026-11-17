import { isOfficialTitleType } from './competitions.js';

export function registerTitle(titles, title) {
  if (!isOfficialTitleType(title.title_type)) return { status: 'rejected', reason: 'NOT_AN_OFFICIAL_TITLE', titles: [...(titles || [])] };
  if (title.status !== 'finished') return { status: 'rejected', reason: 'COMPETITION_NOT_FINISHED', titles: [...(titles || [])] };
  const key = title.title_id || `${title.title_type}:${title.season}:${title.team_id}`;
  if ((titles || []).some(value => (value.title_id || `${value.title_type}:${value.season}:${value.team_id}`) === key)) return { status: 'noop', titles: [...titles] };
  return { status: 'registered', titles: [...(titles || []), { ...title, title_id: key }] };
}

export function detectLeagueChampion({ competition_id, season, competition_round, final_round, standings }) {
  if (Number(competition_round) !== Number(final_round)) return { status: 'pending', champion: null };
  if (!standings?.rows?.length) return { status: 'unavailable', champion: null };
  if (standings.ambiguous) return { status: 'ambiguous', champion: null, reason: 'UNDEFINED_STANDINGS_TIE_BREAK' };
  return { status: 'resolved', champion: { team_id: standings.rows[0].team_id, competition_id, season } };
}
