async function request(path, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' }, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function toUiTeam(team) {
  return {
    id: Number(team.id),
    pontos: team.roundPoints == null ? null : Number(team.roundPoints),
    pontos_campeonato: team.totalPoints == null ? null : Number(team.totalPoints),
    patrimonio: team.budget == null ? null : Number(team.budget),
    rodada_time_id: team.lineupRoundId == null ? null : Number(team.lineupRoundId),
    escalou: Boolean(team.scaled),
    capitao_id: team.captain?.id || '',
    reserva_luxo_id: team.luxuryReserve?.id || '',
    capitao_nome: team.captain?.name || '',
    reserva_luxo_nome: team.luxuryReserve?.name || ''
  };
}

export async function fetchCartolaSnapshot(teamIds) {
  const ids = teamIds.map(Number).filter(Number.isFinite).join(',');
  const snapshot = await request(`/api/cartola/snapshot?ids=${encodeURIComponent(ids)}`);
  return {
    market: snapshot.market || null,
    teams: (snapshot.teams || []).map(toUiTeam),
    errors: snapshot.errors || []
  };
}
