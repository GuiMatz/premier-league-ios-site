import { cartolaRequest, normalizeMarket, normalizeTeam, setJsonResponseHeaders } from '../../server/cartola.js';
export default async function handler(req,res){
  if(req.method!=='GET'){setJsonResponseHeaders(res,'no-store');return res.status(405).json({error:'Method not allowed'})}
  const id=Number(req.query.id);if(!Number.isInteger(id)||id<=0){setJsonResponseHeaders(res,'no-store');return res.status(400).json({error:'Invalid team id'})}
  try{const [marketPayload,teamPayload]=await Promise.all([cartolaRequest('/mercado/status'),cartolaRequest(`/time/id/${id}`)]);const market=normalizeMarket(marketPayload);const team=normalizeTeam(id,teamPayload,market.round);setJsonResponseHeaders(res);return res.status(200).json({market,team})}catch(error){setJsonResponseHeaders(res,'no-store');return res.status(error.status||502).json({error:error.message||'Cartola unavailable'})}
}
