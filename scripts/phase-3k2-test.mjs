import assert from 'node:assert/strict';
import { readdir,readFile } from 'node:fs/promises';
import { join,relative,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLeagueApiService } from '../server/league-api/service.js';
import { createLeagueReadProvider,PUBLIC_LEAGUE_READ_ROOT } from '../server/league-api/read-provider.js';
import { GitHubMockTransport } from '../server/league-next/github/mock-transport.js';
import { GitHubHttpTransport } from '../server/league-next/github/transport.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url))),leagueRoot=join(root,'data','league-next');
async function files(dir){const out={};async function walk(current){for(const row of await readdir(current,{withFileTypes:true})){const path=join(current,row.name);if(row.isDirectory())await walk(path);else out[`${PUBLIC_LEAGUE_READ_ROOT}/${relative(dir,path).replaceAll('\\','/')}`]=await readFile(path,'utf8');}}await walk(dir);return out;}

const local=createLeagueApiService({projectRoot:root,env:{LEAGUE_READ_PROVIDER:'file'}}),localStatus=await local.status();
assert.equal(localStatus.data.current_cartola_round,23);assert.equal(localStatus.data.last_processed_round,22);assert.equal(localStatus.data.next_engine_managed_round,null);

const branch='league-next-lab',transport=new GitHubMockTransport({branch,files:await files(leagueRoot)}),env={LEAGUE_READ_PROVIDER:'github',LEAGUE_GITHUB_OWNER:'example-owner',LEAGUE_GITHUB_REPO:'premier-league-ios-site',LEAGUE_GITHUB_BRANCH:branch,LEAGUE_GITHUB_TOKEN:'test-only-placeholder'};
const reader=createLeagueReadProvider({env,projectRoot:root,transportFactory:()=>transport});
assert.equal(reader.kind,'github');assert.equal(reader.root,PUBLIC_LEAGUE_READ_ROOT);assert.equal(reader.provider,undefined);assert.equal(await reader.exists('manifest.json'),true);assert.equal((await reader.readJson('manifest.json')).official_writer,'bot');assert.ok((await reader.list('baselines')).includes('baselines/pre-engine-2026-r23.json'));assert.equal(typeof await reader.getVersion(),'string');
for(const method of ['write','writeText','writeJson','delete','publish','updateRef','compareAndSwap','prepareTransaction','commitTransaction'])await assert.rejects(()=>reader[method]('x'),error=>error.code==='READ_ONLY_PROVIDER_WRITE_FORBIDDEN',method);
assert.equal(transport.calls.some(call=>['createBlob','createTree','createCommit','updateRef'].includes(call.operation)),false);
assert.equal(Object.keys(transport.visibleFiles(branch)).some(path=>path.startsWith('data/league-next-lab/')||path.startsWith('reports/shadow/')||path.startsWith('reports/shadow-writer/')),false);

const remote=createLeagueApiService({projectRoot:root,env,transportFactory:()=>transport}),remoteStatus=await remote.status(),health=await remote.health();
assert.equal(remoteStatus.data.current_cartola_round,23);assert.equal(remoteStatus.data.last_processed_round,22);assert.equal(remoteStatus.data.baseline_as_of_round,22);assert.equal(remoteStatus.data.next_engine_managed_round,null);assert.equal(remoteStatus.data.migration.status,'AMBIGUOUS');
assert.equal(health.data.checks.api,true);assert.equal(health.data.checks.provider,true);assert.equal(health.data.checks.storage_read_model,true);

const unavailable=createLeagueApiService({projectRoot:root,env:{LEAGUE_READ_PROVIDER:'github'}});
await assert.rejects(()=>unavailable.status(),error=>error.code==='PROVIDER_INIT_FAILED');const unavailableHealth=await unavailable.health();assert.equal(unavailableHealth.status,'unavailable');assert.equal(unavailableHealth.data.checks.provider,false);assert.equal(unavailableHealth.data.checks.storage_read_model,false);assert.equal(unavailableHealth.data.error.code,'PROVIDER_INIT_FAILED');
const failedTransport=new GitHubMockTransport({branch,files:await files(leagueRoot)});failedTransport.failNext('getRef','NETWORK_ERROR');const remoteUnavailable=createLeagueApiService({projectRoot:root,env,transportFactory:()=>failedTransport});await assert.rejects(()=>remoteUnavailable.status(),error=>error.code==='GITHUB_READ_FAILED');

const response=status=>({ok:false,status,json:async()=>({message:'safe'}),headers:{get:()=>null}}),authTransport=new GitHubHttpTransport({token:'test-only-placeholder',fetchImpl:async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer test-only-placeholder');return response(401);}});await assert.rejects(()=>authTransport.getRef({owner:'o',repo:'r',branch}),error=>error.code==='GITHUB_AUTH_FAILED');
const refTransport=new GitHubHttpTransport({token:'test-only-placeholder',fetchImpl:async()=>response(404)}),refService=createLeagueApiService({projectRoot:root,env,transportFactory:()=>refTransport});await assert.rejects(()=>refService.status(),error=>error.code==='GITHUB_REF_NOT_FOUND');

const allFiles=await files(leagueRoot),withoutManifest={...allFiles};delete withoutManifest[`${PUBLIC_LEAGUE_READ_ROOT}/manifest.json`];const manifestService=createLeagueApiService({projectRoot:root,env,transportFactory:()=>new GitHubMockTransport({branch,files:withoutManifest})});await assert.rejects(()=>manifestService.status(),error=>error.code==='READ_MODEL_MANIFEST_MISSING');
const manifestHealth=await manifestService.health();assert.equal(manifestHealth.data.checks.provider,true);assert.equal(manifestHealth.data.checks.storage_read_model,false);assert.equal(manifestHealth.data.error.code,'READ_MODEL_MANIFEST_MISSING');
const withoutBaseline={...allFiles};delete withoutBaseline[`${PUBLIC_LEAGUE_READ_ROOT}/baselines/pre-engine-2026-r23.json`];const baselineService=createLeagueApiService({projectRoot:root,env,transportFactory:()=>new GitHubMockTransport({branch,files:withoutBaseline})});await assert.rejects(()=>baselineService.status(),error=>error.code==='READ_MODEL_BASELINE_MISSING');
const supportService=createLeagueApiService({projectRoot:root,env,transportFactory:()=>new GitHubMockTransport({branch,files:allFiles}),supportDataLoader:async()=>({catalog:null,golden:null,history:null})});await assert.rejects(()=>supportService.status(),error=>error.code==='READ_MODEL_CATALOG_MISSING');

for(const invalid of ['../manifest.json','data\\league-next\\manifest.json','/manifest.json'])await assert.rejects(()=>reader.readJson(invalid),error=>error.code==='GITHUB_READ_FAILED');
const vercel=JSON.parse(await readFile(join(root,'vercel.json'),'utf8'));assert.equal(vercel.functions['api/league/*.js'].includeFiles,'data/{catalog/clubs.json,migration/golden-sources.json,historico_rodadas.json}');

console.log(JSON.stringify({ok:true,status:'PHASE_3K2_OK',file_provider:true,github_mock_reader:true,read_only:true,public_root:PUBLIC_LEAGUE_READ_ROOT,shadow_exposed:false,observed:23,processed:22,boundary:null}));
