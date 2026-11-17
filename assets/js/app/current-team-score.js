const CACHE_KEY='plios.current-team-scores.v1';
const numeric=value=>value==null||!Number.isFinite(Number(value))?null:Number(value);

export function selectCurrentTeamScore(projection,{roundFinal=false,lastTrusted=null}={}){
  const official=numeric(projection?.officialScore),effective=numeric(projection?.effectiveScore),projected=numeric(projection?.projectedScore);
  if((roundFinal||projection?.officialIsAuthoritative===true)&&official!=null)return{value:official,source:'official_final',label:'Rodada finalizada',authoritative:true};
  if(effective!=null)return{value:effective,source:'effective_current',label:'Parcial atual',authoritative:false};
  if(projected!=null)return{value:projected,source:'effective_projection',label:'Parcial atual',authoritative:false};
  const cached=numeric(lastTrusted?.value);
  return cached==null?null:{...lastTrusted,value:cached,source:'trusted_cache',label:'Última atualização disponível',authoritative:false};
}

export function selectTeamScores(projections,{roundFinal=false,cached={}}={}){
  return Object.fromEntries(Object.entries(projections||{}).flatMap(([teamId,projection])=>{
    const selected=selectCurrentTeamScore(projection,{roundFinal,lastTrusted:cached[teamId]});
    return selected?[[Number(teamId),{...selected,teamId:Number(teamId),round:Number(projection?.round)||null}]]:[];
  }));
}

export function readCurrentScoreCache(round){
  try{const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}');return Number(cache.round)===Number(round)?cache.scores||{}:{}}catch{return{}};
}

export function writeCurrentScoreCache(round,scores){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({round:Number(round),updatedAt:new Date().toISOString(),scores}))}catch{}
}

export {CACHE_KEY as CURRENT_SCORE_CACHE_KEY};
