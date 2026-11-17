import assert from 'node:assert/strict';
import { mkdir,readFile,rm } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createLeagueApiService,endpointCache } from '../server/league-api/service.js';
import { createLeagueHandler } from '../server/league-api/http.js';
import { addLockedLineup } from '../server/league-next/lineup-archive.js';
import { writeAtomic } from '../server/league-next/storage.js';
import { createOwnershipFixture } from '../test/fixtures/league/ownership-10-clubs.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=join(root,'data','league-next'),temp=join(root,'tmp','league-next',`phase-3f2-${process.pid}`),read=async path=>JSON.parse(await readFile(path,'utf8'));
await mkdir(join(temp,'events'),{recursive:true});for(const relative of ['manifest.json','baselines/pre-engine-2026-r23.json','baselines/clubs-history.json','seasons/2026/state.json'])await writeAtomic(join(temp,relative),await read(join(source,relative)));await writeAtomic(join(temp,'events','2026.jsonl'),'');
const service=createLeagueApiService({projectRoot:root,leagueRoot:temp,shadowRoot:join(temp,'shadow')});
const status=await service.status();assert.equal(status.ok,true);assert.equal(status.data.writer,'bot');assert.equal(status.data.cutover_enabled,false);assert.equal(status.data.current_cartola_round,23);assert.equal(status.data.last_processed_round,22);assert.equal(status.data.baseline_as_of_round,22);assert.equal(status.data.next_engine_managed_round,null);assert.equal(status.data.migration.status,'AMBIGUOUS');assert.ok(status.warnings.includes('MIGRATION_BOUNDARY_UNDECIDED'));assert.equal(status.data.ledger_event_count,0);assert.equal('path' in status.data,false);
const state=await service.state();assert.equal(state.data.official,false);assert.equal(state.data.mode,'isolated');assert.equal(state.data.writer,'bot');
const pl=await service.standings({competition:'pl',season:'2026'});assert.equal(pl.data.rows.length,10);assert.equal(pl.data.rows[0].points>=pl.data.rows[1].points,true);
const pc1=await service.standings({competition:'pc1',season:'2026'});assert.equal(pc1.data.source_status,'consolidated_only');assert.equal(pc1.data.official_order[0],10000003);
const pc2=await service.standings({competition:'pc2',season:'2026'});assert.equal(pc2.status,'unavailable');assert.equal(pc2.data,null);assert.equal(pc2.meta.competition,'pc2');
const round=await service.rounds({season:'2026',round:'19'});assert.equal(round.data.competition,'pc2');assert.equal(round.data.competition_round,1);assert.notEqual(round.data.mvp.score,null);
assert.equal((await service.lineups({season:2026,round:24})).status,'unavailable');assert.equal((await service.ownership({season:2026,round:24})).status,'unavailable');assert.equal((await service.live({season:2026,round:24})).status,'unavailable');
const catalog=await read(join(root,'data','catalog','clubs.json')),lineups=createOwnershipFixture(catalog.clubs.map(c=>c.team_id));let archive={schema_version:1,season:2026,cartola_round:24,locked:{},result:{}};for(const lineup of lineups)archive=addLockedLineup(archive,lineup).archive;await writeAtomic(join(temp,'seasons','2026','lineups','R24.json'),archive);
const ownership=await service.ownership({season:2026,round:24});assert.equal(ownership.status,'complete');assert.equal(ownership.data.expected_teams,10);assert.equal(ownership.data.most_selected[0].percentage,100);assert.ok(ownership.data.source_lineups_hash);
const impact=await service.impact({season:2026,round:24,athlete_id:102});assert.equal(impact.data.affected_teams.length,10);assert.equal(impact.data.affected_teams.filter(x=>x.role==='captain').length,4);
const rlImpact=await service.impact({season:2026,round:24,athlete_id:900});assert.equal(rlImpact.data.effective_impact.every(x=>x.status==='unavailable'),true);
const records=await service.records({season:2026});assert.equal(records.data.records[0].status,'co_record');assert.equal(records.data.records[0].score,145);assert.deepEqual(new Set(records.data.records[0].holders.map(x=>x.team_id)),new Set([10000001,10000009]));assert.equal(records.data.records[0].holders.every(x=>x.provenance==='SPECIAL_SCORE'),true);
const active=await service.clubs({});assert.equal(active.data.clubs.length,10);assert.equal(active.data.clubs.every(x=>x.active!==false),true);const all=await service.clubs({include_inactive:'true'});assert.equal(all.data.clubs.some(x=>x.team_id===99999999&&x.active===false),true);assert.deepEqual(all.data.clubs.find(x=>x.team_id===10000010).aliases,['Titiham','Titiham Headspurs']);
const history=await service.history();assert.equal(history.meta.ledger_included,false);assert.equal(history.meta.cartoleiro_de_ouro_classification,'honor');assert.ok(history.data.titles.length>0);
const health=await service.health();assert.equal(['healthy','degraded'].includes(health.status),true);assert.equal(health.data.checks.ledger_parseable,true);
await assert.rejects(()=>service.standings({competition:'xyz'}),error=>error.code==='INVALID_COMPETITION');await assert.rejects(()=>service.impact({season:2026,round:24,athlete_id:'x'}),error=>error.code==='INVALID_ATHLETE_ID');

const fakeService={status:async()=>status},handler=createLeagueHandler('status',{service:fakeService}),headers={};let code=null,body=null;const res={setHeader(k,v){headers[k]=v;},status(value){code=value;return this;},json(value){body=value;return value;}};await handler({method:'POST',query:{}},res);assert.equal(code,405);assert.equal(body.error.code,'METHOD_NOT_ALLOWED');assert.equal(headers.Allow,'GET');assert.equal(endpointCache.live,'no-store');
code=null;body=null;await handler({method:'GET',query:{}},res);assert.equal(code,200);assert.equal(body.ok,true);
const serialized=JSON.stringify({status,state,pl,pc1,pc2,round,ownership,impact,records,active,all,history,health});assert.equal(/(discord[_-]?token|github[_-]?token|api[_-]?key|authorization|bearer\s|[A-Z]:\\|AppData|Open Design)/i.test(serialized),false);assert.equal(serialized.includes('stack'),false);
assert.equal(pc2.status,'unavailable');assert.equal(pc2.data,null);for(const value of [await service.lineups({season:2026,round:23}),await service.live({season:2026,round:23})]){assert.equal(value.status,'unavailable');assert.equal(value.data,null);}
for(const directory of [join(root,'server','league-api'),join(root,'api','league')])for(const file of (await readdir(directory)).filter(name=>name.endsWith('.js'))){const text=await readFile(join(directory,file),'utf8');assert.equal(/[A-Z]:\\|AppData|Open Design/.test(text),false);for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!match[1].startsWith('.'))continue;const target=resolve(directory,match[1]),parent=dirname(target),expected=target.split(/[\\/]/).at(-1),entries=await readdir(parent);assert.ok(entries.includes(expected),`import casing: ${file} -> ${match[1]}`);}}
await rm(temp,{recursive:true,force:true});console.log('OK: Fase 3F.2 — API GET-only, contratos, ownership, co-recorde, health, cache e segurança validados.');
