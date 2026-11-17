export function mapCartolaRound(cartolaRound, season = 2026) {
  const round = Number(cartolaRound);
  if (!Number.isInteger(round) || round < 1 || round > 38) return null;
  if (season !== 2026) return { season, cartola_round: round, competition_id: null, competition_round: null };
  if (round <= 18) return { season, cartola_round: round, competition_id: 'pc1', competition_round: round };
  if (round <= 36) return { season, cartola_round: round, competition_id: 'pc2', competition_round: round - 18 };
  return { season, cartola_round: round, competition_id: null, competition_round: null };
}

export const cartolaToPc2Round = round => mapCartolaRound(round, 2026)?.competition_id === 'pc2' ? Number(round) - 18 : null;
export const pc2ToCartolaRound = round => Number.isInteger(Number(round)) && Number(round) >= 1 && Number(round) <= 18 ? Number(round) + 18 : null;
