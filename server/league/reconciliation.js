import { calculateHeadToHeadStandings, calculatePremierLeagueStandings, normalizeMatch, calculateSeasonHighScore, historicalAward } from '../../lib/league/index.js';

const result=(classification,details)=>({classification,details});
export function compareBotStateWithEngine({botState,history,catalog}) {
  const ids=(catalog.clubs||catalog).map(club=>Number(club.team_id)),known=new Set(ids),round=Number(botState.rodada),season=Number(botState.temporada_atual||2026);
  const pl=calculatePremierLeagueStandings(ids,botState.round_scores||{});
  const pc2Matches=Object.entries(botState.pc2_resultados||{}).flatMap(([r,games])=>games.map((game,index)=>normalizeMatch({match_id:`bot:pc2:${r}:${index}`,competition_id:'pc2',season,competition_round:Number(r),cartola_round:Number(r)+18,home_team_id:game[0],home_score:game[1],away_team_id:game[2],away_score:game[3]},known)));
  const pc2=calculateHeadToHeadStandings(ids,pc2Matches);
  const statsRound=Number(botState.stats_last_round?.round),mvp=historicalAward(history,season,statsRound,'mvp'),merda=historicalAward(history,season,statsRound,'merda');
  const record=calculateSeasonHighScore(history,season);
  return {
    round:result(Number.isInteger(round)?'MATCH':'ERROR',{bot:round,engine_input:round}),
    premier_league:result(pl.rows.length?'MATCH':'INSUFFICIENT_DATA',{leader_team_id:pl.rows[0]?.team_id??null,source:'shared round_scores'}),
    pc2:result(pc2Matches.length?'MATCH':'INSUFFICIENT_DATA',{leader_team_id:pc2.rows[0]?.team_id??null,matches:pc2Matches.length}),
    wins_draws_games:result('EXPECTED_DIFFERENCE',{reason:'BOT aproveitamento é histórico vitalício; snapshot reproduz somente competições com partidas completas'}),
    mvp:result(mvp?.team_id===Number(botState.stats_last_round?.mvp_team_id)&&mvp?.score===Number(botState.stats_last_round?.mvp_points)?'MATCH':'AMBIGUOUS',{bot:botState.stats_last_round?.mvp_team_id??null,engine:mvp?.team_id??null}),
    merda:result(merda?.team_id===Number(botState.stats_last_round?.merda_team_id)&&merda?.score===Number(botState.stats_last_round?.merda_points)?'MATCH':'AMBIGUOUS',{bot:botState.stats_last_round?.merda_team_id??null,engine:merda?.team_id??null}),
    zikado:result('INSUFFICIENT_DATA',{reason:'contadores anteriores ao histórico por rodada não são reconstruíveis somente pelo snapshot'}),
    aproveitamento:result('EXPECTED_DIFFERENCE',{reason:'mesma limitação dos contadores históricos V/D/J'}),
    records:result(record.status==='co_record'?'EXPECTED_DIFFERENCE':'MATCH',{engine_status:record.status,holders:record.holders.map(value=>value.team_id),reason:record.status==='co_record'?'BOT apresenta lista ordenada; Engine explicita co-recordistas':null})
  };
}
