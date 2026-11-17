import { TEAMS, TEAM_IDS, CURRENT_RODADA_PC } from './data/league.js';
import { CONFRONTOS, RESULTADOS, DEFAULT_RESULTADOS_EXTRA, APROVEITAMENTO, PC2_CONFRONTOS, PC2_RESULTADOS } from './data/pc.js';
import { HIST, CURRENT_CAPTAINS, CURRENT_LUXO } from './data/history.js';
import { STATS_BASELINE_ROUND, LAST_OFFICIAL_ROUND } from './data/stats.js';

let resultadosExtra = normalizeResultadosExtra(DEFAULT_RESULTADOS_EXTRA);

export const appState = {
  round: CURRENT_RODADA_PC,
  cartolaRound: null,
  market: null,
  live: {},
  lastLive: {},
  selectedTeam: localStorage.getItem('pli_selected_team') || localStorage.getItem('memibet_my_team') || '',
  fetching: false,
  apiOk: false,
  apiMsg: 'aguardando Cartola',
  historyRound: null,
  userChangedRound: false,
  publicUpdatedAt: '',
  statsRound: STATS_BASELINE_ROUND,
  statsLastRound: { ...LAST_OFFICIAL_ROUND }
};

export function normalizeResultadosExtra(extra) {
  const out = {};
  Object.entries(extra || {}).forEach(([round, matches]) => {
    const roundNumber = Number(round);
    if (!Number.isFinite(roundNumber)) return;
    out[roundNumber] = (matches || [])
      .map(match => [Number(match[0]), Number(match[1]), Number(match[2]), Number(match[3])])
      .filter(match => match.every(Number.isFinite));
  });
  return out;
}

export function getResultados() {
  return { ...RESULTADOS, ...resultadosExtra };
}

export function isClosedRound(round) {
  return Boolean(getResultados()[Number(round)]);
}

export function closedRoundsCount() {
  return Object.keys(getResultados()).length;
}

function overwriteObject(target, source) {
  Object.keys(target).forEach(key => delete target[key]);
  Object.entries(source || {}).forEach(([key, value]) => { target[key] = value; });
}

function resolveTeamId(teamKey) {
  const byId = Number(teamKey);
  if (TEAM_IDS.includes(byId)) return byId;
  return TEAM_IDS.find(id => TEAMS[id].name === teamKey || TEAMS[id].short === teamKey || TEAMS[id].owner === teamKey);
}

function athleteName(value, names) {
  if (value == null) return '';
  return names?.[String(value)] || value;
}

export function applyPublicState(json = {}) {
  const extra = json.resultados_pc_extra || json.RESULTADOS_PC_EXTRA || json.resultados;
  if (extra) resultadosExtra = normalizeResultadosExtra(extra);

  const explicitStatsRound = Number(json.stats_round ?? json.estatisticas_rodada ?? json.rodada_processada);
  const derivedStatsRound = Number(json.rodada) > 0 ? Number(json.rodada) - 1 : 0;
  const incomingStatsRound = Number.isFinite(explicitStatsRound) && explicitStatsRound > 0 ? explicitStatsRound : derivedStatsRound;
  if (incomingStatsRound >= appState.statsRound) {
    if (json.mvp_historico) overwriteObject(HIST.mvp, json.mvp_historico);
    if (json.zikado) overwriteObject(HIST.zikado, json.zikado);
    if (json.merda_historico) overwriteObject(HIST.merda, json.merda_historico);
    if (json.aproveitamento) overwriteObject(APROVEITAMENTO, json.aproveitamento);
    if (incomingStatsRound > 0) appState.statsRound = incomingStatsRound;
    const last = json.stats_last_round || json.ultima_rodada_estatisticas;
    if (last && Number(last.round || last.rodada)) {
      appState.statsLastRound = {
        round: Number(last.round || last.rodada),
        mvpTeamId: Number(last.mvpTeamId || last.mvp_team_id || last.mvp_id || 0),
        mvpPoints: Number(last.mvpPoints || last.mvp_points || last.mvp_pontos || 0),
        merdaTeamId: Number(last.merdaTeamId || last.merda_team_id || last.merda_id || 0),
        merdaPoints: Number(last.merdaPoints || last.merda_points || last.merda_pontos || 0)
      };
    }
  }

  const athleteNames = json.nomes_atletas || {};
  if (json.capitao_por_time) {
    const captains = {};
    Object.entries(json.capitao_por_time).forEach(([team, value]) => {
      const id = resolveTeamId(team);
      if (id) captains[id] = athleteName(value, athleteNames);
    });
    overwriteObject(CURRENT_CAPTAINS, captains);
  }

  if (json.reserva_luxo_por_time) {
    const reserves = {};
    Object.entries(json.reserva_luxo_por_time).forEach(([team, value]) => {
      const id = resolveTeamId(team);
      if (id) reserves[id] = athleteName(value, athleteNames);
    });
    overwriteObject(CURRENT_LUXO, reserves);
  }

  if (json.pc2_confrontos) overwriteObject(PC2_CONFRONTOS, json.pc2_confrontos);
  if (json.pc2_resultados) overwriteObject(PC2_RESULTADOS, json.pc2_resultados);

  if (!appState.userChangedRound) {
    const pc2Round = Number(json.pc2_round);
    if (Number.isFinite(pc2Round) && pc2Round >= 1 && pc2Round <= 18) appState.round = pc2Round;
  }

  appState.publicUpdatedAt = json.updated_at || '';
}

export function setSelectedTeam(id) {
  appState.selectedTeam = id ? String(id) : '';
  if (appState.selectedTeam) localStorage.setItem('pli_selected_team', appState.selectedTeam);
  else localStorage.removeItem('pli_selected_team');
}
