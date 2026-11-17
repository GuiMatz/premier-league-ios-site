import { readFile } from 'node:fs/promises';import { dirname,resolve } from 'node:path';import { fileURLToPath } from 'node:url';
export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const args=process.argv.slice(2);
export const option=(name,fallback=null)=>{const index=args.indexOf(name);return index>=0?args[index+1]:fallback;};
export const requiredNumber=name=>{const value=Number(option(name));if(!Number.isInteger(value))throw new Error(`Argumento obrigatório: ${name}`);return value;};
export const json=async path=>JSON.parse(await readFile(resolve(projectRoot,path),'utf8'));
export const catalog=await json('data/catalog/clubs.json');
export const shadowRoot=option('--shadow-root','reports/shadow');
export function fixturesForRound(state,round){if(round>=19&&round<=36){const competitionRound=round-18;return(state.pc2_confrontos?.[String(competitionRound)]||[]).map((pair,index)=>({match_id:`shadow:pc2:${competitionRound}:${index+1}`,competition_id:'pc2',competition_round:competitionRound,cartola_round:round,home_team_id:Number(pair[0]),away_team_id:Number(pair[1])}));}return[];}
