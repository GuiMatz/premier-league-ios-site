import { cartolaRequest, normalizeMarket, normalizeTeam, parseTeamIds, setJsonResponseHeaders } from '../../server/cartola.js';
const completedRoundCache=new Map();
async function officialRound(ids,season,round){
  const key=`${season}:${round}:${ids.join(',')}`,cached=completedRoundCache.get(key);
  if(cached)return cached;
  const settled=await Promise.allSettled(ids.map(async id=>{const raw=await cartolaRequest(`/time/id/${id}/${round}`);if(raw?.pontos==null||!Number.isFinite(Number(raw.pontos)))throw new Error('Official final score unavailable');return normalizeTeam(id,raw,round)}));
  const scores={},totals={},errors=[];
  settled.forEach((result,index)=>{if(result.status==='fulfilled'){scores[ids[index]]=result.value.roundPoints;totals[ids[index]]=result.value.totalPoints}else errors.push({id:ids[index],message:result.reason?.message||'Cartola request failed',round})});
  const value={completedRound:Object.keys(scores).length===ids.length?{season,round,status:'final',source:'cartola_team_official',official:true,trusted:true,scores,totals}:null,errors};
  if(value.completedRound)completedRoundCache.set(key,value);
  return value;
}
export default async function handler(req,res){
  if(req.method!=='GET'){setJsonResponseHeaders(res,'no-store');return res.status(405).json({error:'Method not allowed'})}
  const ids=parseTeamIds(req.query.ids);if(!ids.length){setJsonResponseHeaders(res,'no-store');return res.status(400).json({error:'Missing team ids'})}
  try{
    const marketPayload=await cartolaRequest('/mercado/status');const market=normalizeMarket(marketPayload);
    let hasLiveScores=false,roundComplete=false;
    if(!market.isOpen){
      const [scoresResult,matchesResult]=await Promise.allSettled([cartolaRequest('/atletas/pontuados'),cartolaRequest('/partidas')]);
      if(scoresResult.status==='fulfilled'){
        const athletes=scoresResult.value?.atletas||scoresResult.value||{};
        hasLiveScores=(Array.isArray(athletes)?athletes.length:Object.keys(athletes).length)>0;
      }
      if(matchesResult.status==='fulfilled'){
        const matches=matchesResult.value?.partidas||[];
        roundComplete=matches.length>0&&matches.every(match=>match.periodo_tr==='POS_JOGO'||match.status_transmissao_tr==='ENCERRADA');
      }
      if(roundComplete)hasLiveScores=false;
    }
    const settled=await Promise.allSettled(ids.map(async id=>normalizeTeam(id,await cartolaRequest(`/time/id/${id}`),market.round)));
    const teams=[],errors=[];settled.forEach((result,index)=>{if(result.status==='fulfilled')teams.push(result.value);else errors.push({id:ids[index],message:result.reason?.message||'Cartola request failed'})});
    let completedRound=null,completedRounds=[];
    const finalRound=market.isOpen&&market.round>1?market.round-1:roundComplete?market.round:null;
    if(finalRound){
      const requested=Number(req.query.fromRound),start=Number.isInteger(requested)&&requested>0?Math.max(requested,finalRound-17):finalRound;
      const backfill=await Promise.all(Array.from({length:finalRound-start+1},(_,index)=>officialRound(ids,market.season,start+index)));
      completedRounds=backfill.map(item=>item.completedRound).filter(Boolean);
      completedRound=completedRounds.at(-1)||null;
      errors.push(...backfill.flatMap(item=>item.errors));
    }
    setJsonResponseHeaders(res);return res.status(200).json({market,hasLiveScores,roundComplete,teams,completedRound,completedRounds,errors});
  }catch(error){setJsonResponseHeaders(res,'no-store');return res.status(error.status||502).json({error:error.message||'Cartola unavailable'})}
}
