import { createLeagueApiService,endpointCache } from './service.js';
import { createLeagueHandler } from './http.js';

export const leagueRouteAllowlist=Object.freeze([
  'status','state','standings','rounds','lineups','ownership',
  'impact','live','records','clubs','history','health'
]);

const allowedRoutes=new Set(leagueRouteAllowlist);
const first=value=>Array.isArray(value)?value[0]:value;
const setRouterHeaders=res=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Access-Control-Allow-Origin','*');
};

export function createLeagueRouter({service=createLeagueApiService()}={}){
  const handlers=Object.fromEntries(leagueRouteAllowlist.map(route=>[
    route,createLeagueHandler(route,{service})
  ]));
  return async function leagueRouter(req,res){
    const route=String(first(req.query?.route)||'').trim().toLowerCase();
    if(!allowedRoutes.has(route)){
      setRouterHeaders(res);
      return res.status(404).json({
        ok:false,status:'not_found',
        error:{code:'LEAGUE_ROUTE_NOT_FOUND',message:'Endpoint da liga não encontrado.'}
      });
    }
    return handlers[route](req,res);
  };
}

export const leagueRouterCache=endpointCache;
