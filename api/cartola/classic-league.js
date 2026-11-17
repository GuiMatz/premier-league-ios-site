import {cartolaRequest,setJsonResponseHeaders} from '../../server/cartola.js';
import clubs from '../../data/catalog/clubs.json' with {type:'json'};

// Slug da liga clássica no Cartola. Configure CARTOLA_LEAGUE_SLUG no ambiente; o valor padrão é fictício.
const SLUG=process.env.CARTOLA_LEAGUE_SLUG||'minha-liga-exemplo';
const CACHE_TTL=60_000;
let cache=null;
const numeric=value=>value==null||value===''||!Number.isFinite(Number(value))?null:Number(value);
const crestOf=team=>team?.url_escudo_png||team?.url_escudo_svg||team?.escudos?.['60x60']||team?.escudos?.['45x45']||null;

function normalizeLeague(payload){
  const source=payload?.times||payload?.equipes||payload?.ranking||payload?.liga?.times||[];
  if(!Array.isArray(source))return[];
  return source.flatMap((entry,index)=>{const team=entry?.time||entry?.team||entry,teamId=numeric(team?.time_id??team?.id),totalPoints=numeric(entry?.pontos??entry?.pontos_campeonato??team?.pontos_campeonato);return teamId==null||totalPoints==null?[]:[{position:numeric(entry?.posicao)??index+1,teamId,name:team?.nome||team?.nome_cartola||null,crest:crestOf(team),totalPoints}]}).sort((a,b)=>b.totalPoints-a.totalPoints||a.position-b.position);
}

async function knownTeamsFallback(){
  const settled=await Promise.allSettled(clubs.clubs.map(async club=>{const payload=await cartolaRequest(`/time/id/${club.team_id}`);const team=payload?.time||{},totalPoints=numeric(payload?.pontos_campeonato);if(totalPoints==null)throw new Error('TOTAL_UNAVAILABLE');return{teamId:Number(club.team_id),name:team.nome||club.official_name,crest:crestOf(team),totalPoints};}));
  const rows=settled.flatMap(result=>result.status==='fulfilled'?[result.value]:[]).sort((a,b)=>b.totalPoints-a.totalPoints).map((row,index)=>({...row,position:index+1}));
  if(rows.length!==clubs.clubs.length)throw new Error('CLASSIC_TOTALS_INCOMPLETE');
  return rows;
}

async function refresh(){
  let rows=[],source='cartola_public_league';
  try{rows=normalizeLeague(await cartolaRequest(`/liga/${SLUG}`));}catch{}
  if(rows.length!==clubs.clubs.length){rows=await knownTeamsFallback();source='cartola_known_teams';}
  const value={slug:SLUG,source,updatedAt:new Date().toISOString(),stale:false,rows};cache={value,expiresAt:Date.now()+CACHE_TTL};return value;
}

export default async function handler(req,res){
  if(req.method!=='GET'){setJsonResponseHeaders(res,'no-store');return res.status(405).json({error:'Method not allowed'});}
  if(cache&&cache.expiresAt>Date.now()){setJsonResponseHeaders(res,'public, s-maxage=60, stale-while-revalidate=300');return res.status(200).json(cache.value);}
  try{const value=await refresh();setJsonResponseHeaders(res,'public, s-maxage=60, stale-while-revalidate=300');return res.status(200).json(value);}catch(error){if(cache?.value){setJsonResponseHeaders(res,'public, s-maxage=30, stale-while-revalidate=600');return res.status(200).json({...cache.value,stale:true});}setJsonResponseHeaders(res,'no-store');return res.status(503).json({error:'Classificação do Cartola temporariamente indisponível'});}
}
