import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLeagueApiService } from '../server/league-api/service.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const allowed=new Set(['PROVIDER_INIT_FAILED','GITHUB_AUTH_FAILED','GITHUB_REF_NOT_FOUND','GITHUB_READ_FAILED','RATE_LIMIT','READ_MODEL_MANIFEST_MISSING','READ_MODEL_BASELINE_MISSING','READ_MODEL_CATALOG_MISSING','READ_MODEL_SUPPORT_DATA_MISSING']);
try{
 const service=createLeagueApiService({projectRoot:root,env:process.env}),health=await service.health();
 if(health.status==='unavailable'){const code=health.data?.error?.code;console.error(JSON.stringify({ok:false,status:'UNAVAILABLE',error:{code:allowed.has(code)?code:'GITHUB_READ_FAILED'}}));process.exitCode=1;}
 else{const status=await service.status();console.log(JSON.stringify({ok:true,status:'AVAILABLE',provider:true,storage_read_model:true,current_cartola_round:status.data.current_cartola_round,last_processed_round:status.data.last_processed_round,next_engine_managed_round:status.data.next_engine_managed_round,migration_status:status.data.migration.status}));}
}catch(error){console.error(JSON.stringify({ok:false,status:'UNAVAILABLE',error:{code:allowed.has(error?.code)?error.code:'GITHUB_READ_FAILED'}}));process.exitCode=1;}
