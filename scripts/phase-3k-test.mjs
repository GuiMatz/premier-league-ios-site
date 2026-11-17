import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLeagueApiService} from '../server/league-api/service.js';
import {createLeagueHandler} from '../server/league-api/http.js';
import {createLeagueApiClient,preserveUncertainty} from '../assets/js/app/league-api-client.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url))),service=createLeagueApiService({projectRoot:root});
const status=await service.status();
assert.equal(status.data.current_cartola_round,23);assert.equal(status.data.last_processed_round,22);assert.equal(status.data.baseline_as_of_round,22);assert.equal(status.data.next_engine_managed_round,null);assert.equal(status.data.migration.status,'AMBIGUOUS');

const calls={status:()=>service.status(),state:()=>service.state(),standings:()=>service.standings({competition:'pc1',season:2026}),rounds:()=>service.rounds({round:22,season:2026}),lineups:()=>service.lineups({round:23,season:2026}),ownership:()=>service.ownership({round:23,season:2026}),impact:()=>service.impact({round:23,season:2026,athlete_id:1}),live:()=>service.live({round:23,season:2026}),records:()=>service.records({season:2026}),clubs:()=>service.clubs(),history:()=>service.history(),health:()=>service.health()};
for(const [name,call] of Object.entries(calls)){const result=await call();assert.equal(result.ok,true,name);assert.ok('status' in result,name);}
const live=await service.live({round:23,season:2026});assert.equal(live.status,'unavailable');assert.equal(live.data,null);assert.equal(live.meta.shadow_debug_enabled,false);assert.equal(live.warnings.includes('LIVE_OFFICIAL_UNAVAILABLE'),true);
const pc1=await service.standings({competition:'pc1',season:2026});assert.equal(pc1.data.source_status,'consolidated_only');
const health=await service.health();assert.equal(health.data.checks.api,true);assert.equal(health.data.checks.provider,true);assert.equal(health.data.checks.storage_read_model,true);
assert.deepEqual(preserveUncertainty({score:null,items:null,status:'unavailable'}),{score:null,items:null,status:'unavailable'});

const fakeFetch=async url=>({ok:true,status:200,json:async()=>({ok:true,status:'unavailable',data:{score:null,items:null},warnings:[],meta:{url}})}),client=createLeagueApiClient({fetchImpl:fakeFetch,baseUrl:'/api/league'}),clientResult=await client.rounds(23);assert.equal(clientResult.data.score,null);assert.equal(clientResult.data.items,null);
const failing=createLeagueApiClient({fetchImpl:async()=>({ok:false,status:500,json:async()=>({ok:false,status:'error',error:{code:'CONTROLLED_500',message:'Falha controlada.'}})})});await assert.rejects(()=>failing.health(),error=>error.code==='CONTROLLED_500');

function response(){return{headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
const handler=createLeagueHandler('health',{service:{health:async()=>{throw new Error('boom');}}}),res500=response();await handler({method:'GET',query:{}},res500);assert.equal(res500.code,500);assert.equal(res500.body.error.code,'INTERNAL_ERROR');assert.equal(JSON.stringify(res500.body).includes('boom'),false);const res405=response();await handler({method:'POST',query:{}},res405);assert.equal(res405.code,405);

const pages=['home-page.html','temporada-2026.html','rodadas.html','escalacoes.html','times.html','estatisticas.html','historia.html'];for(const page of pages)assert.ok((await readFile(join(root,page),'utf8')).includes('<html'),page);
const profile=await readFile(join(root,'assets/js/app/profile.js'),'utf8');assert.ok(profile.includes("const KEY = 'plios.preferences.v1'"));
const apiSource=(await Promise.all(['service.js','http.js'].map(file=>readFile(join(root,'server/league-api',file),'utf8')))).join('\n');assert.equal(/writeFile|appendFile|mkdir|rename\(/.test(apiSource),false);
const vercel=JSON.parse(await readFile(join(root,'vercel.json'),'utf8'));for(const route of ['/','/temporada','/rodadas','/escalacoes','/times','/estatisticas','/historia'])assert.ok(vercel.rewrites.some(row=>row.source===route),route);
const clientSource=await readFile(join(root,'assets/js/app/league-api-client.js'),'utf8');for(const endpoint of Object.keys(calls))assert.ok(clientSource.includes(`'${endpoint}'`),endpoint);
console.log(JSON.stringify({ok:true,status:'PHASE_3K_OK',endpoints:Object.keys(calls).length,pages:pages.length,shadow_public:false,writes:false}));
