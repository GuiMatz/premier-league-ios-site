import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareShadow } from '../server/league/shadow-comparator.js';
import { normalizeAthleteScores } from '../lib/league/live-scoring.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2),out=args.includes('--out')?args[args.indexOf('--out')+1]:null;
let input,source;
if(args.includes('--fixture')){const fixture=args[args.indexOf('--fixture')+1];if(!fixture)throw new Error('Use --fixture <arquivo>');input=JSON.parse(await readFile(resolve(root,fixture),'utf8'));source='fixture';}
else if(args.includes('--current-local')){const state=JSON.parse(await readFile(resolve(root,'data/state_public.json'),'utf8')),round=Number(state.rodada),athletes=Object.fromEntries(Object.entries(state.scouts_anteriores||{}).map(([id,value])=>[id,{raw_score:value.pontuacao??null,status:value.pontuacao==null?'unavailable':'known',source:'bot_state_public:scouts_anteriores'}]));input={lineups:[],athleteScores:normalizeAthleteScores({fetched_at:state.updated_at||null,cartola_round:round,athletes}),officialScores:state.round_scores?.[String(round)]||{}};source='current-local';}
else throw new Error('Use --fixture <arquivo> ou --current-local');
const report={source,...compareShadow(input)};if(out){const target=resolve(root,out);if(!target.startsWith(resolve(root,'reports','shadow'))&&!target.startsWith(resolve(root,'tmp','shadow')))throw new Error('Relatório somente em reports/shadow ou tmp/shadow');await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(report,null,2));}console.log(JSON.stringify(report,null,2));
