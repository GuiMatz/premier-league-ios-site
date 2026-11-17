const CARTOLA_BASE_URL = 'https://api.cartola.globo.com';
const DEFAULT_HEADERS = { Accept:'application/json', Origin:'https://cartola.globo.com', Referer:'https://cartola.globo.com/', 'User-Agent':'Premier-League-IOS/4.0' };

export async function cartolaRequest(path, timeoutMs=8000){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${CARTOLA_BASE_URL}${path}`,{headers:DEFAULT_HEADERS,signal:controller.signal});
    const text=await response.text();
    if(!response.ok){const error=new Error(`Cartola respondeu ${response.status}`);error.status=response.status;throw error}
    return JSON.parse(text);
  }finally{clearTimeout(timeout)}
}

function closeDateToIso(value){
  if(!value)return null;
  if(typeof value==='string'){const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString()}
  if(value.iso){const d=new Date(value.iso);return Number.isNaN(d.getTime())?null:d.toISOString()}
  if(value.timestamp){const d=new Date(Number(value.timestamp)*1000);return Number.isNaN(d.getTime())?null:d.toISOString()}
  if(value.ano&&value.mes&&value.dia){
    const y=String(value.ano).padStart(4,'0'),m=String(value.mes).padStart(2,'0'),day=String(value.dia).padStart(2,'0');
    const h=String(value.hora||0).padStart(2,'0'),min=String(value.minuto||0).padStart(2,'0');
    const d=new Date(`${y}-${m}-${day}T${h}:${min}:00-03:00`);return Number.isNaN(d.getTime())?null:d.toISOString();
  }
  return null;
}

export function normalizeMarket(payload={}){const statusId=Number(payload.status_mercado??payload.status?.id??0);return{round:Number(payload.rodada_atual||0),statusId,isOpen:statusId===1,closesAt:closeDateToIso(payload.fechamento),season:Number(payload.temporada||new Date().getFullYear())}}
export function normalizeTeam(id,payload={},marketRound=0){const team=payload.time||{};const athletes=Array.isArray(payload.atletas)?payload.atletas:Object.values(payload.atletas||{});const athleteName=aid=>aid?(athletes.find(a=>String(a.atleta_id)===String(aid))?.apelido||''):'';const lineupRoundId=Number(team.rodada_time_id||0);const captainId=payload.capitao_id||'',reserveId=payload.reserva_luxo_id||'';return{id:Number(id),roundPoints:Number(payload.pontos||0),totalPoints:Number(payload.pontos_campeonato||0),budget:Number(team.patrimonio||payload.patrimonio||team['patrimônio']||0),lineupRoundId,scaled:marketRound>0?lineupRoundId===marketRound:lineupRoundId>0,captain:captainId?{id:captainId,name:athleteName(captainId)}:null,luxuryReserve:reserveId?{id:reserveId,name:athleteName(reserveId)}:null}}
export function parseTeamIds(raw,max=30){const ids=String(raw||'').split(',').map(v=>Number(v.trim())).filter(v=>Number.isInteger(v)&&v>0);return[...new Set(ids)].slice(0,max)}
export function setJsonResponseHeaders(res,cacheControl='public, s-maxage=30, stale-while-revalidate=120'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',cacheControl);res.setHeader('X-Content-Type-Options','nosniff')}
