import { randomUUID } from 'node:crypto';
import { mkdir,open,unlink,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateLogicalPath } from '../logical-paths.js';
import { ERROR_CODES,LeagueStorageError } from '../contracts.js';

export class FileLockProvider{
 constructor({root,clock=()=>new Date()}={}){this.root=root;this.clock=clock;this.scope='local';this.distributed_safe=false;}
 async acquire(scope,owner=`${process.pid}:${randomUUID()}`,options={}){const key=scopeKey(scope),logical=`locks/${key}.lock`,path=join(this.root,...logical.split('/')),now=this.clock(),ttl=options.ttl??null,expires_at=ttl?new Date(now.getTime()+ttl).toISOString():null;await mkdir(join(this.root,'locks'),{recursive:true});try{const handle=await open(path,'wx'),record={scope,owner,acquired_at:now.toISOString(),ttl,expires_at,provider_scope:this.scope,distributed_safe:this.distributed_safe};await handle.writeFile(JSON.stringify(record));await handle.close();return{status:'acquired',logical_path:logical,path,owner,record};}catch(error){if(error.code==='EEXIST'){try{const current=JSON.parse(await readFile(path,'utf8'));if(options.allowStaleTakeover&&current.expires_at&&Date.parse(current.expires_at)<=now.getTime()){await unlink(path);return this.acquire(scope,owner,options);}}catch{}return{status:'conflict',code:ERROR_CODES.LOCK_CONFLICT,logical_path:logical,owner:null};}throw error;}}
 async renew(lock,options={}){if(!lock?.record?.ttl)return{...lock,status:'not_renewable'};await this.release(lock);return this.acquire(lock.record.scope,lock.owner,{ttl:options.ttl??lock.record.ttl});}
 async release(lock){if(!lock?.path)throw new LeagueStorageError(ERROR_CODES.LOCK_CONFLICT,'Lock inválido.');try{const current=JSON.parse(await readFile(lock.path,'utf8'));if(current.owner!==lock.owner)throw new LeagueStorageError(ERROR_CODES.LOCK_CONFLICT,'Owner do lock divergente.');await unlink(lock.path);return{status:'released'};}catch(error){if(error.code==='ENOENT')return{status:'already_released'};throw error;}}
}
function scopeKey(scope){const value=typeof scope==='string'?scope:`${scope.season}-${`R${String(scope.cartola_round??scope.round).padStart(2,'0')}`}-${scope.operation}`;return validateLogicalPath(value.replace(/[^a-zA-Z0-9._-]/g,'-'));}
