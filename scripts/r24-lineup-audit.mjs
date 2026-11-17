import { readFile } from 'node:fs/promises';
import { cartolaRequest } from '../server/cartola.js';
import { adaptCartolaLineup } from '../server/league/lineup-adapter.js';
import { adaptCartolaAthleteScores } from '../server/league/athlete-score-adapter.js';
import { projectEffectiveLineup } from '../assets/js/app/lineup-projection.js';

const catalog=JSON.parse(await readFile(new URL('../data/catalog/clubs.json',import.meta.url),'utf8'));
const teams=catalog.clubs.filter(club=>club.active!==false&&club.team_id);
const [market,scorePayload,matchesPayload]=await Promise.all([cartolaRequest('/mercado/status'),cartolaRequest('/atletas/pontuados'),cartolaRequest('/partidas')]);
const round=Number(market.rodada_atual),scores=adaptCartolaAthleteScores(scorePayload,{fetchedAt:new Date().toISOString(),cartolaRound:round}),clubMatches={};
for(const match of matchesPayload.partidas||[]){const info={timestamp:Number(match.timestamp)||null,finished:match.periodo_tr==='POS_JOGO'||match.status_transmissao_tr==='ENCERRADA',valid:match.valida!==false};clubMatches[Number(match.clube_casa_id)]=info;clubMatches[Number(match.clube_visitante_id)]=info;}
scores.club_matches=clubMatches;scores.round_complete=Object.values(clubMatches).every(match=>match.finished);
const rows=[];
for(const team of teams){const payload=await cartolaRequest(`/time/id/${team.team_id}/${round}`),lineupRound=Number(payload?.time?.rodada_time_id),result=adaptCartolaLineup(payload,{teamId:team.team_id,season:2026,cartolaRound:round,capturedAt:new Date().toISOString(),knownTeamIds:new Set(teams.map(item=>item.team_id)),locked:true,confirmedForRound:true});if(result.status!=='valid'){rows.push({team:team.official_name,status:result.validation.code});continue;}const projection=projectEffectiveLineup(result.lineup,scores,{roundFinal:scores.round_complete});rows.push({team:team.official_name,lineup_round:lineupRound,source:result.lineup.lineup_source,starters:result.lineup.starters.length,reserves:result.lineup.reserves.length,luxury_reserve:result.lineup.luxury_reserve?.nickname||null,captain:result.lineup.starters.find(item=>item.athlete_id===result.lineup.captain_id)?.nickname||null,not_played:projection.original.filter(item=>item.status==='not_played').map(item=>item.nickname),pending:projection.original.filter(item=>item.status==='pending').map(item=>item.nickname),substitutions:projection.normalSubstitutions.map(item=>`${item.replacedAthleteId}->${item.reserveAthleteId}`),luxury_status:projection.luxuryReserve.status,projected_score:projection.projectedScore,official_score:projection.officialScore});}
console.log(JSON.stringify({round,round_complete:scores.round_complete,rows},null,2));
