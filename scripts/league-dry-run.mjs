import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptCartolaSnapshot, snapshotToEngineInput } from '../server/league/cartola-adapter.js';
import { localStateToCartolaPayload } from '../server/league/input-normalizer.js';
import { compareBotStateWithEngine } from '../server/league/reconciliation.js';
import { finalizeRound } from '../lib/league/index.js';

const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const pathFromRoot=path=>resolve(root,path);
const args=process.argv.slice(2),fixtureIndex=args.indexOf('--fixture'),current=args.includes('--current-local');
if (fixtureIndex<0&&!current) throw new Error('Use --fixture <arquivo> ou --current-local');
const catalog=await readJson(pathFromRoot('data/catalog/clubs.json'));
const botState=await readJson(pathFromRoot('data/state_public.json'));
const history=await readJson(pathFromRoot('data/historico_rodadas.json'));
const payload=current?localStateToCartolaPayload(botState,catalog,botState.updated_at):await readJson(resolve(process.cwd(),args[fixtureIndex+1]));
const adapted=adaptCartolaSnapshot(payload,{catalog,fetchedAt:payload.fetched_at||botState.updated_at});
const round=adapted.snapshot.cartola_round,pc2Round=round>=19&&round<=36?round-18:round;
const fixtureFile=pathFromRoot(`test/fixtures/league/round-${String(round).padStart(2,'0')}-2026.json`);
let fixtures=[];try{fixtures=(await readJson(fixtureFile)).fixtures}catch{fixtures=round>=19?botState.pc2_confrontos?.[String(pc2Round)]||[]:[]}
const prepared=snapshotToEngineInput(adapted.snapshot,{catalog,fixtures,history,occurred_at:adapted.snapshot.fetched_at,legacyOrder:catalog.clubs.map(club=>club.team_id)});
const engine=prepared.status==='ready'?finalizeRound(prepared.input,{}):{status:'not_executed',changes:[],warnings:['snapshot_not_finalizable'],conflicts:[]};
const output={mode:current?'current-local':'fixture',writer:'bot',writes_performed:false,snapshot:adapted.snapshot,validation:adapted.validation,lineups:adapted.lineup_reports,engine:{status:engine.status,changes:engine.changes,warnings:engine.warnings,conflicts:engine.conflicts,event_count:engine.events?.length||0},comparison:compareBotStateWithEngine({botState,history,catalog})};
console.log(JSON.stringify(output,null,2));
