import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createLeagueApiService,endpointCache} from '../server/league-api/service.js';
import {createLeagueRouter,leagueRouteAllowlist} from '../server/league-api/router.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
function response(){return{headers:{},statusCode:null,body:null,setHeader(key,value){this.headers[key]=value;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
async function call(router,route,query={},method='GET'){const res=response();await router({method,query:{route,...query}},res);return res;}

assert.deepEqual(leagueRouteAllowlist,['status','state','standings','rounds','lineups','ownership','impact','live','records','clubs','history','health']);
const service=createLeagueApiService({projectRoot:root}),router=createLeagueRouter({service});
const cases={
  status:{},state:{},standings:{competition:'pc1',season:2026},rounds:{round:22,season:2026},
  lineups:{round:23,season:2026},ownership:{round:23,season:2026},impact:{round:23,season:2026,athlete_id:1},
  live:{round:23,season:2026},records:{season:2026},clubs:{},history:{},health:{}
};
for(const [route,query] of Object.entries(cases)){
  const res=await call(router,route,query);
  assert.equal(res.statusCode,200,route);assert.equal(res.body.ok,true,route);assert.ok('status' in res.body,route);
  assert.equal(res.headers['Cache-Control'],endpointCache[route],`${route} cache`);
}
const status=(await call(router,'status')).body;assert.equal(status.data.current_cartola_round,23);assert.equal(status.data.last_processed_round,22);assert.equal(status.data.next_engine_managed_round,null);assert.equal(status.data.migration.status,'AMBIGUOUS');
const standings=(await call(router,'standings',{competition:'pc1',season:2026})).body;assert.equal(standings.data.source_status,'consolidated_only');
const live=(await call(router,'live',{round:23,season:2026})).body;assert.equal(live.status,'unavailable');assert.equal(live.data,null);assert.equal(live.meta.shadow_debug_enabled,false);
const unknown=await call(router,'writer');assert.equal(unknown.statusCode,404);assert.equal(unknown.body.error.code,'LEAGUE_ROUTE_NOT_FOUND');assert.equal(unknown.headers['Cache-Control'],'no-store');
const post=await call(router,'status',{},'POST');assert.equal(post.statusCode,405);assert.equal(post.body.error.code,'METHOD_NOT_ALLOWED');assert.equal(post.headers.Allow,'GET');

async function jsFiles(dir){const rows=await readdir(dir,{withFileTypes:true});return (await Promise.all(rows.map(async row=>row.isDirectory()?jsFiles(join(dir,row.name)):row.name.endsWith('.js')?[join(dir,row.name)]:[]))).flat();}
const functions=await jsFiles(join(root,'api')),leagueFunctions=functions.filter(path=>path.includes(`${join('api','league')}`));assert.equal(functions.length,5);assert.equal(leagueFunctions.length,1);assert.equal(leagueFunctions[0],join(root,'api','league','[route].js'));
const entry=await import(pathToFileURL(leagueFunctions[0]));assert.equal(typeof entry.default,'function');
const client=await readFile(join(root,'assets','js','app','league-api-client.js'),'utf8');for(const route of leagueRouteAllowlist)assert.ok(client.includes(`'${route}'`),route);
const vercel=JSON.parse(await readFile(join(root,'vercel.json'),'utf8'));assert.ok(Array.isArray(vercel.rewrites));
const apiSources=(await Promise.all(functions.map(path=>readFile(path,'utf8')))).join('\n');assert.equal(/writeFile|appendFile|commitTransaction|shadow-finalize/.test(apiSources),false);
console.log(JSON.stringify({ok:true,status:'PHASE_3K1_OK',vercel_functions_before:16,vercel_functions_after:functions.length,league_api_functions_before:12,league_api_functions_after:leagueFunctions.length,endpoints_preserved:leagueRouteAllowlist.length}));
