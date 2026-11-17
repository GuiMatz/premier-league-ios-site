const row = team_id => ({ team_id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, cartola_points: 0 });

export function calculateHeadToHeadStandings(teamIds, matches, officialOrder = []) {
  const rows = new Map(teamIds.map(id => [Number(id), row(Number(id))]));
  for (const match of matches || []) {
    if (match.status !== 'final') continue;
    const home = rows.get(match.home_team_id), away = rows.get(match.away_team_id);
    if (!home || !away) continue;
    home.played++; away.played++; home.cartola_points += match.home_score; away.cartola_points += match.away_score;
    if (match.home_score > match.away_score) { home.wins++; away.losses++; home.points += 3; }
    else if (match.away_score > match.home_score) { away.wins++; home.losses++; away.points += 3; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
  }
  const order = new Map(officialOrder.map((id, index) => [Number(id), index]));
  const output = [...rows.values()].map(value => ({ ...value, cartola_points: Math.round(value.cartola_points * 100) / 100 }));
  output.sort((a, b) => b.points - a.points || b.cartola_points - a.cartola_points || (order.get(a.team_id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.team_id) ?? Number.MAX_SAFE_INTEGER));
  const tieGroups = []; output.forEach((entry,index)=>{if(index&&entry.points===output[index-1].points&&entry.cartola_points===output[index-1].cartola_points){const prior=tieGroups.find(group=>group.includes(output[index-1].team_id));if(prior)prior.push(entry.team_id);else tieGroups.push([output[index-1].team_id,entry.team_id]);}});
  let rank=0,previous=null;output.forEach((entry,index)=>{const tied=previous&&entry.points===previous.points&&entry.cartola_points===previous.cartola_points;entry.rank=tied?rank:index+1;entry.tie_status=tied||tieGroups.some(group=>group.includes(entry.team_id))?(officialOrder.length?'resolved_official_order':'unresolved'):'none';rank=entry.rank;previous=entry;});
  const ambiguous = tieGroups.length>0&&!officialOrder.length;
  return { rows: output, ambiguous, tie_status:ambiguous?'unresolved':tieGroups.length?'resolved_official_order':'none', tie_groups:tieGroups, official_order:officialOrder.map(Number), tie_break: 'points, cartola_points; no further sporting rule documented' };
}

export function calculatePremierLeagueStandings(teamIds, roundScores, officialOrder = []) {
  const totals = new Map(teamIds.map(id => [Number(id), { team_id: Number(id), cartola_points: 0, rounds: 0 }]));
  for (const scores of Object.values(roundScores || {})) for (const [idText, value] of Object.entries(scores || {})) {
    const entry = totals.get(Number(idText)); if (!entry || value == null || !Number.isFinite(Number(value))) continue;
    entry.cartola_points += Number(value); entry.rounds++;
  }
  const order = new Map(officialOrder.map((id, index) => [Number(id), index]));
  const rows = [...totals.values()].map(entry => ({ ...entry, cartola_points: Math.round(entry.cartola_points * 100) / 100 })).sort((a, b) => b.cartola_points - a.cartola_points || (order.get(a.team_id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.team_id) ?? Number.MAX_SAFE_INTEGER));
  const ambiguous = rows.some((entry, index) => index > 0 && entry.cartola_points === rows[index - 1].cartola_points && !order.has(entry.team_id));
  return { rows, ambiguous, tie_break: 'cartola_points, official_order_if_supplied' };
}

export const calculateWinRate = ({ wins, played }) => Number(played) > 0 ? Number(wins) / Number(played) * 100 : null;
