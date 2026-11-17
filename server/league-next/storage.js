import { basename,dirname,join,resolve,sep } from 'node:path';
import { canonical,hashValue } from './hashing.js';
import { FileStorageProvider } from './providers/file-storage-provider.js';
import { FileLockProvider } from './providers/file-lock-provider.js';
export{canonical,hashValue};
export const roundLabel=round=>`R${String(round).padStart(2,'0')}`;
export function leagueRoot(projectRoot,requested='data/league-next'){const base=resolve(projectRoot),target=resolve(base,requested);if(target!==resolve(base,'data/league-next')&&!target.startsWith(resolve(base,'tmp/league-next')+sep))throw new Error('LEAGUE_NEXT_PATH_OUTSIDE_ALLOWED_ROOT');return target;}
export async function readJson(path,fallback=null){return new FileStorageProvider({root:dirname(path)}).readJson(basename(path),fallback);}
export async function writeAtomic(path,data){const provider=new FileStorageProvider({root:dirname(path)});return typeof data==='string'?provider.writeText(basename(path),data):provider.writeJson(basename(path),data);}
export async function acquireLock(root,{season,round,operation,owner,ttl=null}){const provider=new FileLockProvider({root}),lock=await provider.acquire({season,cartola_round:round,operation},owner,{ttl});return lock.status==='acquired'?{status:'acquired',path:lock.path,owner:lock.owner,release:()=>provider.release(lock)}:{status:'locked',path:lock.path,owner:null};}
export const paths=(root,season,round)=>({ledger:join(root,'events',`${season}.jsonl`),state:join(root,'seasons',String(season),'state.json'),checkpoint:join(root,'checkpoints',String(season),`${roundLabel(round)}.json`),lineups:join(root,'seasons',String(season),'lineups',`${roundLabel(round)}.json`),transactions:join(root,'transactions')});
export async function listFilesRecursive(root){const provider=new FileStorageProvider({root});return(await provider.list('')).map(path=>join(root,...path.split('/')));}
export async function fileExists(path){return new FileStorageProvider({root:dirname(path)}).exists(basename(path));}
