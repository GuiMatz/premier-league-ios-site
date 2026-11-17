import { join } from 'node:path';
import { FileStorageProvider } from '../league-next/providers/file-storage-provider.js';
import { GitHubStorageProvider } from '../league-next/providers/github-storage-provider.js';
import { GitHubHttpTransport } from '../league-next/github/transport.js';

export const PUBLIC_LEAGUE_READ_ROOT='data/league-next';
const allowedProviders=new Set(['file','github']);
const forbiddenMethods=['write','writeText','writeJson','delete','publish','updateRef','compareAndSwap','prepareTransaction','commitTransaction'];
const readOnlyError=()=>Object.assign(new Error('READ_ONLY_PROVIDER_WRITE_FORBIDDEN'),{code:'READ_ONLY_PROVIDER_WRITE_FORBIDDEN'});
const publicProviderCodes=new Set(['PROVIDER_INIT_FAILED','GITHUB_AUTH_FAILED','GITHUB_REF_NOT_FOUND','GITHUB_READ_FAILED','RATE_LIMIT','READ_ONLY_PROVIDER_WRITE_FORBIDDEN']);
export function safeProviderError(error,fallback='GITHUB_READ_FAILED'){
 const source=error?.cause?.code&&publicProviderCodes.has(error.cause.code)?error.cause:error,code=publicProviderCodes.has(source?.code)?source.code:fallback;
 return Object.assign(new Error(code),{code,cause:error});
}

export class ReadOnlyStorageProvider{
 #provider;
 constructor(provider){if(!provider)throw Object.assign(new Error('STORAGE_UNAVAILABLE'),{code:'STORAGE_UNAVAILABLE'});this.#provider=provider;this.kind=provider.kind;this.root=provider.root;this.persistent=provider.persistent;this.distributed_safe=provider.distributed_safe;for(const method of forbiddenMethods)this[method]=async()=>{throw readOnlyError();};Object.freeze(this);}
 async call(method,args){try{return await this.#provider[method](...args);}catch(error){throw safeProviderError(error);}}
 getVersion(...args){return this.call('getVersion',args);}
 exists(...args){return this.call('exists',args);}
 readText(...args){return this.call('readText',args);}
 readJson(...args){return this.call('readJson',args);}
 list(...args){return this.call('list',args);}
}

class PinnedGitHubStorageProvider extends GitHubStorageProvider{
 constructor(options){super(options);this.pinnedSnapshot=null;this.pinnedAt=0;this.snapshotTtlMs=5000;}
 async snapshot(version=null){
  if(version)return super.snapshot(version);
  if(!this.pinnedSnapshot||Date.now()-this.pinnedAt>=this.snapshotTtlMs){
   this.pinnedAt=Date.now();
   this.pinnedSnapshot=super.snapshot().catch(error=>{this.pinnedSnapshot=null;this.pinnedAt=0;throw error;});
  }
  return this.pinnedSnapshot;
 }
 async getVersion(){return(await this.snapshot()).head;}
}

class UnavailableReadProvider{
 constructor(error){this.kind='unavailable';this.root=PUBLIC_LEAGUE_READ_ROOT;this.error=error;this.code='PROVIDER_INIT_FAILED';}
 fail(){throw safeProviderError(this.error,this.code);}
 getVersion(){return this.fail();}exists(){return this.fail();}readText(){return this.fail();}readJson(){return this.fail();}list(){return this.fail();}
}

export function createLeagueReadProvider({env=process.env,projectRoot,leagueRoot=join(projectRoot,'data','league-next'),transportFactory=options=>new GitHubHttpTransport(options)}={}){
 const selected=String(env.LEAGUE_READ_PROVIDER||'file').trim().toLowerCase();
 if(!allowedProviders.has(selected))return new UnavailableReadProvider(Object.assign(new Error('INVALID_LEAGUE_READ_PROVIDER'),{code:'INVALID_LEAGUE_READ_PROVIDER'}));
 try{
  if(selected==='file')return new ReadOnlyStorageProvider(new FileStorageProvider({root:leagueRoot}));
  const owner=String(env.LEAGUE_GITHUB_OWNER||'').trim(),repo=String(env.LEAGUE_GITHUB_REPO||'').trim(),branch=String(env.LEAGUE_GITHUB_BRANCH||'').trim(),token=String(env.LEAGUE_GITHUB_TOKEN||'').trim();
  if(!owner||!repo||!branch||!token)throw Object.assign(new Error('GITHUB_READ_CONFIGURATION_REQUIRED'),{code:'GITHUB_READ_CONFIGURATION_REQUIRED'});
  const transport=transportFactory({token});
  return new ReadOnlyStorageProvider(new PinnedGitHubStorageProvider({transport,owner,repo,branch,allowedBranches:[branch],officialBranches:['main'],root:PUBLIC_LEAGUE_READ_ROOT,mode:'laboratory'}));
 }catch(error){return new UnavailableReadProvider(error);}
}
