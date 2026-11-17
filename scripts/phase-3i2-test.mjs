import assert from 'node:assert/strict';
import { mkdir,readFile,rm } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveLeagueProgress } from '../server/league-executor/round-semantics.js';
import { createLeagueApiService } from '../server/league-api/service.js';
import { writeAtomic } from '../server/league-next/storage.js';

const baseline={as_of_round:22,current_cartola_round:23},state={last_cartola_round:23},manifest={};
const a=deriveLeagueProgress({baseline,state,ledgerEvents:[],checkpoints:[],manifest});assert.equal(a.current_cartola_round,23);assert.equal(a.last_processed_round,22);assert.equal(a.baseline_as_of_round,22);
const b=deriveLeagueProgress({baseline,state,currentCartolaRound:24,ledgerEvents:[],checkpoints:[],manifest});assert.equal(b.current_cartola_round,24);assert.equal(b.last_processed_round,22);
const c=deriveLeagueProgress({baseline,state,ledgerEvents:[],checkpoints:[{status:'committed',cartola_round:23}],manifest});assert.equal(c.last_processed_round,23);assert.equal(c.last_processed_source,'checkpoint');
const finalized={event_id:'round-23-final',schema_version:1,season:2026,cartola_round:23,event_type:'round.finalize',scope_id:'R23',occurred_at:'2026-08-14T00:00:00Z',source:'test',payload_hash:'test',payload:{}};
const d=deriveLeagueProgress({baseline,state,ledgerEvents:[finalized],checkpoints:[],manifest});assert.equal(d.last_processed_round,23);assert.equal(d.last_processed_source,'ledger_finalization');
assert.equal(a.next_engine_managed_round,null);assert.equal(a.migration.status,'AMBIGUOUS');assert.equal(a.migration.reason,'MIGRATION_BOUNDARY_UNDECIDED');assert.equal(b.next_engine_managed_round,null);

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=join(root,'data','league-next'),temp=join(root,'tmp','league-next',`phase-3i2-${process.pid}`),read=async path=>JSON.parse(await readFile(path,'utf8'));
try{await mkdir(join(temp,'events'),{recursive:true});for(const relative of ['manifest.json','baselines/pre-engine-2026-r23.json','baselines/clubs-history.json','seasons/2026/state.json'])await writeAtomic(join(temp,relative),await read(join(source,relative)));await writeAtomic(join(temp,'events','2026.jsonl'),'');const service=createLeagueApiService({projectRoot:root,leagueRoot:temp,shadowRoot:join(temp,'shadow')}),status=await service.status();assert.equal(status.data.cartola_round,23);assert.equal(status.data.current_cartola_round,23);assert.equal(status.data.last_processed_round,22);assert.equal(status.data.baseline_as_of_round,22);assert.equal(status.data.next_engine_managed_round,null);assert.deepEqual(status.data.migration,{pre_engine_baseline_through:22,next_engine_managed_round:null,status:'AMBIGUOUS',reason:'MIGRATION_BOUNDARY_UNDECIDED'});assert.ok(status.warnings.includes('MIGRATION_BOUNDARY_UNDECIDED'));assert.equal(status.meta.last_processed_source,'baseline');}
finally{await rm(temp,{recursive:true,force:true});}
console.log('OK: Fase 3I.2 — API status separa rodada observada, processada e fronteira de migração.');
