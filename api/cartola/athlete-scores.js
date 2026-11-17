import {cartolaRequest,normalizeMarket,setJsonResponseHeaders} from '../../server/cartola.js';
import {adaptCartolaAthleteScores} from '../../server/league/athlete-score-adapter.js';
import {adaptCartolaLineup} from '../../server/league/lineup-adapter.js';
import {projectEffectiveLineup} from '../../assets/js/app/lineup-projection.js';
import clubs from '../../data/catalog/clubs.json' with {type:'json'};

export default async function handler(req,res){
  if(req.method!=='GET'){setJsonResponseHeaders(res,'no-store');return res.status(405).json({error:'Method not allowed'});}
  try{
    const fetchedAt=new Date().toISOString(),[market,payload,matchesPayload]=await Promise.all([cartolaRequest('/mercado/status'),cartolaRequest('/atletas/pontuados'),cartolaRequest('/partidas').catch(()=>null)]),m=normalizeMarket(market),adapted=adaptCartolaAthleteScores(payload,{fetchedAt,cartolaRound:m.round}),clubMatches={};
    for(const match of matchesPayload?.partidas||[]){const info={timestamp:Number(match.timestamp)||null,finished:match.periodo_tr==='POS_JOGO'||match.status_transmissao_tr==='ENCERRADA',valid:match.valida!==false};if(match.clube_casa_id)clubMatches[Number(match.clube_casa_id)]=info;if(match.clube_visitante_id)clubMatches[Number(match.clube_visitante_id)]=info;}
    const roundComplete=Object.values(clubMatches).length>0&&Object.values(clubMatches).every(match=>match.finished),scores={...adapted,club_matches:clubMatches,round_complete:roundComplete},response={...scores,updated_at:fetchedAt,team_projections:null};
    if(String(req.query?.projections||'')==='1'){
      const known=new Set(clubs.clubs.map(club=>Number(club.team_id))),lineups=await Promise.all(clubs.clubs.map(async club=>{try{const raw=await cartolaRequest(`/time/id/${club.team_id}/${m.round}`),adaptedLineup=adaptCartolaLineup(raw,{teamId:club.team_id,season:m.season,cartolaRound:m.round,capturedAt:fetchedAt,knownTeamIds:known,locked:!m.isOpen,confirmedForRound:true});return adaptedLineup.status==='valid'?adaptedLineup.lineup:null;}catch{return null;}}));
      response.team_projections=Object.fromEntries(lineups.filter(Boolean).map(lineup=>[lineup.team_id,projectEffectiveLineup(lineup,scores,{roundFinal:roundComplete})]));
    }
    setJsonResponseHeaders(res,'private, max-age=0');return res.status(200).json(response);
  }catch(error){setJsonResponseHeaders(res,'no-store');return res.status(error.status||502).json({error:error.message||'Cartola unavailable'});}
}
